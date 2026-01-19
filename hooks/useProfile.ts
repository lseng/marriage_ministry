import { useState, useEffect, useCallback } from 'react';
import * as profileService from '../services/profile';
import type { CurrentUserProfile } from '../services/profile';

interface UseCurrentProfileResult {
  profile: CurrentUserProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCurrentProfile(): UseCurrentProfileResult {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getCurrentUserProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
  };
}

interface UseUpdateProfileResult {
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifyPassword: (email: string, currentPassword: string) => Promise<boolean>;
  updating: boolean;
  error: string | null;
}

export function useUpdateProfile(): UseUpdateProfileResult {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEmail = async (newEmail: string): Promise<void> => {
    try {
      setUpdating(true);
      setError(null);
      await profileService.updateUserEmail(newEmail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update email';
      setError(message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      setUpdating(true);
      setError(null);
      await profileService.updateUserPassword(newPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const verifyPassword = async (email: string, currentPassword: string): Promise<boolean> => {
    try {
      return await profileService.verifyCurrentPassword(email, currentPassword);
    } catch {
      return false;
    }
  };

  return {
    updateEmail,
    updatePassword,
    verifyPassword,
    updating,
    error,
  };
}
