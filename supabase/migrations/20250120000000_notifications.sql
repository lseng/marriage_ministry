-- Notifications Database Schema
-- Phase 7: Notifications & Reminders

-- Notification templates for consistent messaging
CREATE TABLE IF NOT EXISTS public.notification_templates (
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
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.notification_templates(id),
  recipient_id UUID REFERENCES public.profiles(id) NOT NULL,
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
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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

-- Notification delivery log for analytics
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID REFERENCES public.notification_queue(id),
  event TEXT NOT NULL CHECK (event IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  channel TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add notification_preferences column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
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

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_queue_status_scheduled ON public.notification_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_recipient ON public.notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_queue ON public.notification_delivery_log(notification_queue_id);
CREATE INDEX IF NOT EXISTS idx_templates_event_type ON public.notification_templates(event_type);

-- Enable RLS on new tables
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Templates: Admin only for management, all authenticated can read active templates
CREATE POLICY "Admins manage notification templates"
  ON public.notification_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read active templates"
  ON public.notification_templates FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Queue: Service role only (for processing) - no direct user access
CREATE POLICY "Service role manages queue"
  ON public.notification_queue FOR ALL
  USING (auth.role() = 'service_role');

-- In-app notifications: Users see and update their own
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Service role manages notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

-- Delivery log: Admin can view for analytics
CREATE POLICY "Admins view delivery logs"
  ON public.notification_delivery_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role manages delivery logs"
  ON public.notification_delivery_log FOR ALL
  USING (auth.role() = 'service_role');

-- Triggers for updated_at on notification_templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO public.notification_templates (name, event_type, subject_template, email_body_template, sms_template, in_app_template, in_app_action_url) VALUES

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
     <h4 style="margin-top: 0;">This Week</h4>
     <ul>
       <li>Assignments completed: {{completed_count}}</li>
       <li>Pending reviews: {{pending_reviews}}</li>
       <li>Overdue assignments: {{overdue_count}}</li>
     </ul>
   </div>
   <a href="{{portal_url}}" style="display: inline-block; background: #41748d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
     View Dashboard
   </a>',
  NULL,
  NULL,
  NULL)

ON CONFLICT (name) DO NOTHING;
