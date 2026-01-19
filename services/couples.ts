import { supabase } from '../lib/supabase';
import type { Couple } from '../types/database';

export interface CreateCoupleData {
  husband_first_name: string;
  husband_last_name: string;
  wife_first_name: string;
  wife_last_name: string;
  email: string;
  phone?: string;
  coach_id?: string;
  wedding_date?: string;
}

export interface UpdateCoupleData {
  husband_first_name?: string;
  husband_last_name?: string;
  wife_first_name?: string;
  wife_last_name?: string;
  email?: string;
  phone?: string;
  coach_id?: string | null;
  status?: 'active' | 'inactive' | 'completed';
  wedding_date?: string;
}

export async function getCouples(): Promise<Couple[]> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .order('enrollment_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCouplesWithCoach(): Promise<Array<Couple & { coach?: { first_name: string; last_name: string } | null }>> {
  const { data: couples, error } = await supabase
    .from('couples')
    .select('*')
    .order('enrollment_date', { ascending: false });

  if (error) throw error;

  // Fetch coach info for each couple
  const result = await Promise.all((couples || []).map(async (couple) => {
    if (!couple.coach_id) {
      return { ...couple, coach: null };
    }

    const { data: coach } = await supabase
      .from('coaches')
      .select('first_name, last_name')
      .eq('id', couple.coach_id)
      .single();

    return { ...couple, coach };
  }));

  return result;
}

export async function getCouple(id: string): Promise<Couple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createCouple(data: CreateCoupleData): Promise<Couple> {
  const { data: couple, error } = await supabase
    .from('couples')
    .insert({
      husband_first_name: data.husband_first_name,
      husband_last_name: data.husband_last_name,
      wife_first_name: data.wife_first_name,
      wife_last_name: data.wife_last_name,
      email: data.email,
      phone: data.phone || null,
      coach_id: data.coach_id || null,
      wedding_date: data.wedding_date || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return couple;
}

export async function updateCouple(id: string, data: UpdateCoupleData): Promise<Couple> {
  const { data: couple, error } = await supabase
    .from('couples')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return couple;
}

export async function deleteCouple(id: string): Promise<void> {
  // First delete related assignment statuses and responses
  await supabase.from('assignment_responses').delete().eq('couple_id', id);
  await supabase.from('assignment_statuses').delete().eq('couple_id', id);

  const { error } = await supabase.from('couples').delete().eq('id', id);
  if (error) throw error;
}

export async function assignCoach(coupleId: string, coachId: string | null): Promise<Couple> {
  const { data: couple, error } = await supabase
    .from('couples')
    .update({ coach_id: coachId })
    .eq('id', coupleId)
    .select()
    .single();

  if (error) throw error;
  return couple;
}

export async function getCoachOptions(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('coaches')
    .select('id, first_name, last_name')
    .eq('status', 'active')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return (data || []).map(c => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
  }));
}

export interface CoupleWithDetails extends Couple {
  coach: { id: string; first_name: string; last_name: string; email: string } | null;
  assignmentHistory: Array<{
    id: string;
    assignment_id: string;
    status: string;
    sent_at: string | null;
    completed_at: string | null;
    assignment: {
      id: string;
      title: string;
      week_number: number;
      due_date: string | null;
    };
  }>;
}

export async function getCoupleWithDetails(id: string): Promise<CoupleWithDetails | null> {
  // Get couple data
  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('id', id)
    .single();

  if (coupleError) {
    if (coupleError.code === 'PGRST116') return null;
    throw coupleError;
  }

  // Get coach info if assigned
  let coach = null;
  if (couple.coach_id) {
    const { data: coachData } = await supabase
      .from('coaches')
      .select('id, first_name, last_name, email')
      .eq('id', couple.coach_id)
      .single();
    coach = coachData;
  }

  // Get assignment history
  const { data: statuses, error: statusError } = await supabase
    .from('assignment_statuses')
    .select('id, assignment_id, status, sent_at, completed_at')
    .eq('couple_id', id)
    .order('created_at', { ascending: false });

  if (statusError) throw statusError;

  // Get assignment details for each status
  const assignmentHistory = await Promise.all(
    (statuses || []).map(async (status) => {
      const { data: assignment } = await supabase
        .from('assignments')
        .select('id, title, week_number, due_date')
        .eq('id', status.assignment_id)
        .single();

      return {
        ...status,
        assignment: assignment || { id: status.assignment_id, title: 'Unknown', week_number: 0, due_date: null },
      };
    })
  );

  return {
    ...couple,
    coach,
    assignmentHistory,
  };
}
