import { describe, it, expect } from 'vitest';
import {
  validateFormResponses,
  createFormField,
  type FormField,
  type FormResponses,
} from './forms';

describe('forms', () => {
  describe('validateFormResponses', () => {
    const textField: FormField = {
      id: 'text1',
      type: 'text',
      label: 'Name',
      required: true,
    };

    const optionalTextField: FormField = {
      id: 'text2',
      type: 'text',
      label: 'Nickname',
      required: false,
    };

    const textareaField: FormField = {
      id: 'textarea1',
      type: 'textarea',
      label: 'Description',
      required: true,
      minLength: 10,
      maxLength: 100,
    };

    const selectField: FormField = {
      id: 'select1',
      type: 'select',
      label: 'Country',
      required: true,
      options: [
        { label: 'USA', value: 'us' },
        { label: 'Canada', value: 'ca' },
      ],
    };

    const checkboxField: FormField = {
      id: 'checkbox1',
      type: 'checkbox',
      label: 'Interests',
      required: true,
      options: [
        { label: 'Sports', value: 'sports' },
        { label: 'Music', value: 'music' },
      ],
    };

    const scaleField: FormField = {
      id: 'scale1',
      type: 'scale',
      label: 'Satisfaction',
      required: true,
      min: 1,
      max: 5,
    };

    const numberField: FormField = {
      id: 'number1',
      type: 'number',
      label: 'Age',
      required: true,
      min: 18,
      max: 100,
    };

    it('should validate required fields', () => {
      const fields = [textField];
      const responses: FormResponses = {};

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fieldId).toBe('text1');
      expect(result.errors[0].message).toContain('required');
    });

    it('should pass validation for valid required fields', () => {
      const fields = [textField];
      const responses: FormResponses = { text1: 'John' };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not require optional fields', () => {
      const fields = [optionalTextField];
      const responses: FormResponses = {};

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minLength for text fields', () => {
      const fields = [textareaField];
      const responses: FormResponses = { textarea1: 'short' };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 10 characters');
    });

    it('should validate maxLength for text fields', () => {
      const fields = [textareaField];
      const responses: FormResponses = { textarea1: 'a'.repeat(150) };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('exceed 100 characters');
    });

    it('should validate checkbox requires at least one selection', () => {
      const fields = [checkboxField];
      const responses: FormResponses = { checkbox1: [] };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least one selection');
    });

    it('should pass for checkbox with selections', () => {
      const fields = [checkboxField];
      const responses: FormResponses = { checkbox1: ['sports'] };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(true);
    });

    it('should validate scale minimum value', () => {
      const fields = [scaleField];
      const responses: FormResponses = { scale1: 0 };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 1');
    });

    it('should validate scale maximum value', () => {
      const fields = [scaleField];
      const responses: FormResponses = { scale1: 10 };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('exceed 5');
    });

    it('should pass for valid scale value', () => {
      const fields = [scaleField];
      const responses: FormResponses = { scale1: 3 };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(true);
    });

    it('should validate number is actually a number', () => {
      const fields = [numberField];
      const responses: FormResponses = { number1: 'not a number' };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('must be a number');
    });

    it('should validate multiple fields', () => {
      const fields = [textField, selectField, scaleField];
      const responses: FormResponses = {
        text1: 'John',
        select1: 'us',
        scale1: 4,
      };

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const fields = [textField, selectField, scaleField];
      const responses: FormResponses = {};

      const result = validateFormResponses(fields, responses);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('createFormField', () => {
    it('should create a text field with defaults', () => {
      const field = createFormField('text');

      expect(field.type).toBe('text');
      expect(field.label).toBe('');
      expect(field.required).toBe(false);
      expect(field.id).toBeTruthy();
    });

    it('should create a textarea field', () => {
      const field = createFormField('textarea');

      expect(field.type).toBe('textarea');
      expect(field.maxLength).toBe(2000);
    });

    it('should create a select field with default options', () => {
      const field = createFormField('select');

      expect(field.type).toBe('select');
      expect(field.options).toHaveLength(2);
      expect(field.options![0].label).toBe('Option 1');
    });

    it('should create a scale field with min/max', () => {
      const field = createFormField('scale');

      expect(field.type).toBe('scale');
      expect(field.min).toBe(1);
      expect(field.max).toBe(10);
    });

    it('should generate unique IDs', () => {
      const field1 = createFormField('text');
      const field2 = createFormField('text');

      expect(field1.id).not.toBe(field2.id);
    });
  });
});
