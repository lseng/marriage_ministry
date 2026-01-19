import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getInvitationByToken } from '../../services/invitations';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Heart, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Invitation, UserRole } from '../../types/database';

type InvitationState =
  | { status: 'loading' }
  | { status: 'valid'; invitation: Invitation }
  | { status: 'expired' }
  | { status: 'already_accepted' }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

/**
 * Validate password meets requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least 1 number');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format role for display
 */
function formatRole(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    coach: 'Marriage Coach',
    couple: 'Participating Couple',
  };
  return roleLabels[role] || role;
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitationState, setInvitationState] = useState<InvitationState>({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate invitation token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setInvitationState({ status: 'not_found' });
        return;
      }

      try {
        const invitation = await getInvitationByToken(token);

        if (!invitation) {
          setInvitationState({ status: 'not_found' });
          return;
        }

        // Check if already accepted
        if (invitation.accepted_at) {
          setInvitationState({ status: 'already_accepted' });
          return;
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          setInvitationState({ status: 'expired' });
          return;
        }

        setInvitationState({ status: 'valid', invitation });
      } catch (err) {
        setInvitationState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to validate invitation'
        });
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password requirements
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(`Password requirements: ${validation.errors.join(', ')}`);
      return;
    }

    if (invitationState.status !== 'valid') return;
    const { invitation } = invitationState;

    setIsSubmitting(true);

    try {
      // Step 1: Create auth user with Supabase signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            role: invitation.role,
            invitation_id: invitation.id,
          },
        },
      });

      if (signUpError) {
        // Handle case where user already exists
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please log in instead.');
        } else {
          setError(signUpError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Create profile record
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: invitation.email,
        role: invitation.role,
      });

      if (profileError) {
        // Profile might already exist from a trigger, which is fine
        if (!profileError.message.includes('duplicate')) {
          console.error('Profile creation error:', profileError);
        }
      }

      // Step 3: Create role-specific record if needed
      if (invitation.role === 'coach') {
        const metadata = invitation.metadata as Record<string, unknown> || {};
        await supabase.from('coaches').insert({
          user_id: authData.user.id,
          first_name: (metadata.first_name as string) || '',
          last_name: (metadata.last_name as string) || '',
          email: invitation.email,
          phone: (metadata.phone as string) || null,
          status: 'active',
        });
      } else if (invitation.role === 'couple') {
        const metadata = invitation.metadata as Record<string, unknown> || {};
        await supabase.from('couples').insert({
          user_id: authData.user.id,
          husband_first_name: (metadata.husband_first_name as string) || '',
          husband_last_name: (metadata.husband_last_name as string) || '',
          wife_first_name: (metadata.wife_first_name as string) || '',
          wife_last_name: (metadata.wife_last_name as string) || '',
          email: invitation.email,
          phone: (metadata.phone as string) || null,
          coach_id: (metadata.coach_id as string) || null,
          status: 'active',
        });
      }

      // Step 4: Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      // Success!
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading state
  if (invitationState.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Account Created!</CardTitle>
            <CardDescription>
              Your account has been created successfully. You can now sign in.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error states
  if (invitationState.status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been removed.
              Please contact your ministry administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitationState.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Invitations are valid for 7 days.
              Please contact your ministry administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitationState.status === 'already_accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been used to create an account.
              You can sign in with your existing credentials.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitationState.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Something Went Wrong</CardTitle>
            <CardDescription>
              {invitationState.message}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid invitation - show form
  const { invitation } = invitationState;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Welcome to Marriage Ministry</CardTitle>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Invitation details */}
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Role: </span>
                <span className="font-medium">{formatRole(invitation.role)}</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, 1 uppercase letter, and 1 number
              </p>
            </div>

            {/* Confirm password field */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Already have an account? Sign in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
