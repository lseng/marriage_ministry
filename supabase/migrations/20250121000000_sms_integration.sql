-- SMS Integration Schema
-- Phase 5: SMS/Text Integration

-- Helper function to check if user is a coach
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- SMS CONFIGURATION TABLE
-- ============================================

-- SMS provider configuration (encrypted credentials)
CREATE TABLE IF NOT EXISTS public.sms_config (
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

-- ============================================
-- SMS MESSAGES TABLE
-- ============================================

-- SMS message log (all inbound/outbound messages)
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT, -- Twilio message SID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  media_urls TEXT[], -- MMS attachments
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'received')),
  couple_id UUID REFERENCES public.couples(id),
  related_assignment_id UUID REFERENCES public.assignments(id),
  conversation_thread_id UUID,
  error_code TEXT,
  error_message TEXT,
  segments INTEGER DEFAULT 1, -- SMS segment count for billing
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHONE MAPPINGS TABLE
-- ============================================

-- Phone number to couple mapping with verification
CREATE TABLE IF NOT EXISTS public.phone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
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

-- ============================================
-- SMS TEMPLATES TABLE
-- ============================================

-- SMS templates for consistent messaging
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'assignment', 'reminder', 'verification', 'system'
  body TEXT NOT NULL, -- Max 160 chars recommended, supports {{variables}}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sms_messages_couple ON public.sms_messages(couple_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction_status ON public.sms_messages(direction, status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON public.sms_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_number ON public.phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_couple ON public.phone_mappings(couple_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- SMS Config Policies
DROP POLICY IF EXISTS "sms_config_admin_all" ON public.sms_config;
CREATE POLICY "sms_config_admin_all"
  ON public.sms_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SMS Messages Policies
DROP POLICY IF EXISTS "sms_messages_service_role" ON public.sms_messages;
CREATE POLICY "sms_messages_service_role"
  ON public.sms_messages FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "sms_messages_admin_select" ON public.sms_messages;
CREATE POLICY "sms_messages_admin_select"
  ON public.sms_messages FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "sms_messages_coach_select" ON public.sms_messages;
CREATE POLICY "sms_messages_coach_select"
  ON public.sms_messages FOR SELECT
  USING (
    public.is_coach() AND
    couple_id IN (
      SELECT id FROM public.couples
      WHERE coach_id = public.get_coach_id()
    )
  );

DROP POLICY IF EXISTS "sms_messages_couple_select" ON public.sms_messages;
CREATE POLICY "sms_messages_couple_select"
  ON public.sms_messages FOR SELECT
  USING (couple_id = public.get_couple_id());

-- Phone Mappings Policies
DROP POLICY IF EXISTS "phone_mappings_admin_all" ON public.phone_mappings;
CREATE POLICY "phone_mappings_admin_all"
  ON public.phone_mappings FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "phone_mappings_couple_all" ON public.phone_mappings;
CREATE POLICY "phone_mappings_couple_all"
  ON public.phone_mappings FOR ALL
  USING (couple_id = public.get_couple_id())
  WITH CHECK (couple_id = public.get_couple_id());

DROP POLICY IF EXISTS "phone_mappings_coach_select" ON public.phone_mappings;
CREATE POLICY "phone_mappings_coach_select"
  ON public.phone_mappings FOR SELECT
  USING (
    public.is_coach() AND
    couple_id IN (
      SELECT id FROM public.couples
      WHERE coach_id = public.get_coach_id()
    )
  );

-- SMS Templates Policies
DROP POLICY IF EXISTS "sms_templates_admin_all" ON public.sms_templates;
CREATE POLICY "sms_templates_admin_all"
  ON public.sms_templates FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "sms_templates_authenticated_select" ON public.sms_templates;
CREATE POLICY "sms_templates_authenticated_select"
  ON public.sms_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update trigger for sms_config
DROP TRIGGER IF EXISTS update_sms_config_updated_at ON public.sms_config;
CREATE TRIGGER update_sms_config_updated_at BEFORE UPDATE ON public.sms_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for phone_mappings
DROP TRIGGER IF EXISTS update_phone_mappings_updated_at ON public.phone_mappings;
CREATE TRIGGER update_phone_mappings_updated_at BEFORE UPDATE ON public.phone_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DEFAULT SMS TEMPLATES
-- ============================================

INSERT INTO public.sms_templates (name, category, body) VALUES
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
  'Welcome to Marriage Ministry SMS! Reply HELP for commands. Text responses are submitted as homework.')
ON CONFLICT (name) DO NOTHING;
