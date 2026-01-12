import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { Modal, ModalFooter } from '../ui/modal';
import { EmptyState } from '../ui/empty-state';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useFormTemplates } from '../../hooks/useHomework';
import type { FormField, FormFieldType, FormTemplate, FormFieldOption } from '../../types/forms';
import { createFormField } from '../../types/forms';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  Copy,
  FileText,
  Edit,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
} from 'lucide-react';

// Field type options for the builder
const FIELD_TYPES: { value: FormFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Short Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'select', label: 'Dropdown', description: 'Select from options' },
  { value: 'radio', label: 'Single Choice', description: 'Choose one option' },
  { value: 'checkbox', label: 'Multiple Choice', description: 'Choose multiple options' },
  { value: 'scale', label: 'Scale', description: 'Numeric rating scale' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
];

export function FormBuilder() {
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, refresh } =
    useFormTemplates(true);

  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate({
      id: '',
      name: '',
      description: '',
      fields: [],
      is_active: true,
      created_by: null,
      created_at: '',
      updated_at: '',
    });
  };

  const handleEdit = (template: FormTemplate) => {
    setIsCreating(false);
    setEditingTemplate({ ...template, fields: [...template.fields] });
  };

  const handleDelete = async (template: FormTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"? This will deactivate the template.`)) {
      await deleteTemplate(template.id);
    }
  };

  const handleToggleActive = async (template: FormTemplate) => {
    await updateTemplate(template.id, { is_active: !template.is_active });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error loading templates"
        description={error}
        action={{ label: 'Try again', onClick: refresh }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Form Templates</h2>
          <p className="text-muted-foreground">Create and manage dynamic homework forms</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={FileText}
            title="No form templates"
            description="Create your first form template to start building dynamic homework forms."
            action={{ label: 'Create Template', onClick: handleCreate }}
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <Badge variant={template.is_active ? 'success' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {template.description && (
                    <p className="text-muted-foreground mb-3">{template.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    title={template.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <ToggleLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editingTemplate && (
        <FormEditorModal
          template={editingTemplate}
          isCreating={isCreating}
          onSave={async (template) => {
            if (isCreating) {
              await createTemplate({
                name: template.name,
                description: template.description || undefined,
                fields: template.fields,
                is_active: template.is_active,
              });
            } else {
              await updateTemplate(template.id, {
                name: template.name,
                description: template.description || undefined,
                fields: template.fields,
                is_active: template.is_active,
              });
            }
            setEditingTemplate(null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <FormPreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

// Form Editor Modal
interface FormEditorModalProps {
  template: FormTemplate;
  isCreating: boolean;
  onSave: (template: FormTemplate) => Promise<void>;
  onClose: () => void;
}

function FormEditorModal({ template, isCreating, onSave, onClose }: FormEditorModalProps) {
  const [formData, setFormData] = useState<FormTemplate>(template);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addField = (type: FormFieldType) => {
    const newField = createFormField(type);
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setEditingField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
    if (editingField?.id === fieldId) {
      setEditingField((prev) => prev && { ...prev, ...updates });
    }
  };

  const removeField = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    if (editingField?.id === fieldId) {
      setEditingField(null);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const index = prev.fields.findIndex((f) => f.id === fieldId);
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.fields.length - 1)
      ) {
        return prev;
      }
      const newFields = [...prev.fields];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      return { ...prev, fields: newFields };
    });
  };

  const duplicateField = (field: FormField) => {
    const newField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `${field.label} (Copy)`,
    };
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isCreating ? 'Create Form Template' : 'Edit Form Template'}
      size="lg"
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Template Info */}
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Week 1 Reflection"
            required
          />
          <Textarea
            label="Description (optional)"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this form..."
          />
        </div>

        {/* Fields List */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Fields ({formData.fields.length})</h4>
          </div>

          {formData.fields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No fields added yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Add Field" below to start building your form
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`border rounded-lg p-3 ${
                    editingField?.id === field.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {field.label || 'Untitled Field'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveField(field.id, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-muted rounded disabled:opacity-50"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveField(field.id, 'down')}
                        disabled={index === formData.fields.length - 1}
                        className="p-1 hover:bg-muted rounded disabled:opacity-50"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingField(editingField?.id === field.id ? null : field)
                        }
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => duplicateField(field)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1 hover:bg-muted rounded text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Field Editor */}
                  {editingField?.id === field.id && (
                    <FieldEditor
                      field={field}
                      onUpdate={(updates) => updateField(field.id, updates)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Field Dropdown */}
          <div className="mt-4">
            <Select
              label=""
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addField(e.target.value as FormFieldType);
                }
              }}
              options={FIELD_TYPES.map((t) => ({
                value: t.value,
                label: `Add ${t.label}`,
              }))}
              placeholder="+ Add Field"
            />
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
          {saving ? 'Saving...' : isCreating ? 'Create Template' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Field Editor
interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

function FieldEditor({ field, onUpdate }: FieldEditorProps) {
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
  const hasScale = field.type === 'scale' || field.type === 'number';

  const updateOption = (index: number, updates: Partial<FormFieldOption>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    const options = field.options || [];
    onUpdate({
      options: [
        ...options,
        { label: `Option ${options.length + 1}`, value: `option${options.length + 1}` },
      ],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(index, 1);
    onUpdate({ options: newOptions });
  };

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Label"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Question text..."
        />
        <Input
          label="Placeholder"
          value={field.placeholder || ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Placeholder text..."
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm">Required</span>
        </label>
      </div>

      <Input
        label="Helper Text"
        value={field.helperText || ''}
        onChange={(e) => onUpdate({ helperText: e.target.value })}
        placeholder="Additional instructions..."
      />

      {/* Options for select/radio/checkbox */}
      {hasOptions && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          {(field.options || []).map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                placeholder="Option label"
                className="flex-1"
              />
              <Input
                value={option.value}
                onChange={(e) => updateOption(index, { value: e.target.value })}
                placeholder="Value"
                className="w-32"
              />
              <button
                onClick={() => removeOption(index)}
                className="p-2 hover:bg-muted rounded text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" />
            Add Option
          </Button>
        </div>
      )}

      {/* Scale/Number settings */}
      {hasScale && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Min Value"
            value={String(field.min ?? '')}
            onChange={(e) => onUpdate({ min: e.target.valueAsNumber || undefined })}
          />
          <Input
            type="number"
            label="Max Value"
            value={String(field.max ?? '')}
            onChange={(e) => onUpdate({ max: e.target.valueAsNumber || undefined })}
          />
        </div>
      )}

      {/* Text length settings */}
      {(field.type === 'text' || field.type === 'textarea') && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Min Length"
            value={String(field.minLength ?? '')}
            onChange={(e) => onUpdate({ minLength: e.target.valueAsNumber || undefined })}
          />
          <Input
            type="number"
            label="Max Length"
            value={String(field.maxLength ?? '')}
            onChange={(e) => onUpdate({ maxLength: e.target.valueAsNumber || undefined })}
          />
        </div>
      )}
    </div>
  );
}

// Form Preview Modal
interface FormPreviewModalProps {
  template: FormTemplate;
  onClose: () => void;
}

function FormPreviewModal({ template, onClose }: FormPreviewModalProps) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Preview: ${template.name}`} size="lg">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}

        {template.fields.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No fields in this template</p>
        ) : (
          template.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>

              {field.type === 'text' && (
                <Input placeholder={field.placeholder} disabled />
              )}

              {field.type === 'textarea' && (
                <Textarea placeholder={field.placeholder} disabled className="min-h-[100px]" />
              )}

              {field.type === 'select' && (
                <Select
                  options={field.options?.map((o) => ({ value: o.value, label: o.label })) || []}
                  placeholder={field.placeholder || 'Select...'}
                  disabled
                  value=""
                  onChange={() => {}}
                />
              )}

              {field.type === 'radio' && (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input type="radio" disabled className="h-4 w-4" />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input type="checkbox" disabled className="h-4 w-4" />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'scale' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{field.min ?? 1}</span>
                  <div className="flex-1 flex gap-1">
                    {Array.from(
                      { length: (field.max ?? 10) - (field.min ?? 1) + 1 },
                      (_, i) => (field.min ?? 1) + i
                    ).map((num) => (
                      <button
                        key={num}
                        disabled
                        className="flex-1 py-2 px-1 text-sm rounded border bg-background"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm">{field.max ?? 10}</span>
                </div>
              )}

              {field.type === 'number' && (
                <Input
                  type="number"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  disabled
                />
              )}

              {field.type === 'date' && <Input type="date" disabled />}

              {field.helperText && (
                <p className="text-xs text-muted-foreground">{field.helperText}</p>
              )}
            </div>
          ))
        )}
      </div>

      <ModalFooter>
        <Button onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
