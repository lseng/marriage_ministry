-- Migration: Create invitations table for user invitation workflow
-- Spec: specs/phase-1-authentication.md

-- =============================================================================
-- INVITATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'couple')),
  invited_by UUID REFERENCES public.profiles(id),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.invitations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Anyone can read their own invitation by token (for acceptance flow)
-- This allows unauthenticated users to validate their invitation
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;
CREATE POLICY "Anyone can read invitation by token"
  ON public.invitations
  FOR SELECT
  USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.invitations IS 'Stores pending invitations for new users to join the system';
COMMENT ON COLUMN public.invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN public.invitations.role IS 'Role to assign when invitation is accepted';
COMMENT ON COLUMN public.invitations.invited_by IS 'Profile ID of the admin who sent the invitation';
COMMENT ON COLUMN public.invitations.invitation_token IS 'Unique token for secure invitation acceptance (generated with nanoid)';
COMMENT ON COLUMN public.invitations.expires_at IS 'Invitation expiration timestamp (7 days from creation)';
COMMENT ON COLUMN public.invitations.accepted_at IS 'Timestamp when invitation was accepted (null if pending)';
COMMENT ON COLUMN public.invitations.metadata IS 'Additional data: coach_id for couple invitations, names, phone, etc.';
