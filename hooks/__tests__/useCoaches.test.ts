import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCoaches, useCoach } from '../useCoaches';
import * as coachesService from '../../services/coaches';
import type { Coach } from '../../types/database';

// Mock coaches service
vi.mock('../../services/coaches', () => ({
  getCoaches: vi.fn(),
  getCoachWithCouples: vi.fn(),
  getCoachAssignedCouplesCount: vi.fn(),
  createCoach: vi.fn(),
  updateCoach: vi.fn(),
  deleteCoach: vi.fn(),
}));

describe('useCoaches', () => {
  const mockCoach: Coach = {
    id: 'coach-1',
    user_id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCoach2: Coach = {
    id: 'coach-2',
    user_id: 'user-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '555-5678',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with loading state', () => {
    vi.mocked(coachesService.getCoaches).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(coachesService.getCoachAssignedCouplesCount).mockResolvedValue(0);

    const { result } = renderHook(() => useCoaches());

    expect(result.current.loading).toBe(true);
    expect(result.current.coaches).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return coaches data when fetched successfully', async () => {
    vi.mocked(coachesService.getCoaches).mockResolvedValue([mockCoach, mockCoach2]);
    vi.mocked(coachesService.getCoachAssignedCouplesCount)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coaches).toHaveLength(2);
    expect(result.current.coaches[0]).toEqual({ ...mockCoach, assigned_couples_count: 3 });
    expect(result.current.coaches[1]).toEqual({ ...mockCoach2, assigned_couples_count: 5 });
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(coachesService.getCoaches).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coaches).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(coachesService.getCoaches).mockRejectedValue('Some string error');

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch coaches');
  });

  it('should create coach and refresh list', async () => {
    const newCoach: Coach = { ...mockCoach, id: 'coach-new' };
    vi.mocked(coachesService.getCoaches)
      .mockResolvedValueOnce([mockCoach])
      .mockResolvedValueOnce([mockCoach, newCoach]);
    vi.mocked(coachesService.getCoachAssignedCouplesCount).mockResolvedValue(0);
    vi.mocked(coachesService.createCoach).mockResolvedValue(newCoach);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData = {
      first_name: 'New',
      last_name: 'Coach',
      email: 'new@example.com',
    };

    await act(async () => {
      await result.current.createCoach(createData);
    });

    expect(coachesService.createCoach).toHaveBeenCalledWith(createData);
    expect(coachesService.getCoaches).toHaveBeenCalledTimes(2);
  });

  it('should update coach and refresh list', async () => {
    const updatedCoach: Coach = { ...mockCoach, first_name: 'Updated' };
    vi.mocked(coachesService.getCoaches)
      .mockResolvedValueOnce([mockCoach])
      .mockResolvedValueOnce([updatedCoach]);
    vi.mocked(coachesService.getCoachAssignedCouplesCount).mockResolvedValue(0);
    vi.mocked(coachesService.updateCoach).mockResolvedValue(updatedCoach);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { first_name: 'Updated' };

    await act(async () => {
      await result.current.updateCoach('coach-1', updateData);
    });

    expect(coachesService.updateCoach).toHaveBeenCalledWith('coach-1', updateData);
    expect(coachesService.getCoaches).toHaveBeenCalledTimes(2);
  });

  it('should delete coach and refresh list', async () => {
    vi.mocked(coachesService.getCoaches)
      .mockResolvedValueOnce([mockCoach, mockCoach2])
      .mockResolvedValueOnce([mockCoach2]);
    vi.mocked(coachesService.getCoachAssignedCouplesCount).mockResolvedValue(0);
    vi.mocked(coachesService.deleteCoach).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteCoach('coach-1');
    });

    expect(coachesService.deleteCoach).toHaveBeenCalledWith('coach-1');
    expect(coachesService.getCoaches).toHaveBeenCalledTimes(2);
  });

  it('should refresh coaches when refresh is called', async () => {
    vi.mocked(coachesService.getCoaches)
      .mockResolvedValueOnce([mockCoach])
      .mockResolvedValueOnce([mockCoach, mockCoach2]);
    vi.mocked(coachesService.getCoachAssignedCouplesCount).mockResolvedValue(0);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.coaches).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.coaches).toHaveLength(2);
    });

    expect(coachesService.getCoaches).toHaveBeenCalledTimes(2);
  });
});

describe('useCoach', () => {
  const mockCoach: Coach = {
    id: 'coach-1',
    user_id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCouples = [
    {
      id: 'couple-1',
      husband_first_name: 'Bob',
      wife_first_name: 'Alice',
      husband_last_name: 'Johnson',
      email: 'johnson@example.com',
      status: 'active',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when id is null', async () => {
    const { result } = renderHook(() => useCoach(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coach).toBeNull();
    expect(result.current.couples).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(coachesService.getCoachWithCouples).not.toHaveBeenCalled();
  });

  it('should start with loading state', () => {
    vi.mocked(coachesService.getCoachWithCouples).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCoach('coach-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.coach).toBeNull();
    expect(result.current.couples).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return coach with couples when fetched successfully', async () => {
    vi.mocked(coachesService.getCoachWithCouples).mockResolvedValue({
      coach: mockCoach,
      couples: mockCouples,
    });

    const { result } = renderHook(() => useCoach('coach-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coach).toEqual(mockCoach);
    expect(result.current.couples).toEqual(mockCouples);
    expect(result.current.error).toBeNull();
  });

  it('should return null when coach not found', async () => {
    vi.mocked(coachesService.getCoachWithCouples).mockResolvedValue(null);

    const { result } = renderHook(() => useCoach('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coach).toBeNull();
    expect(result.current.couples).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    vi.mocked(coachesService.getCoachWithCouples).mockRejectedValue(
      new Error('Coach not found')
    );

    const { result } = renderHook(() => useCoach('coach-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coach).toBeNull();
    expect(result.current.error).toBe('Coach not found');
  });

  it('should return generic error for non-Error thrown values', async () => {
    vi.mocked(coachesService.getCoachWithCouples).mockRejectedValue('String error');

    const { result } = renderHook(() => useCoach('coach-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch coach');
  });

  it('should refresh coach when refresh is called', async () => {
    const updatedCouples = [...mockCouples, {
      id: 'couple-2',
      husband_first_name: 'Tom',
      wife_first_name: 'Sarah',
      husband_last_name: 'Williams',
      email: 'williams@example.com',
      status: 'active',
    }];

    vi.mocked(coachesService.getCoachWithCouples)
      .mockResolvedValueOnce({ coach: mockCoach, couples: mockCouples })
      .mockResolvedValueOnce({ coach: mockCoach, couples: updatedCouples });

    const { result } = renderHook(() => useCoach('coach-1'));

    await waitFor(() => {
      expect(result.current.couples).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.couples).toHaveLength(2);
    });

    expect(coachesService.getCoachWithCouples).toHaveBeenCalledTimes(2);
  });

  it('should refetch when id changes', async () => {
    const mockCoach2: Coach = { ...mockCoach, id: 'coach-2', first_name: 'Jane' };

    vi.mocked(coachesService.getCoachWithCouples)
      .mockResolvedValueOnce({ coach: mockCoach, couples: mockCouples })
      .mockResolvedValueOnce({ coach: mockCoach2, couples: [] });

    const { result, rerender } = renderHook(
      ({ id }) => useCoach(id),
      { initialProps: { id: 'coach-1' } }
    );

    await waitFor(() => {
      expect(result.current.coach?.first_name).toBe('John');
    });

    rerender({ id: 'coach-2' });

    await waitFor(() => {
      expect(result.current.coach?.first_name).toBe('Jane');
    });

    expect(coachesService.getCoachWithCouples).toHaveBeenCalledTimes(2);
    expect(coachesService.getCoachWithCouples).toHaveBeenNthCalledWith(1, 'coach-1');
    expect(coachesService.getCoachWithCouples).toHaveBeenNthCalledWith(2, 'coach-2');
  });
});
