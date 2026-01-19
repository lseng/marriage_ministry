# Phase 5: SMS/Text Integration

> **Reference**: See `specs/marriage-ministry-master-plan.md` for full context
> **Brand Guide**: See `specs/resonate-brand-guide.pdf`
> **Dependencies**: Phase 1 (Auth), Phase 3 (Assignments)
> **Priority**: High - Core Feature

---

## Overview

Enable couples to receive assignment notifications and submit responses via SMS text messaging. This removes friction for couples who may not regularly log into the web portal, meeting them where they already are - on their phones.

## Goals

1. Twilio integration for sending/receiving SMS
2. Phone number verification for couples
3. Inbound SMS command handling (STATUS, SUBMIT, HELP, etc.)
4. Assignment notifications via SMS
5. Reminder delivery via SMS
6. Two-way conversation support leading into LLM integration

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Couple    │────>│    Twilio    │────>│ Supabase Edge   │
│  (SMS)      │<────│   Webhook    │<────│   Function      │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          v                       v                       v
                   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                   │  Message    │        │  Command    │        │  Response   │
                   │  Logger     │        │  Router     │        │  Handler    │
                   └─────────────┘        └─────────────┘        └─────────────┘
```

---

## Database Schema

### File: `supabase/migrations/[timestamp]_sms_integration.sql`

```sql
-- SMS provider configuration (encrypted credentials)
CREATE TABLE IF NOT EXISTS sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'twilio',
  phone_number TEXT NOT NULL, -- The Twilio number couples text to
  account_sid TEXT NOT NULL,
  -- auth_token stored in Supabase Vault, not here
  webhook_url TEXT,
  webhook_secret TEXT, -- For signature verification
  is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 1000,
  messages_sent_today INTEGER DEFAULT 0,
  limit_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS message log (all inbound/outbound messages)
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT, -- Twilio message SID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  media_urls TEXT[], -- MMS attachments
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'received')),
  couple_id UUID REFERENCES couples(id),
  related_assignment_id UUID REFERENCES assignments(id),
  conversation_thread_id UUID,
  error_code TEXT,
  error_message TEXT,
  segments INTEGER DEFAULT 1, -- SMS segment count for billing
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone number to couple mapping with verification
CREATE TABLE IF NOT EXISTS phone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  spouse TEXT CHECK (spouse IN ('husband', 'wife')),
  is_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number)
);

-- SMS templates for consistent messaging
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'assignment', 'reminder', 'verification', 'system'
  body TEXT NOT NULL, -- Max 160 chars recommended, supports {{variables}}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_couple ON sms_messages(couple_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction_status ON sms_messages(direction, status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON sms_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_number ON phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_couple ON phone_mappings(couple_id);

-- RLS policies
ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_mappings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage SMS config
CREATE POLICY "Admins manage SMS config"
  ON sms_config FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role manages messages
CREATE POLICY "Service role manages SMS messages"
  ON sms_messages FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all messages
CREATE POLICY "Admins view all SMS messages"
  ON sms_messages FOR SELECT
  USING (is_admin());

-- Coaches can view their couples' messages
CREATE POLICY "Coaches view assigned couples SMS"
  ON sms_messages FOR SELECT
  USING (
    is_coach() AND
    couple_id IN (
      SELECT id FROM couples
      WHERE coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
    )
  );

-- Phone mappings - similar pattern
CREATE POLICY "Admins manage phone mappings"
  ON phone_mappings FOR ALL
  USING (is_admin());

CREATE POLICY "Couples manage own phone mappings"
  ON phone_mappings FOR ALL
  USING (couple_id = get_couple_id())
  WITH CHECK (couple_id = get_couple_id());

-- Default SMS templates
INSERT INTO sms_templates (name, category, body) VALUES
('verification_code', 'verification',
  'Your Marriage Ministry verification code is: {{code}}. This code expires in 10 minutes.'),
('assignment_new', 'assignment',
  'New assignment: "{{title}}". Due {{due_date}}. Reply SUBMIT followed by your response, or log in to complete.'),
('assignment_reminder', 'reminder',
  'Reminder: "{{title}}" due in {{days}} days. Text your response or log in at {{url}}'),
('assignment_overdue', 'reminder',
  'Your assignment "{{title}}" is overdue. Ready when you are - text your response to complete.'),
('submission_received', 'system',
  'Got it! Your response for "{{title}}" has been submitted. Your coach will review it soon.'),
('help_response', 'system',
  'Commands: STATUS (view assignment), SUBMIT [response], DONE (mark complete), PAUSE (1 week break), HELP'),
('unknown_number', 'system',
  'Hi! We don''t recognize this number. Log into the Marriage Ministry portal to register your phone.'),
('opted_out', 'system',
  'You''ve been unsubscribed from Marriage Ministry texts. Reply START to re-subscribe anytime.'),
('welcome', 'system',
  'Welcome to Marriage Ministry SMS! Reply HELP for commands. Text responses are submitted as homework.');
```

---

## Implementation Steps

### Step 1: SMS Service Layer

**File: `services/sms.ts`**

```typescript
import { supabase } from '@/lib/supabase';

// Phone number formatting
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Add US country code if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Send SMS
export interface SendSMSOptions {
  to: string;
  body: string;
  coupleId?: string;
  assignmentId?: string;
  mediaUrls?: string[];
}

export async function sendSMS(options: SendSMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const normalizedTo = normalizePhoneNumber(options.to);

  // Check for opt-out
  const { data: mapping } = await supabase
    .from('phone_mappings')
    .select('opted_out')
    .eq('phone_number', normalizedTo)
    .single();

  if (mapping?.opted_out) {
    return { success: false, error: 'Phone number has opted out' };
  }

  // Check daily limit
  const { data: config } = await supabase
    .from('sms_config')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!config) {
    return { success: false, error: 'SMS not configured' };
  }

  // Reset daily counter if needed
  const resetTime = new Date(config.limit_reset_at);
  const now = new Date();
  if (now.getDate() !== resetTime.getDate()) {
    await supabase
      .from('sms_config')
      .update({
        messages_sent_today: 0,
        limit_reset_at: now.toISOString(),
      })
      .eq('id', config.id);
    config.messages_sent_today = 0;
  }

  if (config.messages_sent_today >= config.daily_limit) {
    return { success: false, error: 'Daily SMS limit reached' };
  }

  try {
    // Call Twilio via edge function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: normalizedTo,
        body: options.body,
        mediaUrls: options.mediaUrls,
      },
    });

    if (error) throw error;

    // Log outbound message
    await supabase.from('sms_messages').insert({
      external_id: data.sid,
      direction: 'outbound',
      from_number: config.phone_number,
      to_number: normalizedTo,
      body: options.body,
      media_urls: options.mediaUrls,
      status: 'sent',
      couple_id: options.coupleId,
      related_assignment_id: options.assignmentId,
      segments: Math.ceil(options.body.length / 160),
      sent_at: new Date().toISOString(),
    });

    // Increment daily counter
    await supabase
      .from('sms_config')
      .update({ messages_sent_today: config.messages_sent_today + 1 })
      .eq('id', config.id);

    return { success: true, messageId: data.sid };
  } catch (error: any) {
    // Log failed attempt
    await supabase.from('sms_messages').insert({
      direction: 'outbound',
      from_number: config.phone_number,
      to_number: normalizedTo,
      body: options.body,
      status: 'failed',
      couple_id: options.coupleId,
      error_message: error.message,
    });

    return { success: false, error: error.message };
  }
}

// Send templated SMS
export async function sendTemplatedSMS(
  templateName: string,
  to: string,
  variables: Record<string, string>,
  options?: { coupleId?: string; assignmentId?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data: template } = await supabase
    .from('sms_templates')
    .select('body')
    .eq('name', templateName)
    .eq('is_active', true)
    .single();

  if (!template) {
    return { success: false, error: `Template not found: ${templateName}` };
  }

  // Interpolate variables
  const body = template.body.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => variables[key] || ''
  );

  return sendSMS({ to, body, ...options });
}

// Bulk send to couple
export async function sendSMSToCoupla(
  coupleId: string,
  body: string,
  assignmentId?: string
): Promise<{ sent: number; failed: number }> {
  const { data: mappings } = await supabase
    .from('phone_mappings')
    .select('phone_number')
    .eq('couple_id', coupleId)
    .eq('is_verified', true)
    .eq('opted_out', false);

  let sent = 0;
  let failed = 0;

  for (const mapping of mappings || []) {
    const result = await sendSMS({
      to: mapping.phone_number,
      body,
      coupleId,
      assignmentId,
    });

    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed };
}
```

### Step 2: Phone Verification Service

**File: `services/phone-verification.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import { sendTemplatedSMS, normalizePhoneNumber } from './sms';

export async function initiatePhoneVerification(
  coupleId: string,
  phoneNumber: string,
  spouse: 'husband' | 'wife'
): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Check if number already registered to different couple
  const { data: existing } = await supabase
    .from('phone_mappings')
    .select('couple_id')
    .eq('phone_number', normalizedPhone)
    .neq('couple_id', coupleId)
    .single();

  if (existing) {
    return { success: false, error: 'Phone number registered to another account' };
  }

  // Generate 6-digit code
  const code = Math.random().toString().slice(2, 8);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // Upsert phone mapping with verification code
  const { error } = await supabase.from('phone_mappings').upsert(
    {
      phone_number: normalizedPhone,
      couple_id: coupleId,
      spouse,
      is_verified: false,
      verification_code: code,
      verification_expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'phone_number' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  // Send verification SMS
  const result = await sendTemplatedSMS('verification_code', normalizedPhone, {
    code,
  });

  return result;
}

export async function confirmPhoneVerification(
  coupleId: string,
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const { data: mapping } = await supabase
    .from('phone_mappings')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .eq('couple_id', coupleId)
    .single();

  if (!mapping) {
    return { success: false, error: 'Phone number not found' };
  }

  if (mapping.verification_code !== code) {
    return { success: false, error: 'Invalid verification code' };
  }

  if (new Date(mapping.verification_expires_at) < new Date()) {
    return { success: false, error: 'Verification code expired' };
  }

  // Mark as verified
  const { error } = await supabase
    .from('phone_mappings')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verification_code: null,
      verification_expires_at: null,
    })
    .eq('id', mapping.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Send welcome message
  await sendTemplatedSMS('welcome', normalizedPhone, {});

  return { success: true };
}

export async function getVerifiedPhones(coupleId: string): Promise<
  Array<{
    phone: string;
    spouse: 'husband' | 'wife';
    verifiedAt: string;
  }>
> {
  const { data } = await supabase
    .from('phone_mappings')
    .select('phone_number, spouse, verified_at')
    .eq('couple_id', coupleId)
    .eq('is_verified', true)
    .eq('opted_out', false);

  return (data || []).map((m) => ({
    phone: m.phone_number,
    spouse: m.spouse,
    verifiedAt: m.verified_at,
  }));
}
```

### Step 3: Twilio Send Edge Function

**File: `supabase/functions/send-sms/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

serve(async (req) => {
  // Verify request is from our app
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { to, body, mediaUrls } = await req.json();

  if (!to || !body) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', TWILIO_PHONE_NUMBER!);
  formData.append('To', to);
  formData.append('Body', body);

  if (mediaUrls) {
    for (const url of mediaUrls) {
      formData.append('MediaUrl', url);
    }
  }

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.message, code: data.code }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ sid: data.sid, status: data.status }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 4: Twilio Webhook Handler

**File: `supabase/functions/sms-webhook/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

serve(async (req) => {
  // Verify Twilio signature
  const signature = req.headers.get('X-Twilio-Signature');
  const url = req.url;

  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = value as string;
  }

  if (!verifyTwilioSignature(url, params, signature || '', TWILIO_AUTH_TOKEN!)) {
    console.error('Invalid Twilio signature');
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const from = params.From;
  const to = params.To;
  const body = params.Body?.trim() || '';
  const messageSid = params.MessageSid;
  const numMedia = parseInt(params.NumMedia || '0');

  // Collect media URLs
  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    if (mediaUrl) mediaUrls.push(mediaUrl);
  }

  // Find couple by phone number
  const { data: phoneMapping } = await supabase
    .from('phone_mappings')
    .select('couple_id, spouse, is_verified, opted_out')
    .eq('phone_number', from)
    .single();

  // Log inbound message
  await supabase.from('sms_messages').insert({
    external_id: messageSid,
    direction: 'inbound',
    from_number: from,
    to_number: to,
    body: body,
    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    status: 'received',
    couple_id: phoneMapping?.couple_id || null,
  });

  // Handle unknown number
  if (!phoneMapping) {
    const response = await getTemplate(supabase, 'unknown_number');
    return twimlResponse(response);
  }

  // Handle opt-out
  if (phoneMapping.opted_out) {
    if (body.toUpperCase() === 'START') {
      await supabase
        .from('phone_mappings')
        .update({ opted_out: false, opted_out_at: null })
        .eq('phone_number', from);
      return twimlResponse('Welcome back! You will now receive Marriage Ministry messages.');
    }
    return twimlResponse(''); // Silent for opted-out users
  }

  // Handle STOP command
  if (body.toUpperCase() === 'STOP') {
    await supabase
      .from('phone_mappings')
      .update({ opted_out: true, opted_out_at: new Date().toISOString() })
      .eq('phone_number', from);
    const response = await getTemplate(supabase, 'opted_out');
    return twimlResponse(response);
  }

  // Route to command handler
  const response = await handleSMSCommand(supabase, {
    coupleId: phoneMapping.couple_id,
    spouse: phoneMapping.spouse,
    body,
    from,
    to,
  });

  return twimlResponse(response);
});

interface SMSContext {
  coupleId: string;
  spouse: string;
  body: string;
  from: string;
  to: string;
}

async function handleSMSCommand(
  supabase: SupabaseClient,
  ctx: SMSContext
): Promise<string> {
  const command = ctx.body.toUpperCase().split(' ')[0];
  const args = ctx.body.slice(command.length).trim();

  switch (command) {
    case 'HELP':
      return await getTemplate(supabase, 'help_response');

    case 'STATUS':
      return await getAssignmentStatus(supabase, ctx.coupleId);

    case 'SUBMIT':
      if (!args) {
        return 'Please include your response after SUBMIT. Example: SUBMIT We practiced active listening by...';
      }
      return await submitAssignmentResponse(supabase, ctx.coupleId, args);

    case 'DONE':
      return await markAssignmentDone(supabase, ctx.coupleId);

    case 'PAUSE':
      return await pauseReminders(supabase, ctx.coupleId);

    default:
      // Treat as assignment response if they have a pending assignment
      const hasPending = await hasPendingAssignment(supabase, ctx.coupleId);
      if (hasPending) {
        return await submitAssignmentResponse(supabase, ctx.coupleId, ctx.body);
      }

      return 'I didn\'t understand that. Reply HELP for available commands.';
  }
}

async function getAssignmentStatus(
  supabase: SupabaseClient,
  coupleId: string
): Promise<string> {
  const { data: status } = await supabase
    .from('assignment_statuses')
    .select(`
      *,
      assignments(title, description, due_date)
    `)
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!status) {
    return 'No pending assignments. Great job staying on top of things!';
  }

  const dueDate = new Date(status.assignments.due_date).toLocaleDateString();
  return `Current: "${status.assignments.title}"\nDue: ${dueDate}\n\n${status.assignments.description}\n\nReply with your response to submit.`;
}

async function submitAssignmentResponse(
  supabase: SupabaseClient,
  coupleId: string,
  response: string
): Promise<string> {
  // Find current assignment
  const { data: status } = await supabase
    .from('assignment_statuses')
    .select('id, assignments(id, title)')
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!status) {
    return 'No pending assignment to submit for. Reply STATUS to check your assignments.';
  }

  // Create homework response
  const { error } = await supabase.from('homework_responses').insert({
    assignment_status_id: status.id,
    couple_id: coupleId,
    responses: { text_response: response },
    is_draft: false,
    submitted_at: new Date().toISOString(),
    submission_method: 'sms',
  });

  if (error) {
    console.error('Failed to save response:', error);
    return 'Sorry, there was an error saving your response. Please try again or log in online.';
  }

  // Update assignment status
  await supabase
    .from('assignment_statuses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', status.id);

  return `Got it! Your response for "${status.assignments.title}" has been submitted. Your coach will review it soon.`;
}

async function markAssignmentDone(
  supabase: SupabaseClient,
  coupleId: string
): Promise<string> {
  const { data: status } = await supabase
    .from('assignment_statuses')
    .select('id, assignments(title)')
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!status) {
    return 'No pending assignment to mark complete.';
  }

  await supabase
    .from('assignment_statuses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', status.id);

  return `Marked "${status.assignments.title}" as complete. Great work!`;
}

async function pauseReminders(
  supabase: SupabaseClient,
  coupleId: string
): Promise<string> {
  const pauseUntil = new Date();
  pauseUntil.setDate(pauseUntil.getDate() + 7);

  await supabase
    .from('couples')
    .update({ reminders_paused_until: pauseUntil.toISOString() })
    .eq('id', coupleId);

  return `Reminders paused for 1 week. They'll resume on ${pauseUntil.toLocaleDateString()}.`;
}

async function hasPendingAssignment(
  supabase: SupabaseClient,
  coupleId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('assignment_statuses')
    .select('id')
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .limit(1)
    .single();

  return !!data;
}

async function getTemplate(
  supabase: SupabaseClient,
  name: string
): Promise<string> {
  const { data } = await supabase
    .from('sms_templates')
    .select('body')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  return data?.body || '';
}

function twimlResponse(message: string): Response {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  // Sort params and concatenate
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join('');

  const data = url + sortedParams;
  const expectedSignature = createHmac('sha1', authToken)
    .update(data)
    .digest('base64');

  return signature === expectedSignature;
}
```

### Step 5: Phone Verification UI Component

**File: `components/profile/PhoneVerification.tsx`**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  initiatePhoneVerification,
  confirmPhoneVerification,
  getVerifiedPhones,
} from '@/services/phone-verification';
import { formatPhoneForDisplay } from '@/services/sms';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Check, X, Loader2 } from 'lucide-react';

interface VerifiedPhone {
  phone: string;
  spouse: 'husband' | 'wife';
  verifiedAt: string;
}

export function PhoneVerification() {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;

  const [verifiedPhones, setVerifiedPhones] = useState<VerifiedPhone[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [selectedSpouse, setSelectedSpouse] = useState<'husband' | 'wife'>('husband');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [pendingPhone, setPendingPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load verified phones on mount
  useEffect(() => {
    if (coupleId) {
      loadVerifiedPhones();
    }
  }, [coupleId]);

  async function loadVerifiedPhones() {
    const phones = await getVerifiedPhones(coupleId!);
    setVerifiedPhones(phones);
  }

  async function handleSendCode() {
    if (!newPhone || !coupleId) return;

    setIsLoading(true);
    setError(null);

    const result = await initiatePhoneVerification(coupleId, newPhone, selectedSpouse);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to send verification code');
      return;
    }

    setPendingPhone(newPhone);
    setStep('verify');
  }

  async function handleVerifyCode() {
    if (!verificationCode || !coupleId) return;

    setIsLoading(true);
    setError(null);

    const result = await confirmPhoneVerification(coupleId, pendingPhone, verificationCode);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Verification failed');
      return;
    }

    // Success - reset and reload
    setIsAdding(false);
    setNewPhone('');
    setVerificationCode('');
    setStep('input');
    setPendingPhone('');
    await loadVerifiedPhones();
  }

  function handleCancel() {
    setIsAdding(false);
    setNewPhone('');
    setVerificationCode('');
    setStep('input');
    setPendingPhone('');
    setError(null);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-resonate-dark-gray">
          SMS Notifications
        </h3>
        {!isAdding && verifiedPhones.length < 2 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            Add Phone
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Receive assignment notifications and submit responses via text message.
      </p>

      {/* Verified phones list */}
      {verifiedPhones.length > 0 && (
        <div className="space-y-2 mb-4">
          {verifiedPhones.map((phone) => (
            <div
              key={phone.phone}
              className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-resonate-green" />
                <span className="font-medium">
                  {formatPhoneForDisplay(phone.phone)}
                </span>
                <span className="text-sm text-gray-500">
                  ({phone.spouse})
                </span>
              </div>
              <Check className="h-4 w-4 text-resonate-green" />
            </div>
          ))}
        </div>
      )}

      {verifiedPhones.length === 0 && !isAdding && (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Phone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No phone numbers verified</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setIsAdding(true)}
          >
            Add Phone Number
          </Button>
        </div>
      )}

      {/* Add phone form */}
      {isAdding && (
        <div className="border-t pt-4 mt-4">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  This phone belongs to
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="spouse"
                      value="husband"
                      checked={selectedSpouse === 'husband'}
                      onChange={() => setSelectedSpouse('husband')}
                      className="text-resonate-blue"
                    />
                    Husband
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="spouse"
                      value="wife"
                      checked={selectedSpouse === 'wife'}
                      onChange={() => setSelectedSpouse('wife')}
                      className="text-resonate-blue"
                    />
                    Wife
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSendCode} disabled={isLoading || !newPhone}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Send Code
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to {formatPhoneForDisplay(pendingPhone)}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Verify
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="text-resonate-blue hover:underline"
                  onClick={() => {
                    setStep('input');
                    setVerificationCode('');
                    setError(null);
                  }}
                >
                  Try again
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

### Step 6: Assignment SMS Notification Hook

**File: `hooks/useSMSNotifications.ts`**

```typescript
import { sendSMSToCoupla, sendTemplatedSMS } from '@/services/sms';
import { supabase } from '@/lib/supabase';

export function useSMSNotifications() {
  async function notifyAssignmentDistributed(
    coupleId: string,
    assignment: { id: string; title: string; due_date: string }
  ) {
    const dueDate = new Date(assignment.due_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    await sendSMSToCoupla(
      coupleId,
      `New assignment: "${assignment.title}". Due ${dueDate}. Reply with your response or log in to complete.`,
      assignment.id
    );
  }

  async function sendReminder(
    coupleId: string,
    assignment: { title: string },
    daysUntilDue: number
  ) {
    const { data: mappings } = await supabase
      .from('phone_mappings')
      .select('phone_number')
      .eq('couple_id', coupleId)
      .eq('is_verified', true)
      .eq('opted_out', false);

    for (const mapping of mappings || []) {
      await sendTemplatedSMS('assignment_reminder', mapping.phone_number, {
        title: assignment.title,
        days: daysUntilDue.toString(),
        url: 'marriage.resonatemovement.org',
      });
    }
  }

  async function notifySubmissionReceived(
    coupleId: string,
    assignmentTitle: string
  ) {
    const { data: mappings } = await supabase
      .from('phone_mappings')
      .select('phone_number')
      .eq('couple_id', coupleId)
      .eq('is_verified', true);

    for (const mapping of mappings || []) {
      await sendTemplatedSMS('submission_received', mapping.phone_number, {
        title: assignmentTitle,
      });
    }
  }

  return {
    notifyAssignmentDistributed,
    sendReminder,
    notifySubmissionReceived,
  };
}
```

---

## Admin SMS Settings UI

**File: `components/settings/SMSSettings.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export function SMSSettings() {
  const [config, setConfig] = useState<{
    phone_number: string;
    is_active: boolean;
    daily_limit: number;
    messages_sent_today: number;
  } | null>(null);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    failedToday: 0,
  });

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  async function loadConfig() {
    const { data } = await supabase
      .from('sms_config')
      .select('*')
      .single();
    setConfig(data);
  }

  async function loadStats() {
    const today = new Date().toISOString().split('T')[0];

    const [sent, received, failed] = await Promise.all([
      supabase
        .from('sms_messages')
        .select('id', { count: 'exact' })
        .eq('direction', 'outbound'),
      supabase
        .from('sms_messages')
        .select('id', { count: 'exact' })
        .eq('direction', 'inbound'),
      supabase
        .from('sms_messages')
        .select('id', { count: 'exact' })
        .eq('status', 'failed')
        .gte('created_at', today),
    ]);

    setStats({
      totalSent: sent.count || 0,
      totalReceived: received.count || 0,
      failedToday: failed.count || 0,
    });
  }

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">SMS Configuration</h2>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Status</h3>
          <Badge variant={config.is_active ? 'success' : 'secondary'}>
            {config.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div>
          <h3 className="font-medium mb-2">Twilio Number</h3>
          <p className="text-gray-600">{config.phone_number}</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Daily Limit</h3>
          <p className="text-gray-600">
            {config.messages_sent_today} / {config.daily_limit}
          </p>
        </div>

        <div>
          <h3 className="font-medium mb-2">Failed Today</h3>
          <p className={stats.failedToday > 0 ? 'text-red-600' : 'text-gray-600'}>
            {stats.failedToday}
          </p>
        </div>
      </div>

      <div className="border-t mt-6 pt-6">
        <h3 className="font-medium mb-4">All-Time Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-2xl font-bold text-resonate-blue">
              {stats.totalSent}
            </p>
            <p className="text-sm text-gray-600">Messages Sent</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-2xl font-bold text-resonate-green">
              {stats.totalReceived}
            </p>
            <p className="text-sm text-gray-600">Messages Received</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

---

## Environment Variables

Add to Supabase Edge Function secrets:

```bash
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# App
APP_URL=https://marriage.resonatemovement.org
```

---

## Testing Requirements

### Unit Tests

```typescript
describe('SMS Service', () => {
  test('normalizes US phone numbers', () => {
    expect(normalizePhoneNumber('(555) 123-4567')).toBe('+15551234567');
    expect(normalizePhoneNumber('555-123-4567')).toBe('+15551234567');
    expect(normalizePhoneNumber('15551234567')).toBe('+15551234567');
  });

  test('respects opt-out status', async () => {
    const result = await sendSMS({
      to: '+15551234567', // opted-out number
      body: 'Test',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('opted out');
  });
});
```

### E2E Tests

```typescript
describe('SMS Webhook', () => {
  test('handles HELP command', async ({ request }) => {
    const response = await request.post('/functions/v1/sms-webhook', {
      form: {
        From: '+15551234567',
        To: '+15559876543',
        Body: 'HELP',
        MessageSid: 'SM123',
      },
    });

    const text = await response.text();
    expect(text).toContain('Commands:');
    expect(text).toContain('STATUS');
    expect(text).toContain('SUBMIT');
  });

  test('submits assignment via SMS', async ({ request }) => {
    const response = await request.post('/functions/v1/sms-webhook', {
      form: {
        From: '+15551234567', // Registered couple
        To: '+15559876543',
        Body: 'SUBMIT We practiced active listening this week by...',
        MessageSid: 'SM456',
      },
    });

    const text = await response.text();
    expect(text).toContain('submitted');
  });
});
```

---

## Acceptance Criteria

- [ ] Twilio account configured with phone number
- [ ] Webhook endpoint deployed and receiving messages
- [ ] Phone verification flow works for couples
- [ ] HELP command returns available commands
- [ ] STATUS command shows current assignment
- [ ] SUBMIT command creates homework response
- [ ] DONE command marks assignment complete
- [ ] PAUSE command stops reminders for 1 week
- [ ] STOP command opts out of SMS
- [ ] START command re-subscribes
- [ ] Assignment distribution sends SMS to verified phones
- [ ] SMS templates are customizable
- [ ] Daily message limit enforced
- [ ] Message logs viewable by admin
- [ ] Failed messages are logged with errors
