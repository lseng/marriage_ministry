import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCurrentProfile, useUpdateProfile } from '../useProfile';
import * as profileService from '../../services/profile';
import type { CurrentUserProfile } from '../../services/profile';

// Mock profile service
vi.mock('../../services/profile', () => ({
  getCurrentUserProfile: vi.fn(),
  updateUserEmail: vi.fn(),
  updateUserPassword: vi.fn(),
  verifyCurrentPassword: vi.fn(),
}));

describe('useCurrentProfile', () => {
  const mockProfile: CurrentUserProfile = {
    profile: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'admin',
      failed_login_attempts: 0,
      locked_until: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    role: 'admin',
    roleData: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading state', () => {
    vi.mocked(profileService.getCurrentUserProfile).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCurrentProfile());

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return profile data when fetched successfully', async () => {
    vi.mocked(profileService.getCurrentUserProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useCurrentProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(profileService.getCurrentUserProfile).mockRejectedValue(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() => useCurrentProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBe('Failed to fetch');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(profileService.getCurrentUserProfile).mockRejectedValue('Some string error');

    const { result } = renderHook(() => useCurrentProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch profile');
  });

  it('should refresh profile when refresh is called', async () => {
    const updatedProfile: CurrentUserProfile = {
      ...mockProfile,
      profile: { ...mockProfile.profile, email: 'updated@example.com' },
    };

    vi.mocked(profileService.getCurrentUserProfile)
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(updatedProfile);

    const { result } = renderHook(() => useCurrentProfile());

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.profile).toEqual(updatedProfile);
    });

    expect(profileService.getCurrentUserProfile).toHaveBeenCalledTimes(2);
  });
});

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      vi.mocked(profileService.updateUserEmail).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateProfile());

      expect(result.current.updating).toBe(false);

      await act(async () => {
        await result.current.updateEmail('new@example.com');
      });

      expect(profileService.updateUserEmail).toHaveBeenCalledWith('new@example.com');
      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle email update error', async () => {
      vi.mocked(profileService.updateUserEmail).mockRejectedValue(
        new Error('Email already in use')
      );

      const { result } = renderHook(() => useUpdateProfile());

      await act(async () => {
        try {
          await result.current.updateEmail('existing@example.com');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Email already in use');
      });
    });

    it('should handle non-Error thrown values', async () => {
      vi.mocked(profileService.updateUserEmail).mockRejectedValue('Some error');

      const { result } = renderHook(() => useUpdateProfile());

      await act(async () => {
        try {
          await result.current.updateEmail('test@example.com');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to update email');
      });
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      vi.mocked(profileService.updateUserPassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateProfile());

      await act(async () => {
        await result.current.updatePassword('newPassword123');
      });

      expect(profileService.updateUserPassword).toHaveBeenCalledWith('newPassword123');
      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle password update error', async () => {
      vi.mocked(profileService.updateUserPassword).mockRejectedValue(
        new Error('Password too weak')
      );

      const { result } = renderHook(() => useUpdateProfile());

      await act(async () => {
        try {
          await result.current.updatePassword('weak');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Password too weak');
      });
    });
  });

  describe('verifyPassword', () => {
    it('should return true for valid password', async () => {
      vi.mocked(profileService.verifyCurrentPassword).mockResolvedValue(true);

      const { result } = renderHook(() => useUpdateProfile());

      let isValid: boolean = false;
      await act(async () => {
        isValid = await result.current.verifyPassword('test@example.com', 'correctPassword');
      });

      expect(isValid).toBe(true);
      expect(profileService.verifyCurrentPassword).toHaveBeenCalledWith(
        'test@example.com',
        'correctPassword'
      );
    });

    it('should return false for invalid password', async () => {
      vi.mocked(profileService.verifyCurrentPassword).mockResolvedValue(false);

      const { result } = renderHook(() => useUpdateProfile());

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.verifyPassword('test@example.com', 'wrongPassword');
      });

      expect(isValid).toBe(false);
    });

    it('should return false when verification throws error', async () => {
      vi.mocked(profileService.verifyCurrentPassword).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useUpdateProfile());

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.verifyPassword('test@example.com', 'password');
      });

      expect(isValid).toBe(false);
    });
  });
});
