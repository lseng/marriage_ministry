import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getHomeworkResponses,
  getHomeworkResponse,
  getHomeworkResponseByAssignmentStatus,
  createHomeworkResponse,
  updateHomeworkResponse,
  submitHomework,
  saveDraft,
  reviewHomework,
  getPendingReviews,
  getCoupleAssignments,
  startHomework,
  type ReviewData,
} from '../homework';
import { supabase } from '../../lib/supabase';
import type { FormTemplate, HomeworkResponse } from '../../types/forms';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('homework service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFormTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Communication Assessment',
    description: 'Evaluate communication patterns',
    fields: [
      {
        id: 'field-1',
        type: 'text',
        label: 'What is your main concern?',
        required: true,
      },
    ],
    is_active: true,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockHomeworkResponse: HomeworkResponse = {
    id: 'response-123',
    assignment_status_id: 'status-123',
    couple_id: 'couple-123',
    responses: { 'field-1': 'Our answer here' },
    draft_responses: null,
    is_draft: false,
    submitted_at: '2024-01-15T00:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  // ==================== Form Templates ====================

  describe('getFormTemplates', () => {
    it('should return all active form templates ordered by created_at desc', async () => {
      const mockTemplates = [mockFormTemplate];

      // Mock the order() result which needs both .eq() method and promise behavior
      const mockOrderResult = {
        eq: vi.fn().mockResolvedValue({
          data: mockTemplates,
          error: null,
        }),
        then: vi.fn((resolve) => {
          resolve({ data: mockTemplates, error: null });
          return Promise.resolve({ data: mockTemplates, error: null });
        }),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockOrderResult),
        }),
      } as never);

      const result = await getFormTemplates();

      expect(supabase.from).toHaveBeenCalledWith('form_templates');
      expect(result).toEqual(mockTemplates);
    });

    it('should return active templates by default (includeInactive=false)', async () => {
      const mockTemplates = [mockFormTemplate];

      const mockEqResult = {
        then: vi.fn((resolve) => {
          resolve({ data: mockTemplates, error: null });
          return Promise.resolve({ data: mockTemplates, error: null });
        }),
      };

      const mockOrderResult = {
        eq: vi.fn().mockReturnValue(mockEqResult),
        then: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockOrderResult),
        }),
      } as never);

      await getFormTemplates(false);

      expect(mockOrderResult.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return all templates when includeInactive=true', async () => {
      const mockTemplates = [mockFormTemplate, { ...mockFormTemplate, is_active: false }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTemplates,
            error: null,
          }),
        }),
      } as never);

      const result = await getFormTemplates(true);

      expect(result).toEqual(mockTemplates);
    });

    it('should return empty array when no templates exist', async () => {
      const mockEqResult = {
        then: vi.fn((resolve) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        }),
      };

      const mockOrderResult = {
        eq: vi.fn().mockReturnValue(mockEqResult),
        then: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockOrderResult),
        }),
      } as never);

      const result = await getFormTemplates();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const mockError = { message: 'Database error' };

      const mockEqResult = Promise.resolve({
        data: null,
        error: mockError,
      });

      const mockOrderResult = {
        eq: vi.fn().mockReturnValue(mockEqResult),
        then: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockOrderResult),
        }),
      } as never);

      await expect(getFormTemplates()).rejects.toEqual(mockError);
    });
  });

  describe('getFormTemplate', () => {
    it('should return a form template by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFormTemplate,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getFormTemplate('template-123');

      expect(supabase.from).toHaveBeenCalledWith('form_templates');
      expect(result).toEqual(mockFormTemplate);
    });

    it('should return null when template is not found (PGRST116)', async () => {
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

      const result = await getFormTemplate('nonexistent-id');

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

      await expect(getFormTemplate('template-123')).rejects.toEqual(mockError);
    });
  });

  describe('createFormTemplate', () => {
    const createData = {
      name: 'Intimacy Assessment',
      description: 'Evaluate intimacy levels',
      fields: [
        {
          id: 'field-1',
          type: 'scale' as const,
          label: 'Rate your intimacy',
          required: true,
          min: 1,
          max: 10,
        },
      ],
      is_active: true,
    };

    it('should create a new form template with all fields', async () => {
      const createdTemplate = {
        ...mockFormTemplate,
        id: 'new-template-id',
        ...createData,
        created_by: 'user-456',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdTemplate,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createFormTemplate(createData, 'user-456');

      expect(supabase.from).toHaveBeenCalledWith('form_templates');
      expect(mockInsert).toHaveBeenCalledWith({
        name: createData.name,
        description: createData.description,
        fields: createData.fields,
        is_active: true,
        created_by: 'user-456',
      });
      expect(result).toEqual(createdTemplate);
    });

    it('should create template with optional fields as null', async () => {
      const minimalData = {
        name: 'Minimal Template',
        fields: [
          {
            id: 'field-1',
            type: 'text' as const,
            label: 'Question',
            required: false,
          },
        ],
      };

      const createdTemplate = {
        ...mockFormTemplate,
        id: 'new-template-id',
        name: minimalData.name,
        description: null,
        fields: minimalData.fields,
        is_active: true,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdTemplate,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createFormTemplate(minimalData, 'user-789');

      expect(mockInsert).toHaveBeenCalledWith({
        name: minimalData.name,
        description: null,
        fields: minimalData.fields,
        is_active: true,
        created_by: 'user-789',
      });
      expect(result).toEqual(createdTemplate);
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

      await expect(createFormTemplate(createData, 'user-123')).rejects.toEqual(mockError);
    });
  });

  describe('updateFormTemplate', () => {
    const updateData = {
      name: 'Updated Template Name',
      description: 'Updated description',
      is_active: false,
    };

    it('should update template and return updated data', async () => {
      const updatedTemplate = {
        ...mockFormTemplate,
        ...updateData,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedTemplate,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateFormTemplate('template-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('form_templates');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedTemplate);
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

      await expect(updateFormTemplate('template-123', updateData)).rejects.toEqual(mockError);
    });
  });

  describe('deleteFormTemplate', () => {
    it('should soft delete template by setting is_active to false', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      await deleteFormTemplate('template-123');

      expect(supabase.from).toHaveBeenCalledWith('form_templates');
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    });

    it('should throw error when soft delete fails', async () => {
      const mockError = { message: 'Delete failed' };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: mockError }),
        }),
      } as never);

      await expect(deleteFormTemplate('template-123')).rejects.toEqual(mockError);
    });
  });

  // ==================== Homework Responses ====================

  describe('getHomeworkResponses', () => {
    it('should return all homework responses ordered by created_at desc', async () => {
      const mockResponses = [mockHomeworkResponse];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockResponses,
            error: null,
          }),
        }),
      } as never);

      const result = await getHomeworkResponses();

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(result).toEqual(mockResponses);
    });

    it('should filter by couple_id when provided', async () => {
      const mockResponses = [mockHomeworkResponse];

      const mockEqResult = {
        then: vi.fn((resolve) => {
          resolve({ data: mockResponses, error: null });
          return Promise.resolve({ data: mockResponses, error: null });
        }),
      };

      const mockOrderResult = {
        eq: vi.fn().mockReturnValue(mockEqResult),
        then: vi.fn(),
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockOrderResult),
        }),
      } as never);

      await getHomeworkResponses('couple-123');

      expect(mockOrderResult.eq).toHaveBeenCalledWith('couple_id', 'couple-123');
    });

    it('should return empty array when no responses exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as never);

      const result = await getHomeworkResponses();

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

      await expect(getHomeworkResponses()).rejects.toEqual(mockError);
    });
  });

  describe('getHomeworkResponse', () => {
    it('should return a homework response by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockHomeworkResponse,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await getHomeworkResponse('response-123');

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(result).toEqual(mockHomeworkResponse);
    });

    it('should return null when response is not found (PGRST116)', async () => {
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

      const result = await getHomeworkResponse('nonexistent-id');

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

      await expect(getHomeworkResponse('response-123')).rejects.toEqual(mockError);
    });
  });

  describe('getHomeworkResponseByAssignmentStatus', () => {
    it('should return response by assignment_status_id and couple_id', async () => {
      const mockEq = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockHomeworkResponse,
              error: null,
            }),
          }),
        });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      } as never);

      const result = await getHomeworkResponseByAssignmentStatus('status-123', 'couple-123');

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(result).toEqual(mockHomeworkResponse);
    });

    it('should return null when response is not found (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      } as never);

      const result = await getHomeworkResponseByAssignmentStatus('status-123', 'couple-123');

      expect(result).toBeNull();
    });

    it('should throw error when query fails with non-PGRST116 error', async () => {
      const mockError = { code: 'OTHER', message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      } as never);

      await expect(getHomeworkResponseByAssignmentStatus('status-123', 'couple-123')).rejects.toEqual(mockError);
    });
  });

  describe('createHomeworkResponse', () => {
    const createData = {
      assignment_status_id: 'status-456',
      couple_id: 'couple-456',
      responses: { 'field-1': 'Test answer' },
      is_draft: false,
    };

    it('should create a new homework response', async () => {
      const createdResponse = {
        ...mockHomeworkResponse,
        id: 'new-response-id',
        ...createData,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdResponse,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createHomeworkResponse(createData);

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(result).toEqual(createdResponse);
    });

    it('should create draft response with submitted_at as null', async () => {
      const draftData = {
        assignment_status_id: 'status-456',
        couple_id: 'couple-456',
        responses: {},
        is_draft: true,
      };

      const createdResponse = {
        ...mockHomeworkResponse,
        id: 'new-response-id',
        ...draftData,
        submitted_at: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdResponse,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as never);

      const result = await createHomeworkResponse(draftData);

      expect(result.is_draft).toBe(true);
      expect(result.submitted_at).toBeNull();
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

      await expect(createHomeworkResponse(createData)).rejects.toEqual(mockError);
    });
  });

  describe('updateHomeworkResponse', () => {
    const updateData = {
      responses: { 'field-1': 'Updated answer' },
      is_draft: false,
    };

    it('should update homework response and return updated data', async () => {
      const updatedResponse = {
        ...mockHomeworkResponse,
        ...updateData,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedResponse,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await updateHomeworkResponse('response-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedResponse);
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

      await expect(updateHomeworkResponse('response-123', updateData)).rejects.toEqual(mockError);
    });
  });

  describe('submitHomework', () => {
    it('should submit homework and update assignment status to completed', async () => {
      const responses = { 'field-1': 'Final answer' };
      const submittedResponse = {
        ...mockHomeworkResponse,
        responses,
        is_draft: false,
        submitted_at: '2024-01-20T00:00:00Z',
        draft_responses: null,
      };

      const mockUpdate = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: submittedResponse,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await submitHomework('response-123', responses);

      expect(result).toEqual(submittedResponse);
      expect(result.is_draft).toBe(false);
      expect(result.draft_responses).toBeNull();
    });

    it('should throw error when homework update fails', async () => {
      const mockError = { message: 'Update failed' };
      const responses = { 'field-1': 'Final answer' };

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

      await expect(submitHomework('response-123', responses)).rejects.toEqual(mockError);
    });
  });

  describe('saveDraft', () => {
    it('should save draft responses', async () => {
      const draftResponses = { 'field-1': 'Work in progress' };
      const draftResponse = {
        ...mockHomeworkResponse,
        draft_responses: draftResponses,
        is_draft: true,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: draftResponse,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await saveDraft('response-123', draftResponses);

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(mockUpdate).toHaveBeenCalledWith({
        draft_responses: draftResponses,
        is_draft: true,
      });
      expect(result).toEqual(draftResponse);
    });

    it('should throw error when draft save fails', async () => {
      const mockError = { message: 'Save failed' };
      const draftResponses = { 'field-1': 'Work in progress' };

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

      await expect(saveDraft('response-123', draftResponses)).rejects.toEqual(mockError);
    });
  });

  // ==================== Review Functions ====================

  describe('reviewHomework', () => {
    const reviewData: ReviewData = {
      reviewed_by: 'coach-123',
      review_notes: 'Great work!',
    };

    it('should review homework and add review data', async () => {
      const reviewedResponse = {
        ...mockHomeworkResponse,
        reviewed_by: reviewData.reviewed_by,
        reviewed_at: '2024-01-25T00:00:00Z',
        review_notes: reviewData.review_notes,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: reviewedResponse,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await reviewHomework('response-123', reviewData);

      expect(supabase.from).toHaveBeenCalledWith('homework_responses');
      expect(result).toEqual(reviewedResponse);
      expect(result.reviewed_by).toBe('coach-123');
    });

    it('should review homework without notes', async () => {
      const minimalReview: ReviewData = {
        reviewed_by: 'coach-123',
      };

      const reviewedResponse = {
        ...mockHomeworkResponse,
        reviewed_by: minimalReview.reviewed_by,
        reviewed_at: '2024-01-25T00:00:00Z',
        review_notes: null,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: reviewedResponse,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as never);

      const result = await reviewHomework('response-123', minimalReview);

      expect(result.review_notes).toBeNull();
    });

    it('should throw error when review update fails', async () => {
      const mockError = { message: 'Review failed' };

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

      await expect(reviewHomework('response-123', reviewData)).rejects.toEqual(mockError);
    });
  });

  describe('getPendingReviews', () => {
    it('should return pending reviews with assignment and couple details', async () => {
      const mockResponses = [
        {
          id: 'response-1',
          assignment_status_id: 'status-1',
          couple_id: 'couple-1',
          responses: {},
          is_draft: false,
          submitted_at: '2024-01-15T00:00:00Z',
          reviewed_at: null,
        },
      ];

      const mockStatuses = [
        { id: 'status-1', assignment_id: 'assignment-1' },
      ];

      const mockAssignments = [
        {
          id: 'assignment-1',
          title: 'Week 1: Communication',
          week_number: 1,
          due_date: '2024-01-20',
          form_template_id: 'template-1',
        },
      ];

      const mockCouples = [
        {
          id: 'couple-1',
          husband_first_name: 'John',
          wife_first_name: 'Jane',
          husband_last_name: 'Smith',
          coach_id: 'coach-123',
        },
      ];

      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Communication Template',
          fields: [],
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'homework_responses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: mockResponses,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as never;
        }
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockStatuses,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockAssignments,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockCouples,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'form_templates') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockTemplates,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getPendingReviews();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('assignment');
      expect(result[0]).toHaveProperty('couple');
      expect(result[0].assignment.title).toBe('Week 1: Communication');
      expect(result[0].couple.husband_first_name).toBe('John');
    });

    it('should filter pending reviews by coach_id when provided', async () => {
      const mockResponses = [
        {
          id: 'response-1',
          assignment_status_id: 'status-1',
          couple_id: 'couple-1',
          responses: {},
          is_draft: false,
          submitted_at: '2024-01-15T00:00:00Z',
          reviewed_at: null,
        },
        {
          id: 'response-2',
          assignment_status_id: 'status-2',
          couple_id: 'couple-2',
          responses: {},
          is_draft: false,
          submitted_at: '2024-01-16T00:00:00Z',
          reviewed_at: null,
        },
      ];

      const mockStatuses = [
        { id: 'status-1', assignment_id: 'assignment-1' },
        { id: 'status-2', assignment_id: 'assignment-1' },
      ];

      const mockAssignments = [
        {
          id: 'assignment-1',
          title: 'Week 1',
          week_number: 1,
          due_date: '2024-01-20',
          form_template_id: null,
        },
      ];

      const mockCouples = [
        {
          id: 'couple-1',
          husband_first_name: 'John',
          wife_first_name: 'Jane',
          husband_last_name: 'Smith',
          coach_id: 'coach-123',
        },
        {
          id: 'couple-2',
          husband_first_name: 'Bob',
          wife_first_name: 'Alice',
          husband_last_name: 'Johnson',
          coach_id: 'coach-456',
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'homework_responses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: mockResponses,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as never;
        }
        if (table === 'assignment_statuses') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockStatuses,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'assignments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockAssignments,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'couples') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockCouples,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'form_templates') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getPendingReviews('coach-123');

      // Should only return responses for couples assigned to coach-123
      expect(result).toHaveLength(1);
      expect(result[0].couple.id).toBe('couple-1');
    });

    it('should return empty array when no pending reviews exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await getPendingReviews();

      expect(result).toEqual([]);
    });

    it('should throw error when responses query fails', async () => {
      const mockError = { message: 'Database error' };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: mockError,
                }),
              }),
            }),
          }),
        }),
      } as never);

      await expect(getPendingReviews()).rejects.toEqual(mockError);
    });
  });

  // ==================== Couple Assignment Functions ====================

  describe('getCoupleAssignments', () => {
    it('should return couple assignments with assignment details and homework responses', async () => {
      const mockStatuses = [
        {
          id: 'status-1',
          assignment_id: 'assignment-1',
          status: 'completed',
          sent_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-15T00:00:00Z',
        },
      ];

      const mockAssignments = [
        {
          id: 'assignment-1',
          title: 'Week 1: Communication',
          description: 'Learn communication',
          content: 'Content here',
          week_number: 1,
          due_date: '2024-01-20',
          form_template_id: 'template-1',
        },
      ];

      const mockResponses = [
        {
          id: 'response-1',
          assignment_status_id: 'status-1',
          responses: {},
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table) => {
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
              in: vi.fn().mockResolvedValue({
                data: mockAssignments,
                error: null,
              }),
            }),
          } as never;
        }
        if (table === 'homework_responses') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockResponses,
                error: null,
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      const result = await getCoupleAssignments('couple-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('assignment');
      expect(result[0]).toHaveProperty('homework_response');
      expect(result[0].assignment.title).toBe('Week 1: Communication');
    });

    it('should return empty array when couple has no assignments', async () => {
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

      const result = await getCoupleAssignments('couple-123');

      expect(result).toEqual([]);
    });

    it('should throw error when statuses query fails', async () => {
      const mockError = { message: 'Database error' };

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

      await expect(getCoupleAssignments('couple-123')).rejects.toEqual(mockError);
    });
  });

  describe('startHomework', () => {
    it('should return existing homework response if already exists', async () => {
      const existingResponse = mockHomeworkResponse;

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: existingResponse,
                error: null,
              }),
            }),
          }),
        }),
      } as never);

      const result = await startHomework('status-123', 'couple-123');

      expect(result).toEqual(existingResponse);
    });

    it('should create new draft response if none exists', async () => {
      const newDraftResponse = {
        ...mockHomeworkResponse,
        id: 'new-response-id',
        is_draft: true,
        responses: {},
        submitted_at: null,
      };

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'homework_responses') {
          // First call for getHomeworkResponseByAssignmentStatus
          const selectMock = vi.fn();
          if (selectMock.mock.calls.length === 0) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116', message: 'Not found' },
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: newDraftResponse,
                    error: null,
                  }),
                }),
              }),
            } as never;
          }
        }
        return {} as never;
      });

      const result = await startHomework('status-456', 'couple-456');

      expect(result.is_draft).toBe(true);
      expect(result.responses).toEqual({});
    });
  });
});
