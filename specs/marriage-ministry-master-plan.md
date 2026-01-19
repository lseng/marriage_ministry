# Marriage Ministry Application - Master Implementation Plan

> **Brand Reference**: See `specs/resonate-brand-guide.pdf` for design language, colors, typography, and brand values.
>
> **Mission Alignment**: This application supports Resonate's mission to "make disciples who make disciples who make much of Jesus for the glory of God" by facilitating marriage discipleship through coaching relationships.

---

## Table of Contents

1. [Overview](#overview)
2. [Design System & Brand Integration](#design-system--brand-integration)
3. [Phase 1: Foundation & Authentication](#phase-1-foundation--authentication)
4. [Phase 2: User Profiles & Management](#phase-2-user-profiles--management)
5. [Phase 3: Assignment System](#phase-3-assignment-system)
6. [Phase 4: Permissions & Role-Based Access](#phase-4-permissions--role-based-access)
7. [Phase 5: SMS/Text Integration](#phase-5-smstext-integration)
8. [Phase 6: LLM-Powered Conversational Assignments](#phase-6-llm-powered-conversational-assignments)
9. [Phase 7: Notifications & Reminders](#phase-7-notifications--reminders)
10. [Phase 8: Analytics & Reporting](#phase-8-analytics--reporting)
11. [Phase 9: Mobile Experience](#phase-9-mobile-experience)
12. [Phase 10: Testing & Quality Assurance](#phase-10-testing--quality-assurance)

---

## Overview

### Application Purpose

The Marriage Ministry Application is a comprehensive platform for managing pre-marital and marriage enrichment programs at Resonate Church. It connects:

- **Managers/Admins**: Church staff who oversee the entire marriage ministry program
- **Coaches**: Trained mentor couples who guide couples through their journey
- **Couples**: Engaged or married couples participating in the program

### Core Value Proposition

1. **Streamlined Communication**: Coaches can easily track and communicate with their assigned couples
2. **Structured Curriculum**: Weekly assignments guide couples through intentional growth
3. **Flexible Engagement**: Couples can complete assignments via web portal OR text messaging
4. **Progress Visibility**: All stakeholders can see progress and identify couples needing attention
5. **Scalability**: Support growth from dozens to hundreds of couples without administrative burden

### Technical Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **SMS Provider**: Twilio (recommended) or alternatives
- **LLM Integration**: OpenAI GPT-4 or Claude API for conversational interfaces
- **Hosting**: Vercel (frontend), Supabase (backend)

---

## Design System & Brand Integration

### Resonate Brand Colors

Reference: `specs/resonate-brand-guide.pdf`

```css
:root {
  /* Primary Colors */
  --resonate-blue: #41748d;      /* Primary brand color - headers, primary buttons, links */
  --resonate-green: #50a684;     /* Success states, positive actions, progress indicators */

  /* Neutral Colors */
  --resonate-dark-gray: #373a36; /* Body text, dark backgrounds */
  --resonate-light-gray: #545454; /* Secondary text, borders, disabled states */

  /* Extended Palette (derived) */
  --resonate-blue-light: #5a8fa8;   /* Hover states, secondary elements */
  --resonate-blue-dark: #2d5263;    /* Active states, emphasis */
  --resonate-green-light: #6bb89a;  /* Success hover */
  --resonate-green-dark: #3d8568;   /* Success active */

  /* Semantic Colors */
  --color-primary: var(--resonate-blue);
  --color-secondary: var(--resonate-green);
  --color-text-primary: var(--resonate-dark-gray);
  --color-text-secondary: var(--resonate-light-gray);
  --color-success: var(--resonate-green);
  --color-warning: #d4a574;         /* Warm orange - attention needed */
  --color-error: #c45c5c;           /* Muted red - errors, destructive */
  --color-background: #ffffff;
  --color-surface: #f8f9fa;
  --color-border: #e2e8f0;
}
```

### Typography

Reference: Acumin Pro font family from brand guide

```css
:root {
  /* Font Families - fallback to system fonts for performance */
  --font-heading: 'Acumin Pro ExtraCondensed', 'Arial Narrow', sans-serif;
  --font-subheading: 'Acumin Pro SemiCondensed', 'Arial', sans-serif;
  --font-body: 'Acumin Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### Component Styling Guidelines

1. **Buttons**
   - Primary: Blue background (#41748d), white text
   - Secondary: Outlined with blue border
   - Success: Green background (#50a684) for confirmations
   - Destructive: Muted red for delete actions

2. **Cards**
   - White background with subtle shadow
   - Rounded corners (8px)
   - Blue accent border on left for emphasis

3. **Forms**
   - Clean, minimal styling
   - Blue focus rings
   - Green checkmarks for validation success

4. **Navigation**
   - Blue sidebar with white text
   - Green accent for active state
   - Diamond icon from brand guide as logo

### Brand Voice in Copy

Following Resonate's communication guide:
- **Gospel-centered**: Frame growth in terms of transformation and grace
- **Warm and encouraging**: Support couples without judgment
- **Action-oriented**: Use verbs like "grow," "discover," "connect"
- **Mission-driven**: Connect activities to larger purpose

Example copy:
- Instead of: "Complete your homework"
- Use: "Continue your journey together"
- Instead of: "Assignment overdue"
- Use: "Ready when you are - let's reconnect"

---

## Phase 1: Foundation & Authentication

### 1.1 Account Creation Flow

#### Admin Account Creation
- Created by system administrator or super-admin
- Full access to all features
- Can create other admin accounts

#### Coach Account Creation
```
Flow:
1. Admin navigates to Coaches > Add Coach
2. Fills in: First Name, Last Name, Email, Phone
3. System creates Supabase Auth user with temporary password
4. System creates profile record with role='coach'
5. System creates coach record linked to profile
6. Email sent to coach with welcome message and login instructions
7. Coach logs in and sets permanent password
```

**Database Changes Required:**
```sql
-- Add password_reset_required flag to profiles
ALTER TABLE profiles ADD COLUMN password_reset_required BOOLEAN DEFAULT false;

-- Add invitation tracking
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'couple')),
  invited_by UUID REFERENCES profiles(id),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Couple Account Creation
```
Flow (Admin-initiated):
1. Admin navigates to Couples > Add Couple
2. Fills in: Husband (name, email, phone), Wife (name, email, phone)
3. Selects assigned coach
4. System creates Supabase Auth user for primary contact email
5. System creates profile record with role='couple'
6. System creates couple record linked to profile
7. Welcome email sent with login credentials
8. Couple can optionally add second spouse as additional login

Flow (Self-registration - Future):
1. Couple visits registration page with coach referral code
2. Fills in both spouse information
3. Verifies email
4. Account created in pending state
5. Assigned coach notified for approval
6. Upon approval, full access granted
```

### 1.2 Authentication Methods

#### Email/Password Authentication
- Primary method for all users
- Password requirements: 8+ chars, 1 uppercase, 1 number
- Account lockout after 5 failed attempts (15 min cooldown)

#### Magic Link Authentication
- Alternative for couples who forget passwords
- Valid for 1 hour
- Single use

#### Future: Phone Number Authentication
- SMS OTP for mobile-first users
- Links to existing account by email match

### 1.3 Session Management
- JWT tokens with 1-hour expiry
- Refresh tokens with 7-day expiry
- Remember me option extends to 30 days
- Concurrent session limit: 3 devices

### 1.4 Password Recovery
```
Flow:
1. User clicks "Forgot Password"
2. Enters email address
3. System sends reset link (valid 1 hour)
4. User clicks link, enters new password
5. All other sessions invalidated
6. User logged in with new password
```

---

## Phase 2: User Profiles & Management

### 2.1 Profile Data Model

#### Extended Profile Schema
```sql
-- Extend existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_assignments": true,
  "email_reminders": true,
  "sms_assignments": false,
  "sms_reminders": false,
  "push_notifications": false
}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Extend coaches table
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS years_married INTEGER;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS specialties TEXT[]; -- e.g., ['communication', 'conflict-resolution', 'finances']
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS max_couples INTEGER DEFAULT 8;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS availability JSONB; -- e.g., {"monday": ["evening"], "saturday": ["morning", "afternoon"]}

-- Extend couples table
ALTER TABLE couples ADD COLUMN IF NOT EXISTS anniversary_date DATE;
ALTER TABLE couples ADD COLUMN IF NOT EXISTS communication_preference TEXT DEFAULT 'email' CHECK (communication_preference IN ('email', 'sms', 'both'));
ALTER TABLE couples ADD COLUMN IF NOT EXISTS notes TEXT; -- Private notes for coaches/admin
ALTER TABLE couples ADD COLUMN IF NOT EXISTS goals TEXT[]; -- Self-identified goals
ALTER TABLE couples ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'pre-marital' CHECK (stage IN ('pre-marital', 'newlywed', 'enrichment', 'renewal'));
```

### 2.2 Profile Views

#### Admin Profile View
- Edit any user's profile
- Reset passwords
- Deactivate accounts
- View activity logs

#### Coach Profile View (Public)
- Name and photo
- Bio and specialties
- Years married
- Number of couples currently coaching

#### Coach Self-Profile View
- Edit personal information
- Set availability
- Update bio and specialties
- View assigned couples summary

#### Couple Profile View (For Coaches)
- Both spouse names and contact info
- Wedding/anniversary date
- Program stage
- Assignment progress summary
- Communication preference
- Private notes field

#### Couple Self-Profile View
- Edit contact information
- Set communication preferences (email vs SMS)
- View assigned coach
- View own progress

### 2.3 Profile Components

```typescript
// Component structure
components/
  profile/
    ProfilePage.tsx           // Route handler, role dispatcher
    AdminProfile.tsx          // Admin-specific profile view
    CoachProfile.tsx          // Coach public profile
    CoupleProfile.tsx         // Couple profile (coach view)
    MyProfile.tsx             // Self-profile view (all roles)
    ProfileHeader.tsx         // Shared header component
    ProfileEditModal.tsx      // Edit modal for admins
    AvatarUpload.tsx          // Image upload component
    NotificationPreferences.tsx // Notification settings
    CommunicationPreferences.tsx // SMS/Email preferences for couples
```

### 2.4 Avatar Upload

```typescript
// Storage bucket configuration
const AVATAR_BUCKET = 'avatars';

// Upload function
async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  // Resize image to 256x256 max
  const resizedFile = await resizeImage(file, 256, 256);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, resizedFile, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

---

## Phase 3: Assignment System

### 3.1 Assignment Data Model

#### Current Schema Enhancement
```sql
-- Assignment templates for reusable content
CREATE TABLE assignment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Rich text/markdown content
  category TEXT NOT NULL, -- 'communication', 'conflict', 'intimacy', 'finances', 'spirituality', 'family'
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_time_minutes INTEGER DEFAULT 30,
  resources JSONB, -- Links to videos, articles, etc.
  form_template_id UUID REFERENCES form_templates(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment series for curriculum structure
CREATE TABLE assignment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Pre-Marital Foundations", "Communication Deep Dive"
  description TEXT,
  stage TEXT NOT NULL, -- 'pre-marital', 'newlywed', 'enrichment'
  total_weeks INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link assignments to series
CREATE TABLE series_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES assignment_series(id) ON DELETE CASCADE,
  assignment_template_id UUID REFERENCES assignment_templates(id),
  week_number INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(series_id, week_number)
);

-- Couple enrollment in series
CREATE TABLE couple_series_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  series_id UUID REFERENCES assignment_series(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_week INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
  UNIQUE(couple_id, series_id)
);
```

### 3.2 Assignment Creation Flow

```
Admin Flow:
1. Navigate to Assignments > Create New
2. Choose: "One-time Assignment" or "Add to Series"
3. Fill in assignment details:
   - Title (required)
   - Description (brief summary)
   - Content (rich text editor with markdown support)
   - Category (dropdown)
   - Estimated time
   - Resources (optional links)
   - Form template (optional - for structured responses)
4. Preview assignment
5. Save as draft or publish immediately
6. If published, option to distribute now or schedule

Distribution Options:
- All active couples
- All couples of a specific coach
- Specific couples (multi-select)
- All couples in a specific series/week
```

### 3.3 Assignment Response Types

#### Text Response (Simple)
```typescript
interface TextResponse {
  assignment_id: string;
  couple_id: string;
  response_text: string; // Free-form text
  submitted_at: Date;
  submission_method: 'web' | 'sms' | 'llm_conversation';
}
```

#### Form Response (Structured)
```typescript
interface FormResponse {
  assignment_status_id: string;
  couple_id: string;
  responses: Record<string, any>; // Matches form_template.fields structure
  is_draft: boolean;
  submitted_at: Date;
  submission_method: 'web' | 'sms' | 'llm_conversation';
}
```

#### Conversational Response (LLM-facilitated)
```typescript
interface ConversationalResponse {
  assignment_status_id: string;
  couple_id: string;
  conversation_thread_id: string;
  extracted_responses: Record<string, any>; // LLM-extracted structured data
  raw_conversation: Message[];
  completion_score: number; // 0-100, LLM-assessed
  submitted_at: Date;
}
```

### 3.4 Assignment Status Workflow

```
States:
- pending: Assignment created but not sent to couple
- sent: Assignment distributed, awaiting response
- in_progress: Couple has started (draft saved)
- completed: Response submitted
- reviewed: Coach has reviewed and provided feedback
- overdue: Past due date, not completed

Transitions:
pending -> sent (on distribution)
sent -> in_progress (on draft save)
sent -> completed (on submission)
in_progress -> completed (on submission)
completed -> reviewed (on coach review)
sent -> overdue (automated, past due date)
in_progress -> overdue (automated, past due date)
```

---

## Phase 4: Permissions & Role-Based Access

### 4.1 Permission Matrix

| Action | Admin | Coach | Couple |
|--------|-------|-------|--------|
| **Coaches** |
| View all coaches | Yes | No | No |
| Create coach | Yes | No | No |
| Edit any coach | Yes | No | No |
| Delete coach | Yes | No | No |
| View own coach profile | Yes | Yes | No |
| Edit own coach profile | Yes | Yes | No |
| **Couples** |
| View all couples | Yes | No | No |
| View assigned couples | Yes | Yes | No |
| Create couple | Yes | No | No |
| Edit any couple | Yes | No | No |
| Edit assigned couple | Yes | Yes | No |
| Delete couple | Yes | No | No |
| View own couple profile | Yes | Yes | Yes |
| Edit own couple profile | Yes | No | Yes* |
| **Assignments** |
| Create assignment | Yes | No | No |
| Edit assignment | Yes | No | No |
| Delete assignment | Yes | No | No |
| Distribute assignment | Yes | No | No |
| View all assignments | Yes | Yes | No |
| View own assignments | Yes | Yes | Yes |
| **Homework** |
| Submit homework | No | No | Yes |
| Edit own submission | No | No | Yes* |
| View all submissions | Yes | No | No |
| View assigned couple submissions | Yes | Yes | No |
| View own submissions | No | No | Yes |
| Review submissions | Yes | Yes | No |
| **Forms** |
| Create form template | Yes | No | No |
| Edit form template | Yes | No | No |
| Delete form template | Yes | No | No |
| View form templates | Yes | Yes | No |
| **Analytics** |
| View all metrics | Yes | No | No |
| View coach metrics | Yes | Yes | No |
| View couple metrics | Yes | Yes | Yes* |
| Export data | Yes | No | No |
| **Settings** |
| Manage SMS integration | Yes | No | No |
| Manage LLM settings | Yes | No | No |
| View audit logs | Yes | No | No |

*Limited to own data

### 4.2 Row-Level Security Policies

```sql
-- Coaches table policies
CREATE POLICY "Admins can do everything with coaches"
  ON coaches FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Coaches can view and update own record"
  ON coaches FOR ALL
  USING (
    is_coach() AND
    id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    is_coach() AND
    id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
  );

-- Couples table policies
CREATE POLICY "Admins can do everything with couples"
  ON couples FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Coaches can view and update assigned couples"
  ON couples FOR SELECT
  USING (
    is_coach() AND
    coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
  );

CREATE POLICY "Couples can view own record"
  ON couples FOR SELECT
  USING (
    is_couple() AND
    id = get_couple_id()
  );

CREATE POLICY "Couples can update limited fields on own record"
  ON couples FOR UPDATE
  USING (is_couple() AND id = get_couple_id())
  WITH CHECK (is_couple() AND id = get_couple_id());

-- Assignment responses policies
CREATE POLICY "Couples can submit and view own responses"
  ON homework_responses FOR ALL
  USING (is_couple() AND couple_id = get_couple_id())
  WITH CHECK (is_couple() AND couple_id = get_couple_id());

CREATE POLICY "Coaches can view assigned couples responses"
  ON homework_responses FOR SELECT
  USING (
    is_coach() AND
    couple_id IN (
      SELECT id FROM couples
      WHERE coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Coaches can review assigned couples responses"
  ON homework_responses FOR UPDATE
  USING (
    is_coach() AND
    couple_id IN (
      SELECT id FROM couples
      WHERE coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
    )
  )
  WITH CHECK (
    -- Coaches can only update review-related fields
    is_coach()
  );
```

### 4.3 API-Level Permission Checks

```typescript
// lib/permissions.ts
export interface Permissions {
  // Coaches
  canViewAllCoaches: boolean;
  canManageCoaches: boolean;
  canViewOwnCoachProfile: boolean;
  canEditOwnCoachProfile: boolean;

  // Couples
  canViewAllCouples: boolean;
  canViewAssignedCouples: boolean;
  canManageCouples: boolean;
  canViewOwnCoupleProfile: boolean;
  canEditOwnCoupleProfile: boolean;

  // Assignments
  canManageAssignments: boolean;
  canDistributeAssignments: boolean;
  canViewAllAssignments: boolean;
  canViewOwnAssignments: boolean;

  // Homework
  canSubmitHomework: boolean;
  canViewAllSubmissions: boolean;
  canViewAssignedSubmissions: boolean;
  canReviewSubmissions: boolean;

  // Forms
  canManageForms: boolean;
  canViewForms: boolean;

  // Analytics
  canViewAllMetrics: boolean;
  canViewCoachMetrics: boolean;
  canExportData: boolean;

  // Settings
  canManageIntegrations: boolean;
  canViewAuditLogs: boolean;
}

export function getPermissions(role: 'admin' | 'coach' | 'couple'): Permissions {
  switch (role) {
    case 'admin':
      return {
        canViewAllCoaches: true,
        canManageCoaches: true,
        canViewOwnCoachProfile: true,
        canEditOwnCoachProfile: true,
        canViewAllCouples: true,
        canViewAssignedCouples: true,
        canManageCouples: true,
        canViewOwnCoupleProfile: false,
        canEditOwnCoupleProfile: false,
        canManageAssignments: true,
        canDistributeAssignments: true,
        canViewAllAssignments: true,
        canViewOwnAssignments: true,
        canSubmitHomework: false,
        canViewAllSubmissions: true,
        canViewAssignedSubmissions: true,
        canReviewSubmissions: true,
        canManageForms: true,
        canViewForms: true,
        canViewAllMetrics: true,
        canViewCoachMetrics: true,
        canExportData: true,
        canManageIntegrations: true,
        canViewAuditLogs: true,
      };
    case 'coach':
      return {
        canViewAllCoaches: false,
        canManageCoaches: false,
        canViewOwnCoachProfile: true,
        canEditOwnCoachProfile: true,
        canViewAllCouples: false,
        canViewAssignedCouples: true,
        canManageCouples: false,
        canViewOwnCoupleProfile: false,
        canEditOwnCoupleProfile: false,
        canManageAssignments: false,
        canDistributeAssignments: false,
        canViewAllAssignments: true,
        canViewOwnAssignments: true,
        canSubmitHomework: false,
        canViewAllSubmissions: false,
        canViewAssignedSubmissions: true,
        canReviewSubmissions: true,
        canManageForms: false,
        canViewForms: true,
        canViewAllMetrics: false,
        canViewCoachMetrics: true,
        canExportData: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    case 'couple':
      return {
        canViewAllCoaches: false,
        canManageCoaches: false,
        canViewOwnCoachProfile: false,
        canEditOwnCoachProfile: false,
        canViewAllCouples: false,
        canViewAssignedCouples: false,
        canManageCouples: false,
        canViewOwnCoupleProfile: true,
        canEditOwnCoupleProfile: true,
        canManageAssignments: false,
        canDistributeAssignments: false,
        canViewAllAssignments: false,
        canViewOwnAssignments: true,
        canSubmitHomework: true,
        canViewAllSubmissions: false,
        canViewAssignedSubmissions: false,
        canReviewSubmissions: false,
        canManageForms: false,
        canViewForms: false,
        canViewAllMetrics: false,
        canViewCoachMetrics: false,
        canExportData: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
  }
}
```

---

## Phase 5: SMS/Text Integration

### 5.1 Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Couple    │────>│    Twilio    │────>│ Supabase Edge   │
│  (SMS)      │<────│   Webhook    │<────│   Function      │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                                                  v
                                         ┌─────────────────┐
                                         │   PostgreSQL    │
                                         │   (Messages,    │
                                         │    Responses)   │
                                         └─────────────────┘
```

### 5.2 Database Schema for SMS

```sql
-- SMS configuration
CREATE TABLE sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'twilio',
  phone_number TEXT NOT NULL, -- The Twilio number couples text to
  account_sid TEXT NOT NULL,
  auth_token_encrypted TEXT NOT NULL, -- Encrypted with Supabase Vault
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS message log
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT, -- Twilio message SID
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  media_urls TEXT[], -- MMS attachments
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
  couple_id UUID REFERENCES couples(id),
  related_assignment_id UUID REFERENCES assignments(id),
  conversation_thread_id UUID, -- For grouping related messages
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone number to couple mapping
CREATE TABLE phone_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  spouse TEXT CHECK (spouse IN ('husband', 'wife')),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number)
);

-- Indexes for efficient lookups
CREATE INDEX idx_sms_messages_couple ON sms_messages(couple_id);
CREATE INDEX idx_sms_messages_thread ON sms_messages(conversation_thread_id);
CREATE INDEX idx_phone_mappings_number ON phone_mappings(phone_number);
```

### 5.3 Twilio Webhook Handler

```typescript
// supabase/functions/sms-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Verify Twilio signature
  const twilioSignature = req.headers.get('X-Twilio-Signature');
  if (!verifyTwilioSignature(req, twilioSignature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const from = formData.get('From') as string;
  const to = formData.get('To') as string;
  const body = formData.get('Body') as string;
  const messageSid = formData.get('MessageSid') as string;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find couple by phone number
  const { data: phoneMapping } = await supabase
    .from('phone_mappings')
    .select('couple_id, spouse')
    .eq('phone_number', from)
    .single();

  if (!phoneMapping) {
    // Unknown number - send help message
    await sendSMS(to, from,
      "Hi! We don't recognize this number. Please log into the Marriage Ministry portal to register your phone for SMS access."
    );
    return new Response('OK');
  }

  // Log inbound message
  await supabase.from('sms_messages').insert({
    external_id: messageSid,
    direction: 'inbound',
    from_number: from,
    to_number: to,
    body: body,
    status: 'received',
    couple_id: phoneMapping.couple_id,
  });

  // Route to appropriate handler
  const response = await routeSMSMessage(supabase, phoneMapping, body);

  // Send response
  if (response) {
    await sendSMS(to, from, response);
  }

  return new Response('OK');
});

async function routeSMSMessage(
  supabase: SupabaseClient,
  phoneMapping: { couple_id: string; spouse: string },
  body: string
): Promise<string | null> {
  const normalizedBody = body.trim().toLowerCase();

  // Check for commands
  if (normalizedBody === 'help') {
    return `Marriage Ministry Commands:
- STATUS: View your current assignment
- DONE: Mark current assignment complete
- SUBMIT [response]: Submit your response
- PAUSE: Pause reminders for 1 week
- HELP: Show this message`;
  }

  if (normalizedBody === 'status') {
    return await getAssignmentStatus(supabase, phoneMapping.couple_id);
  }

  if (normalizedBody === 'done' || normalizedBody.startsWith('submit ')) {
    return await handleSubmission(supabase, phoneMapping, body);
  }

  if (normalizedBody === 'pause') {
    return await pauseReminders(supabase, phoneMapping.couple_id);
  }

  // Default: Treat as assignment response or start LLM conversation
  return await handleConversationalResponse(supabase, phoneMapping, body);
}
```

### 5.4 Outbound SMS Service

```typescript
// services/sms.ts
import { supabase } from '@/lib/supabase';
import twilio from 'twilio';

export interface SMSOptions {
  to: string;
  body: string;
  coupleId?: string;
  assignmentId?: string;
}

export async function sendSMS(options: SMSOptions): Promise<boolean> {
  // Get Twilio config
  const { data: config } = await supabase
    .from('sms_config')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!config) {
    console.error('SMS not configured');
    return false;
  }

  const client = twilio(config.account_sid, config.auth_token_encrypted);

  try {
    const message = await client.messages.create({
      body: options.body,
      from: config.phone_number,
      to: options.to,
    });

    // Log outbound message
    await supabase.from('sms_messages').insert({
      external_id: message.sid,
      direction: 'outbound',
      from_number: config.phone_number,
      to_number: options.to,
      body: options.body,
      status: 'sent',
      couple_id: options.coupleId,
      related_assignment_id: options.assignmentId,
      sent_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('SMS send failed:', error);

    await supabase.from('sms_messages').insert({
      direction: 'outbound',
      from_number: config.phone_number,
      to_number: options.to,
      body: options.body,
      status: 'failed',
      couple_id: options.coupleId,
      error_message: error.message,
    });

    return false;
  }
}

export async function sendAssignmentNotification(
  coupleId: string,
  assignment: Assignment
): Promise<void> {
  // Get couple's phone numbers and preferences
  const { data: couple } = await supabase
    .from('couples')
    .select('*, phone_mappings(*)')
    .eq('id', coupleId)
    .single();

  if (!couple || couple.communication_preference === 'email') {
    return; // Don't send SMS
  }

  const message = `New assignment: "${assignment.title}"

${assignment.description}

Reply SUBMIT followed by your response, or log in to complete online.

Text HELP for more options.`;

  for (const mapping of couple.phone_mappings) {
    await sendSMS({
      to: mapping.phone_number,
      body: message,
      coupleId,
      assignmentId: assignment.id,
    });
  }
}
```

### 5.5 Phone Number Verification Flow

```
Flow:
1. Couple logs into web portal
2. Navigates to Settings > SMS Notifications
3. Enters phone number(s) for each spouse
4. System sends verification code via SMS
5. Couple enters code in portal
6. Phone number marked as verified
7. Future assignments can be sent via SMS
```

```typescript
// Phone verification component
export function PhoneVerification({ coupleId }: { coupleId: string }) {
  const [phone, setPhone] = useState('');
  const [spouse, setSpouse] = useState<'husband' | 'wife'>('husband');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'enter' | 'verify'>('enter');
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);

  async function sendVerification() {
    const code = Math.random().toString().slice(2, 8); // 6-digit code

    // Store pending verification
    await supabase.from('phone_verifications').insert({
      phone_number: phone,
      couple_id: coupleId,
      spouse,
      verification_code: code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    // Send SMS
    await sendSMS({
      to: phone,
      body: `Your Marriage Ministry verification code is: ${code}. This code expires in 10 minutes.`,
    });

    setPendingVerification(phone);
    setStep('verify');
  }

  async function confirmVerification() {
    const { data } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', pendingVerification)
      .eq('couple_id', coupleId)
      .eq('verification_code', verificationCode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!data) {
      toast.error('Invalid or expired code');
      return;
    }

    // Create verified phone mapping
    await supabase.from('phone_mappings').upsert({
      phone_number: phone,
      couple_id: coupleId,
      spouse,
      is_verified: true,
      verified_at: new Date().toISOString(),
    });

    toast.success('Phone number verified!');
    setStep('enter');
    setPendingVerification(null);
  }

  // ... render logic
}
```

---

## Phase 6: LLM-Powered Conversational Assignments

### 6.1 Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Couple    │────>│  SMS/Chat    │────>│    LLM Router   │
│             │<────│  Interface   │<────│  (Edge Fn)      │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          v                       v                       v
                   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
                   │   Claude    │        │  Response   │        │  Progress   │
                   │   API       │        │  Parser     │        │  Tracker    │
                   └─────────────┘        └─────────────┘        └─────────────┘
```

### 6.2 Conversation Data Model

```sql
-- Conversation threads for LLM interactions
CREATE TABLE conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  assignment_status_id UUID REFERENCES assignment_statuses(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'web_chat', 'whatsapp')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'escalated')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  completion_score INTEGER, -- 0-100, assessed by LLM
  extracted_insights JSONB, -- Key themes/responses extracted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages in conversation
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model_version TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM configuration per assignment type
CREATE TABLE llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  assignment_category TEXT, -- null = default for all
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  temperature DECIMAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  extraction_schema JSONB, -- JSON schema for extracting structured responses
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_couple ON conversation_threads(couple_id);
CREATE INDEX idx_threads_assignment ON conversation_threads(assignment_status_id);
CREATE INDEX idx_messages_thread ON conversation_messages(thread_id);
```

### 6.3 LLM System Prompts

```typescript
// Default system prompt for marriage ministry conversations
const DEFAULT_SYSTEM_PROMPT = `You are a warm, supportive conversation guide for the Resonate Marriage Ministry program. You help couples complete their weekly assignments through natural conversation.

Your role:
- Guide couples through assignment questions conversationally
- Ask follow-up questions to encourage deeper reflection
- Affirm their efforts and celebrate growth
- Keep responses concise for SMS (under 300 characters when possible)
- Never be judgmental or preachy
- Reference their specific assignment context

For this couple:
- Names: {husband_name} & {wife_name}
- Current assignment: {assignment_title}
- Week: {week_number}
- Assignment questions: {assignment_questions}

Guide them naturally through each question. When you've gathered sufficient responses for all questions, summarize what you've learned and ask if they'd like to submit.

Remember Resonate's values: Enjoy Grace, Embody Love, Engage Culture, Live Sent.`;

// Category-specific prompts
const COMMUNICATION_PROMPT = `${DEFAULT_SYSTEM_PROMPT}

Focus areas for communication assignments:
- Active listening skills
- Expressing needs without blame
- Understanding each other's communication styles
- Creating safe spaces for difficult conversations`;

const CONFLICT_RESOLUTION_PROMPT = `${DEFAULT_SYSTEM_PROMPT}

Focus areas for conflict resolution:
- Identifying triggers and patterns
- Moving from blame to understanding
- Finding compromise and win-win solutions
- Repair after disagreements`;

const INTIMACY_PROMPT = `${DEFAULT_SYSTEM_PROMPT}

Focus areas for intimacy:
- Emotional connection and vulnerability
- Quality time priorities
- Physical affection and appreciation
- Spiritual intimacy and prayer together

Note: Keep the conversation appropriate and focused on emotional/relational aspects.`;
```

### 6.4 Conversation Handler

```typescript
// supabase/functions/llm-conversation/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';

interface ConversationRequest {
  thread_id?: string;
  couple_id: string;
  assignment_status_id?: string;
  message: string;
  channel: 'sms' | 'web_chat';
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  });

  const body: ConversationRequest = await req.json();

  // Get or create conversation thread
  let thread;
  if (body.thread_id) {
    const { data } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('id', body.thread_id)
      .single();
    thread = data;
  } else {
    // Create new thread
    const { data } = await supabase
      .from('conversation_threads')
      .insert({
        couple_id: body.couple_id,
        assignment_status_id: body.assignment_status_id,
        channel: body.channel,
      })
      .select()
      .single();
    thread = data;
  }

  // Get conversation history
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  // Get couple and assignment context
  const context = await getConversationContext(supabase, body.couple_id, body.assignment_status_id);

  // Get appropriate LLM config
  const config = await getLLMConfig(supabase, context.assignment?.category);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(config.system_prompt, context);

  // Store user message
  await supabase.from('conversation_messages').insert({
    thread_id: thread.id,
    role: 'user',
    content: body.message,
  });

  // Call LLM
  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    system: systemPrompt,
    messages: [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: body.message },
    ],
  });

  const assistantMessage = response.content[0].text;
  const processingTime = Date.now() - startTime;

  // Store assistant response
  await supabase.from('conversation_messages').insert({
    thread_id: thread.id,
    role: 'assistant',
    content: assistantMessage,
    tokens_used: response.usage.output_tokens,
    model_version: config.model,
    processing_time_ms: processingTime,
  });

  // Update thread
  await supabase
    .from('conversation_threads')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (thread.message_count || 0) + 2,
    })
    .eq('id', thread.id);

  // Check if conversation is complete
  const isComplete = await checkCompletion(supabase, anthropic, thread.id, context);
  if (isComplete) {
    await finalizeConversation(supabase, anthropic, thread.id, context);
  }

  return new Response(JSON.stringify({
    thread_id: thread.id,
    response: assistantMessage,
    is_complete: isComplete,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function checkCompletion(
  supabase: SupabaseClient,
  anthropic: Anthropic,
  threadId: string,
  context: ConversationContext
): Promise<boolean> {
  // Get all messages
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  // Ask LLM to assess completion
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Use faster model for assessment
    max_tokens: 100,
    system: `You assess whether a couple has adequately completed their marriage ministry assignment through conversation.

Assignment questions to cover:
${context.assignment?.questions?.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Respond with JSON: {"complete": true/false, "missing_questions": [list of question numbers not yet addressed]}`,
    messages: [
      {
        role: 'user',
        content: `Here is the conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}\n\nHas the couple adequately addressed all assignment questions?`,
      },
    ],
  });

  try {
    const assessment = JSON.parse(response.content[0].text);
    return assessment.complete;
  } catch {
    return false;
  }
}

async function finalizeConversation(
  supabase: SupabaseClient,
  anthropic: Anthropic,
  threadId: string,
  context: ConversationContext
): Promise<void> {
  // Get all messages
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  // Extract structured responses using LLM
  const extractionResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: `Extract structured responses from this marriage ministry conversation.

Assignment: ${context.assignment?.title}
Questions: ${JSON.stringify(context.assignment?.questions)}

Respond with JSON matching this schema:
{
  "responses": {
    "question_1": "extracted response",
    "question_2": "extracted response",
    ...
  },
  "key_insights": ["insight 1", "insight 2"],
  "growth_areas": ["area 1", "area 2"],
  "completion_score": 0-100,
  "summary": "Brief summary of the couple's responses"
}`,
    messages: [
      {
        role: 'user',
        content: `Conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`,
      },
    ],
  });

  const extraction = JSON.parse(extractionResponse.content[0].text);

  // Update thread with extraction
  await supabase
    .from('conversation_threads')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_score: extraction.completion_score,
      extracted_insights: extraction,
    })
    .eq('id', threadId);

  // Create homework response from extracted data
  await supabase.from('homework_responses').insert({
    assignment_status_id: context.assignment_status_id,
    couple_id: context.couple_id,
    responses: extraction.responses,
    is_draft: false,
    submitted_at: new Date().toISOString(),
  });

  // Update assignment status
  await supabase
    .from('assignment_statuses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', context.assignment_status_id);
}
```

### 6.5 Web Chat Interface

```typescript
// components/chat/AssignmentChat.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function AssignmentChat({
  coupleId,
  assignmentStatusId,
}: {
  coupleId: string;
  assignmentStatusId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing thread or start fresh
  useEffect(() => {
    loadExistingThread();
  }, [assignmentStatusId]);

  async function loadExistingThread() {
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('id, status')
      .eq('couple_id', coupleId)
      .eq('assignment_status_id', assignmentStatusId)
      .eq('channel', 'web_chat')
      .single();

    if (thread) {
      setThreadId(thread.id);
      setIsComplete(thread.status === 'completed');

      const { data: msgs } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
    }
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: userMessage, created_at: new Date().toISOString() },
    ]);

    try {
      const response = await fetch('/api/llm-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          couple_id: coupleId,
          assignment_status_id: assignmentStatusId,
          message: userMessage,
          channel: 'web_chat',
        }),
      });

      const data = await response.json();
      setThreadId(data.thread_id);
      setIsComplete(data.is_complete);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b bg-resonate-blue text-white">
        <h3 className="font-semibold">Complete Your Assignment</h3>
        <p className="text-sm opacity-90">
          Have a conversation about this week's topic. Your responses will be saved automatically.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Start the conversation by saying hello!</p>
            <p className="text-sm mt-2">
              I'll guide you through this week's assignment questions.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-resonate-blue text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Completion message */}
      {isComplete && (
        <div className="p-4 bg-resonate-green/10 border-t border-resonate-green">
          <p className="text-resonate-green font-medium">
            Assignment completed! Your responses have been submitted.
          </p>
        </div>
      )}

      {/* Input */}
      {!isComplete && (
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-resonate-blue"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-resonate-blue text-white px-6 py-2 rounded-lg hover:bg-resonate-blue-dark disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 7: Notifications & Reminders

### 7.1 Notification Types

| Type | Trigger | Channels | Recipients |
|------|---------|----------|------------|
| Assignment Published | New assignment created and distributed | Email, SMS, Push | Couples |
| Assignment Reminder | 2 days before due date | Email, SMS | Couples (incomplete) |
| Assignment Overdue | Due date passed | Email, SMS | Couples, Coach |
| Submission Received | Couple submits homework | Email | Coach |
| Review Complete | Coach reviews submission | Email, Push | Couples |
| New Couple Assigned | Coach assigned to new couple | Email | Coach |
| Couple Inactive | No activity for 2 weeks | Email | Coach, Admin |
| Weekly Digest | Every Monday 9am | Email | Coaches, Admin |

### 7.2 Database Schema

```sql
-- Notification templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'assignment_published', 'reminder', etc.
  subject_template TEXT, -- For email
  body_template TEXT NOT NULL, -- Supports {{variable}} interpolation
  sms_template TEXT, -- Shorter version for SMS
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  recipient_id UUID REFERENCES profiles(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  variables JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences (extend profiles)
-- Already added in Phase 2

-- Notification log for analytics
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notification_queue(id),
  event TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX idx_queue_recipient ON notification_queue(recipient_id);
```

### 7.3 Default Notification Templates

```sql
INSERT INTO notification_templates (name, type, subject_template, body_template, sms_template) VALUES
(
  'assignment_published',
  'assignment_published',
  'New Assignment: {{assignment_title}}',
  'Hi {{couple_names}},

Your coach has shared a new assignment with you: **{{assignment_title}}**

{{assignment_description}}

**Due Date:** {{due_date}}

Log in to complete your assignment, or reply to this message to start a conversation about it.

Grace and peace,
Resonate Marriage Ministry',
  'New assignment: {{assignment_title}}. Due {{due_date}}. Reply to complete or log in at {{portal_url}}'
),
(
  'assignment_reminder',
  'reminder',
  'Reminder: {{assignment_title}} due soon',
  'Hi {{couple_names}},

Just a gentle reminder that your assignment "{{assignment_title}}" is due in {{days_until_due}} days.

Take some time together this week to reflect and respond.

Grace and peace,
Resonate Marriage Ministry',
  'Reminder: "{{assignment_title}}" due in {{days_until_due}} days. Text your response or log in to complete.'
),
(
  'submission_received',
  'submission_received',
  '{{couple_names}} submitted: {{assignment_title}}',
  'Hi {{coach_name}},

{{couple_names}} has submitted their response for "{{assignment_title}}".

Log in to review their submission and provide feedback.

{{portal_url}}/reviews',
  NULL
),
(
  'review_complete',
  'review_complete',
  'Your coach reviewed: {{assignment_title}}',
  'Hi {{couple_names}},

{{coach_name}} has reviewed your submission for "{{assignment_title}}" and left some feedback.

Log in to see their notes and encouragement.

Grace and peace,
Resonate Marriage Ministry',
  '{{coach_name}} reviewed your "{{assignment_title}}" submission. Log in to see their feedback!'
);
```

### 7.4 Notification Service

```typescript
// services/notifications.ts
import { supabase } from '@/lib/supabase';
import { sendEmail } from './email';
import { sendSMS } from './sms';
import { sendPushNotification } from './push';

interface NotificationOptions {
  templateName: string;
  recipientId: string;
  variables: Record<string, string>;
  channels?: ('email' | 'sms' | 'push')[];
  scheduledFor?: Date;
}

export async function queueNotification(options: NotificationOptions): Promise<void> {
  // Get template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('name', options.templateName)
    .eq('is_active', true)
    .single();

  if (!template) {
    console.error(`Template not found: ${options.templateName}`);
    return;
  }

  // Get recipient preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, phone, notification_preferences')
    .eq('id', options.recipientId)
    .single();

  if (!profile) return;

  const prefs = profile.notification_preferences;
  const channels = options.channels || ['email']; // Default to email

  for (const channel of channels) {
    // Check if user wants this channel
    const prefKey = `${channel}_${template.type.split('_')[0]}`;
    if (prefs && prefs[prefKey] === false) continue;

    // Skip SMS if no template or no phone
    if (channel === 'sms' && (!template.sms_template || !profile.phone)) continue;

    await supabase.from('notification_queue').insert({
      template_id: template.id,
      recipient_id: options.recipientId,
      recipient_email: channel === 'email' ? profile.email : null,
      recipient_phone: channel === 'sms' ? profile.phone : null,
      channel,
      variables: options.variables,
      scheduled_for: options.scheduledFor?.toISOString() || new Date().toISOString(),
    });
  }
}

export async function processNotificationQueue(): Promise<void> {
  // Get pending notifications that are due
  const { data: notifications } = await supabase
    .from('notification_queue')
    .select('*, notification_templates(*)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(100);

  for (const notification of notifications || []) {
    try {
      const template = notification.notification_templates;
      const variables = notification.variables;

      // Interpolate template
      const interpolate = (text: string) =>
        text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');

      switch (notification.channel) {
        case 'email':
          await sendEmail({
            to: notification.recipient_email,
            subject: interpolate(template.subject_template),
            body: interpolate(template.body_template),
          });
          break;

        case 'sms':
          await sendSMS({
            to: notification.recipient_phone,
            body: interpolate(template.sms_template),
          });
          break;

        case 'push':
          await sendPushNotification({
            userId: notification.recipient_id,
            title: interpolate(template.subject_template),
            body: interpolate(template.body_template).slice(0, 200),
          });
          break;
      }

      // Mark as sent
      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id);

      // Log success
      await supabase.from('notification_log').insert({
        notification_id: notification.id,
        event: 'sent',
      });
    } catch (error) {
      // Mark as failed
      await supabase
        .from('notification_queue')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', notification.id);
    }
  }
}

// Helper to send assignment notification to couple
export async function notifyAssignmentPublished(
  coupleId: string,
  assignment: Assignment
): Promise<void> {
  const { data: couple } = await supabase
    .from('couples')
    .select('*, profiles(*)')
    .eq('id', coupleId)
    .single();

  if (!couple) return;

  const channels: ('email' | 'sms')[] = ['email'];
  if (couple.communication_preference !== 'email') {
    channels.push('sms');
  }

  await queueNotification({
    templateName: 'assignment_published',
    recipientId: couple.profile_id,
    channels,
    variables: {
      couple_names: `${couple.husband_first_name} & ${couple.wife_first_name}`,
      assignment_title: assignment.title,
      assignment_description: assignment.description || '',
      due_date: new Date(assignment.due_date).toLocaleDateString(),
      portal_url: process.env.NEXT_PUBLIC_APP_URL || '',
    },
  });
}
```

### 7.5 Scheduled Jobs (Cron)

```typescript
// supabase/functions/scheduled-notifications/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Process pending notifications
  await processNotificationQueue();

  // 2. Generate assignment reminders (2 days before due)
  await generateAssignmentReminders(supabase);

  // 3. Mark overdue assignments and notify
  await processOverdueAssignments(supabase);

  // 4. Check for inactive couples (2 weeks no activity)
  await checkInactiveCouples(supabase);

  return new Response('OK');
});

async function generateAssignmentReminders(supabase: SupabaseClient) {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  // Find assignments due in 2 days that aren't completed
  const { data: pendingStatuses } = await supabase
    .from('assignment_statuses')
    .select(`
      *,
      assignments(*),
      couples(*, profiles(*))
    `)
    .eq('status', 'sent')
    .gte('assignments.due_date', new Date().toISOString())
    .lte('assignments.due_date', twoDaysFromNow.toISOString());

  for (const status of pendingStatuses || []) {
    // Check if reminder already sent today
    const { data: existing } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('recipient_id', status.couples.profile_id)
      .eq('variables->assignment_id', status.assignment_id)
      .gte('created_at', new Date().toISOString().split('T')[0])
      .single();

    if (!existing) {
      await queueNotification({
        templateName: 'assignment_reminder',
        recipientId: status.couples.profile_id,
        variables: {
          couple_names: `${status.couples.husband_first_name} & ${status.couples.wife_first_name}`,
          assignment_title: status.assignments.title,
          days_until_due: '2',
          assignment_id: status.assignment_id,
        },
      });
    }
  }
}
```

---

## Phase 8: Analytics & Reporting

### 8.1 Metrics Dashboard

#### Admin Metrics
- Total active couples
- Couples by stage (pre-marital, newlywed, enrichment)
- Assignment completion rate (overall, by week, by category)
- Average time to complete assignments
- Coach workload distribution
- SMS vs web submission breakdown
- LLM conversation completion rate
- Couples at risk (overdue, inactive)

#### Coach Metrics
- Assigned couples count
- Pending reviews count
- Couple progress by assignment
- Average response time to reviews
- Couples needing attention

#### Couple Metrics (Self)
- Assignments completed
- Current streak
- Progress through series
- Time spent on assignments

### 8.2 Analytics Schema

```sql
-- Daily metrics snapshot (populated by cron job)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  dimensions JSONB DEFAULT '{}', -- e.g., {"coach_id": "...", "category": "communication"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, metric_name, dimensions)
);

-- Event tracking for detailed analytics
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  couple_id UUID REFERENCES couples(id),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_metrics_date ON daily_metrics(date);
CREATE INDEX idx_metrics_name ON daily_metrics(metric_name);
CREATE INDEX idx_events_name ON analytics_events(event_name);
CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);
```

### 8.3 Analytics Service

```typescript
// services/analytics.ts
import { supabase } from '@/lib/supabase';

export interface DashboardMetrics {
  totalCouples: number;
  activeCouples: number;
  couplesByStage: Record<string, number>;
  totalCoaches: number;
  activeCoaches: number;
  assignmentCompletionRate: number;
  averageCompletionTime: number; // hours
  pendingReviews: number;
  overdueAssignments: number;
  submissionsByChannel: {
    web: number;
    sms: number;
    llm_conversation: number;
  };
}

export async function getAdminDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    couplesResult,
    coachesResult,
    completionResult,
    pendingResult,
    channelResult,
  ] = await Promise.all([
    // Couples metrics
    supabase
      .from('couples')
      .select('status, stage', { count: 'exact' }),

    // Coaches metrics
    supabase
      .from('coaches')
      .select('status', { count: 'exact' }),

    // Completion rate
    supabase
      .from('assignment_statuses')
      .select('status'),

    // Pending reviews
    supabase
      .from('homework_responses')
      .select('id', { count: 'exact' })
      .is('reviewed_at', null)
      .eq('is_draft', false),

    // Submissions by channel
    supabase
      .from('homework_responses')
      .select('submission_method'),
  ]);

  const couples = couplesResult.data || [];
  const coaches = coachesResult.data || [];
  const statuses = completionResult.data || [];
  const submissions = channelResult.data || [];

  const activeCouples = couples.filter(c => c.status === 'active').length;
  const couplesByStage = couples.reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completedStatuses = statuses.filter(s => s.status === 'completed').length;
  const completionRate = statuses.length > 0
    ? (completedStatuses / statuses.length) * 100
    : 0;

  const overdueStatuses = statuses.filter(s => s.status === 'overdue').length;

  const channelCounts = submissions.reduce((acc, s) => {
    const channel = s.submission_method || 'web';
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, { web: 0, sms: 0, llm_conversation: 0 } as Record<string, number>);

  return {
    totalCouples: couples.length,
    activeCouples,
    couplesByStage,
    totalCoaches: coaches.length,
    activeCoaches: coaches.filter(c => c.status === 'active').length,
    assignmentCompletionRate: Math.round(completionRate),
    averageCompletionTime: 48, // TODO: Calculate from actual data
    pendingReviews: pendingResult.count || 0,
    overdueAssignments: overdueStatuses,
    submissionsByChannel: channelCounts,
  };
}

// Track analytics event
export async function trackEvent(
  eventName: string,
  userId: string | null,
  coupleId: string | null,
  properties: Record<string, any> = {}
): Promise<void> {
  await supabase.from('analytics_events').insert({
    event_name: eventName,
    user_id: userId,
    couple_id: coupleId,
    properties,
  });
}

// Event names
export const AnalyticsEvents = {
  ASSIGNMENT_VIEWED: 'assignment_viewed',
  ASSIGNMENT_STARTED: 'assignment_started',
  ASSIGNMENT_COMPLETED: 'assignment_completed',
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_MESSAGE_SENT: 'conversation_message_sent',
  CONVERSATION_COMPLETED: 'conversation_completed',
  SMS_RECEIVED: 'sms_received',
  SMS_SENT: 'sms_sent',
  LOGIN: 'login',
  PROFILE_UPDATED: 'profile_updated',
} as const;
```

### 8.4 Reports

```typescript
// services/reports.ts

export interface CoupleProgressReport {
  couple: {
    id: string;
    names: string;
    coach: string;
    stage: string;
    enrollmentDate: Date;
  };
  progress: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    currentWeek: number;
    lastActivityDate: Date;
    overdueCount: number;
  };
  assignments: Array<{
    title: string;
    weekNumber: number;
    status: string;
    completedAt: Date | null;
    reviewedAt: Date | null;
  }>;
}

export async function generateCoupleProgressReport(coupleId: string): Promise<CoupleProgressReport> {
  const { data: couple } = await supabase
    .from('couples')
    .select(`
      *,
      coaches(first_name, last_name),
      assignment_statuses(
        *,
        assignments(title, week_number)
      )
    `)
    .eq('id', coupleId)
    .single();

  if (!couple) throw new Error('Couple not found');

  const statuses = couple.assignment_statuses || [];
  const completed = statuses.filter(s => s.status === 'completed');
  const overdue = statuses.filter(s => s.status === 'overdue');

  return {
    couple: {
      id: couple.id,
      names: `${couple.husband_first_name} & ${couple.wife_first_name}`,
      coach: `${couple.coaches.first_name} ${couple.coaches.last_name}`,
      stage: couple.stage,
      enrollmentDate: new Date(couple.enrollment_date),
    },
    progress: {
      totalAssignments: statuses.length,
      completedAssignments: completed.length,
      completionRate: statuses.length > 0
        ? Math.round((completed.length / statuses.length) * 100)
        : 0,
      currentWeek: Math.max(...statuses.map(s => s.assignments.week_number), 0),
      lastActivityDate: new Date(
        Math.max(...statuses.map(s => new Date(s.updated_at).getTime()))
      ),
      overdueCount: overdue.length,
    },
    assignments: statuses.map(s => ({
      title: s.assignments.title,
      weekNumber: s.assignments.week_number,
      status: s.status,
      completedAt: s.completed_at ? new Date(s.completed_at) : null,
      reviewedAt: null, // TODO: Join with homework_responses
    })),
  };
}

export async function exportCoachReport(coachId: string): Promise<Blob> {
  // Generate CSV of all couples and their progress
  const { data: couples } = await supabase
    .from('couples')
    .select(`
      *,
      assignment_statuses(status)
    `)
    .eq('coach_id', coachId);

  const rows = couples?.map(c => {
    const statuses = c.assignment_statuses || [];
    const completed = statuses.filter(s => s.status === 'completed').length;
    return {
      'Couple Name': `${c.husband_first_name} ${c.husband_last_name} & ${c.wife_first_name} ${c.wife_last_name}`,
      'Email': c.email,
      'Phone': c.phone,
      'Stage': c.stage,
      'Status': c.status,
      'Enrollment Date': c.enrollment_date,
      'Assignments Completed': completed,
      'Total Assignments': statuses.length,
      'Completion Rate': statuses.length > 0
        ? `${Math.round((completed / statuses.length) * 100)}%`
        : 'N/A',
    };
  }) || [];

  const csv = convertToCSV(rows);
  return new Blob([csv], { type: 'text/csv' });
}
```

---

## Phase 9: Mobile Experience

### 9.1 Responsive Design Requirements

The application must be fully functional on mobile devices with the following breakpoints:

```css
/* Tailwind breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### 9.2 Mobile-First Components

#### Navigation
- Hamburger menu on mobile
- Bottom navigation bar for couples (Home, Assignments, Chat, Profile)
- Swipe gestures for navigation

#### Assignment Cards
- Full-width cards on mobile
- Swipe to mark complete (couples)
- Pull-to-refresh

#### Chat Interface
- Full-screen on mobile
- Keyboard-aware layout
- Quick reply suggestions

### 9.3 Progressive Web App (PWA)

```json
// public/manifest.json
{
  "name": "Resonate Marriage Ministry",
  "short_name": "Marriage Ministry",
  "description": "Grow together in your marriage journey",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#41748d",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 9.4 Push Notifications (Web)

```typescript
// services/push.ts
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  // Get push subscription
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Store subscription on server
  await supabase.from('push_subscriptions').upsert({
    user_id: getCurrentUserId(),
    endpoint: subscription.endpoint,
    keys: JSON.stringify(subscription.toJSON().keys),
  });

  return true;
}
```

---

## Phase 10: Testing & Quality Assurance

### 10.1 Testing Strategy

#### Unit Tests (Vitest)
- Services: All CRUD operations
- Hooks: State management and data fetching
- Utils: Helper functions and formatters
- Components: Isolated component behavior

#### Integration Tests
- Authentication flows
- Permission checks
- Notification delivery
- SMS webhook handling
- LLM conversation handling

#### End-to-End Tests (Playwright)
- Complete user journeys by role
- Assignment lifecycle
- SMS submission simulation
- Cross-browser compatibility

### 10.2 Critical Test Scenarios

```typescript
// e2e/auth.spec.ts
describe('Authentication', () => {
  test('Admin can log in with email/password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Coach can only see assigned couples', async ({ page }) => {
    await loginAs(page, 'coach');
    await page.goto('/couples');
    const couples = await page.locator('[data-testid="couple-card"]').all();
    // Verify all couples belong to this coach
    for (const couple of couples) {
      await expect(couple.locator('[data-testid="coach-name"]')).toContainText('Test Coach');
    }
  });

  test('Couple cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'couple');
    await page.goto('/coaches');
    await expect(page).toHaveURL('/'); // Redirected
  });
});

// e2e/assignments.spec.ts
describe('Assignment Workflow', () => {
  test('Admin creates and distributes assignment', async ({ page }) => {
    await loginAs(page, 'admin');

    // Create assignment
    await page.goto('/assignments');
    await page.click('[data-testid="create-assignment"]');
    await page.fill('[name="title"]', 'Communication Basics');
    await page.fill('[name="description"]', 'Learn to listen and respond');
    await page.fill('[name="content"]', 'This week, practice active listening...');
    await page.click('[data-testid="save-assignment"]');

    // Distribute
    await page.click('[data-testid="distribute-button"]');
    await page.click('[data-testid="distribute-all"]');
    await page.click('[data-testid="confirm-distribute"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('distributed');
  });

  test('Couple completes assignment via web', async ({ page }) => {
    await loginAs(page, 'couple');
    await page.goto('/homework');

    await page.click('[data-testid="current-assignment"]');
    await page.fill('[name="response"]', 'Our reflection on this week...');
    await page.click('[data-testid="submit-response"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('submitted');
  });

  test('Coach reviews submission', async ({ page }) => {
    await loginAs(page, 'coach');
    await page.goto('/reviews');

    await page.click('[data-testid="pending-review"]:first-child');
    await page.fill('[name="review_notes"]', 'Great reflection! Keep growing.');
    await page.click('[data-testid="mark-reviewed"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('reviewed');
  });
});

// e2e/sms.spec.ts
describe('SMS Integration', () => {
  test('Incoming SMS creates submission', async ({ request }) => {
    // Simulate Twilio webhook
    const response = await request.post('/api/sms-webhook', {
      form: {
        From: '+15551234567', // Registered couple phone
        To: '+15559876543',
        Body: 'SUBMIT We practiced active listening this week by...',
        MessageSid: 'SM' + Date.now(),
      },
    });

    expect(response.status()).toBe(200);

    // Verify submission created
    const { data: submission } = await supabase
      .from('homework_responses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(submission.submission_method).toBe('sms');
  });
});
```

### 10.3 Test Data Seeding

See `specs/seed-data-population.md` for comprehensive seed data requirements.

---

## Implementation Order for Ralph

### Sprint 1: Foundation (Specs 1-3)
1. `phase-1-authentication.md` - Complete auth flows and account creation
2. `phase-4-permissions.md` - RLS policies and permission system
3. `phase-2-profiles.md` - Profile views and management

### Sprint 2: Core Features (Specs 4-5)
4. `phase-3-assignments.md` - Assignment system enhancements
5. `phase-7-notifications.md` - Email notifications and reminders

### Sprint 3: SMS Integration (Specs 6-7)
6. `phase-5-sms-integration.md` - Twilio integration and SMS workflows
7. `phase-6-llm-conversations.md` - Conversational assignment completion

### Sprint 4: Polish (Specs 8-10)
8. `phase-8-analytics.md` - Dashboard metrics and reporting
9. `phase-9-mobile.md` - Responsive design and PWA
10. `phase-10-testing.md` - Comprehensive test coverage

---

## Appendix A: Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15559876543

# LLM (Anthropic)
ANTHROPIC_API_KEY=your-anthropic-key

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# App
NEXT_PUBLIC_APP_URL=https://marriage.resonatemovement.org
```

## Appendix B: API Routes Summary

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/auth/login` | POST | Email/password login | Public |
| `/api/auth/magic-link` | POST | Send magic link | Public |
| `/api/auth/logout` | POST | End session | Authenticated |
| `/api/coaches` | GET/POST | List/create coaches | Admin |
| `/api/coaches/:id` | GET/PUT/DELETE | Coach CRUD | Admin |
| `/api/couples` | GET/POST | List/create couples | Admin/Coach |
| `/api/couples/:id` | GET/PUT/DELETE | Couple CRUD | Admin/Coach |
| `/api/assignments` | GET/POST | List/create assignments | Admin |
| `/api/assignments/:id` | GET/PUT/DELETE | Assignment CRUD | Admin |
| `/api/assignments/:id/distribute` | POST | Distribute to couples | Admin |
| `/api/homework` | GET/POST | List/submit homework | All |
| `/api/homework/:id/review` | POST | Review submission | Admin/Coach |
| `/api/sms-webhook` | POST | Twilio webhook | Twilio |
| `/api/llm-conversation` | POST | Chat with LLM | Authenticated |
| `/api/notifications/process` | POST | Process queue (cron) | Service |
| `/api/analytics/metrics` | GET | Dashboard metrics | Admin/Coach |
| `/api/analytics/export` | GET | Export report | Admin |

---

*This specification is designed to be executed incrementally by Ralph across multiple planning cycles. Each phase builds upon the previous, with clear dependencies and acceptance criteria.*
