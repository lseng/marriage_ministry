import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useHomework } from '../../hooks/useHomework';
import type { FormField, FormResponses, FormTemplate } from '../../types/forms';
import { validateFormResponses } from '../../types/forms';
import { Save, Send, AlertCircle, CheckCircle } from 'lucide-react';

interface HomeworkFormProps {
  assignmentStatusId: string;
  coupleId: string;
  template: FormTemplate | null;
  assignmentContent?: string;
  onComplete?: () => void;
}

const LOCAL_STORAGE_KEY_PREFIX = 'homework_draft_';

export function HomeworkForm({
  assignmentStatusId,
  coupleId,
  template,
  assignmentContent,
  onComplete,
}: HomeworkFormProps) {
  const { response, loading, error, saving, saveDraft, submit } = useHomework(
    assignmentStatusId,
    coupleId
  );

  const [formData, setFormData] = useState<FormResponses>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get the storage key for this specific assignment
  const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${assignmentStatusId}`;

  // Initialize form data from response, draft, or localStorage
  useEffect(() => {
    if (response) {
      // If submitted, show the submitted responses
      if (!response.is_draft && response.submitted_at) {
        setFormData(response.responses);
        setSubmitSuccess(true);
        return;
      }

      // If draft, use draft responses
      if (response.draft_responses) {
        setFormData(response.draft_responses);
        return;
      }

      // Otherwise use the saved responses
      setFormData(response.responses);
    } else {
      // Try to load from localStorage
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setFormData(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [response, storageKey]);

  // Save to localStorage on change (debounced)
  useEffect(() => {
    if (Object.keys(formData).length > 0 && !submitSuccess) {
      const timeout = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData, storageKey, submitSuccess]);

  // Auto-save draft to server periodically
  const autoSaveDraft = useCallback(async () => {
    if (Object.keys(formData).length > 0 && !submitSuccess && !saving) {
      try {
        setSaveStatus('saving');
        await saveDraft(formData);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }
  }, [formData, submitSuccess, saving, saveDraft]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (submitSuccess) return;

    const interval = setInterval(autoSaveDraft, 30000);
    return () => clearInterval(interval);
  }, [autoSaveDraft, submitSuccess]);

  const handleFieldChange = (fieldId: string, value: FormResponses[string]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user types
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaveStatus('saving');
      await saveDraft(formData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (template) {
      const validation = validateFormResponses(template.fields, formData);
      if (!validation.isValid) {
        const newErrors: Record<string, string> = {};
        validation.errors.forEach((err) => {
          newErrors[err.fieldId] = err.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    try {
      await submit(formData);
      // Clear localStorage on successful submit
      localStorage.removeItem(storageKey);
      setSubmitSuccess(true);
      onComplete?.();
    } catch {
      // Error is handled by the hook
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const fieldError = errors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <Input
            label={field.label}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            error={fieldError}
            disabled={submitSuccess}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            label={field.label}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            error={fieldError}
            disabled={submitSuccess}
            required={field.required}
            className="min-h-[120px]"
          />
        );

      case 'select':
        return (
          <Select
            label={field.label}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            options={field.options?.map((opt) => ({ value: opt.value, label: opt.label })) || []}
            placeholder={field.placeholder || 'Select an option...'}
            error={fieldError}
            disabled={submitSuccess}
            required={field.required}
          />
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    disabled={submitSuccess}
                    className="h-4 w-4 text-primary focus:ring-primary border-input"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => {
                const checkedValues = Array.isArray(value) ? value : [];
                return (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={checkedValues.includes(option.value)}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...checkedValues, option.value]
                          : checkedValues.filter((v) => v !== option.value);
                        handleFieldChange(field.id, newValues);
                      }}
                      disabled={submitSuccess}
                      className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                );
              })}
            </div>
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );

      case 'scale': {
        const min = field.min ?? 1;
        const max = field.max ?? 10;
        const scaleValue = typeof value === 'number' ? value : null;
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{min}</span>
              <div className="flex-1 flex gap-1">
                {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleFieldChange(field.id, num)}
                    disabled={submitSuccess}
                    className={`flex-1 py-2 px-1 text-sm rounded border transition-colors ${
                      scaleValue === num
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    } ${submitSuccess ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{max}</span>
            </div>
            {field.helperText && (
              <p className="text-sm text-muted-foreground">{field.helperText}</p>
            )}
            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
          </div>
        );
      }

      case 'date':
        return (
          <Input
            type="date"
            label={field.label}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            error={fieldError}
            disabled={submitSuccess}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            label={field.label}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.valueAsNumber || '')}
            placeholder={field.placeholder}
            error={fieldError}
            disabled={submitSuccess}
            required={field.required}
            min={field.min}
            max={field.max}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Homework Submitted!</h2>
        <p className="text-muted-foreground mb-6">
          Your responses have been saved successfully. Your coach will review them soon.
        </p>

        {/* Show submitted responses */}
        {template && (
          <div className="mt-6 text-left border-t pt-6">
            <h3 className="font-medium mb-4">Your Responses:</h3>
            <div className="space-y-4">
              {template.fields.map((field) => (
                <div key={field.id} className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {field.label}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {Array.isArray(formData[field.id])
                      ? (formData[field.id] as string[]).join(', ')
                      : String(formData[field.id] || '-')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Content */}
      {assignmentContent && (
        <Card className="p-6">
          <h3 className="font-medium mb-3">Assignment Instructions</h3>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
            {assignmentContent}
          </div>
        </Card>
      )}

      {/* Form */}
      <Card className="p-6">
        {error && (
          <div className="mb-6 rounded-md bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {template ? (
          <div className="space-y-6">
            {template.fields.map((field) => (
              <div key={field.id}>{renderField(field)}</div>
            ))}
          </div>
        ) : (
          /* Default single textarea if no template */
          <Textarea
            label="Your Response"
            value={String(formData.response || '')}
            onChange={(e) => handleFieldChange('response', e.target.value)}
            placeholder="Write your response here..."
            className="min-h-[200px]"
            required
          />
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saveStatus === 'saving' && (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Draft saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Failed to save</span>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
            >
              <Send className="h-4 w-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit Homework'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
