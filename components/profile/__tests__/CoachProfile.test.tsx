import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CoachProfile } from '../CoachProfile';
import * as useCoachesHook from '../../../hooks/useCoaches';
import type { Coach } from '../../../types/database';

// Mock useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'coach-1' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock useCoach hook
vi.mock('../../../hooks/useCoaches', () => ({
  useCoach: vi.fn(),
}));

describe('CoachProfile', () => {
  const mockCoach: Coach = {
    id: 'coach-1',
    user_id: 'user-1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@test.com',
    phone: '555-1234',
    status: 'active',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  const mockCouples = [
    {
      id: 'couple-1',
      husband_first_name: 'Mike',
      husband_last_name: 'Johnson',
      wife_first_name: 'Sarah',
      email: 'johnsons@test.com',
      status: 'active',
    },
    {
      id: 'couple-2',
      husband_first_name: 'David',
      husband_last_name: 'Williams',
      wife_first_name: 'Emily',
      email: 'williams@test.com',
      status: 'completed',
    },
  ];

  const mockRefresh = vi.fn();

  const renderCoachProfile = () => {
    return render(
      <BrowserRouter>
        <CoachProfile />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: null,
        couples: [],
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      renderCoachProfile();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message and go back button', async () => {
      const user = userEvent.setup();
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: null,
        couples: [],
        loading: false,
        error: 'Failed to load coach',
        refresh: mockRefresh,
      });

      renderCoachProfile();

      expect(screen.getByText('Error loading coach')).toBeInTheDocument();
      expect(screen.getByText('Failed to load coach')).toBeInTheDocument();

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(mockNavigate).toHaveBeenCalledWith('/coaches');
    });
  });

  describe('Not Found State', () => {
    it('should display not found message when coach is null', async () => {
      const user = userEvent.setup();
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: null,
        couples: [],
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderCoachProfile();

      expect(screen.getByText('Coach not found')).toBeInTheDocument();
      expect(screen.getByText(/doesn't exist or has been removed/i)).toBeInTheDocument();

      const backButton = screen.getByRole('button', { name: /back to coaches/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/coaches');
    });
  });

  describe('Coach Profile Display', () => {
    beforeEach(() => {
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: mockCoach,
        couples: mockCouples,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display coach name and contact info', () => {
      renderCoachProfile();

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      // Email appears in multiple places (header and contact section)
      expect(screen.getAllByText('john.smith@test.com').length).toBeGreaterThan(0);
    });

    it('should display back to coaches link', async () => {
      const user = userEvent.setup();
      renderCoachProfile();

      const backLink = screen.getByText('Back to Coaches');
      await user.click(backLink);

      expect(mockNavigate).toHaveBeenCalledWith('/coaches');
    });

    it('should display tabs for overview and couples', () => {
      renderCoachProfile();

      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /assigned couples.*2/i })).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    beforeEach(() => {
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: mockCoach,
        couples: mockCouples,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display contact information', () => {
      renderCoachProfile();

      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      // Email and phone may appear in multiple places (header and contact section)
      expect(screen.getAllByText('john.smith@test.com').length).toBeGreaterThan(0);
      expect(screen.getAllByText('555-1234').length).toBeGreaterThan(0);
    });

    it('should display statistics', () => {
      renderCoachProfile();

      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total Couples')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total couples count
    });
  });

  describe('Couples Tab', () => {
    beforeEach(() => {
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: mockCoach,
        couples: mockCouples,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });
    });

    it('should display assigned couples when switching to couples tab', async () => {
      const user = userEvent.setup();
      renderCoachProfile();

      const couplesTab = screen.getByRole('tab', { name: /assigned couples/i });
      await user.click(couplesTab);

      await waitFor(() => {
        expect(screen.getByText(/Mike & Sarah Johnson/i)).toBeInTheDocument();
        expect(screen.getByText(/David & Emily Williams/i)).toBeInTheDocument();
      });
    });

    it('should navigate to couple profile when clicking on a couple', async () => {
      const user = userEvent.setup();
      renderCoachProfile();

      const couplesTab = screen.getByRole('tab', { name: /assigned couples/i });
      await user.click(couplesTab);

      await waitFor(() => {
        expect(screen.getByText(/Mike & Sarah Johnson/i)).toBeInTheDocument();
      });

      // Click on the first couple row
      const coupleRow = screen.getByText(/Mike & Sarah Johnson/i).closest('div[class*="cursor-pointer"]');
      if (coupleRow) {
        await user.click(coupleRow);
        expect(mockNavigate).toHaveBeenCalledWith('/couples/couple-1');
      }
    });
  });

  describe('Empty Couples', () => {
    it('should display empty state when coach has no couples', async () => {
      const user = userEvent.setup();
      vi.mocked(useCoachesHook.useCoach).mockReturnValue({
        coach: mockCoach,
        couples: [],
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      renderCoachProfile();

      const couplesTab = screen.getByRole('tab', { name: /assigned couples.*0/i });
      await user.click(couplesTab);

      await waitFor(() => {
        expect(screen.getByText('No couples assigned')).toBeInTheDocument();
      });
    });
  });
});
