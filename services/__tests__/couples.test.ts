import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCouples,
  getCouplesWithCoach,
  getCouple,
  getCoupleWithDetails,
  createCouple,
  updateCouple,
  deleteCouple,
  assignCoach,
  getCoachOptions,
} from '../couples';
import { supabase } from '../../lib/supabase';
import type { Couple } from '../../types/database';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('couples service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCouple: Couple = {
    id: 'couple-123',
    user_id: 'user-123',
    husband_first_name: 'John',
    husband_last_name: 'Smith',
    wife_first_name: 'Jane',
    wife_last_name: 'Smith',
    email: 'johnandjane@example.com',
    phone: '+1234567890',
    coach_id: 'coach-123',
    status: 'active',
    wedding_date: '2024-06-15',
    enrollment_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getCouples', () => {
    it('should return all couples ordered by enrollment date descending', async () => {
      const mockCouples = [mockCouple];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCouples,
            error: null,
          }),
        }),
      } as never);

      const result = await getCouples();

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toEqual(mockCouples);
    });

    it('should return empty array when no couples exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getCouples();

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

      await expect(getCouples()).rejects.toEqual(mockError);
    });
  });

  describe('getCouplesWithCoach', () => {
    const mockCoach = {
      first_name: 'Bob',
      last_name: 'Coach',
    };

    it('should return couples with coach info when coach is assigned', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockCouple],
                error: null,
              }),
            }),
          } as never;
        }
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
        return {} as never;
      });

      const result = await getCouplesWithCoach();

      expect(result).toEqual([
        {
          ...mockCouple,
          coach: mockCoach,
        },
      ]);
    });

    it('should return couples with null coach when no coach is assigned', async () => {
      const coupleWithoutCoach = { ...mockCouple, coach_id: null };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [coupleWithoutCoach],
            error: null,
          }),
        }),
      } as never);

      const result = await getCouplesWithCoach();

      expect(result).toEqual([
        {
          ...coupleWithoutCoach,
          coach: null,
        },
      ]);
    });

    it('should return empty array when no couples exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getCouplesWithCoach();

      expect(result).toEqual([]);
    });

    it('should throw error when couples query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      } as never);

      await expect(getCouplesWithCoach()).rejects.toEqual(mockError);
    });
  });

  describe('getCouple', () => {
    it('should return a couple by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCouple,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getCouple('couple-123');

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toEqual(mockCouple);
    });

    it('should return null when couple is not found (PGRST116)', async () => {
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

      const result = await getCouple('nonexistent-id');

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

      await expect(getCouple('couple-123')).rejects.toEqual(mockError);
    });
  });

  describe('getCoupleWithDetails', () => {
    const mockCoach = {
      id: 'coach-123',
      first_name: 'Bob',
      last_name: 'Coach',
      email: 'bob.coach@example.com',
    };

    const mockStatuses = [
      {
        id: 'status-1',
        assignment_id: 'assignment-1',
        status: 'completed',
        sent_at: '2024-01-15T00:00:00Z',
        completed_at: '2024-01-20T00:00:00Z',
      },
      {
        id: 'status-2',
        assignment_id: 'assignment-2',
        status: 'pending',
        sent_at: '2024-01-22T00:00:00Z',
        completed_at: null,
      },
    ];

    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Week 1: Communication',
        week_number: 1,
        due_date: '2024-01-21',
      },
      {
        id: 'assignment-2',
        title: 'Week 2: Conflict Resolution',
        week_number: 2,
        due_date: '2024-01-28',
      },
    ];

    it('should return couple with coach and assignment history', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
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
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockStatuses,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  const assignment = mockAssignments[callCount++];
                  return Promise.resolve({
                    data: assignment,
                    error: null,
                  });
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoupleWithDetails('couple-123');

      expect(result).toEqual({
        ...mockCouple,
        coach: mockCoach,
        assignmentHistory: [
          {
            ...mockStatuses[0],
            assignment: mockAssignments[0],
          },
          {
            ...mockStatuses[1],
            assignment: mockAssignments[1],
          },
        ],
      });
    });

    it('should return couple with null coach when no coach is assigned', async () => {
      const coupleWithoutCoach = { ...mockCouple, coach_id: null };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: coupleWithoutCoach,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoupleWithDetails('couple-123');

      expect(result).toEqual({
        ...coupleWithoutCoach,
        coach: null,
        assignmentHistory: [],
      });
    });

    it('should return couple with empty assignment history when no assignments exist', async () => {
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
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
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoupleWithDetails('couple-123');

      expect(result).toEqual({
        ...mockCouple,
        coach: mockCoach,
        assignmentHistory: [],
      });
    });

    it('should return null when couple is not found (PGRST116)', async () => {
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

      const result = await getCoupleWithDetails('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error when couple query fails with non-PGRST116 error', async () => {
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

      await expect(getCoupleWithDetails('couple-123')).rejects.toEqual(mockError);
    });

    it('should throw error when assignment statuses query fails', async () => {
      const mockError = { message: 'Statuses query error' };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
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
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: mockError,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      await expect(getCoupleWithDetails('couple-123')).rejects.toEqual(mockError);
    });

    it('should handle missing assignment data gracefully', async () => {
      const mockStatus = {
        id: 'status-1',
        assignment_id: 'assignment-1',
        status: 'pending',
        sent_at: '2024-01-15T00:00:00Z',
        completed_at: null,
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCouple,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
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
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [mockStatus],
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoupleWithDetails('couple-123');

      expect(result).toEqual({
        ...mockCouple,
        coach: mockCoach,
        assignmentHistory: [
          {
            ...mockStatus,
            assignment: {
              id: 'assignment-1',
              title: 'Unknown',
              week_number: 0,
              due_date: null,
            },
          },
        ],
      });
    });
  });

  describe('createCouple', () => {
    const createData = {
      husband_first_name: 'Tom',
      husband_last_name: 'Johnson',
      wife_first_name: 'Sarah',
      wife_last_name: 'Johnson',
      email: 'tomandsarah@example.com',
      phone: '+1987654321',
      coach_id: 'coach-456',
      wedding_date: '2024-08-20',
    };

    it('should create a new couple with all fields', async () => {
      const createdCouple = {
        ...mockCouple,
        id: 'new-couple-id',
        ...createData,
        status: 'active',
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdCouple,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await createCouple(createData);

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toEqual(createdCouple);
    });

    it('should create a couple with optional fields as null', async () => {
      const minimalData = {
        husband_first_name: 'Tom',
        husband_last_name: 'Johnson',
        wife_first_name: 'Sarah',
        wife_last_name: 'Johnson',
        email: 'tomandsarah@example.com',
      };

      const createdCouple = {
        ...mockCouple,
        id: 'new-couple-id',
        ...minimalData,
        phone: null,
        coach_id: null,
        wedding_date: null,
        status: 'active',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCouple,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createCouple(minimalData);

      expect(mockInsert).toHaveBeenCalledWith({
        husband_first_name: minimalData.husband_first_name,
        husband_last_name: minimalData.husband_last_name,
        wife_first_name: minimalData.wife_first_name,
        wife_last_name: minimalData.wife_last_name,
        email: minimalData.email,
        phone: null,
        coach_id: null,
        wedding_date: null,
        status: 'active',
      });
      expect(result).toEqual(createdCouple);
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

      await expect(createCouple(createData)).rejects.toEqual(mockError);
    });
  });

  describe('updateCouple', () => {
    const updateData = {
      husband_first_name: 'John',
      husband_last_name: 'Updated',
      wife_first_name: 'Jane',
      wife_last_name: 'Updated',
      email: 'updated@example.com',
      phone: '+1111111111',
      coach_id: 'coach-789',
      status: 'completed' as const,
      wedding_date: '2024-12-31',
    };

    it('should update couple and return updated data', async () => {
      const updatedCouple = {
        ...mockCouple,
        ...updateData,
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCouple,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await updateCouple('couple-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toEqual(updatedCouple);
    });

    it('should update only specified fields', async () => {
      const partialUpdate = { status: 'inactive' as const };
      const updatedCouple = {
        ...mockCouple,
        status: 'inactive' as const,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedCouple,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateCouple('couple-123', partialUpdate);

      expect(mockUpdate).toHaveBeenCalledWith(partialUpdate);
      expect(result).toEqual(updatedCouple);
    });

    it('should allow coach_id to be set to null', async () => {
      const updateWithNullCoach = { coach_id: null };
      const updatedCouple = {
        ...mockCouple,
        coach_id: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCouple,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await updateCouple('couple-123', updateWithNullCoach);

      expect(result.coach_id).toBeNull();
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

      await expect(updateCouple('couple-123', updateData)).rejects.toEqual(mockError);
    });
  });

  describe('deleteCouple', () => {
    it('should delete assignment responses, statuses, and couple', async () => {
      const mockDeleteResponses = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteStatuses = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteCouple = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignment_responses') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDeleteResponses,
            }),
          } as never;
        }
        if (table === 'assignment_statuses') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDeleteStatuses,
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDeleteCouple,
            }),
          } as never;
        }
        return {} as never;
      });

      await deleteCouple('couple-123');

      expect(mockDeleteResponses).toHaveBeenCalled();
      expect(mockDeleteStatuses).toHaveBeenCalled();
      expect(mockDeleteCouple).toHaveBeenCalled();
    });

    it('should throw error when delete couple fails', async () => {
      const mockError = { message: 'Delete failed' };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignment_responses') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as never;
        }
        if (table === 'assignment_statuses') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: mockError }),
            }),
          } as never;
        }
        return {} as never;
      });

      await expect(deleteCouple('couple-123')).rejects.toEqual(mockError);
    });
  });

  describe('assignCoach', () => {
    it('should assign a coach to a couple', async () => {
      const updatedCouple = {
        ...mockCouple,
        coach_id: 'new-coach-id',
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCouple,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await assignCoach('couple-123', 'new-coach-id');

      expect(supabase.from).toHaveBeenCalledWith('couples');
      expect(result).toEqual(updatedCouple);
    });

    it('should unassign a coach by setting coach_id to null', async () => {
      const updatedCouple = {
        ...mockCouple,
        coach_id: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCouple,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await assignCoach('couple-123', null);

      expect(result.coach_id).toBeNull();
    });

    it('should throw error when assign fails', async () => {
      const mockError = { message: 'Assign failed' };

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

      await expect(assignCoach('couple-123', 'coach-456')).rejects.toEqual(mockError);
    });
  });

  describe('getCoachOptions', () => {
    const mockCoaches = [
      { id: 'coach-1', first_name: 'Alice', last_name: 'Anderson' },
      { id: 'coach-2', first_name: 'Bob', last_name: 'Brown' },
      { id: 'coach-3', first_name: 'Charlie', last_name: 'Clark' },
    ];

    it('should return active coaches as options sorted by last name', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockCoaches,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getCoachOptions();

      expect(supabase.from).toHaveBeenCalledWith('coaches');
      expect(result).toEqual([
        { id: 'coach-1', name: 'Alice Anderson' },
        { id: 'coach-2', name: 'Bob Brown' },
        { id: 'coach-3', name: 'Charlie Clark' },
      ]);
    });

    it('should return empty array when no active coaches exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getCoachOptions();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Query failed' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      } as never);

      await expect(getCoachOptions()).rejects.toEqual(mockError);
    });
  });
});
