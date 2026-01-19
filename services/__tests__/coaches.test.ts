import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCoaches,
  getCoach,
  getCoachWithCouples,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoachAssignedCouplesCount,
} from '../coaches';
import { supabase } from '../../lib/supabase';
import type { Coach } from '../../types/database';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('coaches service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCoach: Coach = {
    id: 'coach-123',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getCoaches', () => {
    it('should return all coaches ordered by last name', async () => {
      const mockCoaches = [mockCoach];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCoaches,
            error: null,
          }),
        }),
      } as never);

      const result = await getCoaches();

      expect(supabase.from).toHaveBeenCalledWith('coaches');
      expect(result).toEqual(mockCoaches);
    });

    it('should return empty array when no coaches exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getCoaches();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      } as never);

      await expect(getCoaches()).rejects.toEqual(mockError);
    });
  });

  describe('getCoach', () => {
    it('should return a coach by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCoach,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getCoach('coach-123');

      expect(supabase.from).toHaveBeenCalledWith('coaches');
      expect(result).toEqual(mockCoach);
    });

    it('should return null when coach is not found (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      } as never);

      const result = await getCoach('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error when query fails with non-PGRST116 error', async () => {
      const mockError = { code: 'OTHER', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(getCoach('coach-123')).rejects.toEqual(mockError);
    });
  });

  describe('getCoachWithCouples', () => {
    const mockCouples = [
      {
        id: 'couple-1',
        husband_first_name: 'Bob',
        wife_first_name: 'Alice',
        husband_last_name: 'Smith',
        email: 'bobandalice@example.com',
        status: 'active',
      },
      {
        id: 'couple-2',
        husband_first_name: 'Tom',
        wife_first_name: 'Jane',
        husband_last_name: 'Johnson',
        email: 'tomandjane@example.com',
        status: 'active',
      },
    ];

    it('should return coach with their assigned couples', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockCouples,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoachWithCouples('coach-123');

      expect(result).toEqual({
        coach: mockCoach,
        couples: mockCouples,
      });
    });

    it('should return coach with empty couples array when no couples assigned', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoachWithCouples('coach-123');

      expect(result).toEqual({
        coach: mockCoach,
        couples: [],
      });
    });

    it('should return null when coach is not found (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      } as never);

      const result = await getCoachWithCouples('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error when coach query fails with non-PGRST116 error', async () => {
      const mockError = { code: 'OTHER', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(getCoachWithCouples('coach-123')).rejects.toEqual(mockError);
    });

    it('should throw error when couples query fails', async () => {
      const mockError = { message: 'Couples query error' };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'coaches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      await expect(getCoachWithCouples('coach-123')).rejects.toEqual(mockError);
    });
  });

  describe('createCoach', () => {
    const createData = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1987654321',
      user_id: 'user-456',
    };

    it('should create a new coach with all fields', async () => {
      const createdCoach = {
        ...mockCoach,
        id: 'new-coach-id',
        ...createData,
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdCoach,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await createCoach(createData);

      expect(supabase.from).toHaveBeenCalledWith('coaches');
      expect(result).toEqual(createdCoach);
    });

    it('should create a coach with optional fields as null', async () => {
      const minimalData = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
      };

      const createdCoach = {
        ...mockCoach,
        id: 'new-coach-id',
        first_name: minimalData.first_name,
        last_name: minimalData.last_name,
        email: minimalData.email,
        phone: null,
        user_id: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCoach,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createCoach(minimalData);

      expect(mockInsert).toHaveBeenCalledWith({
        first_name: minimalData.first_name,
        last_name: minimalData.last_name,
        email: minimalData.email,
        phone: null,
        user_id: null,
        status: 'active',
      });
      expect(result).toEqual(createdCoach);
    });

    it('should throw error when insert fails', async () => {
      const mockError = { message: 'Insert failed' };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(createCoach(createData)).rejects.toEqual(mockError);
    });
  });

  describe('updateCoach', () => {
    const updateData = {
      first_name: 'John',
      last_name: 'Updated',
      email: 'john.updated@example.com',
      phone: '+1111111111',
      status: 'inactive' as const,
    };

    it('should update coach and return updated data', async () => {
      const updatedCoach = {
        ...mockCoach,
        ...updateData,
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCoach,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await updateCoach('coach-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('coaches');
      expect(result).toEqual(updatedCoach);
    });

    it('should update only specified fields', async () => {
      const partialUpdate = { status: 'inactive' as const };
      const updatedCoach = {
        ...mockCoach,
        status: 'inactive' as const,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedCoach,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateCoach('coach-123', partialUpdate);

      expect(mockUpdate).toHaveBeenCalledWith(partialUpdate);
      expect(result).toEqual(updatedCoach);
    });

    it('should throw error when update fails', async () => {
      const mockError = { message: 'Update failed' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      } as never);

      await expect(updateCoach('coach-123', updateData)).rejects.toEqual(mockError);
    });
  });

  describe('deleteCoach', () => {
    it('should unassign couples and delete coach', async () => {
      const mockUnassign = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            update: vi.fn().mockReturnValue({
              eq: mockUnassign,
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDelete,
            }),
          } as never;
        }
        return {} as never;
      });

      await deleteCoach('coach-123');

      expect(mockUnassign).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw error when unassign fails', async () => {
      const mockError = { message: 'Unassign failed' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: mockError }),
        }),
      } as never);

      await expect(deleteCoach('coach-123')).rejects.toEqual(mockError);
    });

    it('should throw error when delete fails', async () => {
      const mockError = { message: 'Delete failed' };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as never;
        }
        if (table === 'coaches') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: mockError }),
            }),
          } as never;
        }
        return {} as never;
      });

      await expect(deleteCoach('coach-123')).rejects.toEqual(mockError);
    });
  });

  describe('getCoachAssignedCouplesCount', () => {
    it('should return count of assigned couples', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      } as never);

      const result = await getCoachAssignedCouplesCount('coach-123');

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toBe(5);
    });

    it('should return 0 when count is null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getCoachAssignedCouplesCount('coach-123');

      expect(result).toBe(0);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Count query failed' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: null,
            error: mockError,
          }),
        }),
      } as never);

      await expect(getCoachAssignedCouplesCount('coach-123')).rejects.toEqual(mockError);
    });
  });
});
