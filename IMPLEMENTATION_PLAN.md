# Implementation Plan

Generated: 2026-01-18T20:35:00Z
Based on specs: application-roadmap.md, bug-1-fix-password-signin-500-error.md, seed-data-population.md, profile-views.md, dashboard-interactivity-enhancements.md, marriage-ministry-master-plan.md, phase-1-authentication.md, phase-5-sms-integration.md, phase-6-llm-conversations.md, phase-7-notifications.md, design-system.md, RALPH_EXECUTION_GUIDE.md

---

## Current State Summary

The Marriage Ministry application has a **comprehensive foundation** with most core functionality implemented and passing validation (lint + build + tests).

### Build Status ✅

```
npm run lint    → 0 warnings (passing)
npm run build   → Success (570 kB bundle)
npm run test    → 232 tests passed (16 test files)
```

### Fully Implemented ✓

**Authentication & Authorization:**
- Email/password sign-in with Supabase Auth
- Magic link authentication flow
- Role-based access control (Admin, Coach, Couple)
- RLS policies on all tables (6 migrations deployed)
- Protected routes with role checks
- Profile management with email/password updates
- Forgot/Reset password flow (ForgotPasswordPage, ResetPasswordPage)
- Account lockout after 5 failed attempts (15-min cooldown)
- Invitation system with 7-day tokens (invitations table + InviteUserModal)
- Accept invitation flow (AcceptInvitePage)

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

**Notifications (In-App):**
- NotificationContext with database persistence
- Supabase realtime subscriptions
- Notification bell in header with unread count
- NotificationPreferences page with email/SMS/in-app toggles
- notifications service (CRUD operations)
- Notification database schema (notification_templates, notification_queue, notifications, notification_delivery_log)

**Design System:**
- Resonate brand colors applied (Blue #41748d, Green #50a684)
- Extended color palette with 50-900 shades
- Dark mode support
- UI primitives (Button, Card, Input, Select, Badge, Avatar, Modal, Tabs, Switch, Toast)

**Seed Data:**
- 7 auth users (1 admin, 5 coaches, 1 couple user)
- 5 coaches (4 active, 1 inactive)
- 12 couples (9 active, 2 completed, 1 inactive)
- 3 form templates with JSONB field definitions
- 6 assignments (Weeks 1-6 with varied due dates)
- 48 assignment statuses with realistic distribution
- Homework responses with JSONB data
- Cloud Supabase compatible (extensions.crypt, gen_random_uuid)

### Test Coverage (Current)

| Area | Coverage | Notes |
|------|----------|-------|
| **lib/** | 98% | Excellent - date.ts, permissions.ts, utils.ts |
| **types/** | 100% | forms.ts validation functions |
| **hooks/** | 44% | Partial - useCoaches, useCouples, useAssignments, useProfile covered |
| **services/** | 16% | Only notifications.ts has tests |
| **components/** | 41% | Auth, dashboard, profile components covered |

**Unit Tests (19 test files, 314 tests):**
- `components/auth/__tests__/LoginPage.test.tsx`
- `contexts/__tests__/AuthContext.test.tsx`
- `hooks/__tests__/useProfile.test.ts`
- `hooks/__tests__/useCoaches.test.ts`
- `hooks/__tests__/useCouples.test.ts`
- `hooks/__tests__/useAssignments.test.ts`
- `hooks/__tests__/useDashboardMetrics.test.ts`
- `components/profile/__tests__/CoupleProfile.test.tsx`
- `components/profile/__tests__/CoachProfile.test.tsx`
- `components/profile/__tests__/MyProfile.test.tsx`
- `components/dashboard/__tests__/MetricCard.test.tsx`
- `components/dashboard/__tests__/ViewAllLink.test.tsx`
- `components/assignments/__tests__/AssignmentDetailModal.test.tsx`
- `services/__tests__/notifications.test.ts`
- `services/__tests__/coaches.test.ts` (23 tests)
- `services/__tests__/couples.test.ts` (32 tests)
- `services/__tests__/assignments.test.ts` (NEW - 27 tests)
- `types/forms.test.ts`
- `lib/date.test.ts`
- `lib/permissions.test.ts`

**E2E Tests:**
- `e2e/example.spec.ts`
- `e2e/auth-magic-link.spec.ts`
- `e2e/auth-password-signin.spec.ts`

---

## Gap Analysis Summary

### Phase 1: Authentication - COMPLETE ✅

All Phase 1 requirements have been implemented:
- ✅ Invitation system with 7-day tokens
- ✅ Accept invitation page
- ✅ Forgot/Reset password flow
- ✅ Account lockout after 5 failed attempts
- ❌ Session tracking (3 device limit) - NOT in current spec priority

### Phase 5: SMS Integration - NOT STARTED

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Twilio integration | Not implemented | No SMS service |
| Phone verification | Not implemented | No phone_mappings table |
| SMS commands (STATUS, SUBMIT, etc.) | Not implemented | No webhook handler |
| PhoneVerification component | Not implemented | Missing UI |

### Phase 6: LLM Conversations - NOT STARTED

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| Claude API integration | Not implemented | No LLM service |
| AssignmentChat component | Not implemented | No chat UI |
| Conversation threading | Not implemented | No conversation tables |
| Crisis keyword escalation | Not implemented | No detection logic |

### Phase 7: Notifications - PARTIAL

| Spec Requirement | Current State | Gap |
|-----------------|---------------|-----|
| In-app notifications | ✅ Implemented | Complete with database persistence |
| Notification preferences | ✅ Implemented | UI with email/SMS/in-app toggles |
| Database schema | ✅ Implemented | All tables and RLS policies |
| Email via Resend | Not implemented | Need Edge Function |
| Scheduled reminders | Not implemented | Need cron job/scheduler |

### Test Coverage Gaps

| Service | Test File | Status |
|---------|-----------|--------|
| notifications.ts | ✅ notifications.test.ts | Complete (98.7% coverage) |
| coaches.ts | ✅ coaches.test.ts | Complete (23 tests) |
| couples.ts | ✅ couples.test.ts | Complete (32 tests) |
| assignments.ts | ✅ assignments.test.ts | Complete (27 tests) |
| homework.ts | ❌ homework.test.ts | Missing (0% coverage) |
| invitations.ts | ❌ invitations.test.ts | Missing (0% coverage) |
| profile.ts | ❌ profile.test.ts | Missing (0% coverage) |

---

## Prioritized Tasks

### High Priority

#### H1: Add Service Layer Tests for coaches.ts ✅
- [x] Create unit tests for coaches service
  - Files: `services/__tests__/coaches.test.ts` (completed)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client responses
    - Test getCoaches(), getCoach(id), getCoachWithCouples(id)
    - Test createCoach(), updateCoach(), deleteCoach()
    - Test getCoachAssignedCouplesCount()
    - Test error handling (not found, database errors)
  - Validation: ✅ All 23 tests passing, 255 total tests now

#### H2: Add Service Layer Tests for couples.ts ✅
- [x] Create unit tests for couples service
  - Files: `services/__tests__/couples.test.ts` (completed)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client responses
    - Test getCouples(), getCouplesWithCoach(), getCoupleWithDetails()
    - Test createCouple(), updateCouple(), deleteCouple()
    - Test assignCoach(), getCoachOptions()
    - Test error handling and edge cases
  - Validation: ✅ All 32 tests passing, 287 total tests now

#### H3: Add Service Layer Tests for assignments.ts ✅
- [x] Create unit tests for assignments service
  - Files: `services/__tests__/assignments.test.ts` (completed)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client responses
    - Test getAssignments(), getAssignment()
    - Test createAssignment(), updateAssignment(), deleteAssignment()
    - Test distributeAssignment() with all target types (all, coach, specific)
    - Test getAssignmentStatuses()
    - Test error handling
  - Validation: ✅ All 27 tests passing, 314 total tests now

#### H4: Add Service Layer Tests for homework.ts
- [ ] Create unit tests for homework service
  - Files: `services/__tests__/homework.test.ts` (new)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client responses
    - Test form template CRUD operations
    - Test homework response CRUD operations
    - Test saveDraft(), submitHomework()
    - Test reviewHomework(), getPendingReviews()
    - Test getCoupleAssignments(), startHomework()
  - Validation: `npm run test:run` passes, coverage improves

#### H5: Add Service Layer Tests for invitations.ts
- [ ] Create unit tests for invitations service
  - Files: `services/__tests__/invitations.test.ts` (new)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client responses
    - Test getInvitations(), getPendingInvitations()
    - Test createInvitation() with token generation
    - Test hasPendingInvitation(), getInvitationByToken()
    - Test deleteInvitation(), resendInvitation()
    - Test getInvitationUrl()
  - Validation: `npm run test:run` passes, coverage improves

#### H6: Add Service Layer Tests for profile.ts
- [ ] Create unit tests for profile service
  - Files: `services/__tests__/profile.test.ts` (new)
  - Spec: AGENTS.md (target: 70%+ coverage)
  - Work:
    - Mock Supabase client and auth responses
    - Test getCurrentUserProfile() with role-specific data
    - Test updateUserEmail(), updateUserPassword()
    - Test verifyCurrentPassword()
    - Test error handling
  - Validation: `npm run test:run` passes, coverage improves

---

### Medium Priority

#### M1: Email Notifications via Resend
- [ ] Implement email delivery for notifications
  - Files:
    - `supabase/functions/send-email/index.ts` (new)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Create Edge Function for Resend API integration
    - Template variable interpolation ({{variable}} syntax)
    - Brand footer with Resonate styling
    - Retry logic (3 attempts with exponential backoff)
    - Log delivery to notification_delivery_log
  - Validation: Test email sends successfully

#### M2: Scheduled Notification Processing
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

#### M3: Assignment Reminder Notifications
- [ ] Create assignment reminder triggers
  - Files:
    - `supabase/functions/scheduled-reminders/index.ts` (new)
  - Spec: `specs/phase-7-notifications.md`
  - Work:
    - Query assignments due in 2 days
    - Query overdue assignments
    - Queue reminder notifications
    - Skip already-notified assignments
    - Schedule via pg_cron (daily at 9 AM)
  - Validation: Reminders queue correctly for upcoming/overdue assignments

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

---

## Dependencies

```
H1-H6 (Service Tests) → No dependencies (can run in parallel)

M1 (Email via Resend) → Notification schema (already complete)
M2 (Scheduled Processing) → M1
M3 (Assignment Reminders) → M1, M2

L1 (SMS Schema) → No dependencies
L2 (Twilio Webhook) → L1
L3 (Phone Verification) → L1, L2
L4 (LLM Schema) → No dependencies
L5 (Chat Component) → L4
L6 (Crisis Escalation) → L4, L5
```

---

## Environment Variables Required

```bash
# Already configured
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Phase 7 (Email notifications)
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

1. **Email Delivery:** Resend requires domain verification for production. Use Supabase Auth emails for development.

2. **Twilio Costs:** SMS integration requires Twilio account with phone number. Consider development sandbox for testing.

3. **Claude API:** LLM conversations require Anthropic API key. Need careful prompt engineering for accurate response extraction and crisis detection.

4. **Background Jobs:** Notification processing needs reliable scheduling. Recommend pg_cron (Supabase extension) for simplicity.

5. **Bundle Size:** Current build is 570 kB (over 500 kB limit). Consider code splitting before adding more features.

6. **Test Data Isolation:** E2E tests need isolated data. Consider test-specific seed data or transaction rollback.

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
| High     | 6     | Service Layer Tests (coaches, couples, assignments, homework, invitations, profile) |
| Medium   | 3     | Email Notifications + Scheduling |
| Low      | 6     | SMS + LLM Integration |
| **Total** | **15** | |

**Recommended Execution Order:**

1. **Sprint 1 (Quality):** H1-H6 (service tests - can be done in parallel)
2. **Sprint 2 (Email):** M1-M3 (email notifications, scheduling, reminders)
3. **Sprint 3 (SMS):** L1-L3 (SMS integration)
4. **Sprint 4 (LLM):** L4-L6 (conversational assignments)
