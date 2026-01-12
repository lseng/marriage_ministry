-- Marriage Ministry RLS Policies
-- Role-based access control for all tables

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get coach_id for current user
CREATE OR REPLACE FUNCTION public.get_coach_id()
RETURNS UUID AS $$
  SELECT id FROM public.coaches WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get couple_id for current user
CREATE OR REPLACE FUNCTION public.get_couple_id()
RETURNS UUID AS $$
  SELECT c.id FROM public.couples c
  JOIN public.profiles p ON p.email = c.email
  WHERE p.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Profile is created on signup (handled by trigger, but allow service role)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- COACHES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "coaches_select_admin" ON public.coaches;
DROP POLICY IF EXISTS "coaches_select_own" ON public.coaches;
DROP POLICY IF EXISTS "coaches_insert_admin" ON public.coaches;
DROP POLICY IF EXISTS "coaches_update_admin" ON public.coaches;
DROP POLICY IF EXISTS "coaches_delete_admin" ON public.coaches;

-- Admins can view all coaches
CREATE POLICY "coaches_select_admin" ON public.coaches
  FOR SELECT USING (public.is_admin());

-- Coaches can view their own record
CREATE POLICY "coaches_select_own" ON public.coaches
  FOR SELECT USING (user_id = auth.uid());

-- Only admins can create coaches
CREATE POLICY "coaches_insert_admin" ON public.coaches
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update coaches
CREATE POLICY "coaches_update_admin" ON public.coaches
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete coaches
CREATE POLICY "coaches_delete_admin" ON public.coaches
  FOR DELETE USING (public.is_admin());

-- ============================================
-- COUPLES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "couples_select_admin" ON public.couples;
DROP POLICY IF EXISTS "couples_select_coach" ON public.couples;
DROP POLICY IF EXISTS "couples_select_own" ON public.couples;
DROP POLICY IF EXISTS "couples_insert_admin" ON public.couples;
DROP POLICY IF EXISTS "couples_update_admin" ON public.couples;
DROP POLICY IF EXISTS "couples_update_coach" ON public.couples;
DROP POLICY IF EXISTS "couples_delete_admin" ON public.couples;

-- Admins can view all couples
CREATE POLICY "couples_select_admin" ON public.couples
  FOR SELECT USING (public.is_admin());

-- Coaches can view their assigned couples
CREATE POLICY "couples_select_coach" ON public.couples
  FOR SELECT USING (coach_id = public.get_coach_id());

-- Couples can view their own record
CREATE POLICY "couples_select_own" ON public.couples
  FOR SELECT USING (id = public.get_couple_id());

-- Only admins can create couples
CREATE POLICY "couples_insert_admin" ON public.couples
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update any couple
CREATE POLICY "couples_update_admin" ON public.couples
  FOR UPDATE USING (public.is_admin());

-- Coaches can update notes/status for their assigned couples (limited fields handled in app)
CREATE POLICY "couples_update_coach" ON public.couples
  FOR UPDATE USING (coach_id = public.get_coach_id());

-- Only admins can delete couples
CREATE POLICY "couples_delete_admin" ON public.couples
  FOR DELETE USING (public.is_admin());

-- ============================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "assignments_select_all" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert_admin" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_admin" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete_admin" ON public.assignments;

-- All authenticated users can view assignments
CREATE POLICY "assignments_select_all" ON public.assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can create assignments
CREATE POLICY "assignments_insert_admin" ON public.assignments
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update assignments
CREATE POLICY "assignments_update_admin" ON public.assignments
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete assignments
CREATE POLICY "assignments_delete_admin" ON public.assignments
  FOR DELETE USING (public.is_admin());

-- ============================================
-- ASSIGNMENT_RESPONSES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "responses_select_admin" ON public.assignment_responses;
DROP POLICY IF EXISTS "responses_select_coach" ON public.assignment_responses;
DROP POLICY IF EXISTS "responses_select_own" ON public.assignment_responses;
DROP POLICY IF EXISTS "responses_insert_couple" ON public.assignment_responses;
DROP POLICY IF EXISTS "responses_update_couple" ON public.assignment_responses;
DROP POLICY IF EXISTS "responses_update_reviewer" ON public.assignment_responses;

-- Admins can view all responses
CREATE POLICY "responses_select_admin" ON public.assignment_responses
  FOR SELECT USING (public.is_admin());

-- Coaches can view responses from their assigned couples
CREATE POLICY "responses_select_coach" ON public.assignment_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id AND c.coach_id = public.get_coach_id()
    )
  );

-- Couples can view their own responses
CREATE POLICY "responses_select_own" ON public.assignment_responses
  FOR SELECT USING (couple_id = public.get_couple_id());

-- Couples can create their own responses
CREATE POLICY "responses_insert_couple" ON public.assignment_responses
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id());

-- Couples can update their own responses (before review)
CREATE POLICY "responses_update_couple" ON public.assignment_responses
  FOR UPDATE USING (
    couple_id = public.get_couple_id()
    AND reviewed_at IS NULL
  );

-- Coaches and admins can add review notes
CREATE POLICY "responses_update_reviewer" ON public.assignment_responses
  FOR UPDATE USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id AND c.coach_id = public.get_coach_id()
    )
  );

-- ============================================
-- ASSIGNMENT_STATUSES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "statuses_select_admin" ON public.assignment_statuses;
DROP POLICY IF EXISTS "statuses_select_coach" ON public.assignment_statuses;
DROP POLICY IF EXISTS "statuses_select_own" ON public.assignment_statuses;
DROP POLICY IF EXISTS "statuses_insert_admin" ON public.assignment_statuses;
DROP POLICY IF EXISTS "statuses_update_admin" ON public.assignment_statuses;
DROP POLICY IF EXISTS "statuses_update_on_complete" ON public.assignment_statuses;

-- Admins can view all statuses
CREATE POLICY "statuses_select_admin" ON public.assignment_statuses
  FOR SELECT USING (public.is_admin());

-- Coaches can view statuses for their assigned couples
CREATE POLICY "statuses_select_coach" ON public.assignment_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id AND c.coach_id = public.get_coach_id()
    )
  );

-- Couples can view their own assignment statuses
CREATE POLICY "statuses_select_own" ON public.assignment_statuses
  FOR SELECT USING (couple_id = public.get_couple_id());

-- Only admins can create/distribute assignment statuses
CREATE POLICY "statuses_insert_admin" ON public.assignment_statuses
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update any status
CREATE POLICY "statuses_update_admin" ON public.assignment_statuses
  FOR UPDATE USING (public.is_admin());

-- Status is updated to completed when couple submits (handled by trigger)
CREATE POLICY "statuses_update_on_complete" ON public.assignment_statuses
  FOR UPDATE USING (couple_id = public.get_couple_id());

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'couple'); -- Default role is 'couple'
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
