import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;

interface PhoneMapping {
  couple_id: string;
  spouse: string;
  is_verified: boolean;
  opted_out: boolean;
}

interface SMSContext {
  coupleId: string;
  spouse: string;
  body: string;
  from: string;
  to: string;
}

interface AssignmentStatus {
  id: string;
  status: string;
  assignments: {
    id: string;
    title: string;
    description: string;
    due_date: string;
  };
}

serve(async (req) => {
  try {
    // Verify Twilio signature
    const signature = req.headers.get('X-Twilio-Signature');
    const url = new URL(req.url).toString();

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value as string;
    }

    if (!verifyTwilioSignature(url, params, signature || '', TWILIO_AUTH_TOKEN)) {
      console.error('Invalid Twilio signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      couple_id: (phoneMapping as PhoneMapping | null)?.couple_id || null,
    });

    // Handle unknown number
    if (!phoneMapping) {
      const response = await getTemplate(supabase, 'unknown_number');
      return twimlResponse(response);
    }

    const mapping = phoneMapping as PhoneMapping;

    // Handle opt-out
    if (mapping.opted_out) {
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
      coupleId: mapping.couple_id,
      spouse: mapping.spouse,
      body,
      from,
      to,
    });

    return twimlResponse(response);
  } catch (error) {
    console.error('Error in twilio-webhook:', error);
    return twimlResponse('Sorry, there was an error processing your message. Please try again later.');
  }
});

/**
 * Route SMS commands to appropriate handlers
 */
async function handleSMSCommand(
  supabase: ReturnType<typeof createClient>,
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

    default: {
      // Treat as assignment response if they have a pending assignment
      const hasPending = await hasPendingAssignment(supabase, ctx.coupleId);
      if (hasPending) {
        return await submitAssignmentResponse(supabase, ctx.coupleId, ctx.body);
      }

      return "I didn't understand that. Reply HELP for available commands.";
    }
  }
}

/**
 * Get current assignment status for couple
 */
async function getAssignmentStatus(
  supabase: ReturnType<typeof createClient>,
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
    .maybeSingle();

  if (!status) {
    return 'No pending assignments. Great job staying on top of things!';
  }

  const assignmentStatus = status as AssignmentStatus;
  const dueDate = new Date(assignmentStatus.assignments.due_date).toLocaleDateString();
  return `Current: "${assignmentStatus.assignments.title}"\nDue: ${dueDate}\n\n${assignmentStatus.assignments.description}\n\nReply with your response to submit.`;
}

/**
 * Submit assignment response via SMS
 */
async function submitAssignmentResponse(
  supabase: ReturnType<typeof createClient>,
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
    .maybeSingle();

  if (!status) {
    return 'No pending assignment to submit for. Reply STATUS to check your assignments.';
  }

  const assignmentStatus = status as AssignmentStatus;

  // Create homework response
  const { error } = await supabase.from('homework_responses').insert({
    assignment_status_id: assignmentStatus.id,
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
    .eq('id', assignmentStatus.id);

  return `Got it! Your response for "${assignmentStatus.assignments.title}" has been submitted. Your coach will review it soon.`;
}

/**
 * Mark assignment as done without submitting response
 */
async function markAssignmentDone(
  supabase: ReturnType<typeof createClient>,
  coupleId: string
): Promise<string> {
  const { data: status } = await supabase
    .from('assignment_statuses')
    .select('id, assignments(title)')
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!status) {
    return 'No pending assignment to mark complete.';
  }

  const assignmentStatus = status as AssignmentStatus;

  await supabase
    .from('assignment_statuses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', assignmentStatus.id);

  return `Marked "${assignmentStatus.assignments.title}" as complete. Great work!`;
}

/**
 * Pause reminders for one week
 */
async function pauseReminders(
  supabase: ReturnType<typeof createClient>,
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

/**
 * Check if couple has a pending assignment
 */
async function hasPendingAssignment(
  supabase: ReturnType<typeof createClient>,
  coupleId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('assignment_statuses')
    .select('id')
    .eq('couple_id', coupleId)
    .in('status', ['sent', 'in_progress'])
    .limit(1)
    .maybeSingle();

  return !!data;
}

/**
 * Get SMS template by name
 */
async function getTemplate(
  supabase: ReturnType<typeof createClient>,
  name: string
): Promise<string> {
  const { data } = await supabase
    .from('sms_templates')
    .select('body')
    .eq('name', name)
    .eq('is_active', true)
    .maybeSingle();

  return data?.body || '';
}

/**
 * Create TwiML response
 */
function twimlResponse(message: string): Response {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Verify Twilio request signature
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  // Sort params and concatenate with URL
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
