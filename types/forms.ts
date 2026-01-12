// Dynamic Form Types for Marriage Ministry

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'scale'
  | 'date'
  | 'number';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[]; // For select, radio, checkbox
  min?: number; // For scale, number
  max?: number; // For scale, number
  minLength?: number; // For text, textarea
  maxLength?: number; // For text, textarea
  helperText?: string;
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateInsert {
  name: string;
  description?: string;
  fields: FormField[];
  is_active?: boolean;
  created_by?: string;
}

export interface FormTemplateUpdate {
  name?: string;
  description?: string;
  fields?: FormField[];
  is_active?: boolean;
}

// Form response types
export type FormResponseValue = string | string[] | number | boolean | null;

export interface FormResponses {
  [fieldId: string]: FormResponseValue;
}

export interface HomeworkResponse {
  id: string;
  assignment_status_id: string;
  couple_id: string;
  responses: FormResponses;
  draft_responses: FormResponses | null;
  is_draft: boolean;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkResponseInsert {
  assignment_status_id: string;
  couple_id: string;
  responses: FormResponses;
  draft_responses?: FormResponses;
  is_draft?: boolean;
  submitted_at?: string;
}

export interface HomeworkResponseUpdate {
  responses?: FormResponses;
  draft_responses?: FormResponses;
  is_draft?: boolean;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

// Extended types with relations
export interface HomeworkResponseWithDetails extends HomeworkResponse {
  assignment: {
    id: string;
    title: string;
    week_number: number;
    due_date: string | null;
    form_template?: FormTemplate | null;
  };
  couple: {
    id: string;
    husband_first_name: string;
    wife_first_name: string;
    husband_last_name: string;
  };
  reviewer?: {
    id: string;
    email: string;
  } | null;
}

// Form validation types
export interface FormValidationError {
  fieldId: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
}

// Helper function to validate form responses
export function validateFormResponses(
  fields: FormField[],
  responses: FormResponses
): FormValidationResult {
  const errors: FormValidationError[] = [];

  for (const field of fields) {
    const value = responses[field.id];

    // Check required fields
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          fieldId: field.id,
          message: `${field.label} is required`,
        });
        continue;
      }

      // Check arrays (checkboxes)
      if (Array.isArray(value) && value.length === 0) {
        errors.push({
          fieldId: field.id,
          message: `${field.label} requires at least one selection`,
        });
        continue;
      }
    }

    // Skip further validation if empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type-specific validation
    if (field.type === 'text' || field.type === 'textarea') {
      const strValue = String(value);

      if (field.minLength && strValue.length < field.minLength) {
        errors.push({
          fieldId: field.id,
          message: `${field.label} must be at least ${field.minLength} characters`,
        });
      }

      if (field.maxLength && strValue.length > field.maxLength) {
        errors.push({
          fieldId: field.id,
          message: `${field.label} must not exceed ${field.maxLength} characters`,
        });
      }

      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(strValue)) {
          errors.push({
            fieldId: field.id,
            message: field.validation.message || `${field.label} format is invalid`,
          });
        }
      }
    }

    if (field.type === 'number' || field.type === 'scale') {
      const numValue = Number(value);

      if (isNaN(numValue)) {
        errors.push({
          fieldId: field.id,
          message: `${field.label} must be a number`,
        });
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push({
            fieldId: field.id,
            message: `${field.label} must be at least ${field.min}`,
          });
        }

        if (field.max !== undefined && numValue > field.max) {
          errors.push({
            fieldId: field.id,
            message: `${field.label} must not exceed ${field.max}`,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to create a new field with defaults
export function createFormField(type: FormFieldType): FormField {
  const id = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const baseField: FormField = {
    id,
    type,
    label: '',
    required: false,
  };

  switch (type) {
    case 'select':
    case 'radio':
    case 'checkbox':
      return {
        ...baseField,
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
        ],
      };
    case 'scale':
      return {
        ...baseField,
        min: 1,
        max: 10,
      };
    case 'textarea':
      return {
        ...baseField,
        maxLength: 2000,
      };
    default:
      return baseField;
  }
}
