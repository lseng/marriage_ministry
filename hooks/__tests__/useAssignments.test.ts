import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAssignments } from '../useAssignments';
import * as assignmentsService from '../../services/assignments';
import { useAuth } from '../../contexts/AuthContext';
import type { Assignment } from '../../types/database';
import type { User } from '@supabase/supabase-js';

// Mock assignments service
vi.mock('../../services/assignments', () => ({
  getAssignments: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  distributeAssignment: vi.fn(),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Default permissions for testing (admin role)
const defaultPermissions = {
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
};

describe('useAssignments', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockAssignment: assignmentsService.AssignmentWithStats = {
    id: 'assignment-1',
    title: 'Week 1: Communication Basics',
    description: 'Learn the fundamentals of healthy communication',
    content: 'Assignment content here',
    week_number: 1,
    due_date: '2024-01-22',
    form_template_id: null,
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pending_count: 5,
    completed_count: 3,
    total_distributed: 8,
  };

  const mockAssignment2: assignmentsService.AssignmentWithStats = {
    id: 'assignment-2',
    title: 'Week 2: Conflict Resolution',
    description: 'Strategies for resolving conflicts constructively',
    content: 'More assignment content',
    week_number: 2,
    due_date: '2024-01-29',
    form_template_id: null,
    created_by: 'user-1',
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    pending_count: 2,
    completed_count: 0,
    total_distributed: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      profile: null,
      role: 'admin',
      permissions: defaultPermissions,
      loading: false,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('should start with loading state', () => {
    vi.mocked(assignmentsService.getAssignments).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useAssignments());

    expect(result.current.loading).toBe(true);
    expect(result.current.assignments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return assignments data when fetched successfully', async () => {
    vi.mocked(assignmentsService.getAssignments).mockResolvedValue([mockAssignment, mockAssignment2]);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assignments).toHaveLength(2);
    expect(result.current.assignments[0]).toEqual(mockAssignment);
    expect(result.current.assignments[1]).toEqual(mockAssignment2);
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(assignmentsService.getAssignments).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assignments).toEqual([]);
    expect(result.current.error).toBe('Database error');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(assignmentsService.getAssignments).mockRejectedValue('String error');

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch assignments');
  });

  it('should create assignment and refresh list', async () => {
    const newAssignment: Assignment = {
      id: 'assignment-new',
      title: 'Week 3: Building Trust',
      description: 'Developing trust in relationships',
      content: 'New assignment content',
      week_number: 3,
      due_date: '2024-02-05',
      form_template_id: null,
      created_by: 'user-1',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };

    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment, mockAssignment2])
      .mockResolvedValueOnce([mockAssignment, mockAssignment2, { ...newAssignment, pending_count: 0, completed_count: 0, total_distributed: 0 }]);
    vi.mocked(assignmentsService.createAssignment).mockResolvedValue(newAssignment);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData: assignmentsService.CreateAssignmentData = {
      title: 'Week 3: Building Trust',
      description: 'Developing trust in relationships',
      content: 'New assignment content',
      week_number: 3,
      due_date: '2024-02-05',
    };

    await act(async () => {
      await result.current.createAssignment(createData);
    });

    expect(assignmentsService.createAssignment).toHaveBeenCalledWith(createData, 'user-1');
    expect(assignmentsService.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should throw error when creating assignment without authenticated user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      role: null,
      permissions: defaultPermissions,
      loading: false,
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(assignmentsService.getAssignments).mockResolvedValue([mockAssignment]);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData: assignmentsService.CreateAssignmentData = {
      title: 'New Assignment',
      content: 'Content',
      week_number: 3,
    };

    await expect(
      act(async () => {
        await result.current.createAssignment(createData);
      })
    ).rejects.toThrow('User not authenticated');
  });

  it('should update assignment and refresh list', async () => {
    const updatedAssignment: Assignment = { ...mockAssignment, title: 'Updated Title' };
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment])
      .mockResolvedValueOnce([{ ...updatedAssignment, pending_count: 5, completed_count: 3, total_distributed: 8 }]);
    vi.mocked(assignmentsService.updateAssignment).mockResolvedValue(updatedAssignment);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData: assignmentsService.UpdateAssignmentData = { title: 'Updated Title' };

    await act(async () => {
      await result.current.updateAssignment('assignment-1', updateData);
    });

    expect(assignmentsService.updateAssignment).toHaveBeenCalledWith('assignment-1', updateData);
    expect(assignmentsService.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should delete assignment and refresh list', async () => {
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment, mockAssignment2])
      .mockResolvedValueOnce([mockAssignment2]);
    vi.mocked(assignmentsService.deleteAssignment).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteAssignment('assignment-1');
    });

    expect(assignmentsService.deleteAssignment).toHaveBeenCalledWith('assignment-1');
    expect(assignmentsService.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should distribute assignment to all couples and refresh list', async () => {
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment])
      .mockResolvedValueOnce([{ ...mockAssignment, pending_count: 10, total_distributed: 13 }]);
    vi.mocked(assignmentsService.distributeAssignment).mockResolvedValue(5);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const distributeOptions: assignmentsService.DistributeOptions = {
      assignmentId: 'assignment-1',
      target: 'all',
    };

    let distributedCount: number = 0;
    await act(async () => {
      distributedCount = await result.current.distributeAssignment(distributeOptions);
    });

    expect(distributedCount).toBe(5);
    expect(assignmentsService.distributeAssignment).toHaveBeenCalledWith(distributeOptions);
    expect(assignmentsService.getAssignments).toHaveBeenCalledTimes(2);
  });

  it('should distribute assignment to specific coach couples', async () => {
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment])
      .mockResolvedValueOnce([{ ...mockAssignment, pending_count: 8, total_distributed: 11 }]);
    vi.mocked(assignmentsService.distributeAssignment).mockResolvedValue(3);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const distributeOptions: assignmentsService.DistributeOptions = {
      assignmentId: 'assignment-1',
      target: 'coach',
      coachId: 'coach-1',
    };

    let distributedCount: number = 0;
    await act(async () => {
      distributedCount = await result.current.distributeAssignment(distributeOptions);
    });

    expect(distributedCount).toBe(3);
    expect(assignmentsService.distributeAssignment).toHaveBeenCalledWith(distributeOptions);
  });

  it('should distribute assignment to specific couples', async () => {
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment])
      .mockResolvedValueOnce([{ ...mockAssignment, pending_count: 7, total_distributed: 10 }]);
    vi.mocked(assignmentsService.distributeAssignment).mockResolvedValue(2);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const distributeOptions: assignmentsService.DistributeOptions = {
      assignmentId: 'assignment-1',
      target: 'specific',
      coupleIds: ['couple-1', 'couple-2'],
    };

    let distributedCount: number = 0;
    await act(async () => {
      distributedCount = await result.current.distributeAssignment(distributeOptions);
    });

    expect(distributedCount).toBe(2);
    expect(assignmentsService.distributeAssignment).toHaveBeenCalledWith(distributeOptions);
  });

  it('should refresh assignments when refresh is called', async () => {
    vi.mocked(assignmentsService.getAssignments)
      .mockResolvedValueOnce([mockAssignment])
      .mockResolvedValueOnce([mockAssignment, mockAssignment2]);

    const { result } = renderHook(() => useAssignments());

    await waitFor(() => {
      expect(result.current.assignments).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.assignments).toHaveLength(2);
    });

    expect(assignmentsService.getAssignments).toHaveBeenCalledTimes(2);
  });
});
