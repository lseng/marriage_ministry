import { supabase } from '../lib/supabase';
import type { Invitation, InvitationInsert, UserRole, Json } from '../types/database';

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  metadata?: Record<string, unknown>;
}

export interface InvitationWithInviter extends Invitation {
  inviter?: {
    email: string;
  } | null;
}

/**
 * Generate a secure random token for invitation links
 * Uses crypto API for cryptographically secure random values
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get all invitations (admin only)
 */
export async function getInvitations(): Promise<InvitationWithInviter[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invited_by(email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get pending invitations (not accepted, not expired)
 */
export async function getPendingInvitations(): Promise<InvitationWithInviter[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invited_by(email)
    `)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get an invitation by its token (for acceptance flow)
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('invitation_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Create a new invitation
 * @param data - Invitation data including email, role, and optional metadata
 * @param invitedBy - Profile ID of the admin creating the invitation
 * @returns The created invitation
 */
export async function createInvitation(
  data: CreateInvitationData,
  invitedBy: string
): Promise<Invitation> {
  // Generate secure token and set expiry to 7 days from now
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const insertData: InvitationInsert = {
    email: data.email.toLowerCase().trim(),
    role: data.role,
    invited_by: invitedBy,
    invitation_token: token,
    expires_at: expiresAt.toISOString(),
    metadata: (data.metadata || {}) as Json,
  };

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return invitation;
}

/**
 * Check if an email already has a pending invitation
 */
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase().trim())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return (count || 0) > 0;
}

/**
 * Cancel/delete an invitation (admin only)
 */
export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Resend an invitation by creating a new one with fresh expiry
 */
export async function resendInvitation(id: string, invitedBy: string): Promise<Invitation> {
  // Get the existing invitation
  const { data: existing, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Invitation not found');

  // Delete the old invitation
  await deleteInvitation(id);

  // Create a new one with fresh token and expiry
  return createInvitation(
    {
      email: existing.email,
      role: existing.role as UserRole,
      metadata: existing.metadata as Record<string, unknown>,
    },
    invitedBy
  );
}

/**
 * Build the invitation URL from a token
 */
export function getInvitationUrl(token: string): string {
  return `${window.location.origin}/auth/accept-invite?token=${token}`;
}
