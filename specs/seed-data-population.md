# Chore: Populate Supabase with Comprehensive Seed Data

## Chore Description
The application's dashboard and components are fully functional and connected to Supabase, but they display empty states because the database has minimal seed data (only 1 admin user and 1 coach). This chore involves creating a comprehensive seed file that populates all tables with realistic mock data to demonstrate the full functionality of the application.

The seed data will include:
- **Coaches**: 4-5 active coaches with varied statuses
- **Couples**: 10-15 couples assigned to different coaches with varied statuses (active, inactive, completed)
- **Assignments**: 6-8 weekly assignments with content
- **Assignment Statuses**: Distribution of assignments to couples with pending/sent/completed/overdue statuses
- **Assignment Responses**: Homework submissions from couples
- **Form Templates**: 2-3 dynamic form templates for homework
- **Homework Responses**: Completed homework submissions with JSONB responses
- **Recent Activity Data**: Data timestamped to show recent activity in the dashboard

This will enable:
- Dashboard metrics showing real counts (Total Coaches, Active Couples, Pending Assignments, Completed This Week)
- Recent Activity feed showing new couples, homework submissions
- Upcoming Assignments list with pending counts
- CoachesList showing coaches with assigned couple counts
- CouplesList showing couples with coach assignments and statuses
- AssignmentsList showing assignments with distribution metrics
- Form Builder showing existing form templates

## Relevant Files
Use these files to resolve the chore:

- `supabase/seed.sql` - Existing seed file with admin and coach users; needs to be extended with comprehensive mock data
- `supabase/migrations/20250111000000_initial_schema.sql` - Reference for table structure (profiles, coaches, couples, assignments, assignment_responses, assignment_statuses)
- `supabase/migrations/20250113000000_form_schema.sql` - Reference for form_templates and homework_responses table structure
- `supabase/config.toml` - Confirms seed.sql is configured to run during `db reset`
- `hooks/useDashboardMetrics.ts` - Reference for what queries the dashboard runs (helps understand what data shapes are needed)
- `types/app.ts` - Reference for TypeScript types to ensure seed data matches expected schema

### New Files
- None required - all changes are to the existing `supabase/seed.sql` file

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Backup and Analyze Current Seed File
- Review the current `supabase/seed.sql` structure
- Note the deterministic UUID pattern used for test users
- Understand the deletion order required for foreign key constraints

### Step 2: Design Seed Data Structure
- Plan UUIDs for all entities using deterministic patterns for consistency:
  - Coaches: `c1000000-0000-0000-0000-00000000000X`
  - Couples: `cp000000-0000-0000-0000-00000000000X`
  - Assignments: `a0000000-0000-0000-0000-00000000000X`
  - Form Templates: `ft000000-0000-0000-0000-00000000000X`
- Plan relationships:
  - Each coach should have 2-4 couples assigned
  - Each assignment should be distributed to most active couples
  - Mix of pending/completed statuses for realistic dashboard metrics

### Step 3: Extend Seed File - Add Additional Coaches
- Add 3-4 more coaches to the seed file:
  - Coach 2: Sarah Johnson (active)
  - Coach 3: Michael Brown (active)
  - Coach 4: Emily Davis (active)
  - Coach 5: David Wilson (inactive - for status variety)
- Create corresponding auth.users entries for each coach
- Create profiles with role='coach' for each

### Step 4: Extend Seed File - Add Couples
- Add 12 couples distributed across coaches:
  - 3 couples assigned to Coach 1 (John Doe)
  - 3 couples assigned to Coach 2 (Sarah Johnson)
  - 3 couples assigned to Coach 3 (Michael Brown)
  - 2 couples assigned to Coach 4 (Emily Davis)
  - 1 couple unassigned (new enrollment)
- Include variety in statuses: 9 active, 2 completed, 1 inactive
- Include realistic wedding dates and enrollment dates (some recent for activity feed)

### Step 5: Extend Seed File - Add Form Templates
- Add 3 form templates with JSONB field definitions:
  - "Weekly Reflection" - Standard weekly homework with text fields
  - "Communication Assessment" - Multiple choice and scale questions
  - "Date Night Planning" - Short form with a few fields
- Each template should have realistic field structures:
  ```json
  [
    {"id": "field_1", "type": "textarea", "label": "Question text", "required": true},
    {"id": "field_2", "type": "select", "label": "Rating", "options": ["1","2","3","4","5"]}
  ]
  ```

### Step 6: Extend Seed File - Add Assignments
- Add 6 weekly assignments:
  - Week 1: "Getting Started" - Introduction assignment
  - Week 2: "Communication Foundations" - With form template attached
  - Week 3: "Conflict Resolution"
  - Week 4: "Date Night Challenge"
  - Week 5: "Gratitude Practice"
  - Week 6: "Looking Forward"
- Include due dates (some past, some future for variety)
- Link some to form_templates

### Step 7: Extend Seed File - Add Assignment Statuses
- Create assignment_statuses entries distributing assignments to couples:
  - Week 1-3: Mostly completed or overdue
  - Week 4: Mix of completed/pending
  - Week 5-6: Mostly pending or sent (upcoming)
- This creates realistic dashboard metrics:
  - Pending assignments count > 0
  - Completed this week count > 0

### Step 8: Extend Seed File - Add Assignment Responses
- Add assignment_responses for completed assignment_statuses:
  - Include response_text for traditional responses
  - Mix of reviewed and unreviewed submissions
  - Some with coach notes
- Timestamp submissions within the last 2 weeks for recent activity

### Step 9: Extend Seed File - Add Homework Responses (JSONB)
- Add homework_responses for assignments with form templates:
  - Create JSONB responses matching the form template fields
  - Include some drafts (is_draft = true)
  - Include some reviewed submissions

### Step 10: Add Couple User Accounts (Optional Enhancement)
- Create 2-3 auth.users entries for couples to allow couple login testing:
  - couple1@test.com / password123
  - couple2@test.com / password123
- Link these to specific couples via user_id

### Step 11: Verify Deletion Order for Idempotent Seeding
- Ensure DELETE statements are in correct order to respect foreign keys:
  1. homework_responses
  2. assignment_responses
  3. assignment_statuses
  4. assignments
  5. couples
  6. coaches
  7. form_templates
  8. profiles (for new users)
  9. auth.users (for new users)

### Step 12: Test the Seed File
- Run `npx supabase db reset` to apply migrations and seed
- Verify all data is inserted without errors
- Check the application dashboard shows populated metrics

### Step 13: Run Validation Commands
- Execute validation commands to ensure no regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npx supabase db reset` - Reset database and apply seed file (must complete without SQL errors)
- `npm run build` - Build the project to check for TypeScript errors
- `npm run lint` - Run linting to check for code quality issues
- `npm run dev` - Start development server and manually verify:
  - Dashboard shows non-zero metrics
  - Recent Activity shows entries
  - Coaches page shows multiple coaches
  - Couples page shows multiple couples with assigned coaches
  - Assignments page shows assignments

## Notes

### Seed Data Summary
| Entity | Count | Notes |
|--------|-------|-------|
| Auth Users | 7 | 1 admin, 5 coaches, 1 couple (for login testing) |
| Profiles | 7 | Matching auth users |
| Coaches | 5 | 4 active, 1 inactive |
| Couples | 12 | 9 active, 2 completed, 1 inactive |
| Form Templates | 3 | Various question types |
| Assignments | 6 | Weeks 1-6 |
| Assignment Statuses | ~60 | 12 couples x ~5 assignments each |
| Assignment Responses | ~30 | For completed statuses |
| Homework Responses | ~10 | For form-based assignments |

### Test User Credentials
After seeding, the following users will be available:
- **Admin**: admin@test.com / password123
- **Coach 1**: coach@test.com / password123
- **Coach 2**: coach2@test.com / password123
- **Couple**: couple1@test.com / password123

### Expected Dashboard Metrics After Seeding
- Total Coaches: 4 (active only)
- Active Couples: 9
- Pending Assignments: ~20-30
- Completed This Week: 5-10 (depending on timestamps)

### UUID Pattern Reference
Using deterministic UUIDs makes the seed idempotent and allows for predictable relationships:
```
Admin:     a0000000-0000-0000-0000-000000000001
Coach 1:   c0000000-0000-0000-0000-000000000001
Coach 2:   c0000000-0000-0000-0000-000000000002
Couple 1:  cp000000-0000-0000-0000-000000000001
Assign 1:  a0000000-0000-0000-0000-000000000001
Form T 1:  ft000000-0000-0000-0000-000000000001
```
