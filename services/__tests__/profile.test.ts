import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentUserProfile,
  updateUserEmail,
  updateUserPassword,
  verifyCurrentPassword,
} from '../profile';
import { supabase } from '../../lib/supabase';
import type { Profile, Coach, Couple } from '../../types/database';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('profile service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProfile: Profile = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    failed_login_attempts: 0,
    locked_until: null,
    notification_preferences: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCoach: Coach = {
    id: 'coach-123',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Coach',
    email: 'john.coach@example.com',
    phone: '+1234567890',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCouple: Couple = {
    id: 'couple-123',
    user_id: 'user-123',
    husband_first_name: 'Bob',
    husband_last_name: 'Smith',
    wife_first_name: 'Alice',
    wife_last_name: 'Smith',
    email: 'bobandalice@example.com',
    phone: '+1987654321',
    coach_id: 'coach-456',
    status: 'active',
    wedding_date: '2024-06-01',
    enrollment_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getCurrentUserProfile', () => {
    it('should return null when no user is authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await getCurrentUserProfile();

      expect(result).toBeNull();
    });

    it('should return null when profile is not found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      } as never);

      const result = await getCurrentUserProfile();

      expect(result).toBeNull();
    });

    it('should return admin profile with no role-specific data', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: mockProfile,
        role: 'admin',
        roleData: {},
      });
    });

    it('should return coach profile with assigned couples count', async () => {
      const coachProfile = { ...mockProfile, role: 'coach' as const };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coachProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 5,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coachProfile,
        role: 'coach',
        roleData: {
          coach: {
            ...mockCoach,
            assignedCouplesCount: 5,
          },
        },
      });
    });

    it('should return coach profile with zero couples when count is null', async () => {
      const coachProfile = { ...mockProfile, role: 'coach' as const };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coachProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: null,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coachProfile,
        role: 'coach',
        roleData: {
          coach: {
            ...mockCoach,
            assignedCouplesCount: 0,
          },
        },
      });
    });

    it('should return coach profile with empty roleData when coach record not found', async () => {
      const coachProfile = { ...mockProfile, role: 'coach' as const };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coachProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coachProfile,
        role: 'coach',
        roleData: {},
      });
    });

    it('should return couple profile with coach information', async () => {
      const coupleProfile = { ...mockProfile, role: 'couple' as const };
      const assignedCoach = {
        id: 'coach-456',
        first_name: 'Jane',
        last_name: 'Coach',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coupleProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: assignedCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coupleProfile,
        role: 'couple',
        roleData: {
          couple: {
            ...mockCouple,
            coach: assignedCoach,
          },
        },
      });
    });

    it('should return couple profile with null coach when not assigned', async () => {
      const coupleProfile = { ...mockProfile, role: 'couple' as const };
      const unassignedCouple = { ...mockCouple, coach_id: null };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coupleProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: unassignedCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coupleProfile,
        role: 'couple',
        roleData: {
          couple: {
            ...unassignedCouple,
            coach: null,
          },
        },
      });
    });

    it('should return couple profile with null coach when coach not found', async () => {
      const coupleProfile = { ...mockProfile, role: 'couple' as const };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coupleProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coupleProfile,
        role: 'couple',
        roleData: {
          couple: {
            ...mockCouple,
            coach: null,
          },
        },
      });
    });

    it('should return couple profile with empty roleData when couple record not found', async () => {
      const coupleProfile = { ...mockProfile, role: 'couple' as const };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coupleProfile,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCurrentUserProfile();

      expect(result).toEqual({
        profile: coupleProfile,
        role: 'couple',
        roleData: {},
      });
    });
  });

  describe('updateUserEmail', () => {
    it('should update user email in auth and profiles table', async () => {
      const newEmail = 'newemail@example.com';

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: newEmail } },
        error: null,
      } as never);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      const mockUpdate = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockUpdate,
        }),
      } as never);

      await updateUserEmail(newEmail);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: newEmail });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error when auth update fails', async () => {
      const mockError = new Error('Auth update failed');

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: mockError,
      } as never);

      await expect(updateUserEmail('newemail@example.com')).rejects.toThrow('Auth update failed');
    });

    it('should complete successfully even if profile update fails', async () => {
      const newEmail = 'newemail@example.com';

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: newEmail } },
        error: null,
      } as never);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile update failed' },
          }),
        }),
      } as never);

      await expect(updateUserEmail(newEmail)).resolves.toBeUndefined();
    });

    it('should handle case when user is not found after auth update', async () => {
      const newEmail = 'newemail@example.com';

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: newEmail } },
        error: null,
      } as never);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(updateUserEmail(newEmail)).resolves.toBeUndefined();
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password', async () => {
      const newPassword = 'newSecurePassword123';

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      await updateUserPassword(newPassword);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: newPassword });
    });

    it('should throw error when password update fails', async () => {
      const mockError = new Error('Password update failed');

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: mockError,
      } as never);

      await expect(updateUserPassword('newPassword')).rejects.toThrow('Password update failed');
    });
  });

  describe('verifyCurrentPassword', () => {
    it('should return true when password is correct', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      } as never);

      const result = await verifyCurrentPassword('test@example.com', 'correctPassword');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'correctPassword',
      });
      expect(result).toBe(true);
    });

    it('should return false when password is incorrect', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials'),
      } as never);

      const result = await verifyCurrentPassword('test@example.com', 'wrongPassword');

      expect(result).toBe(false);
    });

    it('should return false when sign in fails for any reason', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Network error'),
      } as never);

      const result = await verifyCurrentPassword('test@example.com', 'password');

      expect(result).toBe(false);
    });
  });
});
