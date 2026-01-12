import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { AuthProvider } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('../../../lib/supabase', () => ({
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

vi.mock('../../../lib/permissions', () => ({
  getPermissions: vi.fn(() => ({
    canManageCoaches: false,
    canManageCouples: false,
    canManageAssignments: false,
    canViewAll: false,
    canEditOwn: true,
  })),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mocks
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });
  });

  describe('Rendering', () => {
    it('should render login form with all required elements', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByText('Marriage Ministry')).toBeInTheDocument();
      });

      expect(screen.getByText('Sign in to access the ministry dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
    });

    it('should render with password mode by default', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('should have Heart icon', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByText('Marriage Ministry')).toBeInTheDocument();
      });

      // Heart icon should be present (lucide-react renders as svg)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should switch to magic link mode when button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use password instead/i })).toBeInTheDocument();
    });

    it('should switch back to password mode from magic link mode', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      // Switch to magic link
      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use password instead/i })).toBeInTheDocument();
      });

      // Switch back to password
      await user.click(screen.getByRole('button', { name: /use password instead/i }));

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });
  });

  describe('Password Sign In', () => {
    it('should successfully sign in with email and password', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'admin@test.com',
          password: 'password123',
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should display error message on failed sign in', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid login credentials';

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error(errorMessage),
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during sign in', async () => {
      const user = userEvent.setup();

      // Create a promise that we can control
      let resolveSignIn: () => void;
      const signInPromise = new Promise<{ data: { user: User; session: Session }; error: null }>((resolve) => {
        resolveSignIn = () => resolve({
          data: { user: mockUser, session: mockSession },
          error: null,
        });
      });

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockReturnValue(signInPromise);

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise
      resolveSignIn!();

      // Wait for loading to finish
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should handle non-Error thrown values', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Some error object' },
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Magic Link Sign In', () => {
    it('should successfully send magic link', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOtp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {},
        error: null,
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      // Switch to magic link mode
      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      await user.type(emailInput, 'admin@test.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'admin@test.com',
          options: {
            emailRedirectTo: expect.stringContaining(window.location.origin),
          },
        });
      });

      // Should show success screen
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText(/we sent a magic link to/i)).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    it('should display error message on failed magic link send', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to send magic link';

      (supabase.auth.signInWithOtp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {},
        error: new Error(errorMessage),
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      // Switch to magic link mode
      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send magic link/i });

      await user.type(emailInput, 'test@test.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should not show success screen
      expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
    });

    it('should allow using different email from success screen', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithOtp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {},
        error: null,
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      // Switch to magic link mode
      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@test.com');
      await user.click(screen.getByRole('button', { name: /send magic link/i }));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Click "Use a different email"
      await user.click(screen.getByRole('button', { name: /use a different email/i }));

      // Should return to login form
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
      });

      // Email should be cleared
      const newEmailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(newEmailInput.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    it('should require email field', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should require password field in password mode', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should not show password field in magic link mode', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use magic link instead/i })).toBeInTheDocument();
      });

      // Switch to magic link mode
      await user.click(screen.getByRole('button', { name: /use magic link instead/i }));

      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display errors from authentication attempts', async () => {
      const user = userEvent.setup();

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials'),
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Attempt sign in to trigger error
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'wrong');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Error should persist until next submit attempt
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should clear error on new authentication attempt', async () => {
      const user = userEvent.setup();

      // First attempt fails
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new Error('Invalid credentials'),
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'wrong');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second attempt succeeds
      const mockUser: User = {
        id: 'test-id',
        email: 'test@test.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null,
      });

      await user.clear(passwordInput);
      await user.type(passwordInput, 'correct');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      // Error should be cleared before new attempt
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('id', 'password');
    });

    it('should have proper placeholders', async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Tab through form
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toHaveFocus();
    });
  });
});
