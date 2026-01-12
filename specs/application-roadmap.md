# Chore: Marriage Ministry Application Roadmap

## Chore Description
Create a comprehensive development plan for the Marriage Ministry web application based on the meeting summary requirements. The application will centralize all counseling operations into a single platform, replacing manual spreadsheet tracking and PDF-based homework distribution with a dynamic digital system featuring role-based access control (Managers, Coaches/Counselors, Couples).

The current codebase has a foundational structure in place including:
- Basic database schema with profiles, coaches, couples, assignments, and response tracking
- Skeleton UI components (Dashboard, CoachesList, CouplesList, AssignmentsList)
- Supabase integration setup with authentication framework
- Resonate Design System with tokens and base UI components (Button, Card)
- Testing infrastructure (Vitest for unit tests, Playwright for E2E)

The goal is to build out the full-featured application from this foundation, implementing:
1. Complete authentication and role-based authorization
2. Manager dashboard with overview metrics and real-time visibility
3. Coach/Counselor interface for managing assigned couples and reviewing homework
4. Couple interface for viewing assignments and submitting homework digitally
5. Dynamic form system to replace PDF homework
6. Assignment distribution and progress tracking workflows

## Relevant Files
Use these files to resolve the chore:

### Existing Files to Extend
- `supabase/migrations/20250111000000_initial_schema.sql` - Current database schema that needs RLS policies completed and potentially extended for dynamic forms
- `types/app.ts` - Core TypeScript types that need expansion for new features (forms, notifications, etc.)
- `components/dashboard/Dashboard.tsx` - Skeleton dashboard needing real data integration and role-based views
- `components/coaches/CoachesList.tsx` - Needs Supabase data fetching, CRUD operations, and coach detail views
- `components/couples/CouplesList.tsx` - Needs Supabase data fetching, CRUD operations, and couple management
- `components/assignments/AssignmentsList.tsx` - Needs assignment creation, distribution, and tracking features
- `components/ui/button.tsx` - Base button component to use across the app
- `components/ui/card.tsx` - Base card component to use across the app
- `hooks/useAppState.ts` - App state hook that needs extension for data management
- `design-system/tokens/colors.ts` - Design tokens for consistent styling
- `design-system/tokens/spacing.ts` - Spacing tokens for layout
- `design-system/tokens/typography.ts` - Typography tokens for text styling

### New Files
- `supabase/migrations/20250112000000_rls_policies.sql` - Complete Row Level Security policies for role-based access
- `supabase/migrations/20250113000000_form_schema.sql` - Dynamic form templates and responses schema
- `components/auth/LoginPage.tsx` - Email-based authentication login page
- `components/auth/ProtectedRoute.tsx` - Route protection with role-based access
- `components/layout/AppLayout.tsx` - Main application layout with navigation sidebar
- `components/layout/Sidebar.tsx` - Role-aware navigation sidebar
- `components/dashboard/ManagerDashboard.tsx` - Manager-specific dashboard view
- `components/dashboard/CoachDashboard.tsx` - Coach-specific dashboard view
- `components/dashboard/CoupleDashboard.tsx` - Couple-specific dashboard view
- `components/dashboard/MetricCard.tsx` - Reusable metric display component
- `components/coaches/CoachDetail.tsx` - Coach profile and assigned couples view
- `components/coaches/CoachForm.tsx` - Add/edit coach form component
- `components/couples/CoupleDetail.tsx` - Couple profile and progress view
- `components/couples/CoupleForm.tsx` - Add/edit couple form component
- `components/couples/AssignCoachModal.tsx` - Modal for assigning coach to couple
- `components/assignments/AssignmentDetail.tsx` - Assignment details and responses view
- `components/assignments/AssignmentForm.tsx` - Create/edit assignment form
- `components/assignments/DistributeModal.tsx` - Modal for distributing assignments to couples
- `components/homework/HomeworkForm.tsx` - Dynamic form renderer for homework submission
- `components/homework/HomeworkReview.tsx` - Coach view for reviewing submitted homework
- `components/homework/FormBuilder.tsx` - Manager tool for creating dynamic form templates
- `components/ui/input.tsx` - Text input component
- `components/ui/textarea.tsx` - Textarea component for long-form input
- `components/ui/select.tsx` - Dropdown select component
- `components/ui/modal.tsx` - Modal/dialog component
- `components/ui/tabs.tsx` - Tab navigation component
- `components/ui/badge.tsx` - Status badge component
- `components/ui/avatar.tsx` - User avatar component
- `components/ui/table.tsx` - Data table component
- `components/ui/empty-state.tsx` - Empty state placeholder component
- `components/ui/loading-spinner.tsx` - Loading indicator component
- `hooks/useAuth.ts` - Authentication hook with role info
- `hooks/useCoaches.ts` - Coach data fetching and mutations
- `hooks/useCouples.ts` - Couple data fetching and mutations
- `hooks/useAssignments.ts` - Assignment data fetching and mutations
- `hooks/useHomework.ts` - Homework submission and review hooks
- `hooks/useDashboardMetrics.ts` - Dashboard statistics hook
- `contexts/AuthContext.tsx` - Authentication context provider (extend existing)
- `services/coaches.ts` - Coach API service layer
- `services/couples.ts` - Couple API service layer
- `services/assignments.ts` - Assignment API service layer
- `services/homework.ts` - Homework/forms API service layer
- `types/forms.ts` - Dynamic form types (templates, fields, responses)
- `types/database.ts` - Supabase-generated database types
- `lib/supabase.ts` - Supabase client configuration
- `lib/permissions.ts` - Role-based permission utilities

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Complete Authentication & Authorization Foundation
- Create `lib/supabase.ts` with configured Supabase client using environment variables
- Extend `contexts/AuthContext.tsx` to include user role information from profiles table
- Create `hooks/useAuth.ts` hook exposing user, role, loading state, and auth methods
- Create `components/auth/LoginPage.tsx` with email-based login (Supabase magic link or password)
- Create `components/auth/ProtectedRoute.tsx` that redirects unauthenticated users and checks role access
- Create `lib/permissions.ts` with role-based permission helpers (canManageCoaches, canViewAllCouples, etc.)
- Update `supabase/migrations/` with RLS policies file for all tables based on user roles:
  - Admins: Full access to all tables
  - Coaches: Read own profile, read/update assigned couples, read assignments, read/create responses for their couples
  - Couples: Read own record only, read assigned assignments, create/update own homework responses
- Run validation: `npm run build` and test auth flow

### Step 2: Build Core UI Component Library
- Create `components/ui/input.tsx` - Text input with label, error state, and disabled state
- Create `components/ui/textarea.tsx` - Multi-line text input with auto-resize option
- Create `components/ui/select.tsx` - Dropdown select with label and placeholder
- Create `components/ui/modal.tsx` - Modal dialog with overlay, close button, and portal rendering
- Create `components/ui/tabs.tsx` - Tab navigation component with content panels
- Create `components/ui/badge.tsx` - Status badges for active/inactive/completed/pending states
- Create `components/ui/avatar.tsx` - User avatar with initials fallback
- Create `components/ui/table.tsx` - Data table with sorting and responsive design
- Create `components/ui/empty-state.tsx` - Consistent empty state with icon, title, description, and action
- Create `components/ui/loading-spinner.tsx` - Loading indicator for async operations
- Ensure all components follow Resonate Design System tokens for colors, spacing, typography
- Run validation: `npm run build` and `npm run lint`

### Step 3: Implement Application Layout & Navigation
- Create `components/layout/Sidebar.tsx` with role-aware navigation links:
  - Manager: Dashboard, Coaches, Couples, Assignments, Forms (builder)
  - Coach: Dashboard, My Couples, Assignments
  - Couple: Dashboard, My Assignments
- Create `components/layout/AppLayout.tsx` wrapping content with Sidebar, header, and main content area
- Update routing in main App.tsx to use AppLayout for authenticated routes
- Implement responsive sidebar (collapsible on mobile)
- Add user profile dropdown in header with logout option
- Run validation: `npm run build` and visual inspection

### Step 4: Build Dashboard Components with Real Data
- Create `hooks/useDashboardMetrics.ts` to fetch aggregated statistics from Supabase
- Create `components/dashboard/MetricCard.tsx` for displaying individual metrics with loading state
- Create `components/dashboard/ManagerDashboard.tsx` showing:
  - Total coaches, active couples, pending assignments, completed this week
  - Recent activity feed (new couples, submissions, coach assignments)
  - Upcoming assignments list
  - Quick action buttons (add coach, add couple, create assignment)
- Create `components/dashboard/CoachDashboard.tsx` showing:
  - My assigned couples count and list
  - Pending homework reviews
  - Upcoming assignments for my couples
- Create `components/dashboard/CoupleDashboard.tsx` showing:
  - Current assignment details
  - Progress timeline/history
  - Quick access to submit homework
- Update `components/dashboard/Dashboard.tsx` to render role-appropriate dashboard
- Run validation: `npm run build`

### Step 5: Implement Coach Management Features
- Create `services/coaches.ts` with CRUD operations using Supabase client
- Create `hooks/useCoaches.ts` with data fetching, caching, and mutation functions
- Create `components/coaches/CoachForm.tsx` for adding/editing coaches with validation
- Create `components/coaches/CoachDetail.tsx` showing coach profile, assigned couples, and activity
- Update `components/coaches/CoachesList.tsx` to:
  - Fetch real data from Supabase using useCoaches hook
  - Add search and filter functionality
  - Connect "Add Coach" button to CoachForm modal
  - Add click handlers to view CoachDetail
  - Support both grid and list view modes
- Add coach edit and deactivate functionality
- Run validation: `npm run build`

### Step 6: Implement Couple Management Features
- Create `services/couples.ts` with CRUD operations using Supabase client
- Create `hooks/useCouples.ts` with data fetching, caching, and mutation functions
- Create `components/couples/CoupleForm.tsx` for adding/editing couples with validation
- Create `components/couples/CoupleDetail.tsx` showing couple profile, assigned coach, homework history
- Create `components/couples/AssignCoachModal.tsx` for assigning/reassigning coach to couple
- Update `components/couples/CouplesList.tsx` to:
  - Fetch real data from Supabase using useCouples hook
  - Add search and filter by status, coach
  - Connect "Add Couple" button to CoupleForm modal
  - Add click handlers to view CoupleDetail
  - Show assigned coach information
- Add couple status updates (active, inactive, completed)
- Run validation: `npm run build`

### Step 7: Implement Assignment Distribution System
- Create `services/assignments.ts` with CRUD and distribution operations
- Create `hooks/useAssignments.ts` with data fetching and mutation functions
- Create `components/assignments/AssignmentForm.tsx` for creating/editing assignments:
  - Title, description, content fields
  - Week number selector
  - Due date picker
  - Rich text or markdown content editor
- Create `components/assignments/AssignmentDetail.tsx` showing:
  - Assignment content
  - Distribution status across couples
  - Response/submission summary
- Create `components/assignments/DistributeModal.tsx` for sending assignment to:
  - All active couples
  - Specific coach's couples
  - Individual couple selection
- Update `components/assignments/AssignmentsList.tsx` to:
  - Fetch real data with distribution status
  - Add filtering by week, status
  - Connect create button to AssignmentForm
  - Show distribution/completion metrics
- Run validation: `npm run build`

### Step 8: Build Dynamic Homework Form System
- Create `supabase/migrations/` for dynamic forms schema:
  - `form_templates` table: id, name, description, fields (JSONB), created_by, created_at
  - `form_fields` type definition: type (text, textarea, select, checkbox, scale), label, required, options
  - Update `assignments` to reference form_template_id
  - `homework_responses` table: id, assignment_id, couple_id, responses (JSONB), submitted_at
- Create `types/forms.ts` with TypeScript types for form templates and responses
- Create `services/homework.ts` for form template and response operations
- Create `hooks/useHomework.ts` for homework data management
- Create `components/homework/HomeworkForm.tsx` - Dynamic form renderer that:
  - Renders form fields based on template JSON
  - Handles validation for required fields
  - Saves progress locally (localStorage)
  - Submits responses to Supabase
- Create `components/homework/HomeworkReview.tsx` for coaches to:
  - View submitted homework responses
  - Add notes/feedback
  - Mark as reviewed
- Create `components/homework/FormBuilder.tsx` (Manager only) for:
  - Creating new form templates
  - Adding/removing/reordering fields
  - Setting field types and validation
  - Previewing form
- Run validation: `npm run build`

### Step 9: Add Real-time Updates & Notifications
- Configure Supabase real-time subscriptions for:
  - New homework submissions (notify coach)
  - Assignment distribution (notify couple)
  - Coach assignments (notify coach)
- Create notification display component in header
- Add optimistic updates to mutations for better UX
- Implement toast notifications for actions (success/error states)
- Run validation: `npm run build`

### Step 10: Mobile Responsiveness & Polish
- Audit all components for mobile responsiveness
- Implement touch-friendly interactions
- Add swipe gestures for common actions on mobile
- Optimize table views for mobile (card layouts)
- Test on various screen sizes
- Add loading skeletons for better perceived performance
- Run validation: `npm run build` and visual testing on mobile viewport

### Step 11: Comprehensive Testing
- Write unit tests for all hooks (useAuth, useCoaches, useCouples, useAssignments, useHomework)
- Write unit tests for permission utilities
- Write component tests for form components (validation, submission)
- Write E2E tests for critical flows:
  - Manager login and dashboard access
  - Coach viewing and reviewing homework
  - Couple submitting homework
  - Assignment creation and distribution
- Run validation: `npm run test:run` and `npm run test:e2e`

### Step 12: Final Validation & Documentation
- Run full build: `npm run build`
- Run all tests: `npm run test:all`
- Run linting: `npm run lint`
- Update README.md with final feature list and deployment instructions
- Create CLAUDE.md with project context for AI-assisted development
- Document environment variables needed for production deployment

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run build` - Build the project to check for TypeScript errors
- `npm run lint` - Run linting to check for code quality issues
- `npm run test:run` - Run unit tests to verify component functionality
- `npm run test:e2e` - Run end-to-end tests to verify user workflows
- `npx supabase db push --dry-run` - Validate database migrations syntax

## Notes

### Role-Based Access Summary
| Feature | Manager | Coach | Couple |
|---------|---------|-------|--------|
| View all coaches | Yes | No | No |
| Add/edit coaches | Yes | No | No |
| View all couples | Yes | Only assigned | Own record only |
| Add/edit couples | Yes | No | No |
| Assign coaches | Yes | No | No |
| Create assignments | Yes | No | No |
| Distribute assignments | Yes | No | No |
| View homework submissions | Yes | Only for assigned couples | Own submissions |
| Review homework | Yes | Yes (assigned) | No |
| Submit homework | No | No | Yes |
| Create form templates | Yes | No | No |

### Technical Decisions
- **Authentication**: Supabase Auth with email magic links for simplicity (no password management)
- **State Management**: React hooks + Context for global state, no Redux needed for this scope
- **Forms**: Custom dynamic form system stored as JSONB for flexibility
- **Real-time**: Supabase Realtime for live updates on submissions and assignments
- **Styling**: Tailwind CSS with Resonate Design System tokens for consistency

### Priority Order for MVP
1. Authentication & protected routes (Step 1)
2. Basic CRUD for coaches and couples (Steps 5-6)
3. Assignment creation and distribution (Step 7)
4. Homework submission and review (Step 8)
5. Dashboard metrics (Step 4)
6. Form builder (Step 8 - can be simplified initially)
7. Real-time updates (Step 9 - nice-to-have for MVP)

### External Dependencies
- Supabase project with email auth enabled
- Vercel for hosting (configured in project)
- No additional third-party services required
