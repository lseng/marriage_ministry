import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
const APP_URL = Deno.env.get('APP_URL') || 'https://marriage.resonatemovement.org';

interface ProcessingResult {
  processed: number;
  failed: number;
  total: number;
}

interface NotificationQueueItem {
  id: string;
  template_id: string | null;
  recipient_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: 'email' | 'sms' | 'in_app' | 'push';
  variables: Record<string, string>;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  notification_templates: NotificationTemplate | null;
}

interface NotificationTemplate {
  id: string;
  name: string;
  event_type: string;
  subject_template: string | null;
  email_body_template: string | null;
  sms_template: string | null;
  in_app_template: string | null;
  in_app_action_url: string | null;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pending notifications that are due
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        notification_templates (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', supabase.rpc('max_attempts'))
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Failed to fetch notification queue:', fetchError);
      return new Response(
        JSON.stringify({
          error: fetchError.message,
          processed: 0,
          failed: 0,
          total: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const notification of (notifications as NotificationQueueItem[]) || []) {
      try {
        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({
            status: 'processing',
            attempts: notification.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        const template = notification.notification_templates;
        if (!template) {
          throw new Error('Notification template not found');
        }

        const variables = {
          ...notification.variables,
          portal_url: APP_URL,
        };

        let success = false;

        switch (notification.channel) {
          case 'email':
            success = await sendEmail(
              supabase,
              notification.recipient_email!,
              interpolate(template.subject_template || '', variables),
              interpolate(template.email_body_template || '', variables),
              variables
            );
            break;

          case 'sms':
            success = await sendSMS(
              notification.recipient_phone!,
              interpolate(template.sms_template || '', variables)
            );
            break;

          case 'in_app':
            // In-app notifications are created immediately when queued
            // This channel is just for tracking in the queue
            success = true;
            break;

          case 'push':
            // Push notifications not yet implemented
            success = false;
            break;
        }

        if (success) {
          // Mark as sent
          await supabase
            .from('notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          // Log delivery event
          await logDeliveryEvent(
            supabase,
            notification.id,
            'sent',
            notification.channel
          );

          processed++;
        } else {
          throw new Error('Send failed');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to process notification ${notification.id}:`, errorMessage);

        // Check if max attempts reached
        if (notification.attempts + 1 >= notification.max_attempts) {
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: errorMessage,
            })
            .eq('id', notification.id);

          await logDeliveryEvent(
            supabase,
            notification.id,
            'failed',
            notification.channel,
            { error: errorMessage }
          );
        } else {
          // Reset to pending for retry
          await supabase
            .from('notification_queue')
            .update({
              status: 'pending',
              error_message: errorMessage,
            })
            .eq('id', notification.id);
        }

        failed++;
      }
    }

    const result: ProcessingResult = {
      processed,
      failed,
      total: notifications?.length || 0,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in process-notifications function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        failed: 0,
        total: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Interpolate {{variables}} in a template string
 */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}

/**
 * Send email via the send-email Edge Function
 */
async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  to: string,
  subject: string,
  html: string,
  variables: Record<string, string>
): Promise<boolean> {
  try {
    // Call the send-email Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        variables,
      },
    });

    if (error) {
      console.error('Send email error:', error);
      return false;
    }

    return data?.success === true;
  } catch (error) {
    console.error('Exception calling send-email:', error);
    return false;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Twilio not configured');
    return false;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: to,
        Body: body,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception sending SMS:', error);
    return false;
  }
}

/**
 * Log delivery event to the notification_delivery_log table
 */
async function logDeliveryEvent(
  supabase: ReturnType<typeof createClient>,
  queueId: string,
  event: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
  channel: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('notification_delivery_log').insert({
      notification_queue_id: queueId,
      event,
      channel,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Failed to log delivery event:', error);
    // Don't throw - logging failures shouldn't stop processing
  }
}
