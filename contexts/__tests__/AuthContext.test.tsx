/**
 * Unit Tests for AuthContext - Testing password sign-in fix
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabase';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock the permissions module
vi.mock('../../lib/permissions', () => ({
  getPermissions: vi.fn(() => ({
    canManageCoaches: false,
    canManageCouples: false,
    canManageAssignments: false,
    canViewAll: false,
    canEditOwn: true,
  })),
}));

describe('AuthContext - Password Sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const unsubscribe = vi.fn();
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  it('should sign in with valid credentials without 500 error', async () => {
    const mockUser = {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@test.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };

    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null,
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: mockUser.id, email: mockUser.email, role: 'admin' },
            error: null,
          }),
        }),
      }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('admin@test.com', 'password123');
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'password123',
    });
  });

  it('should handle invalid credentials error', async () => {
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.signIn('admin@test.com', 'wrongpassword');
      })
    ).rejects.toThrow('Invalid credentials');
  });
});
