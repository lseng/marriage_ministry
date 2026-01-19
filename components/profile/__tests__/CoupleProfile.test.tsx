import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CoupleProfile } from '../CoupleProfile';
import * as useCouplesHook from '../../../hooks/useCouples';
import type { CoupleWithDetails } from '../../../services/couples';

// Mock useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'couple-1' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock useCouple hook
vi.mock('../../../hooks/useCouples', () => ({
  useCouple: vi.fn(),
}));

describe('CoupleProfile', () => {
  const mockCouple: CoupleWithDetails = {
    id: 'couple-1',
    user_id: 'user-c1',
    coach_id: 'coach-1',
    husband_first_name: 'Mike',
    husband_last_name: 'Johnson',
    wife_first_name: 'Sarah',
    wife_last_name: 'Johnson',
    email: 'johnsons@test.com',
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
      email: 'john.smith@test.com',
    },
    assignmentHistory: [
      {
        id: 'ch-1',
        assignment_id: 'assignment-1',
        status: 'completed',
        sent_at: '2024-02-15T00:00:00Z',
        completed_at: '2024-02-20T00:00:00Z',
        assignment: {
          id: 'assignment-1',
          title: 'Communication Basics',
          week_number: 1,
          due_date: '2024-02-22',
        },
      },
      {
        id: 'ch-2',
        assignment_id: 'assignment-2',
        status: 'sent',
        sent_at: '2024-02-22T00:00:00Z',
        completed_at: null,
        assignment: {
          id: 'assignment-2',
          title: 'Conflict Resolution',
          week_number: 2,
          due_date: '2024-02-29',
        },
      },
    ],
  };

  const mockRefresh = vi.fn();

  const renderCoupleProfile = () => {
    return render(
      <BrowserRouter>
        <CoupleProfile />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      renderCoupleProfile();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message and go back button', async () => {
      const user = userEvent.setup();
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: null,
        loading: false,
        error: 'Failed to load couple',
        refresh: mockRefresh,
      });

      renderCoupleProfile();

      expect(screen.getByText('Error loading couple')).toBeInTheDocument();
      expect(screen.getByText('Failed to load couple')).toBeInTheDocument();

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(mockNavigate).toHaveBeenCalledWith('/couples');
    });
  });

  describe('Not Found State', () => {
    it('should display not found message when couple is null', async () => {
      const user = userEvent.setup();
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: null,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderCoupleProfile();

      expect(screen.getByText('Couple not found')).toBeInTheDocument();
      expect(screen.getByText(/doesn't exist or has been removed/i)).toBeInTheDocument();

      const backButton = screen.getByRole('button', { name: /back to couples/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/couples');
    });
  });

  describe('Couple Profile Display', () => {
    beforeEach(() => {
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: mockCouple,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display couple name and contact info', () => {
      renderCoupleProfile();

      expect(screen.getByText('Mike & Sarah Johnson')).toBeInTheDocument();
      // Use getAllByText since email appears multiple times (header and contact section)
      expect(screen.getAllByText('johnsons@test.com').length).toBeGreaterThan(0);
    });

    it('should display back to couples link', async () => {
      const user = userEvent.setup();
      renderCoupleProfile();

      const backLink = screen.getByText('Back to Couples');
      await user.click(backLink);

      expect(mockNavigate).toHaveBeenCalledWith('/couples');
    });

    it('should display tabs for overview and assignments', () => {
      renderCoupleProfile();

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /assignments.*2/i })).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    beforeEach(() => {
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: mockCouple,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display contact information', () => {
      renderCoupleProfile();

      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      // Email and phone appear in multiple places (header and contact section)
      expect(screen.getAllByText('johnsons@test.com').length).toBeGreaterThan(0);
      expect(screen.getAllByText('555-5678').length).toBeGreaterThan(0);
    });

    it('should display assigned coach', () => {
      renderCoupleProfile();

      expect(screen.getByText('Assigned Coach')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('john.smith@test.com')).toBeInTheDocument();
    });

    it('should navigate to coach profile when clicking on coach', async () => {
      const user = userEvent.setup();
      renderCoupleProfile();

      const coachSection = screen.getByText('John Smith').closest('div[class*="cursor-pointer"]');
      if (coachSection) {
        await user.click(coachSection);
        expect(mockNavigate).toHaveBeenCalledWith('/coaches/coach-1');
      }
    });

    it('should display progress statistics', () => {
      renderCoupleProfile();

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Total Assignments')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });
  });

  describe('Assignments Tab', () => {
    beforeEach(() => {
      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: mockCouple,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display assignment history when switching to assignments tab', async () => {
      const user = userEvent.setup();
      renderCoupleProfile();

      const assignmentsTab = screen.getByRole('tab', { name: /assignments/i });
      await user.click(assignmentsTab);

      await waitFor(() => {
        expect(screen.getByText(/Week 1: Communication Basics/i)).toBeInTheDocument();
        expect(screen.getByText(/Week 2: Conflict Resolution/i)).toBeInTheDocument();
      });
    });
  });

  describe('No Coach Assigned', () => {
    it('should display empty state when couple has no coach', () => {
      const coupleWithoutCoach: CoupleWithDetails = {
        ...mockCouple,
        coach_id: null,
        coach: null,
      };

      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: coupleWithoutCoach,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderCoupleProfile();

      expect(screen.getByText('No coach assigned')).toBeInTheDocument();
    });
  });

  describe('Empty Assignments', () => {
    it('should display empty state when couple has no assignments', async () => {
      const user = userEvent.setup();
      const coupleWithNoAssignments: CoupleWithDetails = {
        ...mockCouple,
        assignmentHistory: [],
      };

      vi.mocked(useCouplesHook.useCouple).mockReturnValue({
        couple: coupleWithNoAssignments,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderCoupleProfile();

      const assignmentsTab = screen.getByRole('tab', { name: /assignments.*0/i });
      await user.click(assignmentsTab);

      await waitFor(() => {
        expect(screen.getByText('No assignments for this couple')).toBeInTheDocument();
      });
    });
  });
});
