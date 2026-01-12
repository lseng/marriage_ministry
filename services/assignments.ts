import { supabase } from '../lib/supabase';
import type { Assignment } from '../types/database';

export interface CreateAssignmentData {
  title: string;
  description?: string;
  content: string;
  week_number: number;
  due_date?: string;
}

export interface UpdateAssignmentData {
  title?: string;
  description?: string;
  content?: string;
  week_number?: number;
  due_date?: string;
}

export interface AssignmentWithStats extends Assignment {
  pending_count: number;
  completed_count: number;
  total_distributed: number;
}

export async function getAssignments(): Promise<AssignmentWithStats[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('week_number', { ascending: true });

  if (error) throw error;

  // Get stats for each assignment
  const result = await Promise.all((data || []).map(async (assignment) => {
    const { count: pendingCount } = await supabase
      .from('assignment_statuses')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignment.id)
      .eq('status', 'pending');

    const { count: completedCount } = await supabase
      .from('assignment_statuses')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignment.id)
      .eq('status', 'completed');

    const { count: totalDistributed } = await supabase
      .from('assignment_statuses')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignment.id);

    return {
      ...assignment,
      pending_count: pendingCount || 0,
      completed_count: completedCount || 0,
      total_distributed: totalDistributed || 0,
    };
  }));

  return result;
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createAssignment(data: CreateAssignmentData, userId: string): Promise<Assignment> {
  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      title: data.title,
      description: data.description || null,
      content: data.content,
      week_number: data.week_number,
      due_date: data.due_date || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return assignment;
}

export async function updateAssignment(id: string, data: UpdateAssignmentData): Promise<Assignment> {
  const { data: assignment, error } = await supabase
    .from('assignments')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  // Delete related statuses and responses first
  await supabase.from('assignment_responses').delete().eq('assignment_id', id);
  await supabase.from('assignment_statuses').delete().eq('assignment_id', id);

  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw error;
}

// Distribution functions
export interface DistributeOptions {
  assignmentId: string;
  target: 'all' | 'coach' | 'specific';
  coachId?: string;
  coupleIds?: string[];
}

export async function distributeAssignment(options: DistributeOptions): Promise<number> {
  let coupleIds: string[] = [];

  if (options.target === 'all') {
    // Get all active couples
    const { data } = await supabase
      .from('couples')
      .select('id')
      .eq('status', 'active');
    coupleIds = (data || []).map(c => c.id);
  } else if (options.target === 'coach' && options.coachId) {
    // Get couples assigned to specific coach
    const { data } = await supabase
      .from('couples')
      .select('id')
      .eq('coach_id', options.coachId)
      .eq('status', 'active');
    coupleIds = (data || []).map(c => c.id);
  } else if (options.target === 'specific' && options.coupleIds) {
    coupleIds = options.coupleIds;
  }

  if (coupleIds.length === 0) return 0;

  // Check for existing distributions to avoid duplicates
  const { data: existing } = await supabase
    .from('assignment_statuses')
    .select('couple_id')
    .eq('assignment_id', options.assignmentId)
    .in('couple_id', coupleIds);

  const existingCoupleIds = new Set((existing || []).map(e => e.couple_id));
  const newCoupleIds = coupleIds.filter(id => !existingCoupleIds.has(id));

  if (newCoupleIds.length === 0) return 0;

  // Create assignment statuses
  const statuses = newCoupleIds.map(coupleId => ({
    assignment_id: options.assignmentId,
    couple_id: coupleId,
    status: 'sent' as const,
    sent_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('assignment_statuses').insert(statuses);
  if (error) throw error;

  return newCoupleIds.length;
}

export async function getAssignmentStatuses(assignmentId: string): Promise<Array<{
  id: string;
  status: string;
  sent_at: string | null;
  completed_at: string | null;
  couple: {
    id: string;
    husband_first_name: string;
    wife_first_name: string;
    husband_last_name: string;
  };
}>> {
  const { data, error } = await supabase
    .from('assignment_statuses')
    .select('id, status, sent_at, completed_at, couple_id')
    .eq('assignment_id', assignmentId);

  if (error) throw error;

  const result = await Promise.all((data || []).map(async (status) => {
    const { data: couple } = await supabase
      .from('couples')
      .select('id, husband_first_name, wife_first_name, husband_last_name')
      .eq('id', status.couple_id)
      .single();

    return {
      id: status.id,
      status: status.status,
      sent_at: status.sent_at,
      completed_at: status.completed_at,
      couple: couple!,
    };
  }));

  return result.filter(r => r.couple);
}
