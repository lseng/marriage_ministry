# Ralph Execution Guide - Marriage Ministry

> This guide organizes all specs for Ralph to execute in multiple loop plans.

---

## Access Tiers & Role Requirements

### Tier 1: Manager (Admin)
> This is what Mike and Dee see/manage

**Dashboard & Visibility:**
- Quick view of how many Coaches, Counselors, and Couples there are
- See how many couples are not yet assigned to a Coach/Counselor
- See which Coaches/Counselors are available (capacity vs current load)
- See the current progress of each couple

**Management Capabilities:**
- Assign Couples to a Coach/Counselor
- Assign Counselors to Coaches (hierarchy support)
- Add/update/delete Couple, Coach, and Counselor information
- Invite users to join the application via web form
- Create, update, delete homework assignments and materials

**Notifications:**
- Notified once a couple has completed their session (program completion)
- Notified when a Coach/Counselor/Couple registers on the app

---

### Tier 2: Coaches/Counselors
> Note: Counselors may be assigned to work under Coaches

**Visibility (scoped to their assigned couples/counselors only):**
- See their couples' information (Name, email, phone, photo)
- See the current progress of their couples
- See couples' answers once submitted

**Capabilities:**
- Assign homework to their couples
- View and review homework submissions

**Notifications:**
- Notified when a couple has completed their homework

---

### Tier 3: Couples

**Visibility:**
- See their assigned Coach/Counselor information (Name, email, phone, photo)
- See any assignments they must complete
- See their own progress

**Notifications:**
- Notified when homework has been assigned to them

---

## Resources

- **Brand Guide**: `specs/resonate-brand-guide.pdf`
- **Figma Designs**: https://www.figma.com/design/OYkmQvam43rQbp3uizyhai/Marriage-Ministry?node-id=1-6
- **Figma MCP**: `http://127.0.0.1:3845/mcp`
- **Master Plan**: `specs/marriage-ministry-master-plan.md`

---

## Execution Order

### Sprint 1: Foundation

| Priority | Spec | Description |
|----------|------|-------------|
| 1 | `bug-1-fix-password-signin-500-error.md` | Fix auth bug first |
| 2 | `seed-data-population.md` | Populate test data |
| 3 | `phase-1-authentication.md` | Complete auth flows, invitations |
| 4 | `design-system.md` | Apply brand colors, update Login page from Figma |

### Sprint 2: Core Features

| Priority | Spec | Description |
|----------|------|-------------|
| 5 | `profile-views.md` | User profile pages |
| 6 | `dashboard-interactivity-enhancements.md` | Clickable dashboard |
| 7 | `phase-7-notifications.md` | Email/in-app notifications |

### Sprint 3: SMS & AI

| Priority | Spec | Description |
|----------|------|-------------|
| 8 | `phase-5-sms-integration.md` | Twilio SMS for couples |
| 9 | `phase-6-llm-conversations.md` | AI-powered assignment completion |

---

## Per-Spec Summary

### 1. `bug-1-fix-password-signin-500-error.md`
**Goal**: Fix 500 error on password sign-in
**Key Tasks**:
- Create proper seed.sql with Supabase Auth user creation
- Test login with admin@test.com / password123

### 2. `seed-data-population.md`
**Goal**: Populate realistic test data
**Key Tasks**:
- 5 coaches, 12 couples, 6 assignments
- Various statuses (pending, completed, overdue)
- Form templates and responses

### 3. `phase-1-authentication.md`
**Goal**: Complete account management
**Key Tasks**:
- Admin invites coaches/couples via email
- Invitation accept page with password setup
- Password reset flow
- Account lockout after failed attempts

### 4. `design-system.md`
**Goal**: Apply Resonate brand
**Key Tasks**:
- Update Tailwind config with brand colors (#41748d blue, #50a684 green)
- Implement Login page matching Figma design
- Connect Figma MCP for design sync

### 5. `profile-views.md`
**Goal**: User profile pages
**Key Tasks**:
- CoachProfile, CoupleProfile, MyProfile components
- Profile editing for admins
- Activity history display

### 6. `dashboard-interactivity-enhancements.md`
**Goal**: Make dashboard actionable
**Key Tasks**:
- Clickable metric cards with navigation
- ViewAllLink component
- AssignmentDetailModal
- URL query params for filters

### 7. `phase-7-notifications.md`
**Goal**: Keep users informed
**Key Tasks**:
- Email templates (Resend)
- In-app notification bell with real-time updates
- Scheduled reminders (2 days before due)
- Weekly digest for coaches

### 8. `phase-5-sms-integration.md`
**Goal**: SMS for couples
**Key Tasks**:
- Twilio webhook for inbound SMS
- Phone verification flow
- SMS commands: HELP, STATUS, SUBMIT, DONE, PAUSE
- Assignment notifications via text

### 9. `phase-6-llm-conversations.md`
**Goal**: AI assignment completion
**Key Tasks**:
- Claude API integration for conversations
- Guide couples through assignment questions
- Extract structured responses from natural conversation
- Works via SMS or web chat

---

## Key Database Tables to Create/Update

```
# New Role Support
counselors           - Counselor records (similar to coaches)
coach_counselors     - Many-to-many: Counselors assigned to Coaches

# Existing tables to update
coaches              - Add capacity/availability fields
couples              - Support assignment to coach OR counselor
profiles             - Add 'counselor' role option

# SMS Integration
invitations          - Track pending invites
phone_mappings       - Verified phone numbers
sms_messages         - SMS log
sms_config           - Twilio settings
sms_templates        - SMS message templates

# LLM Integration
conversation_threads - LLM conversation state
conversation_messages- Individual messages
llm_configs          - Per-category prompts

# Notifications
notification_templates- Email/SMS templates
notification_queue   - Async notification processing
notifications        - In-app notifications
```

### Role Hierarchy
```
Manager (admin)
    └── Coaches
         └── Counselors (optional, assigned to coaches)
              └── Couples
```

---

## Environment Variables Needed

```bash
# Supabase (existing)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (new)
RESEND_API_KEY=

# SMS (new)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# AI (new)
ANTHROPIC_API_KEY=

# App
APP_URL=https://marriage.resonatemovement.org
```

---

## Success Criteria

When all specs are complete:

1. **Auth**: Admin can invite coaches/counselors/couples, they can accept and login
2. **Profiles**: All roles can view/edit appropriate profiles (scoped to their tier)
3. **Dashboard**: Role-specific dashboards with appropriate metrics
   - Manager: Full visibility of all coaches, counselors, couples, unassigned couples
   - Coach/Counselor: Only their assigned couples and progress
   - Couple: Only their own assignments and coach/counselor info
4. **Assignments**: Full lifecycle from creation to review
5. **Role Management**:
   - Manager can assign couples to coaches/counselors
   - Manager can assign counselors to coaches (hierarchy)
   - Coaches/Counselors can only see their assigned couples
6. **SMS**: Couples can text responses to complete assignments
7. **AI Chat**: Couples can have conversations to complete assignments
8. **Notifications**:
   - Manager notified on: new registrations, couple program completions
   - Coach/Counselor notified on: couple homework completions
   - Couple notified on: new homework assignments
9. **Design**: UI matches Resonate brand guide

---

## Cloud Supabase Configuration

### Project Details
- **URL**: https://pyabluebkwcfphjkhytu.supabase.co
- **Project ID**: pyabluebkwcfphjkhytu

### Deployment Commands
```bash
# Link to cloud project (one-time setup)
npx supabase link --project-ref pyabluebkwcfphjkhytu

# Push migrations to cloud
npx supabase db push

# Reset and reseed cloud database
npx supabase db reset --linked
```

### Important Notes for Seed Data
When writing seed.sql for cloud Supabase:
- Use `extensions.crypt()` and `extensions.gen_salt()` instead of `crypt()` and `gen_salt()`
- Use `gen_random_uuid()` instead of `uuid_generate_v4()` in migrations
- The pgcrypto extension is in the `extensions` schema on cloud

---

## Code Quality Requirements

### NO HARDCODED DATA
All data must come from the database. Never hardcode:
- User lists, coach lists, couple lists
- Metrics counts or statistics
- Assignment data or statuses
- Any IDs or entity references

### Data Fetching Pattern
All components must fetch data via:
1. **Supabase client** - Direct queries using `supabase.from('table').select()`
2. **Custom hooks** - e.g., `useDashboardMetrics()`, `useCouples()`, `useCoaches()`
3. **React Query** - For caching and refetching

### Example Hook Pattern
```typescript
export function useCouples() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCouples = async () => {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setCouples(data ?? []);
      setLoading(false);
    };
    fetchCouples();
  }, []);

  return { couples, loading };
}
```

### Test Data
- Test data lives in `supabase/seed.sql`
- Run `npx supabase db reset` locally to reset and reseed
- Run `npx supabase db reset --linked` to reset cloud database
