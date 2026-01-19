-- Migration: Add security fields to profiles for account lockout
-- Spec: specs/phase-1-authentication.md

-- =============================================================================
-- ADD SECURITY COLUMNS TO PROFILES
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for efficient lockout checking
CREATE INDEX IF NOT EXISTS idx_profiles_locked_until ON public.profiles(locked_until)
  WHERE locked_until IS NOT NULL;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to check if a user is currently locked out
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  lock_timestamp TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO lock_timestamp
  FROM public.profiles
  WHERE email = user_email;

  IF lock_timestamp IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN lock_timestamp > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failed login attempts and lock if threshold reached
-- Returns the number of remaining attempts (0 = locked)
CREATE OR REPLACE FUNCTION public.record_failed_login(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_attempts INTEGER;
  max_attempts CONSTANT INTEGER := 5;
  lockout_duration CONSTANT INTERVAL := '30 minutes';
BEGIN
  -- Get current attempts and increment
  UPDATE public.profiles
  SET
    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
    locked_until = CASE
      WHEN COALESCE(failed_login_attempts, 0) + 1 >= max_attempts
      THEN NOW() + lockout_duration
      ELSE locked_until
    END,
    updated_at = NOW()
  WHERE email = user_email
  RETURNING failed_login_attempts INTO current_attempts;

  -- Return remaining attempts (negative means locked)
  RETURN max_attempts - current_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_logins(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lockout status for a user
CREATE OR REPLACE FUNCTION public.get_lockout_status(user_email TEXT)
RETURNS TABLE(
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ,
  failed_attempts INTEGER,
  remaining_attempts INTEGER
) AS $$
DECLARE
  max_attempts CONSTANT INTEGER := 5;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.locked_until > NOW(), FALSE) AS is_locked,
    p.locked_until,
    COALESCE(p.failed_login_attempts, 0) AS failed_attempts,
    GREATEST(0, max_attempts - COALESCE(p.failed_login_attempts, 0)) AS remaining_attempts
  FROM public.profiles p
  WHERE p.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.profiles.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN public.profiles.locked_until IS 'Account is locked until this timestamp (NULL = not locked)';
COMMENT ON FUNCTION public.is_account_locked(TEXT) IS 'Check if user account is currently locked';
COMMENT ON FUNCTION public.record_failed_login(TEXT) IS 'Increment failed attempts, lock if threshold (5) reached';
COMMENT ON FUNCTION public.clear_failed_logins(TEXT) IS 'Reset failed login counter on successful login';
COMMENT ON FUNCTION public.get_lockout_status(TEXT) IS 'Get full lockout status for a user';
