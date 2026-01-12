import { supabase } from '../lib/supabase';
import type { Coach } from '../types/database';

export interface CreateCoachData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  user_id?: string;
}

export interface UpdateCoachData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export async function getCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCoach(id: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getCoachWithCouples(id: string): Promise<{
  coach: Coach;
  couples: Array<{
    id: string;
    husband_first_name: string;
    wife_first_name: string;
    husband_last_name: string;
    email: string;
    status: string;
  }>;
} | null> {
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', id)
    .single();

  if (coachError) {
    if (coachError.code === 'PGRST116') return null;
    throw coachError;
  }

  const { data: couples, error: couplesError } = await supabase
    .from('couples')
    .select('id, husband_first_name, wife_first_name, husband_last_name, email, status')
    .eq('coach_id', id);

  if (couplesError) throw couplesError;

  return { coach, couples: couples || [] };
}

export async function createCoach(data: CreateCoachData): Promise<Coach> {
  const { data: coach, error } = await supabase
    .from('coaches')
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || null,
      user_id: data.user_id || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return coach;
}

export async function updateCoach(id: string, data: UpdateCoachData): Promise<Coach> {
  const { data: coach, error } = await supabase
    .from('coaches')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return coach;
}

export async function deleteCoach(id: string): Promise<void> {
  // First unassign all couples from this coach
  const { error: unassignError } = await supabase
    .from('couples')
    .update({ coach_id: null })
    .eq('coach_id', id);

  if (unassignError) throw unassignError;

  const { error } = await supabase
    .from('coaches')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getCoachAssignedCouplesCount(id: string): Promise<number> {
  const { count, error } = await supabase
    .from('couples')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', id);

  if (error) throw error;
  return count || 0;
}
