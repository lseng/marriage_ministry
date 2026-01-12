import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Modal, ModalFooter } from '../ui/modal';
import type { Assignment } from '../../types/database';

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AssignmentFormData) => Promise<void>;
  assignment?: Assignment | null;
  loading?: boolean;
}

export interface AssignmentFormData {
  title: string;
  description?: string;
  content: string;
  week_number: number;
  due_date?: string;
}

export function AssignmentForm({ isOpen, onClose, onSubmit, assignment, loading }: AssignmentFormProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    content: '',
    week_number: 1,
    due_date: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AssignmentFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title,
        description: assignment.description || '',
        content: assignment.content,
        week_number: assignment.week_number,
        due_date: assignment.due_date || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        content: '',
        week_number: 1,
        due_date: '',
      });
    }
    setErrors({});
  }, [assignment, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AssignmentFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (formData.week_number < 1) {
      newErrors.week_number = 'Week number must be at least 1';
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
      setErrors({ title: err instanceof Error ? err.message : 'Failed to save assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof AssignmentFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'week_number' ? parseInt(e.target.value) || 1 : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignment ? 'Edit Assignment' : 'Create New Assignment'}
      description={assignment ? 'Update assignment details' : 'Create a new assignment for couples'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Title"
                value={formData.title}
                onChange={handleChange('title')}
                error={errors.title}
                placeholder="Week 1: Communication Basics"
                disabled={submitting || loading}
              />
            </div>
            <Input
              label="Week Number"
              type="number"
              min={1}
              value={formData.week_number.toString()}
              onChange={handleChange('week_number')}
              error={errors.week_number}
              disabled={submitting || loading}
            />
          </div>

          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Brief description of this week's assignment..."
            disabled={submitting || loading}
          />

          <Textarea
            label="Content"
            value={formData.content}
            onChange={handleChange('content')}
            error={errors.content}
            placeholder="Enter the full assignment content here..."
            className="min-h-[200px]"
            disabled={submitting || loading}
          />

          <Input
            label="Due Date (optional)"
            type="date"
            value={formData.due_date}
            onChange={handleChange('due_date')}
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
            {submitting ? 'Saving...' : assignment ? 'Update Assignment' : 'Create Assignment'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
