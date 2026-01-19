# Phase 1: Authentication & Account Creation

> **Reference**: See `specs/marriage-ministry-master-plan.md` for full context
> **Brand Guide**: See `specs/resonate-brand-guide.pdf`
> **Priority**: Critical - Foundation

---

## Overview

Implement complete authentication flows for all user roles (Admin, Coach, Couple) including account creation, login, password management, and session handling.

## Current State

- Basic Supabase Auth integration exists in `contexts/AuthContext.tsx`
- Email/password and magic link login implemented
- Profile fetching tied to authentication
- RLS policies exist but need enhancement

## Goals

1. Admin-initiated account creation for coaches and couples
2. Secure password management with reset flows
3. Email verification for new accounts
4. Invitation system with expiring tokens
5. Session management with concurrent device limits

---

## Database Changes

### File: `supabase/migrations/[timestamp]_auth_enhancements.sql`

```sql
-- Add password reset tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Invitation tracking
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'couple')),
  invited_by UUID REFERENCES profiles(id),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Store coach_id for couple invitations, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session tracking for concurrent device limit
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB,
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);

-- RLS for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON invitations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS for sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages sessions"
  ON user_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Implementation Steps

### Step 1: Invitation Service

**File: `services/invitations.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export interface CreateInvitationParams {
  email: string;
  role: 'admin' | 'coach' | 'couple';
  invitedBy: string;
  metadata?: Record<string, any>;
}

export async function createInvitation(params: CreateInvitationParams): Promise<{
  success: boolean;
  invitation?: { id: string; token: string };
  error?: string;
}> {
  // Check if email already has an account
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', params.email)
    .single();

  if (existingProfile) {
    return { success: false, error: 'User already exists with this email' };
  }

  // Check for pending invitation
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('email', params.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingInvite) {
    return { success: false, error: 'Pending invitation already exists' };
  }

  // Create invitation
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email: params.email,
      role: params.role,
      invited_by: params.invitedBy,
      invitation_token: token,
      expires_at: expiresAt.toISOString(),
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    invitation: { id: data.id, token: data.invitation_token },
  };
}

export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation?: {
    id: string;
    email: string;
    role: string;
    metadata: Record<string, any>;
  };
  error?: string;
}> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('invitation_token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or expired invitation' };
  }

  return {
    valid: true,
    invitation: {
      id: data.id,
      email: data.email,
      role: data.role,
      metadata: data.metadata,
    },
  };
}

export async function acceptInvitation(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateInvitation(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const invitation = validation.invitation!;

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: invitation.email,
    role: invitation.role,
    email_verified: true,
    email_verified_at: new Date().toISOString(),
  });

  if (profileError) {
    // Rollback auth user creation
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: profileError.message };
  }

  // Create role-specific record
  if (invitation.role === 'coach') {
    await createCoachFromInvitation(authData.user.id, invitation.metadata);
  } else if (invitation.role === 'couple') {
    await createCoupleFromInvitation(authData.user.id, invitation.metadata);
  }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return { success: true };
}

async function createCoachFromInvitation(profileId: string, metadata: Record<string, any>) {
  await supabase.from('coaches').insert({
    profile_id: profileId,
    first_name: metadata.first_name || '',
    last_name: metadata.last_name || '',
    email: metadata.email || '',
    phone: metadata.phone || '',
    status: 'active',
  });
}

async function createCoupleFromInvitation(profileId: string, metadata: Record<string, any>) {
  await supabase.from('couples').insert({
    profile_id: profileId,
    husband_first_name: metadata.husband_first_name || '',
    husband_last_name: metadata.husband_last_name || '',
    wife_first_name: metadata.wife_first_name || '',
    wife_last_name: metadata.wife_last_name || '',
    email: metadata.email || '',
    phone: metadata.phone || '',
    coach_id: metadata.coach_id || null,
    status: 'active',
    stage: metadata.stage || 'pre-marital',
  });
}
```

### Step 2: Enhanced Auth Context

**File: `contexts/AuthContext.tsx`** (modifications)

Add to existing context:
- Account lockout handling
- Session tracking
- Password reset required redirect

```typescript
// Add to AuthContextType
interface AuthContextType {
  // ... existing properties
  isLocked: boolean;
  lockoutEndsAt: Date | null;
  requiresPasswordReset: boolean;
  activeSessions: number;
}

// Add lockout check to login
async function signIn(email: string, password: string) {
  // Check for account lockout
  const { data: profile } = await supabase
    .from('profiles')
    .select('locked_until, failed_login_attempts')
    .eq('email', email)
    .single();

  if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
    throw new Error(`Account locked until ${new Date(profile.locked_until).toLocaleTimeString()}`);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Reset failed attempts on success
    await supabase
      .from('profiles')
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq('email', email);

    // Track session
    await trackSession(data.session);

    return data;
  } catch (error) {
    // Increment failed attempts
    const newAttempts = (profile?.failed_login_attempts || 0) + 1;
    const updates: any = { failed_login_attempts: newAttempts };

    // Lock after 5 failed attempts
    if (newAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updates.locked_until = lockUntil.toISOString();
    }

    await supabase.from('profiles').update(updates).eq('email', email);
    throw error;
  }
}

async function trackSession(session: Session) {
  await supabase.from('user_sessions').insert({
    user_id: session.user.id,
    session_token: session.access_token.slice(-16), // Store partial for matching
    device_info: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    },
    expires_at: new Date(session.expires_at! * 1000).toISOString(),
  });

  // Enforce concurrent session limit (3 devices)
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (sessions && sessions.length > 3) {
    // Remove oldest sessions
    const toRemove = sessions.slice(3).map(s => s.id);
    await supabase.from('user_sessions').delete().in('id', toRemove);
  }
}
```

### Step 3: Password Reset Flow

**File: `services/password.ts`**

```typescript
import { supabase } from '@/lib/supabase';

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Verify email exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    // Don't reveal if email exists
    return { success: true };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetPassword(newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Validate password requirements
  if (!isValidPassword(newPassword)) {
    return {
      success: false,
      error: 'Password must be at least 8 characters with 1 uppercase and 1 number',
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  // Clear password reset required flag
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ password_reset_required: false })
      .eq('id', user.id);
  }

  return { success: true };
}

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
```

### Step 4: Invitation Accept Page

**File: `pages/auth/accept-invite.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { validateInvitation, acceptInvitation } from '@/services/invitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setError('Invalid invitation link');
        setIsLoading(false);
        return;
      }

      const result = await validateInvitation(token);
      if (!result.valid) {
        setError(result.error || 'Invalid or expired invitation');
      } else {
        setInvitation({
          email: result.invitation!.email,
          role: result.invitation!.role,
        });
      }
      setIsLoading(false);
    }

    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with 1 uppercase and 1 number');
      return;
    }

    setIsSubmitting(true);

    const result = await acceptInvitation(token!, password);
    if (!result.success) {
      setError(result.error || 'Failed to create account');
      setIsSubmitting(false);
      return;
    }

    navigate('/login?message=Account created successfully. Please log in.');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-resonate-blue" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-resonate-dark-gray">
            Welcome to Marriage Ministry
          </h1>
          <p className="text-gray-600 mt-2">
            Create your account to get started
          </p>
        </div>

        <div className="bg-resonate-blue/10 rounded-lg p-4 mb-6">
          <p className="text-sm text-resonate-dark-gray">
            <strong>Email:</strong> {invitation?.email}
          </p>
          <p className="text-sm text-resonate-dark-gray">
            <strong>Role:</strong> {invitation?.role}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters, 1 uppercase, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

### Step 5: Send Invitation Email

**File: `supabase/functions/send-invitation/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL');

serve(async (req) => {
  const { email, role, token, inviterName } = await req.json();

  const inviteUrl = `${APP_URL}/auth/accept-invite?token=${token}`;

  const roleDisplay = {
    admin: 'Administrator',
    coach: 'Marriage Coach',
    couple: 'Participating Couple',
  }[role];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Resonate Marriage Ministry <noreply@resonatemovement.org>',
      to: email,
      subject: "You're Invited to Marriage Ministry",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #41748d 0%, #50a684 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">Resonate Marriage Ministry</h1>
          </div>

          <div style="padding: 40px; background: #ffffff;">
            <p style="color: #373a36; font-size: 16px; line-height: 1.6;">
              Hi there!
            </p>

            <p style="color: #373a36; font-size: 16px; line-height: 1.6;">
              ${inviterName} has invited you to join the Resonate Marriage Ministry platform as a <strong>${roleDisplay}</strong>.
            </p>

            <p style="color: #373a36; font-size: 16px; line-height: 1.6;">
              Click the button below to create your account and get started:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}"
                 style="background-color: #41748d; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #545454; font-size: 14px; line-height: 1.6;">
              This invitation will expire in 7 days. If you have any questions, please contact your ministry leader.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

            <p style="color: #545454; font-size: 12px; text-align: center;">
              Resonate Movement<br>
              40650 Encyclopedia Cir., Fremont, CA 94538
            </p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
});
```

---

## Component Updates

### Update Coach Creation Flow

**File: `components/coaches/CoachForm.tsx`** (modify)

Add invitation sending after form submission:

```typescript
async function handleSubmit(values: CoachFormValues) {
  // ... existing coach creation logic

  // Send invitation
  const invitation = await createInvitation({
    email: values.email,
    role: 'coach',
    invitedBy: currentUser.id,
    metadata: {
      first_name: values.firstName,
      last_name: values.lastName,
      phone: values.phone,
    },
  });

  if (invitation.success) {
    // Call edge function to send email
    await supabase.functions.invoke('send-invitation', {
      body: {
        email: values.email,
        role: 'coach',
        token: invitation.invitation!.token,
        inviterName: currentUser.name,
      },
    });

    toast.success('Coach invited successfully');
  }
}
```

### Update Couple Creation Flow

**File: `components/couples/CoupleForm.tsx`** (modify)

Similar pattern for couple invitations.

---

## Routes

Add to `App.tsx`:

```typescript
<Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
<Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
```

---

## Testing Requirements

### Unit Tests

```typescript
// services/__tests__/invitations.test.ts
describe('Invitations Service', () => {
  test('creates valid invitation', async () => {
    const result = await createInvitation({
      email: 'new@test.com',
      role: 'coach',
      invitedBy: 'admin-id',
    });
    expect(result.success).toBe(true);
    expect(result.invitation?.token).toHaveLength(32);
  });

  test('rejects duplicate email', async () => {
    const result = await createInvitation({
      email: 'existing@test.com', // Already has account
      role: 'coach',
      invitedBy: 'admin-id',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  test('validates expired invitation', async () => {
    const result = await validateInvitation('expired-token');
    expect(result.valid).toBe(false);
  });
});
```

### E2E Tests

```typescript
// e2e/invitation-flow.spec.ts
describe('Invitation Flow', () => {
  test('Admin invites coach, coach accepts', async ({ page }) => {
    // Admin creates invitation
    await loginAs(page, 'admin');
    await page.goto('/coaches');
    await page.click('[data-testid="add-coach"]');
    await page.fill('[name="email"]', 'newcoach@test.com');
    await page.fill('[name="firstName"]', 'New');
    await page.fill('[name="lastName"]', 'Coach');
    await page.click('[data-testid="submit"]');

    // Get invitation token from database
    const token = await getInvitationToken('newcoach@test.com');

    // Coach accepts invitation
    await page.goto(`/auth/accept-invite?token=${token}`);
    await page.fill('[name="password"]', 'Password123');
    await page.fill('[name="confirmPassword"]', 'Password123');
    await page.click('[data-testid="submit"]');

    // Verify redirect to login
    await expect(page).toHaveURL('/login');

    // Coach can log in
    await page.fill('[name="email"]', 'newcoach@test.com');
    await page.fill('[name="password"]', 'Password123');
    await page.click('[type="submit"]');
    await expect(page).toHaveURL('/');
  });
});
```

---

## Acceptance Criteria

- [ ] Admin can invite coaches via email
- [ ] Admin can invite couples via email
- [ ] Invited users receive email with accept link
- [ ] Accept page validates invitation token
- [ ] Accept page enforces password requirements
- [ ] Account created with correct role after acceptance
- [ ] Role-specific record (coach/couple) created automatically
- [ ] Invitation marked as accepted after use
- [ ] Expired invitations rejected
- [ ] Account lockout after 5 failed login attempts
- [ ] Password reset flow works end-to-end
- [ ] Sessions tracked per device
- [ ] Maximum 3 concurrent sessions enforced
