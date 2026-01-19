import { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useToast } from '../ui/toast';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess: () => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}: ProfileEditModalProps) {
  const { updateEmail, updatePassword, verifyPassword, updating } = useUpdateProfile();
  const { addToast } = useToast();

  // Email form state
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const resetForm = () => {
    setNewEmail('');
    setEmailError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleUpdateEmail = async () => {
    setEmailError('');

    if (!newEmail) {
      setEmailError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (newEmail === currentEmail) {
      setEmailError('New email must be different from current email');
      return;
    }

    try {
      await updateEmail(newEmail);
      addToast({
        type: 'success',
        title: 'Email updated',
        description: 'Your email has been updated successfully. Please check your new email for verification.',
      });
      setNewEmail('');
      onSuccess();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to update email');
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Verify current password first
    const isValid = await verifyPassword(currentEmail, currentPassword);
    if (!isValid) {
      setPasswordError('Current password is incorrect');
      return;
    }

    try {
      await updatePassword(newPassword);
      addToast({
        type: 'success',
        title: 'Password updated',
        description: 'Your password has been updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Profile">
      <div className="space-y-8">
        {/* Email Section */}
        <div>
          <h3 className="font-medium text-lg mb-4">Change Email</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Current Email
              </label>
              <p className="text-foreground">{currentEmail}</p>
            </div>
            <Input
              label="New Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              error={emailError}
            />
            <Button
              onClick={handleUpdateEmail}
              disabled={updating || !newEmail}
              className="w-full sm:w-auto"
            >
              {updating ? 'Updating...' : 'Update Email'}
            </Button>
          </div>
        </div>

        <hr className="border-border" />

        {/* Password Section */}
        <div>
          <h3 className="font-medium text-lg mb-4">Change Password</h3>
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              error={passwordError}
            />
            <Button
              onClick={handleUpdatePassword}
              disabled={updating || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
