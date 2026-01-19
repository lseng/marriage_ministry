import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCouples, useCoachOptions, useCouple } from '../useCouples';
import * as couplesService from '../../services/couples';
import type { Couple } from '../../types/database';
import type { CoupleWithDetails } from '../../services/couples';

// Mock couples service
vi.mock('../../services/couples', () => ({
  getCouplesWithCoach: vi.fn(),
  createCouple: vi.fn(),
  updateCouple: vi.fn(),
  deleteCouple: vi.fn(),
  assignCoach: vi.fn(),
  getCoachOptions: vi.fn(),
  getCoupleWithDetails: vi.fn(),
}));

describe('useCouples', () => {
  const mockCouple: Couple & { coach?: { first_name: string; last_name: string } | null } = {
    id: 'couple-1',
    user_id: 'user-1',
    husband_first_name: 'Bob',
    husband_last_name: 'Johnson',
    wife_first_name: 'Alice',
    wife_last_name: 'Johnson',
    email: 'johnson@example.com',
    phone: '555-1234',
    coach_id: 'coach-1',
    status: 'active',
    enrollment_date: '2024-01-01',
    wedding_date: '2020-06-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    coach: { first_name: 'John', last_name: 'Doe' },
  };

  const mockCouple2: Couple & { coach?: { first_name: string; last_name: string } | null } = {
    id: 'couple-2',
    user_id: 'user-2',
    husband_first_name: 'Tom',
    husband_last_name: 'Williams',
    wife_first_name: 'Sarah',
    wife_last_name: 'Williams',
    email: 'williams@example.com',
    phone: '555-5678',
    coach_id: null,
    status: 'active',
    enrollment_date: '2024-01-02',
    wedding_date: '2019-08-20',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    coach: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading state', () => {
    vi.mocked(couplesService.getCouplesWithCoach).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCouples());

    expect(result.current.loading).toBe(true);
    expect(result.current.couples).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return couples data when fetched successfully', async () => {
    vi.mocked(couplesService.getCouplesWithCoach).mockResolvedValue([mockCouple, mockCouple2]);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couples).toHaveLength(2);
    expect(result.current.couples[0]).toEqual(mockCouple);
    expect(result.current.couples[1]).toEqual(mockCouple2);
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(couplesService.getCouplesWithCoach).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couples).toEqual([]);
    expect(result.current.error).toBe('Database error');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(couplesService.getCouplesWithCoach).mockRejectedValue('String error');

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch couples');
  });

  it('should create couple and refresh list', async () => {
    const newCouple = { ...mockCouple, id: 'couple-new' };
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple])
      .mockResolvedValueOnce([mockCouple, newCouple]);
    vi.mocked(couplesService.createCouple).mockResolvedValue(newCouple);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData: couplesService.CreateCoupleData = {
      husband_first_name: 'New',
      husband_last_name: 'Husband',
      wife_first_name: 'New',
      wife_last_name: 'Wife',
      email: 'new@example.com',
    };

    await act(async () => {
      await result.current.createCouple(createData);
    });

    expect(couplesService.createCouple).toHaveBeenCalledWith(createData);
    expect(couplesService.getCouplesWithCoach).toHaveBeenCalledTimes(2);
  });

  it('should update couple and refresh list', async () => {
    const updatedCouple = { ...mockCouple, husband_first_name: 'Robert' };
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple])
      .mockResolvedValueOnce([updatedCouple]);
    vi.mocked(couplesService.updateCouple).mockResolvedValue(updatedCouple);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { husband_first_name: 'Robert' };

    await act(async () => {
      await result.current.updateCouple('couple-1', updateData);
    });

    expect(couplesService.updateCouple).toHaveBeenCalledWith('couple-1', updateData);
    expect(couplesService.getCouplesWithCoach).toHaveBeenCalledTimes(2);
  });

  it('should delete couple and refresh list', async () => {
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple, mockCouple2])
      .mockResolvedValueOnce([mockCouple2]);
    vi.mocked(couplesService.deleteCouple).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteCouple('couple-1');
    });

    expect(couplesService.deleteCouple).toHaveBeenCalledWith('couple-1');
    expect(couplesService.getCouplesWithCoach).toHaveBeenCalledTimes(2);
  });

  it('should assign coach to couple and refresh list', async () => {
    const assignedCouple = { ...mockCouple2, coach_id: 'coach-1' };
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple, mockCouple2])
      .mockResolvedValueOnce([mockCouple, assignedCouple]);
    vi.mocked(couplesService.assignCoach).mockResolvedValue(assignedCouple);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.assignCoach('couple-2', 'coach-1');
    });

    expect(couplesService.assignCoach).toHaveBeenCalledWith('couple-2', 'coach-1');
    expect(couplesService.getCouplesWithCoach).toHaveBeenCalledTimes(2);
  });

  it('should unassign coach from couple', async () => {
    const unassignedCouple = { ...mockCouple, coach_id: null };
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple])
      .mockResolvedValueOnce([unassignedCouple]);
    vi.mocked(couplesService.assignCoach).mockResolvedValue(unassignedCouple);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.assignCoach('couple-1', null);
    });

    expect(couplesService.assignCoach).toHaveBeenCalledWith('couple-1', null);
  });

  it('should refresh couples when refresh is called', async () => {
    vi.mocked(couplesService.getCouplesWithCoach)
      .mockResolvedValueOnce([mockCouple])
      .mockResolvedValueOnce([mockCouple, mockCouple2]);

    const { result } = renderHook(() => useCouples());

    await waitFor(() => {
      expect(result.current.couples).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.couples).toHaveLength(2);
    });

    expect(couplesService.getCouplesWithCoach).toHaveBeenCalledTimes(2);
  });
});

describe('useCoachOptions', () => {
  const mockCoachOptions = [
    { id: 'coach-1', name: 'John Doe' },
    { id: 'coach-2', name: 'Jane Smith' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading state', () => {
    vi.mocked(couplesService.getCoachOptions).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCoachOptions());

    expect(result.current.loading).toBe(true);
    expect(result.current.coaches).toEqual([]);
  });

  it('should return coach options when fetched successfully', async () => {
    vi.mocked(couplesService.getCoachOptions).mockResolvedValue(mockCoachOptions);

    const { result } = renderHook(() => useCoachOptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coaches).toEqual(mockCoachOptions);
  });

  it('should handle fetch error gracefully', async () => {
    // Mock console.error to suppress error output in test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(couplesService.getCoachOptions).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCoachOptions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coaches).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('useCouple', () => {
  const mockCoupleWithDetails: CoupleWithDetails = {
    id: 'couple-1',
    user_id: 'user-1',
    husband_first_name: 'Bob',
    husband_last_name: 'Johnson',
    wife_first_name: 'Alice',
    wife_last_name: 'Johnson',
    email: 'johnson@example.com',
    phone: '555-1234',
    coach_id: 'coach-1',
    status: 'active',
    enrollment_date: '2024-01-01',
    wedding_date: '2020-06-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    coach: {
      id: 'coach-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    },
    assignmentHistory: [
      {
        id: 'status-1',
        assignment_id: 'assignment-1',
        status: 'completed',
        sent_at: '2024-01-15T00:00:00Z',
        completed_at: '2024-01-20T00:00:00Z',
        assignment: {
          id: 'assignment-1',
          title: 'Week 1: Communication',
          week_number: 1,
          due_date: '2024-01-22',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when id is null', async () => {
    const { result } = renderHook(() => useCouple(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couple).toBeNull();
    expect(result.current.error).toBeNull();
    expect(couplesService.getCoupleWithDetails).not.toHaveBeenCalled();
  });

  it('should start with loading state', () => {
    vi.mocked(couplesService.getCoupleWithDetails).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCouple('couple-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.couple).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return couple with details when fetched successfully', async () => {
    vi.mocked(couplesService.getCoupleWithDetails).mockResolvedValue(mockCoupleWithDetails);

    const { result } = renderHook(() => useCouple('couple-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couple).toEqual(mockCoupleWithDetails);
    expect(result.current.error).toBeNull();
  });

  it('should return null when couple not found', async () => {
    vi.mocked(couplesService.getCoupleWithDetails).mockResolvedValue(null);

    const { result } = renderHook(() => useCouple('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couple).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(couplesService.getCoupleWithDetails).mockRejectedValue(
      new Error('Couple not found')
    );

    const { result } = renderHook(() => useCouple('couple-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.couple).toBeNull();
    expect(result.current.error).toBe('Couple not found');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(couplesService.getCoupleWithDetails).mockRejectedValue('String error');

    const { result } = renderHook(() => useCouple('couple-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch couple');
  });

  it('should refresh couple when refresh is called', async () => {
    const updatedCouple: CoupleWithDetails = {
      ...mockCoupleWithDetails,
      assignmentHistory: [
        ...mockCoupleWithDetails.assignmentHistory,
        {
          id: 'status-2',
          assignment_id: 'assignment-2',
          status: 'pending',
          sent_at: '2024-01-25T00:00:00Z',
          completed_at: null,
          assignment: {
            id: 'assignment-2',
            title: 'Week 2: Conflict Resolution',
            week_number: 2,
            due_date: '2024-01-29',
          },
        },
      ],
    };

    vi.mocked(couplesService.getCoupleWithDetails)
      .mockResolvedValueOnce(mockCoupleWithDetails)
      .mockResolvedValueOnce(updatedCouple);

    const { result } = renderHook(() => useCouple('couple-1'));

    await waitFor(() => {
      expect(result.current.couple?.assignmentHistory).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.couple?.assignmentHistory).toHaveLength(2);
    });

    expect(couplesService.getCoupleWithDetails).toHaveBeenCalledTimes(2);
  });

  it('should refetch when id changes', async () => {
    const mockCouple2: CoupleWithDetails = {
      ...mockCoupleWithDetails,
      id: 'couple-2',
      husband_first_name: 'Tom',
    };

    vi.mocked(couplesService.getCoupleWithDetails)
      .mockResolvedValueOnce(mockCoupleWithDetails)
      .mockResolvedValueOnce(mockCouple2);

    const { result, rerender } = renderHook(
      ({ id }) => useCouple(id),
      { initialProps: { id: 'couple-1' } }
    );

    await waitFor(() => {
      expect(result.current.couple?.husband_first_name).toBe('Bob');
    });

    rerender({ id: 'couple-2' });

    await waitFor(() => {
      expect(result.current.couple?.husband_first_name).toBe('Tom');
    });

    expect(couplesService.getCoupleWithDetails).toHaveBeenCalledTimes(2);
    expect(couplesService.getCoupleWithDetails).toHaveBeenNthCalledWith(1, 'couple-1');
    expect(couplesService.getCoupleWithDetails).toHaveBeenNthCalledWith(2, 'couple-2');
  });
});
