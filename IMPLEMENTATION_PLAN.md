# Implementation Plan

Generated: 2026-01-18T09:45:00Z
Based on specs: design-system.md, phase-1-authentication.md, phase-5-sms-integration.md, phase-6-llm-conversations.md, phase-7-notifications.md, dashboard-interactivity-enhancements.md, profile-views.md, seed-data-population.md, marriage-ministry-master-plan.md

---

## Current State Summary

The Marriage Ministry application has a **comprehensive foundation** with most core functionality implemented and passing validation (lint + build + tests).

### Fully Implemented ✓

**Authentication & Authorization:**
- Email/password sign-in with Supabase Auth
- Magic link authentication flow
- Role-based access control (Admin, Coach, Couple)
- RLS policies on all tables (3 migrations deployed)
- Protected routes with role checks
- Profile management with email/password updates

**Coach/Couple Management:**
- Full CRUD operations with grid/list view toggle
- Search and status filtering (URL-synced)
- Coach assignment to couples
- Detailed profile views (CoachProfile, CoupleProfile, MyProfile)
- ProfileHeader, ProfileEditModal, AssignmentHistoryList components

**Assignments & Homework:**
- Assignment creation with week number and due dates
- Distribution to all couples, coach's couples, or specific couples
- Form template builder (8 field types: text, textarea, select, checkbox, radio, scale, date, number)
- Homework submission with draft saving
- Coach review workflow with notes
- AssignmentDetailModal with distribution statistics

**Dashboard:**
- Role-specific dashboards (ManagerDashboard, CoachDashboard, CoupleDashboard)
- MetricCard component with onClick/href navigation
- ViewAllLink component for "View All" navigation
- Recent activity feed and upcoming assignments
- Real-time metrics from Supabase

**In-App Notifications:**
- NotificationContext with localStorage persistence
- Supabase realtime subscriptions (new assignments, homework submissions, coach assignments)
- Notification bell in header with unread count

**Seed Data:**
- 7 auth users (1 admin, 5 coaches, 1 couple user)
- 5 coaches (4 active, 1 inactive)
- 12 couples (9 active, 2 completed, 1 inactive)
- 3 form templates with JSONB field definitions
- 6 assignments (Weeks 1-6 with varied due dates)
- 48 assignment statuses with realistic distribution
- Homework responses with JSONB data

### Test Coverage

**Unit Tests (9 test files):**
- `components/auth/__tests__/LoginPage.test.tsx`
- `contexts/__tests__/AuthContext.test.tsx`
- `hooks/__tests__/useProfile.test.ts`
- `components/profile/__tests__/CoupleProfile.test.tsx`
- `components/profile/__tests__/CoachProfile.test.tsx`
- `components/profile/__tests__/MyProfile.test.tsx`
- `components/dashboard/__tests__/MetricCard.test.tsx`
- `components/dashboard/__tests__/ViewAllLink.test.tsx`
- `components/assignments/__tests__/AssignmentDetailModal.test.tsx`

**E2E Tests (3 test files):**
- `e2e/example.spec.ts`
- `e2e/auth-magic-link.spec.ts`
- `e2e/auth-password-signin.spec.ts`

### Build Status ✓

```
npm run lint    → 0 warnings
npm run build   → Success (532 kB bundle)
```

---

## Gap Analysis Summary

### Design System Gaps

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Resonate Blue (#41748d) | Generic HSL blue (221.2 83.2% 53.3%) | Not using brand colors |
| Resonate Green (#50a684) | No green/success color | Missing success color |
| Extended palette (50-900 shades) | Single primary color | Missing shades |
| Acumin Pro typography | System fonts only | Missing custom font |

**Files affected:** `styles/globals.css`, `tailwind.config.js`

### Phase 1: Authentication Gaps

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Invitation system with 7-day tokens | ✅ Implemented | Invitations table + Admin UI complete |
| Account lockout after 5 attempts | Not implemented | Missing lockout columns and logic |
| Session tracking (3 device limit) | Not implemented | Missing `user_sessions` table |
| Password reset flow | Not implemented | Missing forgot/reset pages |
| AcceptInvitePage | Not implemented | Missing component and route |

### Phase 5: SMS Integration Gaps

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Twilio integration | Not implemented | No SMS service |
| Phone verification | Not implemented | No phone_mappings table |
| SMS commands (STATUS, SUBMIT, etc.) | Not implemented | No webhook handler |
| PhoneVerification component | Not implemented | Missing UI |

### Phase 6: LLM Conversations Gaps

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Claude API integration | Not implemented | No LLM service |
| AssignmentChat component | Not implemented | No chat UI |
| Conversation threading | Not implemented | No conversation tables |
| Crisis keyword escalation | Not implemented | No detection logic |

### Phase 7: Notifications Gaps

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Email via Resend | Not implemented | In-app only |
| notification_templates table | Not implemented | Missing database tables |
| Notification preferences page | Not implemented | No preferences UI |
| Scheduled reminders | Not implemented | No scheduler |

---

## Prioritized Tasks

### High Priority

#### H1: Apply Resonate Brand Colors to Design System
- [x] Update CSS variables and Tailwind config with brand colors ✅ (2026-01-18)
  - Files: `styles/globals.css`, `tailwind.config.js`
  - Spec: `specs/design-system.md`
  - Work:
    - Update `--primary` to Resonate Blue (#41748d → HSL: 197 37% 40%)
    - Add `--success` using Resonate Green (#50a684 → HSL: 155 36% 48%)
    - Add resonate color palette with 50-900 shades for blue and green
    - Add extended semantic colors (warning, error, info)
    - Configure Acumin Pro font family (with Inter as fallback)
  - Validation: `npm run build`, visual inspection confirms brand colors

#### H2: Create Invitations Database Schema
- [x] Add invitation tracking table with security policies ✅ (2026-01-18)
  - Files: `supabase/migrations/YYYYMMDD_invitations.sql`, `types/database.ts`
  - Spec: `specs/phase-1-authentication.md`
  - Work:
    - Create `invitations` table (id, email, role, token, invited_by, expires_at, accepted_at, created_at)
    - Create RLS policies (admin-only create, token-based read for acceptance)
    - Regenerate TypeScript types: `npx supabase gen types typescript`
  - Validation: `npm run build`, migration applies cleanly with `npx supabase db reset`

#### H3: Implement Admin Invite Flow (UI)
- [x] Create invitation modal and integrate with coach/couple lists ✅ (2026-01-18)
  - Files:
    - `components/admin/InviteUserModal.tsx` (new)
    - `components/coaches/CoachesList.tsx` (add invite button)
    - `components/couples/CouplesList.tsx` (add invite button)
    - `services/invitations.ts` (new)
    - `hooks/useInvitations.ts` (new)
  - Spec: `specs/phase-1-authentication.md`
  - Work:
    - Create InviteUserModal with email input and role selection
    - Add "Invite Coach" button to CoachesList (admin only)
    - Add "Invite Couple" button to CouplesList (admin only)
    - Generate secure tokens with crypto.getRandomValues (7-day expiry)
    - Send invitation record to Supabase
    - Copy invitation link to clipboard
    - Check for existing pending invitations
  - Validation: Admin can create invitation, record appears in DB

#### H4: Create Accept Invitation Page
- [x] Build invitation acceptance flow ✅ (2026-01-18)
  - Files:
    - `components/auth/AcceptInvitePage.tsx` (new)
    - `App.tsx` (add route `/auth/accept-invite`)
  - Spec: `specs/phase-1-authentication.md`
  - Work:
    - Validate token from URL parameter
    - Display invitation details (role, inviter)
    - Password creation form with requirements (8+ chars, 1 uppercase, 1 number)
    - Create Supabase auth user via Edge Function (service role key)
    - Create profile record with invited role
    - Mark invitation as accepted
    - Handle expired/invalid tokens gracefully
  - Validation: Full flow from invitation link to logged-in dashboard

#### H5: Implement Forgot/Reset Password Flow
- [ ] Add forgot and reset password pages
  - Files:
    - `components/auth/ForgotPasswordPage.tsx` (new)
    - `components/auth/ResetPasswordPage.tsx` (new)
    - `components/auth/LoginPage.tsx` (add "Forgot Password?" link)
    - `App.tsx` (add routes `/auth/forgot-password`, `/auth/reset-password`)
  - Spec: `specs/phase-1-authentication.md`
  - Work:
    - ForgotPasswordPage: email input, calls `supabase.auth.resetPasswordForEmail()`
    - Show confirmation message after request
    - ResetPasswordPage: validates recovery token, password input with requirements
    - Add "Forgot Password?" link to LoginPage
  - Validation: Complete password reset flow works end-to-end

#### H6: Add Account Lockout Logic
- [ ] Implement failed login tracking and temporary lockout
  - Files:
    - `supabase/migrations/YYYYMMDD_profile_security_fields.sql`
    - `contexts/AuthContext.tsx`
    - `components/auth/LoginPage.tsx`
    - `types/database.ts`
  - Spec: `specs/phase-1-authentication.md`
  - Work:
    - Add columns to profiles: `failed_login_attempts` (int), `locked_until` (timestamptz)
    - Track failed attempts on login error
    - Lock account after 5 failures (30 min lockout per spec)
    - Clear failed attempts on successful login
    - Show appropriate error messages when locked
  - Validation: Account locks after 5 failed attempts, unlocks after timeout

---

### Medium Priority

#### M1: Create Notifications Database Schema
- [ ] Add notification tables for multi-channel delivery
  - Files: `supabase/migrations/YYYYMMDD_notifications.sql`, `types/database.ts`
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Create `notification_templates` table (id, name, type, subject, body_html, body_sms, body_inapp, variables, is_active)
    - Create `notification_queue` table (id, template_id, recipient_id, channel, variables, priority, scheduled_for, processed_at, status)
    - Create `notifications` table (id, user_id, title, body, type, read_at, metadata, created_at)
    - Create `notification_delivery_log` table (id, notification_id, channel, status, error, sent_at)
    - Add `notification_preferences` JSONB column to profiles
    - RLS policies for each table
  - Validation: Migration applies, types regenerated

#### M2: Enhance In-App Notifications with Database Persistence
- [ ] Wire up notification bell with database-backed notifications
  - Files:
    - `services/notifications.ts` (new)
    - `hooks/useNotifications.ts` (enhance existing)
    - `components/ui/notification-bell.tsx` (enhance)
    - `components/notifications/NotificationDropdown.tsx` (new)
    - `contexts/NotificationContext.tsx` (enhance)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Create notifications service (getNotifications, markAsRead, markAllAsRead)
    - Enhance useNotifications hook to read from database
    - Keep real-time subscription for immediate updates
    - Create dropdown showing recent notifications with timestamps
    - Mark as read on click
  - Validation: Notifications persist across sessions, mark as read works

#### M3: Add Notification Preferences Page
- [ ] Build notification settings in user profile
  - Files:
    - `components/profile/NotificationPreferences.tsx` (new)
    - `components/profile/MyProfile.tsx` (add tab/section)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Create preferences form (email on/off, in-app on/off, quiet hours)
    - Per-notification-type toggles (assignments, submissions, reviews)
    - Save to profiles.notification_preferences JSONB
    - Load preferences on mount
  - Validation: Preferences save and load correctly

#### M4: Add Missing Unit Tests for Hooks
- [ ] Increase test coverage for custom hooks
  - Files: `hooks/__tests__/*.test.ts`
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Add tests for useCoaches hook (CRUD operations, loading states)
    - Add tests for useCouples hook (filtering, coach assignment)
    - Add tests for useAssignments hook (distribution, status tracking)
    - Add tests for useHomework hook (draft, submit, review flows)
    - Mock Supabase client properly
  - Validation: `npm run test:coverage` shows improvement

#### M5: Add Missing Unit Tests for Services
- [ ] Increase test coverage for service layer
  - Files: `services/__tests__/*.test.ts`
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Add tests for coaches.ts service
    - Add tests for couples.ts service
    - Add tests for assignments.ts service
    - Add tests for homework.ts service
    - Mock Supabase responses
  - Validation: `npm run test:coverage` shows improvement

#### M6: Verify Seed Data Completeness
- [ ] Audit seed data against spec requirements
  - Files: `supabase/seed.sql`
  - Spec: `specs/seed-data-population.md`
  - Work:
    - Verify 7 auth users, 5 coaches, 12 couples, 3 form templates, 6 assignments
    - Verify deterministic UUIDs for predictable relationships
    - Verify dashboard shows expected metrics after seeding
    - Verify assignment statuses distribution
  - Validation: `npx supabase db reset`, dashboard metrics match expectations

---

### Low Priority

#### L1: SMS Integration - Database Schema
- [ ] Create SMS-related database tables
  - Files: `supabase/migrations/YYYYMMDD_sms_tables.sql`, `types/database.ts`
  - Spec: `specs/phase-5-sms-integration.md`
  - Work:
    - Create `phone_mappings` table (id, phone, couple_id, verified, verification_code, verified_at)
    - Create `sms_messages` table (id, direction, phone, body, status, twilio_sid, error_message, created_at)
    - Create `sms_templates` table (id, name, body, variables, is_active)
    - Create `sms_opt_outs` table (phone, opted_out_at, reason)
    - RLS policies
  - Validation: Migration applies cleanly

#### L2: SMS Integration - Twilio Webhook Edge Function
- [ ] Handle inbound SMS from Twilio
  - Files: `supabase/functions/twilio-webhook/index.ts` (new)
  - Spec: `specs/phase-5-sms-integration.md`
  - Work:
    - Create Edge Function to receive Twilio webhooks
    - Verify Twilio signature (X-Twilio-Signature header)
    - Parse inbound messages
    - Route to command handlers (HELP, STATUS, SUBMIT, DONE, PAUSE, STOP, START)
    - Log messages to sms_messages table
    - Return TwiML response
  - Validation: Webhook receives and logs test messages

#### L3: SMS Integration - Phone Verification Component
- [ ] Build phone verification UI
  - Files:
    - `components/couples/PhoneVerification.tsx` (new)
    - `components/profile/MyProfile.tsx` (add verification UI for couples)
    - `services/sms.ts` (new)
  - Spec: `specs/phase-5-sms-integration.md`
  - Work:
    - Send 6-digit verification code via Twilio
    - Input field for code entry
    - Mark phone as verified on success
    - Show verified status in profile
  - Validation: Couple can verify phone number

#### L4: LLM Conversations - Database Schema
- [ ] Create conversation-related database tables
  - Files: `supabase/migrations/YYYYMMDD_conversations.sql`, `types/database.ts`
  - Spec: `specs/phase-6-llm-conversations.md`
  - Work:
    - Create `conversation_threads` table (id, assignment_status_id, couple_id, status, channel, started_at, completed_at)
    - Create `conversation_messages` table (id, thread_id, role, content, tokens_used, created_at)
    - Create `llm_configs` table (id, name, model, system_prompt, max_turns, temperature, crisis_keywords)
    - RLS policies
  - Validation: Migration applies cleanly

#### L5: LLM Conversations - Chat Component
- [ ] Build conversational homework UI
  - Files:
    - `components/homework/AssignmentChat.tsx` (new)
    - `services/conversations.ts` (new)
    - `hooks/useConversation.ts` (new)
    - `supabase/functions/conversation-handler/index.ts` (new)
  - Spec: `specs/phase-6-llm-conversations.md`
  - Work:
    - Create chat UI with message bubbles (user/assistant differentiation)
    - Edge Function for Claude API calls (claude-3-5-sonnet)
    - Category-specific system prompts (communication, conflict, intimacy)
    - Implement conversation flow with assignment questions
    - Detect completion and extract structured responses
    - Enforce turn limits (20 user + 20 assistant)
  - Validation: Couple can complete assignment via chat

#### L6: LLM Conversations - Crisis Escalation
- [ ] Implement crisis keyword detection and alerts
  - Files:
    - `supabase/functions/conversation-handler/index.ts` (enhance)
    - `services/conversations.ts` (enhance)
  - Spec: `specs/phase-6-llm-conversations.md`
  - Work:
    - Implement crisis keyword detection (abuse, suicide, violence, etc.)
    - Pause conversation on detection
    - Create escalation alert record
    - Notify assigned coach (in-app notification)
    - Flag thread for review
    - Provide crisis resources message to user
  - Validation: Crisis keywords trigger appropriate alerts

#### L7: Email Notifications via Resend
- [ ] Implement email delivery for notifications
  - Files:
    - `supabase/functions/send-email/index.ts` (new)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Create Edge Function for Resend API integration
    - Template variable interpolation
    - Brand footer with Resonate styling
    - Retry logic (3 attempts with exponential backoff)
    - Log delivery to notification_delivery_log
  - Validation: Test email sends successfully

#### L8: Scheduled Notification Processing
- [ ] Process notification queue on schedule
  - Files:
    - `supabase/functions/process-notifications/index.ts` (new)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Process notification_queue entries
    - Check user preferences before sending
    - Respect quiet hours configuration
    - Route to appropriate channel (email, sms, in-app)
    - Log delivery results
    - Use pg_cron or Supabase scheduled functions
  - Validation: Queued notifications process on schedule

---

## Dependencies

```
H1 (Brand Colors) → No dependencies

H2 (Invitations Schema) → No dependencies
H3 (Invite Flow UI) → H2
H4 (Accept Invite Page) → H2, H3
H5 (Password Reset) → No dependencies
H6 (Account Lockout) → No dependencies

M1 (Notifications Schema) → No dependencies
M2 (In-App Notifications) → M1
M3 (Notification Preferences) → M1, M2
M4-M6 (Tests & Seed Data) → No dependencies

L1 (SMS Schema) → No dependencies
L2 (Twilio Webhook) → L1
L3 (Phone Verification) → L1, L2
L4 (LLM Schema) → No dependencies
L5 (Chat Component) → L4
L6 (Crisis Escalation) → L4, L5
L7 (Email via Resend) → M1
L8 (Scheduled Processing) → M1, L7
```

---

## Environment Variables Required

```bash
# Already configured
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Phase 1 & 7 (Email notifications/invitations)
RESEND_API_KEY=

# Phase 5 (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Phase 6 (LLM)
ANTHROPIC_API_KEY=
```

---

## Risks & Considerations

1. **Resonate Brand Assets:** Need access to Acumin Pro font files or license. Spec allows Inter as fallback.

2. **Email Delivery:** Resend requires domain verification for production. Use Supabase Auth emails for development.

3. **Twilio Costs:** SMS integration requires Twilio account with phone number. Consider development sandbox for testing.

4. **Claude API:** LLM conversations require Anthropic API key. Need careful prompt engineering for accurate response extraction and crisis detection.

5. **Background Jobs:** Notification processing needs reliable scheduling. Recommend pg_cron (Supabase extension) for simplicity.

6. **Session Management:** If implementing concurrent session limits (max 3), handle edge cases carefully to avoid inadvertent lockouts.

7. **Test Data Isolation:** E2E tests need isolated data. Consider test-specific seed data or transaction rollback.

8. **Supabase Auth Admin API:** Invitation acceptance requires `supabase.auth.admin.createUser()` - needs service role key in Edge Function only (NEVER client-side).

9. **Bundle Size:** Current build is 532 kB (over 500 kB limit). Consider code splitting before adding more features.

---

## Validation Commands

```bash
# Lint (0 warnings policy)
npm run lint

# Type check + build
npm run build

# Unit tests
npm run test:run

# Coverage report (target: 70%+)
npm run test:coverage

# E2E tests (requires local Supabase)
npx supabase start
npm run test:e2e

# Full validation suite
npm run test:all

# Database reset with seed
npx supabase db reset
```

---

## Summary

| Priority | Count | Focus Area |
|----------|-------|------------|
| High     | 6     | Brand Design + Authentication |
| Medium   | 6     | Notifications + Test Coverage |
| Low      | 8     | SMS + LLM Integration |
| **Total** | **20** | |

**Recommended Execution Order:**

1. **Sprint 1 (Foundation):** H1 (brand colors), H5 (password reset), H6 (account lockout)
2. **Sprint 2 (Invitations):** H2-H4 (full invitation flow)
3. **Sprint 3 (Notifications):** M1-M3 (notifications infrastructure)
4. **Sprint 4 (Quality):** M4-M6 (test coverage, seed data verification)
5. **Sprint 5 (SMS):** L1-L3 (SMS integration)
6. **Sprint 6 (LLM):** L4-L6 (conversational assignments)
7. **Sprint 7 (Email):** L7-L8 (email delivery, scheduling)
