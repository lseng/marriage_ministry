import { useState, useEffect, useCallback } from 'react';
import {
  getInvitations,
  getPendingInvitations,
  deleteInvitation,
  resendInvitation,
  type InvitationWithInviter,
} from '../services/invitations';
import { useAuth } from '../contexts/AuthContext';

interface UseInvitationsOptions {
  pendingOnly?: boolean;
}

interface UseInvitationsReturn {
  invitations: InvitationWithInviter[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  resend: (id: string) => Promise<void>;
}

export function useInvitations(options: UseInvitationsOptions = {}): UseInvitationsReturn {
  const { pendingOnly = false } = options;
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<InvitationWithInviter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = pendingOnly ? await getPendingInvitations() : await getInvitations();
      setInvitations(data);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [pendingOnly]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      console.error('Error deleting invitation:', err);
      throw err;
    }
  }, []);

  const resend = useCallback(async (id: string) => {
    if (!profile?.id) {
      throw new Error('You must be logged in to resend invitations');
    }

    try {
      const newInvitation = await resendInvitation(id, profile.id);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === id ? { ...newInvitation, inviter: inv.inviter } : inv))
      );
    } catch (err) {
      console.error('Error resending invitation:', err);
      throw err;
    }
  }, [profile?.id]);

  return {
    invitations,
    loading,
    error,
    refresh: fetchInvitations,
    remove,
    resend,
  };
}
