-- Dynamic Forms Schema Migration
-- Adds form templates and homework responses with JSONB fields

-- Form Templates table for dynamic homework forms
CREATE TABLE IF NOT EXISTS public.form_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add form_template_id to assignments
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS form_template_id UUID REFERENCES public.form_templates(id);

-- Homework Responses table with JSONB responses
CREATE TABLE IF NOT EXISTS public.homework_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_status_id UUID REFERENCES public.assignment_statuses(id) NOT NULL,
    couple_id UUID REFERENCES public.couples(id) NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}',
    draft_responses JSONB,
    is_draft BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_status_id, couple_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_templates_is_active ON public.form_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_homework_responses_couple_id ON public.homework_responses(couple_id);
CREATE INDEX IF NOT EXISTS idx_homework_responses_assignment_status_id ON public.homework_responses(assignment_status_id);
CREATE INDEX IF NOT EXISTS idx_homework_responses_reviewed_at ON public.homework_responses(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_assignments_form_template_id ON public.assignments(form_template_id);

-- Add user_id to couples for RLS (if not exists) - MUST BE DONE BEFORE RLS POLICIES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'couples' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.couples ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- Create index for couples.user_id
CREATE INDEX IF NOT EXISTS idx_couples_user_id ON public.couples(user_id);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_templates
-- Admins: Full access
CREATE POLICY "Admins can manage form templates" ON public.form_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Coaches: Read active templates
CREATE POLICY "Coaches can view active form templates" ON public.form_templates
    FOR SELECT USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Couples: Read active templates
CREATE POLICY "Couples can view active form templates" ON public.form_templates
    FOR SELECT USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'couple'
        )
    );

-- RLS Policies for homework_responses
-- Admins: Full access
CREATE POLICY "Admins can manage homework responses" ON public.homework_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Coaches: Read responses for their assigned couples
CREATE POLICY "Coaches can view responses for assigned couples" ON public.homework_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.coaches c ON c.user_id = p.id
            JOIN public.couples cp ON cp.coach_id = c.id
            WHERE p.id = auth.uid()
            AND p.role = 'coach'
            AND cp.id = homework_responses.couple_id
        )
    );

-- Coaches: Update (review) responses for their assigned couples
CREATE POLICY "Coaches can review responses for assigned couples" ON public.homework_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.coaches c ON c.user_id = p.id
            JOIN public.couples cp ON cp.coach_id = c.id
            WHERE p.id = auth.uid()
            AND p.role = 'coach'
            AND cp.id = homework_responses.couple_id
        )
    );

-- Couples: CRUD own responses
CREATE POLICY "Couples can manage own responses" ON public.homework_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.couples c ON c.user_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'couple'
            AND c.id = homework_responses.couple_id
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_responses_updated_at BEFORE UPDATE ON public.homework_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.form_templates IS 'Dynamic form templates for homework assignments';
COMMENT ON COLUMN public.form_templates.fields IS 'JSON array of field definitions: [{type, label, required, options, placeholder, ...}]';
COMMENT ON TABLE public.homework_responses IS 'Couple responses to homework assignments';
COMMENT ON COLUMN public.homework_responses.responses IS 'JSON object mapping field_id to response value';
COMMENT ON COLUMN public.homework_responses.draft_responses IS 'Saved draft responses for auto-save functionality';
