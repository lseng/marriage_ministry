# Phase 7: Notifications & Reminders

> **Reference**: See `specs/marriage-ministry-master-plan.md` for full context
> **Brand Guide**: See `specs/resonate-brand-guide.pdf`
> **Dependencies**: Phase 1 (Auth), Phase 5 (SMS)
> **Priority**: High - User Engagement

---

## Overview

Implement a comprehensive notification system that keeps all users informed about relevant activities through email, SMS, and in-app notifications. This includes assignment alerts, reminders, review notifications, and system updates.

## Goals

1. Email notifications for all major events
2. SMS notifications for time-sensitive items (couples)
3. In-app notification center with real-time updates
4. Scheduled reminders for upcoming due dates
5. Digest emails for coaches/admins
6. User-configurable notification preferences
7. Notification templates for consistent messaging

---

## Notification Types Matrix

| Event | Recipients | Email | SMS | In-App |
|-------|-----------|-------|-----|--------|
| **Assignments** |
| New assignment distributed | Couple | Yes | Optional | Yes |
| Assignment reminder (2 days before) | Couple | Yes | Optional | Yes |
| Assignment overdue | Couple, Coach | Yes | Optional | Yes |
| **Homework** |
| Submission received | Coach | Yes | No | Yes |
| Review completed | Couple | Yes | Optional | Yes |
| **Couples** |
| New couple assigned | Coach | Yes | No | Yes |
| Couple inactive (2+ weeks) | Coach, Admin | Yes | No | Yes |
| **System** |
| Welcome/account created | All | Yes | Optional | No |
| Password reset | All | Yes | No | No |
| Weekly digest | Coach, Admin | Yes | No | No |

---

## Database Schema

### File: `supabase/migrations/[timestamp]_notifications.sql`

```sql
-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL, -- 'assignment_new', 'assignment_reminder', etc.
  subject_template TEXT, -- For email subject
  email_body_template TEXT, -- HTML email body with {{variables}}
  sms_template TEXT, -- Short SMS version (max ~160 chars ideal)
  in_app_template TEXT, -- Short in-app notification text
  in_app_action_url TEXT, -- URL pattern for click action (e.g., /assignments/{{assignment_id}})
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue for async processing
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
  variables JSONB NOT NULL DEFAULT '{}', -- Template variable values
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- For tracking, grouping, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app notifications (persisted for notification center)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT, -- Where to navigate on click
  icon TEXT, -- Icon identifier
  category TEXT, -- 'assignment', 'homework', 'system', etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  related_entity_type TEXT, -- 'assignment', 'couple', 'homework_response', etc.
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences (extend profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_assignments": true,
  "email_reminders": true,
  "email_reviews": true,
  "email_digest": true,
  "sms_assignments": false,
  "sms_reminders": false,
  "sms_reviews": false,
  "in_app_all": true,
  "push_enabled": false,
  "quiet_hours_start": null,
  "quiet_hours_end": null,
  "digest_day": "monday",
  "digest_time": "09:00"
}'::jsonb;

-- Notification delivery log for analytics
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID REFERENCES notification_queue(id),
  event TEXT NOT NULL CHECK (event IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  channel TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status_scheduled ON notification_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_recipient ON notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_queue ON notification_delivery_log(notification_queue_id);

-- RLS policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Templates: Admin only
CREATE POLICY "Admins manage notification templates"
  ON notification_templates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Queue: Service role only (for processing)
CREATE POLICY "Service role manages queue"
  ON notification_queue FOR ALL
  USING (auth.role() = 'service_role');

-- In-app notifications: Users see own
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "Service role manages notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- Delivery log: Admin can view for analytics
CREATE POLICY "Admins view delivery logs"
  ON notification_delivery_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role manages delivery logs"
  ON notification_delivery_log FOR ALL
  USING (auth.role() = 'service_role');
```

### Default Templates

```sql
-- Insert default notification templates
INSERT INTO notification_templates (name, event_type, subject_template, email_body_template, sms_template, in_app_template, in_app_action_url) VALUES

-- Assignment notifications
('assignment_new', 'assignment_new',
  'New Assignment: {{assignment_title}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>A new assignment has been shared with you:</p>
   <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
     <h3 style="color: #41748d; margin-top: 0;">{{assignment_title}}</h3>
     <p>{{assignment_description}}</p>
     <p><strong>Due:</strong> {{due_date}}</p>
   </div>
   <p>Take some time together to reflect on this week''s topic.</p>
   <a href="{{portal_url}}/homework" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Assignment
   </a>
   <p style="color: #666; margin-top: 24px;">Grace and peace,<br>Resonate Marriage Ministry</p>',
  'New assignment: "{{assignment_title}}". Due {{due_date}}. Log in or reply to complete.',
  'New assignment: {{assignment_title}} - Due {{due_date}}',
  '/homework'),

('assignment_reminder', 'assignment_reminder',
  'Reminder: {{assignment_title}} due soon',
  '<h2>Hi {{recipient_name}},</h2>
   <p>Just a gentle reminder that your assignment is due soon:</p>
   <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
     <h3 style="color: #92400e; margin-top: 0;">{{assignment_title}}</h3>
     <p><strong>Due in {{days_remaining}} days</strong></p>
   </div>
   <p>Take some time this week to reflect and respond together.</p>
   <a href="{{portal_url}}/homework" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     Complete Assignment
   </a>',
  'Reminder: "{{assignment_title}}" due in {{days_remaining}} days. Reply with your response or log in.',
  'Reminder: {{assignment_title}} due in {{days_remaining}} days',
  '/homework'),

('assignment_overdue', 'assignment_overdue',
  'Assignment Overdue: {{assignment_title}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>Your assignment "{{assignment_title}}" is now overdue.</p>
   <p>We know life gets busy! Whenever you''re ready, we''re here.</p>
   <a href="{{portal_url}}/homework" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     Complete Now
   </a>',
  'Your assignment "{{assignment_title}}" is overdue. Ready when you are - reply or log in to complete.',
  '{{assignment_title}} is overdue - complete when ready',
  '/homework'),

-- Homework notifications
('submission_received', 'submission_received',
  '{{couple_names}} submitted: {{assignment_title}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>Great news! {{couple_names}} has submitted their response for:</p>
   <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
     <h3 style="color: #065f46; margin-top: 0;">{{assignment_title}}</h3>
   </div>
   <p>Take a moment to review their response and offer encouragement.</p>
   <a href="{{portal_url}}/reviews" style="display: inline-block; background: #50a684; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     Review Submission
   </a>',
  NULL, -- No SMS for coaches
  '{{couple_names}} submitted {{assignment_title}}',
  '/reviews'),

('review_completed', 'review_completed',
  'Your coach reviewed: {{assignment_title}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>{{coach_name}} has reviewed your submission for "{{assignment_title}}" and left some feedback.</p>
   <p>Log in to see their notes and encouragement.</p>
   <a href="{{portal_url}}/homework/{{homework_id}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Feedback
   </a>',
  '{{coach_name}} reviewed your "{{assignment_title}}" submission. Log in to see feedback!',
  '{{coach_name}} reviewed {{assignment_title}}',
  '/homework/{{homework_id}}'),

-- Couple notifications
('couple_assigned', 'couple_assigned',
  'New Couple Assigned: {{couple_names}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>A new couple has been assigned to you:</p>
   <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
     <h3 style="color: #41748d; margin-top: 0;">{{couple_names}}</h3>
     <p>Email: {{couple_email}}</p>
     <p>Stage: {{couple_stage}}</p>
   </div>
   <p>Reach out to introduce yourself and welcome them to the program!</p>
   <a href="{{portal_url}}/couples/{{couple_id}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Couple Profile
   </a>',
  NULL,
  'New couple assigned: {{couple_names}}',
  '/couples/{{couple_id}}'),

('couple_inactive', 'couple_inactive',
  'Check In: {{couple_names}} has been inactive',
  '<h2>Hi {{recipient_name}},</h2>
   <p>{{couple_names}} hasn''t had any activity in {{days_inactive}} days.</p>
   <p>Consider reaching out to check in and see how they''re doing.</p>
   <a href="{{portal_url}}/couples/{{couple_id}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Profile
   </a>',
  NULL,
  '{{couple_names}} inactive for {{days_inactive}} days',
  '/couples/{{couple_id}}'),

-- System notifications
('welcome', 'welcome',
  'Welcome to Marriage Ministry!',
  '<div style="text-align: center; padding: 40px 0;">
     <img src="{{portal_url}}/logo.png" alt="Resonate" style="height: 60px; margin-bottom: 24px;">
   </div>
   <h2>Welcome, {{recipient_name}}!</h2>
   <p>We''re excited to have you join the Resonate Marriage Ministry program.</p>
   <p>Here''s what you can expect:</p>
   <ul>
     <li>Weekly assignments to grow together</li>
     <li>Support from your coach</li>
     <li>Resources for your marriage journey</li>
   </ul>
   <a href="{{portal_url}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     Get Started
   </a>
   <p style="color: #666; margin-top: 24px;">Grace and peace,<br>Resonate Marriage Ministry</p>',
  'Welcome to Marriage Ministry! Log in at {{portal_url}} to get started.',
  NULL,
  NULL),

('weekly_digest', 'weekly_digest',
  'Weekly Ministry Update - {{week_of}}',
  '<h2>Hi {{recipient_name}},</h2>
   <p>Here''s your weekly summary:</p>
   <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
     <h4 style="margin-top: 0;">📊 This Week</h4>
     <ul>
       <li>Assignments completed: {{completed_count}}</li>
       <li>Pending reviews: {{pending_reviews}}</li>
       <li>Overdue assignments: {{overdue_count}}</li>
     </ul>
     {{#if attention_needed}}
     <h4>⚠️ Needs Attention</h4>
     <ul>
       {{#each attention_items}}
       <li>{{this}}</li>
       {{/each}}
     </ul>
     {{/if}}
   </div>
   <a href="{{portal_url}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Dashboard
   </a>',
  NULL,
  NULL,
  NULL);
```

---

## Implementation Steps

### Step 1: Notification Service

**File: `services/notifications.ts`**

```typescript
import { supabase } from '@/lib/supabase';

// Types
export interface NotificationPreferences {
  email_assignments: boolean;
  email_reminders: boolean;
  email_reviews: boolean;
  email_digest: boolean;
  sms_assignments: boolean;
  sms_reminders: boolean;
  sms_reviews: boolean;
  in_app_all: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_day: string;
  digest_time: string;
}

export interface QueueNotificationParams {
  templateName: string;
  recipientId: string;
  variables: Record<string, string>;
  channels?: ('email' | 'sms' | 'in_app')[];
  priority?: number;
  scheduledFor?: Date;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

// Queue a notification
export async function queueNotification(params: QueueNotificationParams): Promise<void> {
  // Get template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('name', params.templateName)
    .eq('is_active', true)
    .single();

  if (!template) {
    console.error(`Notification template not found: ${params.templateName}`);
    return;
  }

  // Get recipient profile with preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, phone, notification_preferences')
    .eq('id', params.recipientId)
    .single();

  if (!profile) {
    console.error(`Recipient not found: ${params.recipientId}`);
    return;
  }

  const prefs = profile.notification_preferences as NotificationPreferences;
  const channels = params.channels || ['email', 'in_app'];

  // Determine preference key based on event type
  const eventCategory = template.event_type.split('_')[0]; // e.g., 'assignment' from 'assignment_new'

  for (const channel of channels) {
    // Check user preferences
    const prefKey = `${channel}_${eventCategory}s` as keyof NotificationPreferences;
    if (prefs && prefs[prefKey] === false) {
      continue; // User opted out
    }

    // Skip channels without templates
    if (channel === 'sms' && !template.sms_template) continue;
    if (channel === 'sms' && !profile.phone) continue;
    if (channel === 'email' && !template.email_body_template) continue;

    // Check quiet hours for non-essential notifications
    if (isInQuietHours(prefs) && params.priority !== 1) {
      // Schedule for after quiet hours
      params.scheduledFor = getNextNonQuietTime(prefs);
    }

    // Queue the notification
    await supabase.from('notification_queue').insert({
      template_id: template.id,
      recipient_id: params.recipientId,
      recipient_email: channel === 'email' ? profile.email : null,
      recipient_phone: channel === 'sms' ? profile.phone : null,
      channel,
      variables: params.variables,
      priority: params.priority || 5,
      scheduled_for: params.scheduledFor?.toISOString() || new Date().toISOString(),
      metadata: params.relatedEntity ? { related_entity: params.relatedEntity } : {},
    });

    // For in-app, also create the notification record immediately
    if (channel === 'in_app') {
      const title = interpolate(template.in_app_template || template.subject_template, params.variables);
      const actionUrl = template.in_app_action_url
        ? interpolate(template.in_app_action_url, params.variables)
        : null;

      await supabase.from('notifications').insert({
        recipient_id: params.recipientId,
        title,
        body: title, // Use same text for simplicity
        action_url: actionUrl,
        category: eventCategory,
        related_entity_type: params.relatedEntity?.type,
        related_entity_id: params.relatedEntity?.id,
      });
    }
  }
}

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}

function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end;
}

function getNextNonQuietTime(prefs: NotificationPreferences): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = (prefs.quiet_hours_end || '08:00').split(':').map(Number);
  tomorrow.setHours(hours, minutes, 0, 0);
  return tomorrow;
}

// Get user's unread notification count
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  return count || 0;
}

// Get user's notifications
export async function getNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean }
): Promise<{ notifications: Notification[]; total: number }> {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, count } = await query;

  return {
    notifications: data || [],
    total: count || 0,
  };
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

// Mark all as read
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('is_read', false);
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  const currentPrefs = profile?.notification_preferences || {};
  const newPrefs = { ...currentPrefs, ...preferences };

  await supabase
    .from('profiles')
    .update({ notification_preferences: newPrefs })
    .eq('id', userId);
}
```

### Step 2: Queue Processor (Edge Function)

**File: `supabase/functions/process-notifications/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
const APP_URL = Deno.env.get('APP_URL') || 'https://marriage.resonatemovement.org';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get pending notifications that are due
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select(`
      *,
      notification_templates (*)
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('priority', { ascending: true })
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Failed to fetch queue:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;
  let failed = 0;

  for (const notification of notifications || []) {
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
      const variables = {
        ...notification.variables,
        portal_url: APP_URL,
      };

      let success = false;

      switch (notification.channel) {
        case 'email':
          success = await sendEmail(
            notification.recipient_email,
            interpolate(template.subject_template, variables),
            interpolate(template.email_body_template, variables)
          );
          break;

        case 'sms':
          success = await sendSMS(
            notification.recipient_phone,
            interpolate(template.sms_template, variables)
          );
          break;

        case 'in_app':
          // Already created in queueNotification
          success = true;
          break;
      }

      if (success) {
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        await logDeliveryEvent(supabase, notification.id, 'sent', notification.channel);
        processed++;
      } else {
        throw new Error('Send failed');
      }
    } catch (err: any) {
      // Check if max attempts reached
      if (notification.attempts + 1 >= notification.max_attempts) {
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: err.message,
          })
          .eq('id', notification.id);

        await logDeliveryEvent(supabase, notification.id, 'failed', notification.channel, {
          error: err.message,
        });
      } else {
        // Reset to pending for retry
        await supabase
          .from('notification_queue')
          .update({
            status: 'pending',
            error_message: err.message,
          })
          .eq('id', notification.id);
      }

      failed++;
      console.error(`Failed to process notification ${notification.id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({ processed, failed, total: notifications?.length || 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function interpolate(template: string | null, variables: Record<string, string>): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Marriage Ministry <noreply@resonatemovement.org>',
      to,
      subject,
      html: wrapEmailTemplate(html),
    }),
  });

  return response.ok;
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('Twilio not configured');
    return false;
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: TWILIO_PHONE_NUMBER!,
      To: to,
      Body: body,
    }).toString(),
  });

  return response.ok;
}

function wrapEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #373a36; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${content}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Resonate Marriage Ministry<br>
        40650 Encyclopedia Cir., Fremont, CA 94538<br>
        <a href="{{portal_url}}/settings/notifications" style="color: #41748d;">Manage notification preferences</a>
      </p>
    </body>
    </html>
  `;
}

async function logDeliveryEvent(
  supabase: any,
  queueId: string,
  event: string,
  channel: string,
  metadata?: Record<string, any>
) {
  await supabase.from('notification_delivery_log').insert({
    notification_queue_id: queueId,
    event,
    channel,
    metadata: metadata || {},
  });
}
```

### Step 3: Scheduled Jobs

**File: `supabase/functions/scheduled-reminders/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results = {
    reminders_sent: 0,
    overdue_marked: 0,
    inactive_alerts: 0,
    digests_queued: 0,
  };

  // 1. Send assignment reminders (2 days before due)
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  twoDaysFromNow.setHours(23, 59, 59, 999);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const { data: pendingAssignments } = await supabase
    .from('assignment_statuses')
    .select(`
      id,
      couple_id,
      couples (
        husband_first_name,
        wife_first_name,
        profile_id
      ),
      assignments (
        id,
        title,
        due_date
      )
    `)
    .eq('status', 'sent')
    .gte('assignments.due_date', tomorrow.toISOString())
    .lte('assignments.due_date', twoDaysFromNow.toISOString());

  for (const status of pendingAssignments || []) {
    // Check if reminder already sent today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingReminder } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('recipient_id', status.couples.profile_id)
      .eq('channel', 'email')
      .ilike('metadata', `%${status.assignments.id}%`)
      .gte('created_at', today)
      .single();

    if (!existingReminder) {
      // Queue reminder
      await supabase.functions.invoke('queue-notification', {
        body: {
          templateName: 'assignment_reminder',
          recipientId: status.couples.profile_id,
          variables: {
            recipient_name: `${status.couples.husband_first_name} & ${status.couples.wife_first_name}`,
            assignment_title: status.assignments.title,
            days_remaining: '2',
          },
          channels: ['email', 'sms', 'in_app'],
          relatedEntity: { type: 'assignment', id: status.assignments.id },
        },
      });
      results.reminders_sent++;
    }
  }

  // 2. Mark overdue assignments and notify
  const { data: overdueAssignments } = await supabase
    .from('assignment_statuses')
    .select(`
      id,
      couple_id,
      couples (
        husband_first_name,
        wife_first_name,
        profile_id,
        coach_id,
        coaches (profile_id)
      ),
      assignments (
        id,
        title,
        due_date
      )
    `)
    .eq('status', 'sent')
    .lt('assignments.due_date', new Date().toISOString());

  for (const status of overdueAssignments || []) {
    // Update status to overdue
    await supabase
      .from('assignment_statuses')
      .update({ status: 'overdue' })
      .eq('id', status.id);

    // Notify couple
    await supabase.functions.invoke('queue-notification', {
      body: {
        templateName: 'assignment_overdue',
        recipientId: status.couples.profile_id,
        variables: {
          recipient_name: `${status.couples.husband_first_name} & ${status.couples.wife_first_name}`,
          assignment_title: status.assignments.title,
        },
        channels: ['email', 'in_app'],
      },
    });

    // Notify coach
    if (status.couples.coaches?.profile_id) {
      await supabase.functions.invoke('queue-notification', {
        body: {
          templateName: 'assignment_overdue',
          recipientId: status.couples.coaches.profile_id,
          variables: {
            recipient_name: 'Coach',
            couple_names: `${status.couples.husband_first_name} & ${status.couples.wife_first_name}`,
            assignment_title: status.assignments.title,
          },
          channels: ['in_app'],
        },
      });
    }

    results.overdue_marked++;
  }

  // 3. Check for inactive couples (2+ weeks)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: inactiveCouples } = await supabase
    .from('couples')
    .select(`
      id,
      husband_first_name,
      wife_first_name,
      profile_id,
      coach_id,
      coaches (profile_id),
      updated_at
    `)
    .eq('status', 'active')
    .lt('updated_at', twoWeeksAgo.toISOString());

  for (const couple of inactiveCouples || []) {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(couple.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Notify coach
    if (couple.coaches?.profile_id) {
      await supabase.functions.invoke('queue-notification', {
        body: {
          templateName: 'couple_inactive',
          recipientId: couple.coaches.profile_id,
          variables: {
            recipient_name: 'Coach',
            couple_names: `${couple.husband_first_name} & ${couple.wife_first_name}`,
            days_inactive: daysSinceActivity.toString(),
            couple_id: couple.id,
          },
          channels: ['email', 'in_app'],
        },
      });
      results.inactive_alerts++;
    }
  }

  // 4. Queue weekly digests (if it's the right day/time)
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentHour = now.getHours();

  // Find coaches/admins who want digest on this day at this hour
  const { data: digestRecipients } = await supabase
    .from('profiles')
    .select('id, notification_preferences')
    .in('role', ['admin', 'coach'])
    .eq('notification_preferences->>digest_day', dayOfWeek);

  for (const recipient of digestRecipients || []) {
    const prefs = recipient.notification_preferences;
    const digestHour = parseInt(prefs?.digest_time?.split(':')[0] || '9');

    if (currentHour === digestHour && prefs?.email_digest !== false) {
      // Generate digest data
      const digestData = await generateDigestData(supabase, recipient.id);

      await supabase.functions.invoke('queue-notification', {
        body: {
          templateName: 'weekly_digest',
          recipientId: recipient.id,
          variables: {
            recipient_name: 'Team',
            week_of: now.toLocaleDateString(),
            ...digestData,
          },
          channels: ['email'],
        },
      });
      results.digests_queued++;
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function generateDigestData(supabase: any, userId: string) {
  // This would be customized based on role
  // For now, return mock data
  return {
    completed_count: '12',
    pending_reviews: '3',
    overdue_count: '2',
    attention_needed: true,
    attention_items: ['Smith family - 3 weeks inactive', 'Jones family - assignment overdue'],
  };
}
```

### Step 4: Notification Bell Component

**File: `components/ui/notification-bell.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string;
  action_url: string | null;
  category: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    if (!user?.id) return;
    setIsLoading(true);
    const { notifications } = await getNotifications(user.id, { limit: 10 });
    setNotifications(notifications);
    setIsLoading(false);
  }

  async function loadUnreadCount() {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }

    setIsOpen(false);
  }

  async function handleMarkAllRead() {
    if (!user?.id) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-elevated border z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-resonate-blue hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-gray-50 border-b last:border-b-0 transition-colors',
                    !notification.is_read && 'bg-blue-50'
                  )}
                >
                  <div className="flex gap-3">
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-resonate-blue rounded-full mt-2 flex-shrink-0" />
                    )}
                    <div className={cn(!notification.is_read ? '' : 'ml-5')}>
                      <p className="font-medium text-sm text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t text-center">
            <a
              href="/notifications"
              className="text-sm text-resonate-blue hover:underline"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Notification Preferences UI

**File: `components/settings/NotificationPreferences.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { updateNotificationPreferences } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { Bell, Mail, Phone, Clock } from 'lucide-react';

interface Preferences {
  email_assignments: boolean;
  email_reminders: boolean;
  email_reviews: boolean;
  email_digest: boolean;
  sms_assignments: boolean;
  sms_reminders: boolean;
  sms_reviews: boolean;
  in_app_all: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_day: string;
  digest_time: string;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  async function loadPreferences() {
    if (!user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    setPrefs(data?.notification_preferences || {});
  }

  async function updatePref(key: keyof Preferences, value: any) {
    if (!user?.id || !prefs) return;

    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    setIsSaving(true);
    await updateNotificationPreferences(user.id, { [key]: value });
    setIsSaving(false);
  }

  if (!prefs) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-resonate-blue" />
          <h3 className="font-semibold">Email Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Assignments</p>
              <p className="text-sm text-gray-500">When new assignments are shared with you</p>
            </div>
            <Switch
              checked={prefs.email_assignments}
              onCheckedChange={(checked) => updatePref('email_assignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reminders</p>
              <p className="text-sm text-gray-500">Before assignments are due</p>
            </div>
            <Switch
              checked={prefs.email_reminders}
              onCheckedChange={(checked) => updatePref('email_reminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reviews</p>
              <p className="text-sm text-gray-500">When your submissions are reviewed</p>
            </div>
            <Switch
              checked={prefs.email_reviews}
              onCheckedChange={(checked) => updatePref('email_reviews', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-gray-500">Summary of activity</p>
            </div>
            <Switch
              checked={prefs.email_digest}
              onCheckedChange={(checked) => updatePref('email_digest', checked)}
            />
          </div>

          {prefs.email_digest && (
            <div className="pl-4 border-l-2 border-gray-200 space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">Send on:</label>
                <Select
                  value={prefs.digest_day}
                  onValueChange={(value) => updatePref('digest_day', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-resonate-blue" />
          <h3 className="font-semibold">SMS Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Assignments</p>
              <p className="text-sm text-gray-500">Text when new assignments are shared</p>
            </div>
            <Switch
              checked={prefs.sms_assignments}
              onCheckedChange={(checked) => updatePref('sms_assignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reminders</p>
              <p className="text-sm text-gray-500">Text reminders before due dates</p>
            </div>
            <Switch
              checked={prefs.sms_reminders}
              onCheckedChange={(checked) => updatePref('sms_reminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reviews</p>
              <p className="text-sm text-gray-500">Text when submissions are reviewed</p>
            </div>
            <Switch
              checked={prefs.sms_reviews}
              onCheckedChange={(checked) => updatePref('sms_reviews', checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-resonate-blue" />
          <h3 className="font-semibold">Quiet Hours</h3>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Pause non-urgent notifications during these hours
        </p>

        <div className="flex items-center gap-4">
          <Select
            value={prefs.quiet_hours_start || 'none'}
            onValueChange={(value) => updatePref('quiet_hours_start', value === 'none' ? null : value)}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Start" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="21:00">9:00 PM</SelectItem>
              <SelectItem value="22:00">10:00 PM</SelectItem>
              <SelectItem value="23:00">11:00 PM</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-gray-500">to</span>
          <Select
            value={prefs.quiet_hours_end || 'none'}
            onValueChange={(value) => updatePref('quiet_hours_end', value === 'none' ? null : value)}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="End" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="06:00">6:00 AM</SelectItem>
              <SelectItem value="07:00">7:00 AM</SelectItem>
              <SelectItem value="08:00">8:00 AM</SelectItem>
              <SelectItem value="09:00">9:00 AM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isSaving && (
        <p className="text-sm text-gray-500 text-center">Saving...</p>
      )}
    </div>
  );
}
```

---

## Cron Schedule

Set up the following cron jobs in Supabase:

```sql
-- Process notification queue every minute
SELECT cron.schedule(
  'process-notifications',
  '* * * * *', -- Every minute
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);

-- Run scheduled reminders hourly
SELECT cron.schedule(
  'scheduled-reminders',
  '0 * * * *', -- Every hour
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  )$$
);
```

---

## Environment Variables

```bash
# Email (Resend)
RESEND_API_KEY=re_...

# SMS (Twilio) - from Phase 5
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# App
APP_URL=https://marriage.resonatemovement.org
```

---

## Acceptance Criteria

- [ ] Notification templates created for all event types
- [ ] Email notifications sent via Resend
- [ ] SMS notifications sent via Twilio (couples only)
- [ ] In-app notification bell shows unread count
- [ ] Real-time updates for new notifications
- [ ] Notification preferences page functional
- [ ] Quiet hours respected for non-urgent notifications
- [ ] Assignment reminders sent 2 days before due
- [ ] Overdue assignments trigger notifications
- [ ] Inactive couples trigger coach alerts
- [ ] Weekly digest sent to coaches/admins
- [ ] Notification delivery logged for analytics
- [ ] Failed notifications retry up to 3 times
