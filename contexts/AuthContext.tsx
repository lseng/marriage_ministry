import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, Profile, LockoutStatus } from '../types/database';
import { getPermissions, type Permission } from '../lib/permissions';

// Custom error for account lockout
export class AccountLockedError extends Error {
  public lockedUntil: Date;
  public remainingMinutes: number;

  constructor(lockedUntil: Date) {
    const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    super(`Account is locked. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`);
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
    this.remainingMinutes = remainingMinutes;
  }
}

// Custom error for failed login with remaining attempts
export class LoginFailedError extends Error {
  public remainingAttempts: number;

  constructor(message: string, remainingAttempts: number) {
    const warningMessage = remainingAttempts > 0
      ? `${message} ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before lockout.`
      : message;
    super(warningMessage);
    this.name = 'LoginFailedError';
    this.remainingAttempts = remainingAttempts;
  }
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  permissions: Permission;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for account lockout
async function getLockoutStatus(email: string): Promise<LockoutStatus | null> {
  const { data, error } = await supabase.rpc('get_lockout_status', { user_email: email });
  if (error || !data || data.length === 0) return null;
  return data[0] as LockoutStatus;
}

async function recordFailedLogin(email: string): Promise<number> {
  const { data, error } = await supabase.rpc('record_failed_login', { user_email: email });
  if (error) {
    console.error('Error recording failed login:', error);
    return 5; // Default to max attempts if error
  }
  return data as number;
}

async function clearFailedLogins(email: string): Promise<void> {
  const { error } = await supabase.rpc('clear_failed_logins', { user_email: email });
  if (error) {
    console.error('Error clearing failed logins:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const role = profile?.role ?? null;
  const permissions = getPermissions(role);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        setProfile(profileData);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    // Check if account is locked before attempting login
    const lockoutStatus = await getLockoutStatus(email);
    if (lockoutStatus?.is_locked && lockoutStatus.locked_until) {
      throw new AccountLockedError(new Date(lockoutStatus.locked_until));
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Record failed login attempt
      const remainingAttempts = await recordFailedLogin(email);

      if (remainingAttempts <= 0) {
        // Account just got locked
        const newLockoutStatus = await getLockoutStatus(email);
        if (newLockoutStatus?.locked_until) {
          throw new AccountLockedError(new Date(newLockoutStatus.locked_until));
        }
      }

      // Include remaining attempts in error message
      throw new LoginFailedError(error.message, Math.max(0, remainingAttempts));
    }

    // Clear failed login attempts on successful login
    await clearFailedLogins(email);
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        permissions,
        loading,
        signIn,
        signInWithMagicLink,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
