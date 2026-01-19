-- Marriage Ministry Database Schema
-- Initial migration

-- Enable UUID extension (using schema-qualified extension)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'couple')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Couples table
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    husband_first_name TEXT NOT NULL,
    husband_last_name TEXT NOT NULL,
    wife_first_name TEXT NOT NULL,
    wife_last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    coach_id UUID REFERENCES public.coaches(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    wedding_date DATE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    due_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment responses table
CREATE TABLE IF NOT EXISTS public.assignment_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) NOT NULL,
    couple_id UUID REFERENCES public.couples(id) NOT NULL,
    response_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(assignment_id, couple_id)
);

-- Assignment status tracking
CREATE TABLE IF NOT EXISTS public.assignment_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) NOT NULL,
    couple_id UUID REFERENCES public.couples(id) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'overdue')),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, couple_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_couples_coach_id ON public.couples(coach_id);
CREATE INDEX IF NOT EXISTS idx_couples_status ON public.couples(status);
CREATE INDEX IF NOT EXISTS idx_assignment_responses_couple_id ON public.assignment_responses(couple_id);
CREATE INDEX IF NOT EXISTS idx_assignment_statuses_couple_id ON public.assignment_statuses(couple_id);
CREATE INDEX IF NOT EXISTS idx_assignment_statuses_status ON public.assignment_statuses(status);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_statuses ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON public.couples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_statuses_updated_at BEFORE UPDATE ON public.assignment_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
