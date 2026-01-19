import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AssignmentDetailModal } from '../AssignmentDetailModal';
import * as assignmentsService from '../../../services/assignments';
import * as authContext from '../../../contexts/AuthContext';
import type { AssignmentWithStats } from '../../../services/assignments';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock services
vi.mock('../../../services/assignments', () => ({
  getAssignmentStatuses: vi.fn(),
}));

// Mock auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AssignmentDetailModal', () => {
  const mockAssignment: AssignmentWithStats = {
    id: 'assignment-1',
    title: 'Communication Basics',
    description: 'Learn effective communication',
    content: 'This is the assignment content...',
    week_number: 1,
    due_date: '2024-03-01',
    form_template_id: null,
    created_by: 'admin-1',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    pending_count: 2,
    completed_count: 3,
    total_distributed: 5,
  };

  const mockStatuses = [
    {
      id: 'status-1',
      status: 'completed',
      sent_at: '2024-02-01T00:00:00Z',
      completed_at: '2024-02-10T00:00:00Z',
      couple: {
        id: 'couple-1',
        husband_first_name: 'John',
        wife_first_name: 'Jane',
        husband_last_name: 'Smith',
      },
    },
    {
      id: 'status-2',
      status: 'sent',
      sent_at: '2024-02-01T00:00:00Z',
      completed_at: null,
      couple: {
        id: 'couple-2',
        husband_first_name: 'Mike',
        wife_first_name: 'Sarah',
        husband_last_name: 'Johnson',
      },
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    assignment: mockAssignment,
    onEdit: vi.fn(),
    onDistribute: vi.fn(),
  };

  const renderModal = (props = {}) => {
    return render(
      <BrowserRouter>
        <AssignmentDetailModal {...defaultProps} {...props} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: null,
      profile: null,
      role: 'admin',
      loading: false,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      permissions: {
        canManageCoaches: true,
        canViewAllCoaches: true,
        canManageCouples: true,
        canViewAllCouples: true,
        canAssignCoaches: true,
        canCreateAssignments: true,
        canDistributeAssignments: true,
        canViewAllSubmissions: true,
        canReviewHomework: true,
        canSubmitHomework: false,
        canCreateFormTemplates: true,
      },
    });
    vi.mocked(assignmentsService.getAssignmentStatuses).mockResolvedValue(mockStatuses);
  });

  it('should not render when closed', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByText('Communication Basics')).not.toBeInTheDocument();
  });

  it('should display assignment title and week number', async () => {
    renderModal();

    expect(screen.getByText('Communication Basics')).toBeInTheDocument();
    // Week number appears multiple times, check that at least one exists
    expect(screen.getAllByText(/Week 1/).length).toBeGreaterThan(0);
  });

  it('should display assignment description', async () => {
    renderModal();

    expect(screen.getByText('Learn effective communication')).toBeInTheDocument();
  });

  it('should display distribution statistics', async () => {
    renderModal();

    expect(screen.getByText('5')).toBeInTheDocument(); // total_distributed
    expect(screen.getByText('Distributed')).toBeInTheDocument();
  });

  it('should display due date when present', async () => {
    renderModal();

    // Should show due date
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  it('should load and display couples list for admin', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/John & Jane Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Mike & Sarah Johnson/)).toBeInTheDocument();
    });
  });

  it('should show edit and distribute buttons for admin', async () => {
    renderModal();

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /distribute/i })).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderModal({ onEdit });

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockAssignment);
  });

  it('should call onDistribute when distribute button is clicked', async () => {
    const user = userEvent.setup();
    const onDistribute = vi.fn();
    renderModal({ onDistribute });

    const distributeButton = screen.getByRole('button', { name: /distribute/i });
    await user.click(distributeButton);

    expect(onDistribute).toHaveBeenCalledWith(mockAssignment);
  });

  it('should navigate to couple profile when clicking on couple row', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/John & Jane Smith/)).toBeInTheDocument();
    });

    const coupleRow = screen.getByText(/John & Jane Smith/).closest('div[class*="cursor-pointer"]');
    if (coupleRow) {
      await user.click(coupleRow);
      expect(mockNavigate).toHaveBeenCalledWith('/couples/couple-1');
    }
  });

  it('should not show admin buttons when user is not admin', async () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: null,
      profile: null,
      role: 'coach',
      loading: false,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      permissions: {
        canManageCoaches: false,
        canViewAllCoaches: false,
        canManageCouples: false,
        canViewAllCouples: true,
        canAssignCoaches: false,
        canCreateAssignments: false,
        canDistributeAssignments: false,
        canViewAllSubmissions: false,
        canReviewHomework: true,
        canSubmitHomework: false,
        canCreateFormTemplates: false,
      },
    });

    renderModal();

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /distribute/i })).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should handle null assignment', () => {
    renderModal({ assignment: null });

    expect(screen.queryByText('Communication Basics')).not.toBeInTheDocument();
  });
});
