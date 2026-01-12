# Hook Generation Command

Generate a React hook with proper TypeScript types, error handling, and tests.

## Input
$ARGUMENTS - Hook name and description (e.g., "useCoaches - fetch and manage coaches data")

## Instructions

1. **Analyze Requirements**
   - Hook name (use-prefixed camelCase)
   - Data it manages
   - Operations (fetch, create, update, delete)
   - Dependencies

2. **Determine Hook Pattern**

   | Pattern | Use Case |
   |---------|----------|
   | Data Fetching | Load data from Supabase |
   | Mutation | Create/update/delete operations |
   | Form State | Manage form inputs and validation |
   | UI State | Toggle, modal, selection state |
   | Subscription | Real-time data updates |

3. **Generate Files**

   - `src/hooks/[hookName].ts` - Main hook
   - `src/hooks/__tests__/[hookName].test.ts` - Tests

## Hook Templates

### Data Fetching Hook
```typescript
// src/hooks/useCoaches.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Coach } from '@/types/app';

interface UseCoachesReturn {
  coaches: Coach[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCoaches(): UseCoachesReturn {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCoaches(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coaches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  return { coaches, loading, error, refetch: fetchCoaches };
}
```

### CRUD Hook
```typescript
// src/hooks/useCoachMutations.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Coach, CoachInsert, CoachUpdate } from '@/types/app';

interface UseCoachMutationsReturn {
  createCoach: (data: CoachInsert) => Promise<Coach>;
  updateCoach: (id: string, data: CoachUpdate) => Promise<Coach>;
  deleteCoach: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useCoachMutations(): UseCoachMutationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCoach = async (data: CoachInsert): Promise<Coach> => {
    try {
      setLoading(true);
      setError(null);

      const { data: coach, error: createError } = await supabase
        .from('coaches')
        .insert(data)
        .select()
        .single();

      if (createError) throw createError;
      return coach;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create coach';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateCoach = async (id: string, data: CoachUpdate): Promise<Coach> => {
    try {
      setLoading(true);
      setError(null);

      const { data: coach, error: updateError } = await supabase
        .from('coaches')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return coach;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update coach';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCoach = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete coach';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { createCoach, updateCoach, deleteCoach, loading, error };
}
```

### Real-time Subscription Hook
```typescript
// src/hooks/useCoachesRealtime.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Coach } from '@/types/app';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useCoachesRealtime(): Coach[] {
  const [coaches, setCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from('coaches')
      .select('*')
      .then(({ data }) => setCoaches(data ?? []));

    // Subscribe to changes
    const channel: RealtimeChannel = supabase
      .channel('coaches-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coaches' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCoaches((prev) => [payload.new as Coach, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCoaches((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Coach) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setCoaches((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return coaches;
}
```

### Form State Hook
```typescript
// src/hooks/useForm.ts
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: (name: keyof T, value: T[keyof T]) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when field changes
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate
      const validationErrors = validate?.(values) ?? {};
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
```

## Test Template

```typescript
// src/hooks/__tests__/useCoaches.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCoaches } from '../useCoaches';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

describe('useCoaches', () => {
  const mockCoaches = [
    { id: '1', first_name: 'John', last_name: 'Doe' },
    { id: '2', first_name: 'Jane', last_name: 'Smith' },
  ];

  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCoaches, error: null }),
      }),
    } as any);
  });

  it('fetches coaches on mount', async () => {
    const { result } = renderHook(() => useCoaches());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coaches).toEqual(mockCoaches);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Network error'),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.coaches).toEqual([]);
  });

  it('refetches data when refetch is called', async () => {
    const { result } = renderHook(() => useCoaches());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
```
