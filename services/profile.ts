import { supabase } from '../lib/supabase';
import type { Profile, Coach, Couple, UserRole } from '../types/database';

export interface CurrentUserProfile {
  profile: Profile;
  role: UserRole;
  roleData: {
    coach?: Coach & { assignedCouplesCount: number };
    couple?: Couple & { coach?: { id: string; first_name: string; last_name: string } | null };
  };
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return null;

  const result: CurrentUserProfile = {
    profile,
    role: profile.role,
    roleData: {},
  };

  // Get role-specific data
  if (profile.role === 'coach') {
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (coach) {
      // Get assigned couples count
      const { count } = await supabase
        .from('couples')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', coach.id);

      result.roleData.coach = {
        ...coach,
        assignedCouplesCount: count || 0,
      };
    }
  } else if (profile.role === 'couple') {
    const { data: couple } = await supabase
      .from('couples')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (couple) {
      // Get coach info if assigned
      let coach = null;
      if (couple.coach_id) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('id, first_name, last_name')
          .eq('id', couple.coach_id)
          .single();
        coach = coachData;
      }

      result.roleData.couple = {
        ...couple,
        coach,
      };
    }
  }

  return result;
}

export async function updateUserEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) throw error;

  // Also update profile email
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', user.id);
  }
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw error;
}

export async function verifyCurrentPassword(email: string, currentPassword: string): Promise<boolean> {
  // Try to sign in with current credentials to verify password
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  return !error;
}
