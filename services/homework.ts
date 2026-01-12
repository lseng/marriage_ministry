import { supabase } from '../lib/supabase';
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
  HomeworkResponse,
  HomeworkResponseInsert,
  HomeworkResponseUpdate,
  FormResponses,
  HomeworkResponseWithDetails,
} from '../types/forms';

// ==================== Form Templates ====================

export async function getFormTemplates(includeInactive = false): Promise<FormTemplate[]> {
  let query = supabase
    .from('form_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getFormTemplate(id: string): Promise<FormTemplate | null> {
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createFormTemplate(
  template: FormTemplateInsert,
  userId: string
): Promise<FormTemplate> {
  const { data, error } = await supabase
    .from('form_templates')
    .insert({
      name: template.name,
      description: template.description || null,
      fields: template.fields,
      is_active: template.is_active ?? true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFormTemplate(
  id: string,
  updates: FormTemplateUpdate
): Promise<FormTemplate> {
  const { data, error } = await supabase
    .from('form_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFormTemplate(id: string): Promise<void> {
  // Soft delete by deactivating
  const { error } = await supabase
    .from('form_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ==================== Homework Responses ====================

export async function getHomeworkResponses(coupleId?: string): Promise<HomeworkResponse[]> {
  let query = supabase
    .from('homework_responses')
    .select('*')
    .order('created_at', { ascending: false });

  if (coupleId) {
    query = query.eq('couple_id', coupleId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getHomeworkResponse(id: string): Promise<HomeworkResponse | null> {
  const { data, error } = await supabase
    .from('homework_responses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getHomeworkResponseByAssignmentStatus(
  assignmentStatusId: string,
  coupleId: string
): Promise<HomeworkResponse | null> {
  const { data, error } = await supabase
    .from('homework_responses')
    .select('*')
    .eq('assignment_status_id', assignmentStatusId)
    .eq('couple_id', coupleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createHomeworkResponse(
  response: HomeworkResponseInsert
): Promise<HomeworkResponse> {
  const { data, error } = await supabase
    .from('homework_responses')
    .insert({
      assignment_status_id: response.assignment_status_id,
      couple_id: response.couple_id,
      responses: response.responses,
      draft_responses: response.draft_responses || null,
      is_draft: response.is_draft ?? false,
      submitted_at: response.is_draft ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHomeworkResponse(
  id: string,
  updates: HomeworkResponseUpdate
): Promise<HomeworkResponse> {
  const { data, error } = await supabase
    .from('homework_responses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitHomework(
  id: string,
  responses: FormResponses
): Promise<HomeworkResponse> {
  const { data, error } = await supabase
    .from('homework_responses')
    .update({
      responses,
      is_draft: false,
      submitted_at: new Date().toISOString(),
      draft_responses: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Also update the assignment status to completed
  const response = data as HomeworkResponse;
  await supabase
    .from('assignment_statuses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', response.assignment_status_id);

  return response;
}

export async function saveDraft(
  id: string,
  draftResponses: FormResponses
): Promise<HomeworkResponse> {
  const { data, error } = await supabase
    .from('homework_responses')
    .update({
      draft_responses: draftResponses,
      is_draft: true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== Review Functions ====================

export interface ReviewData {
  reviewed_by: string;
  review_notes?: string;
}

export async function reviewHomework(
  id: string,
  reviewData: ReviewData
): Promise<HomeworkResponse> {
  const { data, error } = await supabase
    .from('homework_responses')
    .update({
      reviewed_by: reviewData.reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewData.review_notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingReviews(coachId?: string): Promise<HomeworkResponseWithDetails[]> {
  // Get responses that are submitted but not reviewed
  const { data: responses, error } = await supabase
    .from('homework_responses')
    .select('*')
    .eq('is_draft', false)
    .is('reviewed_at', null)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true });

  if (error) throw error;

  if (!responses || responses.length === 0) return [];

  // Get assignment statuses to get assignment details
  const assignmentStatusIds = responses.map(r => r.assignment_status_id);
  const { data: statuses } = await supabase
    .from('assignment_statuses')
    .select('id, assignment_id')
    .in('id', assignmentStatusIds);

  if (!statuses) return [];

  // Get assignments
  const assignmentIds = [...new Set(statuses.map(s => s.assignment_id))];
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, week_number, due_date, form_template_id')
    .in('id', assignmentIds);

  // Get couples
  const coupleIds = [...new Set(responses.map(r => r.couple_id))];
  const { data: couples } = await supabase
    .from('couples')
    .select('id, husband_first_name, wife_first_name, husband_last_name, coach_id')
    .in('id', coupleIds);

  // Filter by coach if specified
  let filteredCouples = couples || [];
  if (coachId) {
    filteredCouples = filteredCouples.filter(c => c.coach_id === coachId);
  }
  const filteredCoupleIds = new Set(filteredCouples.map(c => c.id));

  // Get form templates
  const templateIds = [...new Set((assignments || []).filter(a => a.form_template_id).map(a => a.form_template_id))];
  const { data: templates } = templateIds.length > 0
    ? await supabase.from('form_templates').select('*').in('id', templateIds)
    : { data: [] };

  // Build the detailed responses
  const detailedResponses: HomeworkResponseWithDetails[] = responses
    .filter(r => filteredCoupleIds.has(r.couple_id))
    .map(response => {
      const status = statuses?.find(s => s.id === response.assignment_status_id);
      const assignment = assignments?.find(a => a.id === status?.assignment_id);
      const couple = filteredCouples.find(c => c.id === response.couple_id);
      const template = assignment?.form_template_id
        ? templates?.find(t => t.id === assignment.form_template_id)
        : null;

      return {
        ...response,
        assignment: {
          id: assignment?.id || '',
          title: assignment?.title || 'Unknown Assignment',
          week_number: assignment?.week_number || 0,
          due_date: assignment?.due_date || null,
          form_template: template || null,
        },
        couple: {
          id: couple?.id || '',
          husband_first_name: couple?.husband_first_name || '',
          wife_first_name: couple?.wife_first_name || '',
          husband_last_name: couple?.husband_last_name || '',
        },
        reviewer: null,
      };
    });

  return detailedResponses;
}

// ==================== Couple Assignment Functions ====================

export interface CoupleAssignment {
  id: string;
  assignment_id: string;
  status: string;
  sent_at: string | null;
  completed_at: string | null;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    week_number: number;
    due_date: string | null;
    form_template_id: string | null;
  };
  homework_response?: HomeworkResponse | null;
}

export async function getCoupleAssignments(coupleId: string): Promise<CoupleAssignment[]> {
  // Get assignment statuses for this couple
  const { data: statuses, error } = await supabase
    .from('assignment_statuses')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sent_at', { ascending: false });

  if (error) throw error;
  if (!statuses || statuses.length === 0) return [];

  // Get assignment details
  const assignmentIds = statuses.map(s => s.assignment_id);
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .in('id', assignmentIds);

  // Get homework responses
  const statusIds = statuses.map(s => s.id);
  const { data: responses } = await supabase
    .from('homework_responses')
    .select('*')
    .in('assignment_status_id', statusIds);

  return statuses.map(status => {
    const assignment = assignments?.find(a => a.id === status.assignment_id);
    const response = responses?.find(r => r.assignment_status_id === status.id);

    return {
      id: status.id,
      assignment_id: status.assignment_id,
      status: status.status,
      sent_at: status.sent_at,
      completed_at: status.completed_at,
      assignment: {
        id: assignment?.id || '',
        title: assignment?.title || 'Unknown',
        description: assignment?.description || null,
        content: assignment?.content || '',
        week_number: assignment?.week_number || 0,
        due_date: assignment?.due_date || null,
        form_template_id: assignment?.form_template_id || null,
      },
      homework_response: response || null,
    };
  });
}

export async function startHomework(
  assignmentStatusId: string,
  coupleId: string
): Promise<HomeworkResponse> {
  // Check if response already exists
  const existing = await getHomeworkResponseByAssignmentStatus(assignmentStatusId, coupleId);
  if (existing) return existing;

  // Create new draft response
  return createHomeworkResponse({
    assignment_status_id: assignmentStatusId,
    couple_id: coupleId,
    responses: {},
    is_draft: true,
  });
}
