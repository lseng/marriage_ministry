import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  distributeAssignment,
  getAssignmentStatuses,
  type CreateAssignmentData,
  type UpdateAssignmentData,
  type DistributeOptions,
} from '../assignments';
import { supabase } from '../../lib/supabase';
import type { Assignment } from '../../types/database';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('assignments service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAssignment: Assignment = {
    id: 'assignment-123',
    title: 'Communication Skills',
    description: 'Learn effective communication',
    content: 'Complete the following exercises...',
    week_number: 1,
    due_date: '2024-02-01',
    form_template_id: null,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getAssignments', () => {
    it('should return all assignments with stats ordered by week number', async () => {
      const mockAssignments = [mockAssignment];

      // Mock the assignments query
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAssignments,
                error: null,
              }),
            }),
          } as never;
        }
        // Mock assignment_statuses queries for stats
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 5,
                  error: null,
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('pending_count');
      expect(result[0]).toHaveProperty('completed_count');
      expect(result[0]).toHaveProperty('total_distributed');
    });

    it('should return empty array when no assignments exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getAssignments();

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

      await expect(getAssignments()).rejects.toEqual(mockError);
    });

    it('should calculate stats correctly with multiple statuses', async () => {
      const mockAssignments = [mockAssignment];
      let statusCallCount = 0;

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAssignments,
                error: null,
              }),
            }),
          } as never;
        }
        // Mock different counts for different status queries
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
                if (field === 'assignment_id') {
                  // Check if there's a second eq call (for status)
                  const hasStatusFilter = statusCallCount < 2;
                  if (hasStatusFilter) {
                    return {
                      eq: vi.fn().mockImplementation((field2: string) => {
                        if (field2 === 'status') {
                          statusCallCount++;
                          // First call: pending count = 3
                          // Second call: completed count = 2
                          return Promise.resolve({
                            count: statusCallCount === 1 ? 3 : 2,
                            error: null,
                          });
                        }
                        return Promise.resolve({ count: 0, error: null });
                      }),
                    };
                  } else {
                    // Third call: total count query (no second eq)
                    return Promise.resolve({
                      count: 5,
                      error: null,
                    });
                  }
                }
                return {} as never;
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getAssignments();

      expect(result[0].pending_count).toBe(3);
      expect(result[0].completed_count).toBe(2);
      expect(result[0].total_distributed).toBe(5);
    });
  });

  describe('getAssignment', () => {
    it('should return an assignment by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAssignment,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getAssignment('assignment-123');

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(result).toEqual(mockAssignment);
    });

    it('should return null when assignment is not found (PGRST116)', async () => {
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

      const result = await getAssignment('nonexistent-id');

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

      await expect(getAssignment('assignment-123')).rejects.toEqual(mockError);
    });
  });

  describe('createAssignment', () => {
    const createData: CreateAssignmentData = {
      title: 'Conflict Resolution',
      description: 'Learn to resolve conflicts',
      content: 'Complete the exercises...',
      week_number: 2,
      due_date: '2024-02-15',
    };

    it('should create a new assignment with all fields', async () => {
      const createdAssignment = {
        ...mockAssignment,
        id: 'new-assignment-id',
        ...createData,
        created_by: 'user-456',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdAssignment,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createAssignment(createData, 'user-456');

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(mockInsert).toHaveBeenCalledWith({
        title: createData.title,
        description: createData.description,
        content: createData.content,
        week_number: createData.week_number,
        due_date: createData.due_date,
        created_by: 'user-456',
      });
      expect(result).toEqual(createdAssignment);
    });

    it('should create assignment with optional fields as null', async () => {
      const minimalData: CreateAssignmentData = {
        title: 'Minimal Assignment',
        content: 'Content here',
        week_number: 3,
      };

      const createdAssignment = {
        ...mockAssignment,
        id: 'new-assignment-id',
        title: minimalData.title,
        description: null,
        content: minimalData.content,
        week_number: minimalData.week_number,
        due_date: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdAssignment,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createAssignment(minimalData, 'user-789');

      expect(mockInsert).toHaveBeenCalledWith({
        title: minimalData.title,
        description: null,
        content: minimalData.content,
        week_number: minimalData.week_number,
        due_date: null,
        created_by: 'user-789',
      });
      expect(result).toEqual(createdAssignment);
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

      await expect(createAssignment(createData, 'user-123')).rejects.toEqual(mockError);
    });
  });

  describe('updateAssignment', () => {
    const updateData: UpdateAssignmentData = {
      title: 'Updated Title',
      description: 'Updated description',
      content: 'Updated content',
      week_number: 4,
      due_date: '2024-03-01',
    };

    it('should update assignment and return updated data', async () => {
      const updatedAssignment = {
        ...mockAssignment,
        ...updateData,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedAssignment,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateAssignment('assignment-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedAssignment);
    });

    it('should update only specified fields', async () => {
      const partialUpdate: UpdateAssignmentData = { title: 'New Title' };
      const updatedAssignment = {
        ...mockAssignment,
        title: 'New Title',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedAssignment,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateAssignment('assignment-123', partialUpdate);

      expect(mockUpdate).toHaveBeenCalledWith(partialUpdate);
      expect(result).toEqual(updatedAssignment);
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

      await expect(updateAssignment('assignment-123', updateData)).rejects.toEqual(mockError);
    });
  });

  describe('deleteAssignment', () => {
    it('should delete related responses, statuses, and assignment', async () => {
      const mockDeleteResponses = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteStatuses = vi.fn().mockResolvedValue({ error: null });
      const mockDeleteAssignment = vi.fn().mockResolvedValue({ error: null });

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
        if (table === 'assignments') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: mockDeleteAssignment,
            }),
          } as never;
        }
        return {} as never;
      });

      await deleteAssignment('assignment-123');

      expect(mockDeleteResponses).toHaveBeenCalled();
      expect(mockDeleteStatuses).toHaveBeenCalled();
      expect(mockDeleteAssignment).toHaveBeenCalled();
    });

    it('should throw error when assignment delete fails', async () => {
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
        if (table === 'assignments') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: mockError }),
            }),
          } as never;
        }
        return {} as never;
      });

      await expect(deleteAssignment('assignment-123')).rejects.toEqual(mockError);
    });
  });

  describe('distributeAssignment', () => {
    describe('target: all', () => {
      it('should distribute to all active couples', async () => {
        const mockCouples = [
          { id: 'couple-1' },
          { id: 'couple-2' },
          { id: 'couple-3' },
        ];

        vi.mocked(supabase.from).mockImplementation((table) => {
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
          if (table === 'assignment_statuses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'all',
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(3);
      });

      it('should skip couples that already have the assignment', async () => {
        const mockCouples = [
          { id: 'couple-1' },
          { id: 'couple-2' },
          { id: 'couple-3' },
        ];

        const existingStatuses = [
          { couple_id: 'couple-1' },
        ];

        vi.mocked(supabase.from).mockImplementation((table) => {
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
          if (table === 'assignment_statuses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: existingStatuses,
                    error: null,
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'all',
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(2); // Only couple-2 and couple-3
      });

      it('should return 0 when all couples already have the assignment', async () => {
        const mockCouples = [
          { id: 'couple-1' },
          { id: 'couple-2' },
        ];

        const existingStatuses = [
          { couple_id: 'couple-1' },
          { couple_id: 'couple-2' },
        ];

        vi.mocked(supabase.from).mockImplementation((table) => {
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
          if (table === 'assignment_statuses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: existingStatuses,
                    error: null,
                  }),
                }),
              }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'all',
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(0);
      });
    });

    describe('target: coach', () => {
      it('should distribute to couples assigned to specific coach', async () => {
        const mockCouples = [
          { id: 'couple-1' },
          { id: 'couple-2' },
        ];

        vi.mocked(supabase.from).mockImplementation((table) => {
          if (table === 'couples') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((field: string, _value: unknown) => {
                  if (field === 'coach_id') {
                    return {
                      eq: vi.fn().mockResolvedValue({
                        data: mockCouples,
                        error: null,
                      }),
                    };
                  }
                  return {
                    eq: vi.fn().mockResolvedValue({
                      data: mockCouples,
                      error: null,
                    }),
                  };
                }),
              }),
            } as never;
          }
          if (table === 'assignment_statuses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'coach',
          coachId: 'coach-456',
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(2);
      });

      it('should return 0 when coach has no active couples', async () => {
        vi.mocked(supabase.from).mockImplementation((table) => {
          if (table === 'couples') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => ({
                  eq: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'coach',
          coachId: 'coach-456',
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(0);
      });
    });

    describe('target: specific', () => {
      it('should distribute to specific couple ids', async () => {
        const coupleIds = ['couple-1', 'couple-2'];

        vi.mocked(supabase.from).mockImplementation((table) => {
          if (table === 'assignment_statuses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            } as never;
          }
          return {} as never;
        });

        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'specific',
          coupleIds,
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(2);
      });

      it('should return 0 when no couple ids provided', async () => {
        const options: DistributeOptions = {
          assignmentId: 'assignment-123',
          target: 'specific',
          coupleIds: [],
        };

        const result = await distributeAssignment(options);

        expect(result).toBe(0);
      });
    });

    it('should throw error when insert fails', async () => {
      const mockError = { message: 'Insert failed' };
      const mockCouples = [{ id: 'couple-1' }];

      vi.mocked(supabase.from).mockImplementation((table) => {
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
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: mockError }),
          } as never;
        }
        return {} as never;
      });

      const options: DistributeOptions = {
        assignmentId: 'assignment-123',
        target: 'all',
      };

      await expect(distributeAssignment(options)).rejects.toEqual(mockError);
    });
  });

  describe('getAssignmentStatuses', () => {
    it('should return assignment statuses with couple details', async () => {
      const mockStatuses = [
        {
          id: 'status-1',
          status: 'sent',
          sent_at: '2024-01-01T00:00:00Z',
          completed_at: null,
          couple_id: 'couple-1',
        },
        {
          id: 'status-2',
          status: 'completed',
          sent_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-15T00:00:00Z',
          couple_id: 'couple-2',
        },
      ];

      const mockCouple1 = {
        id: 'couple-1',
        husband_first_name: 'John',
        wife_first_name: 'Jane',
        husband_last_name: 'Smith',
      };

      const mockCouple2 = {
        id: 'couple-2',
        husband_first_name: 'Bob',
        wife_first_name: 'Alice',
        husband_last_name: 'Johnson',
      };

      let coupleCallCount = 0;

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockStatuses,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  coupleCallCount++;
                  return Promise.resolve({
                    data: coupleCallCount === 1 ? mockCouple1 : mockCouple2,
                    error: null,
                  });
                }),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getAssignmentStatuses('assignment-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'status-1',
        status: 'sent',
        sent_at: '2024-01-01T00:00:00Z',
        completed_at: null,
        couple: mockCouple1,
      });
      expect(result[1]).toEqual({
        id: 'status-2',
        status: 'completed',
        sent_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-15T00:00:00Z',
        couple: mockCouple2,
      });
    });

    it('should return empty array when no statuses exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getAssignmentStatuses('assignment-123');

      expect(result).toEqual([]);
    });

    it('should filter out statuses with missing couple data', async () => {
      const mockStatuses = [
        {
          id: 'status-1',
          status: 'sent',
          sent_at: '2024-01-01T00:00:00Z',
          completed_at: null,
          couple_id: 'couple-1',
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockStatuses,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
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

      const result = await getAssignmentStatuses('assignment-123');

      expect(result).toEqual([]);
    });

    it('should throw error when statuses query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      } as never);

      await expect(getAssignmentStatuses('assignment-123')).rejects.toEqual(mockError);
    });
  });
});
