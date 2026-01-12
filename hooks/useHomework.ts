import { useState, useEffect, useCallback } from 'react';
import * as homeworkService from '../services/homework';
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
  HomeworkResponse,
  HomeworkResponseWithDetails,
  FormResponses,
} from '../types/forms';
import { useAuth } from '../contexts/AuthContext';

// ==================== Form Templates Hook ====================

interface UseFormTemplatesResult {
  templates: FormTemplate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTemplate: (data: FormTemplateInsert) => Promise<FormTemplate>;
  updateTemplate: (id: string, data: FormTemplateUpdate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export function useFormTemplates(includeInactive = false): UseFormTemplatesResult {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getFormTemplates(includeInactive);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch form templates');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: FormTemplateInsert): Promise<FormTemplate> => {
    if (!user) throw new Error('User not authenticated');
    const template = await homeworkService.createFormTemplate(data, user.id);
    await fetchTemplates();
    return template;
  };

  const updateTemplate = async (id: string, data: FormTemplateUpdate): Promise<void> => {
    await homeworkService.updateFormTemplate(id, data);
    await fetchTemplates();
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    await homeworkService.deleteFormTemplate(id);
    await fetchTemplates();
  };

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// ==================== Homework Responses Hook ====================

interface UseHomeworkResponsesResult {
  responses: HomeworkResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHomeworkResponses(coupleId?: string): UseHomeworkResponsesResult {
  const [responses, setResponses] = useState<HomeworkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getHomeworkResponses(coupleId);
      setResponses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch homework responses');
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  return {
    responses,
    loading,
    error,
    refresh: fetchResponses,
  };
}

// ==================== Single Homework Response Hook ====================

interface UseHomeworkResult {
  response: HomeworkResponse | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveDraft: (responses: FormResponses) => Promise<void>;
  submit: (responses: FormResponses) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useHomework(
  assignmentStatusId: string | null,
  coupleId: string | null
): UseHomeworkResult {
  const [response, setResponse] = useState<HomeworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchResponse = useCallback(async () => {
    if (!assignmentStatusId || !coupleId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getHomeworkResponseByAssignmentStatus(
        assignmentStatusId,
        coupleId
      );
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch homework');
    } finally {
      setLoading(false);
    }
  }, [assignmentStatusId, coupleId]);

  useEffect(() => {
    fetchResponse();
  }, [fetchResponse]);

  const saveDraft = async (responses: FormResponses): Promise<void> => {
    if (!assignmentStatusId || !coupleId) return;

    try {
      setSaving(true);
      setError(null);

      if (response) {
        const updated = await homeworkService.saveDraft(response.id, responses);
        setResponse(updated);
      } else {
        const created = await homeworkService.createHomeworkResponse({
          assignment_status_id: assignmentStatusId,
          couple_id: coupleId,
          responses: {},
          draft_responses: responses,
          is_draft: true,
        });
        setResponse(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (responses: FormResponses): Promise<void> => {
    if (!assignmentStatusId || !coupleId) return;

    try {
      setSaving(true);
      setError(null);

      if (response) {
        const updated = await homeworkService.submitHomework(response.id, responses);
        setResponse(updated);
      } else {
        const created = await homeworkService.createHomeworkResponse({
          assignment_status_id: assignmentStatusId,
          couple_id: coupleId,
          responses,
          is_draft: false,
        });
        setResponse(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit homework');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    response,
    loading,
    error,
    saving,
    saveDraft,
    submit,
    refresh: fetchResponse,
  };
}

// ==================== Pending Reviews Hook ====================

interface UsePendingReviewsResult {
  reviews: HomeworkResponseWithDetails[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reviewHomework: (id: string, notes?: string) => Promise<void>;
}

export function usePendingReviews(coachId?: string): UsePendingReviewsResult {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<HomeworkResponseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getPendingReviews(coachId);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending reviews');
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const reviewHomework = async (id: string, notes?: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    await homeworkService.reviewHomework(id, {
      reviewed_by: user.id,
      review_notes: notes,
    });
    await fetchReviews();
  };

  return {
    reviews,
    loading,
    error,
    refresh: fetchReviews,
    reviewHomework,
  };
}

// ==================== Couple Assignments Hook ====================

interface UseCoupleAssignmentsResult {
  assignments: homeworkService.CoupleAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startHomework: (assignmentStatusId: string) => Promise<HomeworkResponse>;
}

export function useCoupleAssignments(coupleId: string | null): UseCoupleAssignmentsResult {
  const [assignments, setAssignments] = useState<homeworkService.CoupleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getCoupleAssignments(coupleId);
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const startHomework = async (assignmentStatusId: string): Promise<HomeworkResponse> => {
    if (!coupleId) throw new Error('Couple ID not provided');
    const response = await homeworkService.startHomework(assignmentStatusId, coupleId);
    await fetchAssignments();
    return response;
  };

  return {
    assignments,
    loading,
    error,
    refresh: fetchAssignments,
    startHomework,
  };
}
