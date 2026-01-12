import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Modal, ModalFooter } from '../ui/modal';
import type { Coach } from '../../types/database';

interface CoachFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoachFormData) => Promise<void>;
  coach?: Coach | null;
  loading?: boolean;
}

export interface CoachFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export function CoachForm({ isOpen, onClose, onSubmit, coach, loading }: CoachFormProps) {
  const [formData, setFormData] = useState<CoachFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CoachFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (coach) {
      setFormData({
        first_name: coach.first_name,
        last_name: coach.last_name,
        email: coach.email,
        phone: coach.phone || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      });
    }
    setErrors({});
  }, [coach, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CoachFormData, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s\-()+ ]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Failed to save coach' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof CoachFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={coach ? 'Edit Coach' : 'Add New Coach'}
      description={coach ? 'Update coach information' : 'Enter the coach details below'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={handleChange('first_name')}
              error={errors.first_name}
              placeholder="John"
              disabled={submitting || loading}
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={handleChange('last_name')}
              error={errors.last_name}
              placeholder="Doe"
              disabled={submitting || loading}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="john.doe@example.com"
            disabled={submitting || loading}
          />

          <Input
            label="Phone (optional)"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            placeholder="(555) 123-4567"
            disabled={submitting || loading}
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting || loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || loading}>
            {submitting ? 'Saving...' : coach ? 'Update Coach' : 'Add Coach'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
