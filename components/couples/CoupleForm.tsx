import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Modal, ModalFooter } from '../ui/modal';
import { useCoachOptions } from '../../hooks/useCouples';
import type { Couple } from '../../types/database';

interface CoupleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoupleFormData) => Promise<void>;
  couple?: Couple | null;
  loading?: boolean;
}

export interface CoupleFormData {
  husband_first_name: string;
  husband_last_name: string;
  wife_first_name: string;
  wife_last_name: string;
  email: string;
  phone?: string;
  coach_id?: string;
  wedding_date?: string;
}

export function CoupleForm({ isOpen, onClose, onSubmit, couple, loading }: CoupleFormProps) {
  const { coaches, loading: loadingCoaches } = useCoachOptions();
  const [formData, setFormData] = useState<CoupleFormData>({
    husband_first_name: '',
    husband_last_name: '',
    wife_first_name: '',
    wife_last_name: '',
    email: '',
    phone: '',
    coach_id: '',
    wedding_date: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CoupleFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (couple) {
      setFormData({
        husband_first_name: couple.husband_first_name,
        husband_last_name: couple.husband_last_name,
        wife_first_name: couple.wife_first_name,
        wife_last_name: couple.wife_last_name,
        email: couple.email,
        phone: couple.phone || '',
        coach_id: couple.coach_id || '',
        wedding_date: couple.wedding_date || '',
      });
    } else {
      setFormData({
        husband_first_name: '',
        husband_last_name: '',
        wife_first_name: '',
        wife_last_name: '',
        email: '',
        phone: '',
        coach_id: '',
        wedding_date: '',
      });
    }
    setErrors({});
  }, [couple, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CoupleFormData, string>> = {};

    if (!formData.husband_first_name.trim()) {
      newErrors.husband_first_name = 'Required';
    }
    if (!formData.husband_last_name.trim()) {
      newErrors.husband_last_name = 'Required';
    }
    if (!formData.wife_first_name.trim()) {
      newErrors.wife_first_name = 'Required';
    }
    if (!formData.wife_last_name.trim()) {
      newErrors.wife_last_name = 'Required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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
      setErrors({ email: err instanceof Error ? err.message : 'Failed to save couple' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof CoupleFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const coachOptions = coaches.map(c => ({ value: c.id, label: c.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={couple ? 'Edit Couple' : 'Add New Couple'}
      description={couple ? 'Update couple information' : 'Enter the couple details below'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Husband Info */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Husband</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.husband_first_name}
                onChange={handleChange('husband_first_name')}
                error={errors.husband_first_name}
                placeholder="John"
                disabled={submitting || loading}
              />
              <Input
                label="Last Name"
                value={formData.husband_last_name}
                onChange={handleChange('husband_last_name')}
                error={errors.husband_last_name}
                placeholder="Smith"
                disabled={submitting || loading}
              />
            </div>
          </div>

          {/* Wife Info */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Wife</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.wife_first_name}
                onChange={handleChange('wife_first_name')}
                error={errors.wife_first_name}
                placeholder="Jane"
                disabled={submitting || loading}
              />
              <Input
                label="Last Name"
                value={formData.wife_last_name}
                onChange={handleChange('wife_last_name')}
                error={errors.wife_last_name}
                placeholder="Smith"
                disabled={submitting || loading}
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={errors.email}
              placeholder="smiths@example.com"
              disabled={submitting || loading}
            />
            <Input
              label="Phone (optional)"
              type="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="(555) 123-4567"
              disabled={submitting || loading}
            />
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assigned Coach (optional)"
              value={formData.coach_id}
              onChange={handleChange('coach_id')}
              options={coachOptions}
              placeholder="Select a coach"
              disabled={submitting || loading || loadingCoaches}
            />
            <Input
              label="Wedding Date (optional)"
              type="date"
              value={formData.wedding_date}
              onChange={handleChange('wedding_date')}
              disabled={submitting || loading}
            />
          </div>
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
            {submitting ? 'Saving...' : couple ? 'Update Couple' : 'Add Couple'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
