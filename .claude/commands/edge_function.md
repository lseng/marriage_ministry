# Edge Function Command

Generate a Supabase Edge Function with proper structure, typing, and tests.

## Input
$ARGUMENTS - Function name and description

## Instructions

1. **Parse Requirements**
   - Function name (kebab-case)
   - Purpose and functionality
   - Input/output types
   - Authentication requirements

2. **Create Edge Function**

   Directory: `supabase/functions/[function-name]/`

   Files to create:
   - `index.ts` - Main function
   - `types.ts` - TypeScript types
   - `handler.ts` - Business logic (optional, for complex functions)
   - `_shared/` - Shared utilities (if needed)

3. **Function Template**

```typescript
// supabase/functions/[function-name]/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type { RequestBody, ResponseBody } from './types.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();

    // Business logic here
    const result: ResponseBody = {
      success: true,
      data: {},
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

4. **Types Template**

```typescript
// supabase/functions/[function-name]/types.ts
export interface RequestBody {
  // Define input shape
}

export interface ResponseBody {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

5. **Shared CORS Helper**

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

6. **Create Client Hook**

```typescript
// src/hooks/use[FunctionName].ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useFunctionName() {
  return useMutation({
    mutationFn: async (data: RequestBody) => {
      const { data: result, error } = await supabase.functions.invoke(
        'function-name',
        { body: data }
      );

      if (error) throw error;
      return result;
    },
  });
}
```

7. **Write Tests**

```typescript
// supabase/functions/[function-name]/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('function-name: returns success for valid input', async () => {
  const response = await fetch('http://localhost:54421/functions/v1/function-name', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify({ /* test data */ }),
  });

  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});

Deno.test('function-name: returns 401 for unauthenticated request', async () => {
  const response = await fetch('http://localhost:54421/functions/v1/function-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assertEquals(response.status, 401);
});
```

## Common Patterns

### Sending Email
```typescript
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'Subject',
  html: '<p>Content</p>',
});
```

### Scheduled Function (Cron)
```typescript
// Add to supabase/config.toml
// [functions.function-name]
// schedule = "0 0 * * *"  # Daily at midnight
```

### Database Operations
```typescript
const { data, error } = await supabaseClient
  .from('table')
  .select('*')
  .eq('user_id', user.id);
```

## Deployment

```bash
# Deploy single function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy

# Test locally
supabase functions serve function-name --env-file .env.local
```

## Example

Input: "send-assignment-reminder - Send email reminders to couples about upcoming assignments"

Creates:
- `supabase/functions/send-assignment-reminder/index.ts`
- `supabase/functions/send-assignment-reminder/types.ts`
- `supabase/functions/_shared/cors.ts` (if not exists)
- `src/hooks/useSendReminder.ts`
