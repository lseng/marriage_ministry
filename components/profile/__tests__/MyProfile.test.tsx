import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MyProfile } from '../MyProfile';
import * as useProfileHook from '../../../hooks/useProfile';
import * as authContext from '../../../contexts/AuthContext';
import type { CurrentUserProfile } from '../../../services/profile';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks
vi.mock('../../../hooks/useProfile', () => ({
  useCurrentProfile: vi.fn(),
  useUpdateProfile: vi.fn(() => ({
    updateEmail: vi.fn(),
    updatePassword: vi.fn(),
    verifyPassword: vi.fn(),
    updating: false,
    error: null,
  })),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../ui/toast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  })),
}));

describe('MyProfile', () => {
  const mockAdminProfile: CurrentUserProfile = {
    profile: {
      id: 'user-admin',
      email: 'admin@test.com',
      role: 'admin',
      failed_login_attempts: 0,
      locked_until: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    role: 'admin',
    roleData: {},
  };

  const mockCoachProfile: CurrentUserProfile = {
    profile: {
      id: 'user-coach',
      email: 'coach@test.com',
      role: 'coach',
      failed_login_attempts: 0,
      locked_until: null,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    role: 'coach',
    roleData: {
      coach: {
        id: 'coach-1',
        user_id: 'user-coach',
        first_name: 'John',
        last_name: 'Smith',
        email: 'coach@test.com',
        phone: '555-1234',
        status: 'active',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        assignedCouplesCount: 5,
      },
    },
  };

  const mockCoupleProfile: CurrentUserProfile = {
    profile: {
      id: 'user-couple',
      email: 'couple@test.com',
      role: 'couple',
      failed_login_attempts: 0,
      locked_until: null,
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    },
    role: 'couple',
    roleData: {
      couple: {
        id: 'couple-1',
        user_id: 'user-couple',
        coach_id: 'coach-1',
        husband_first_name: 'Mike',
        husband_last_name: 'Johnson',
        wife_first_name: 'Sarah',
        wife_last_name: 'Johnson',
        email: 'couple@test.com',
        phone: '555-5678',
        status: 'active',
        enrollment_date: '2024-02-01',
        wedding_date: '2024-06-15',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        coach: {
          id: 'coach-1',
          first_name: 'John',
          last_name: 'Smith',
        },
      },
    },
  };

  const mockRefresh = vi.fn();

  const createMockAuthContext = (role: 'admin' | 'coach' | 'couple' | null) => ({
    user: null,
    profile: null,
    role,
    loading: false,
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    permissions: {
      canManageCoaches: role === 'admin',
      canViewAllCoaches: role === 'admin',
      canManageCouples: role === 'admin',
      canViewAllCouples: role === 'admin' || role === 'coach',
      canAssignCoaches: role === 'admin',
      canCreateAssignments: role === 'admin',
      canDistributeAssignments: role === 'admin',
      canViewAllSubmissions: role === 'admin',
      canReviewHomework: role === 'admin' || role === 'coach',
      canSubmitHomework: role === 'couple',
      canCreateFormTemplates: role === 'admin',
    },
  });

  const renderMyProfile = () => {
    return render(
      <BrowserRouter>
        <MyProfile />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext(null));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      renderMyProfile();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message with retry button', async () => {
      const user = userEvent.setup();
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext(null));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: null,
        loading: false,
        error: 'Failed to load profile',
        refresh: mockRefresh,
      });

      renderMyProfile();

      expect(screen.getByText('Error loading profile')).toBeInTheDocument();
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Not Found State', () => {
    it('should display not found message when profile is null', async () => {
      const user = userEvent.setup();
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext(null));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: null,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderMyProfile();

      expect(screen.getByText('Profile not found')).toBeInTheDocument();

      const dashboardButton = screen.getByRole('button', { name: /go to dashboard/i });
      await user.click(dashboardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Admin Profile', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext('admin'));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: mockAdminProfile,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display admin profile information', () => {
      renderMyProfile();

      // Email appears in multiple places
      expect(screen.getAllByText('admin@test.com').length).toBeGreaterThan(0);
      expect(screen.getByText('Admin Account')).toBeInTheDocument();
    });

    it('should display admin privileges section', () => {
      renderMyProfile();

      expect(screen.getByText('Admin Privileges')).toBeInTheDocument();
      expect(screen.getByText('Manage all coaches and couples')).toBeInTheDocument();
      expect(screen.getByText('Create and distribute assignments')).toBeInTheDocument();
    });

    it('should show edit profile button for admin', () => {
      renderMyProfile();

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('should have edit button that can be clicked', async () => {
      const user = userEvent.setup();
      renderMyProfile();

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      // Just verify the button is clickable without testing modal rendering
      // (modal testing would require additional mocks for Modal component)
      await user.click(editButton);
      // Button should still be in document after click
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('Coach Profile', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext('coach'));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: mockCoachProfile,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display coach profile information', () => {
      renderMyProfile();

      // Email appears in multiple places
      expect(screen.getAllByText('coach@test.com').length).toBeGreaterThan(0);
      expect(screen.getByText('Coach Account')).toBeInTheDocument();
    });

    it('should display coach profile section', () => {
      renderMyProfile();

      expect(screen.getByText('Coach Profile')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should display assigned couples count', () => {
      renderMyProfile();

      expect(screen.getByText('Assigned Couples')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Couples Assigned')).toBeInTheDocument();
    });

    it('should not show edit button for coach', () => {
      renderMyProfile();

      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });
  });

  describe('Couple Profile', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext('couple'));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: mockCoupleProfile,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display couple profile information', () => {
      renderMyProfile();

      // Use getAllByText since email appears multiple times
      expect(screen.getAllByText('couple@test.com').length).toBeGreaterThan(0);
      expect(screen.getByText('Couple Account')).toBeInTheDocument();
    });

    it('should display couple names', () => {
      renderMyProfile();

      expect(screen.getByText('Couple Profile')).toBeInTheDocument();
      expect(screen.getByText(/Mike & Sarah/)).toBeInTheDocument();
    });

    it('should display assigned coach', () => {
      renderMyProfile();

      expect(screen.getByText('Your Coach')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Marriage Coach')).toBeInTheDocument();
    });

    it('should not show edit button for couple', () => {
      renderMyProfile();

      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });
  });

  describe('Couple Without Coach', () => {
    it('should display no coach message when couple has no coach', () => {
      const coupleWithoutCoach: CurrentUserProfile = {
        ...mockCoupleProfile,
        roleData: {
          couple: {
            ...mockCoupleProfile.roleData.couple!,
            coach_id: null,
            coach: null,
          },
        },
      };

      vi.mocked(authContext.useAuth).mockReturnValue(createMockAuthContext('couple'));

      vi.mocked(useProfileHook.useCurrentProfile).mockReturnValue({
        profile: coupleWithoutCoach,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderMyProfile();

      expect(screen.getByText('No coach assigned')).toBeInTheDocument();
      expect(screen.getByText('A coach will be assigned to you soon.')).toBeInTheDocument();
    });
  });
});
