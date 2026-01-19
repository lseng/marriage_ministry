import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Mail, Copy, Check, AlertCircle } from 'lucide-react';
import { createInvitation, hasPendingInvitation, getInvitationUrl } from '../../services/invitations';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole, Invitation } from '../../types/database';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onSuccess?: (invitation: Invitation) => void;
}

interface FormData {
  email: string;
  role: UserRole;
}

interface FormErrors {
  email?: string;
  role?: string;
  submit?: string;
}

export function InviteUserModal({
  isOpen,
  onClose,
  defaultRole,
  onSuccess,
}: InviteUserModalProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: defaultRole || 'coach',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ invitation: Invitation; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset form when modal opens/closes or default role changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        role: defaultRole || 'coach',
      });
      setErrors({});
      setSuccess(null);
      setCopied(false);
    }
  }, [isOpen, defaultRole]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate role
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!profile?.id) {
      setErrors({ submit: 'You must be logged in to send invitations' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Check for existing pending invitation
      const hasPending = await hasPendingInvitation(formData.email);
      if (hasPending) {
        setErrors({ email: 'This email already has a pending invitation' });
        setSubmitting(false);
        return;
      }

      // Create the invitation
      const invitation = await createInvitation(
        {
          email: formData.email,
          role: formData.role,
        },
        profile.id
      );

      const url = getInvitationUrl(invitation.invitation_token);
      setSuccess({ invitation, url });
      onSuccess?.(invitation);
    } catch (err) {
      console.error('Error creating invitation:', err);
      setErrors({
        submit: err instanceof Error ? err.message : 'Failed to create invitation',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!success?.url) return;

    try {
      await navigator.clipboard.writeText(success.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const roleOptions = [
    { value: 'coach', label: 'Coach' },
    { value: 'couple', label: 'Couple' },
  ];

  // Success state - show invitation link
  if (success) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Invitation Created"
        description={`Invitation sent to ${success.invitation.email}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span>Invitation Link</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-background p-2 rounded border truncate">
                {success.url}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy to clipboard'}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Share this link with <strong>{success.invitation.email}</strong> to complete their account setup.
            The invitation expires in 7 days.
          </p>
        </div>

        <ModalFooter>
          <Button onClick={onClose}>Done</Button>
        </ModalFooter>
      </Modal>
    );
  }

  // Form state
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite User"
      description="Send an invitation to join the marriage ministry"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
            error={errors.email}
            disabled={submitting}
            autoFocus
          />

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            options={roleOptions}
            error={errors.role}
            disabled={submitting || !!defaultRole}
          />

          {errors.submit && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
