# Chore: Dashboard Interactivity and Navigation Enhancements

## Chore Description
Enhance the Marriage Ministry app's dashboard and list views to make all statistics, metrics, and items fully interactive. Currently, many elements on the dashboard are static displays that show valuable data but don't allow users to drill down or navigate to related content. This chore will add clickable navigation throughout the app to improve usability and feature-richness:

1. **Manager Dashboard (Admin)**:
   - Make metric cards clickable to navigate to their associated pages
   - Make recent activity items clickable to view specific entities (couples, submissions)
   - Make upcoming assignments clickable to view assignment details
   - Add "View All" buttons to Recent Activity and Upcoming Assignments sections

2. **Coach Dashboard**:
   - Make metric cards clickable (Assigned Couples, Pending Reviews, Upcoming Assignments)
   - Make pending review items clickable to navigate to the review
   - Ensure "My Couples" section has "View All" navigation

3. **Couple Dashboard**:
   - Make current assignment card clickable to start/view assignment
   - Make progress timeline items clickable to view completed assignment details
   - Make coach info card clickable to view coach profile (if visible to couples)

4. **Profile Pages (Coach/Couple)**:
   - Make statistics in CoachProfile clickable to show filtered views
   - Make progress stats in CoupleProfile clickable to show assignment details

5. **Assignments List**:
   - Make assignment cards clickable to view assignment details
   - Create AssignmentDetailView component for viewing an assignment

## Relevant Files
Use these files to resolve the chore:

### Dashboard Components (Need Enhancement)
- `components/dashboard/ManagerDashboard.tsx` - Admin dashboard with metrics, recent activity, upcoming assignments
  - MetricCards need onClick handlers
  - Recent activity items need navigation
  - Upcoming assignments need navigation
  - Need "View All" buttons added
- `components/dashboard/CoachDashboard.tsx` - Coach dashboard with couples, reviews, assignments
  - MetricCards need onClick handlers
  - Pending reviews need navigation to /reviews with filter
  - Need "View All" navigation for sections
- `components/dashboard/CoupleDashboard.tsx` - Couple dashboard with assignments and progress
  - Current assignment needs navigation to homework page
  - Progress items need click handlers (view completed assignment)
  - Coach card needs navigation to coach profile

### Metric Card Component (Need Enhancement)
- `components/dashboard/MetricCard.tsx` - Reusable metric card component
  - Need to add onClick prop and cursor styling
  - Need to add visual indication of clickability

### Assignment Components (Need Enhancement)
- `components/assignments/AssignmentsList.tsx` - List of all assignments
  - Assignment cards need click handler to view details (not just edit menu)
  - Need to create detail view or modal

### Profile Components (Need Enhancement)
- `components/profile/CoachProfile.tsx` - Coach profile with statistics
  - Statistics cards need onClick to show filtered couple lists
- `components/profile/CoupleProfile.tsx` - Couple profile with progress stats
  - Progress statistics need onClick to show assignment details

### New Files
- `components/assignments/AssignmentDetailModal.tsx` - Modal to view assignment details and distribution status
- `components/dashboard/ViewAllLink.tsx` - Reusable "View All" link component with consistent styling

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Enhance MetricCard Component
- Add `onClick` optional prop to MetricCard interface
- Add `href` optional prop for link-based navigation
- Add cursor-pointer class when onClick or href is provided
- Add subtle hover state to indicate interactivity (e.g., shadow or scale)
- Update MetricCard to render as button when onClick provided, or Link when href provided
- Ensure keyboard accessibility (focusable, enter key triggers)

### Step 2: Create ViewAllLink Component
- Create `components/dashboard/ViewAllLink.tsx`
- Accept `href` and `label` props
- Style consistently with design system (muted text, arrow icon, hover state)
- Use react-router-dom Link component
- Export for reuse across dashboard components

### Step 3: Create AssignmentDetailModal Component
- Create `components/assignments/AssignmentDetailModal.tsx`
- Display assignment title, description, content, week number, due date
- Show distribution statistics (total sent, completed, pending)
- List couples with assignment status (if admin viewing)
- Include edit and distribute buttons for admins
- Handle loading and error states

### Step 4: Enhance ManagerDashboard
- Update metric cards with navigation:
  - "Total Coaches" → onClick navigates to `/coaches`
  - "Active Couples" → onClick navigates to `/couples?status=active`
  - "Pending Assignments" → onClick navigates to `/assignments`
  - "Completed This Week" → onClick navigates to `/reviews` (shows completed)
- Add "View All" link to Recent Activity card header → navigates to a dedicated activity log or `/couples` (most recent)
- Make each recent activity item clickable:
  - `new_couple` type → navigate to `/couples/{couple_id}`
  - `submission` type → navigate to `/reviews` (or specific submission)
  - `assignment` type → navigate to `/assignments`
  - `coach_assigned` type → navigate to `/coaches/{coach_id}`
- Add "View All" link to Upcoming Assignments card header → navigates to `/assignments`
- Make each upcoming assignment item clickable → opens AssignmentDetailModal
- Update useDashboardMetrics hook to include entity IDs in activity items

### Step 5: Enhance CoachDashboard
- Update metric cards with navigation:
  - "Assigned Couples" → onClick navigates to `/couples` (filtered by coach)
  - "Pending Reviews" → onClick navigates to `/reviews`
  - "Upcoming Assignments" → onClick shows assignments (could open modal or navigate)
- Add "View All" link to My Couples section header → navigates to `/couples`
- Add "View All" link to Pending Reviews section header → navigates to `/reviews`
- Make pending review items clickable → navigate to `/reviews` with review pre-selected or open review modal
- Ensure My Couples items remain clickable (already navigate to couple profile)

### Step 6: Enhance CoupleDashboard
- Make current assignment card fully clickable → navigate to `/homework` or open homework modal
- Make "Start Assignment" button more prominent and ensure it works
- Make each progress timeline item clickable → opens modal showing completed assignment details and responses
- Make coach info card clickable → navigate to coach profile if couples can view it (check permissions)
- If couples cannot view coach profile, add tooltip explaining why or remove click behavior

### Step 7: Enhance CoachProfile Statistics
- Make "Total Couples" stat clickable → switch to Assigned Couples tab and scroll
- Make "Active" stat clickable → switch to Assigned Couples tab with active filter
- Make "Completed" stat clickable → switch to Assigned Couples tab with completed filter
- Update Tabs component state to allow programmatic tab switching

### Step 8: Enhance CoupleProfile Statistics
- Make "Total Assignments" stat clickable → switch to Assignments tab
- Make "Completed" stat clickable → switch to Assignments tab with completed filter
- Make "Pending" stat clickable → switch to Assignments tab with pending filter
- Make "Completion Rate" visual element clickable → show tooltip or progress breakdown

### Step 9: Enhance AssignmentsList
- Make entire assignment card clickable (not just the action menu area)
- Clicking card opens AssignmentDetailModal showing full assignment info
- Maintain separate click handlers for Distribute button and menu actions
- Add visual hover state to indicate entire card is clickable

### Step 10: Update useDashboardMetrics Hook
- Add `coupleId` field to activity items of type `new_couple`
- Add `submissionId` and `coupleId` fields to activity items of type `submission`
- Add `assignmentId` field to activity items of type `assignment`
- Add `coachId` field to activity items of type `coach_assigned`
- These IDs enable navigation from activity items

### Step 11: Add URL Query Parameter Support for Filters
- Update `CouplesList.tsx` to read `status` query param and apply filter on mount
- Update `AssignmentsList.tsx` to read query params if needed
- Use `useSearchParams` from react-router-dom
- Ensure filter state syncs with URL for shareable links

### Step 12: Write Unit Tests
- Test MetricCard renders with onClick and handles clicks
- Test MetricCard renders with href and renders as link
- Test ViewAllLink renders correctly and navigates
- Test AssignmentDetailModal displays assignment data
- Test ManagerDashboard metric cards navigate correctly
- Test ManagerDashboard activity items navigate correctly
- Test CoachDashboard metric cards navigate correctly
- Test CoupleDashboard interactions work correctly

### Step 13: Run Validation Commands
- Run `npm run build` to check for TypeScript errors
- Run `npm run lint` to check for code quality issues
- Run `npm run test:run` to run all unit tests

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run build` - Build the project to check for TypeScript errors
- `npm run lint` - Run linting to check for code quality issues
- `npm run test:run` - Run all unit tests to ensure no regressions

## Notes

### User Experience Considerations
- All clickable elements should have clear visual affordance (cursor, hover states)
- Clicking a metric shouldn't feel like activating a button - it should feel like navigating
- Use consistent patterns: cards hover with shadow, text links underline, buttons have press states
- Consider adding tooltips on hover explaining what clicking will do for first-time users

### Accessibility Requirements
- All clickable elements must be keyboard accessible (Tab, Enter/Space)
- Add appropriate ARIA attributes (role="button" or use actual links)
- Ensure focus states are visible
- Screen reader users should understand that metrics are interactive

### Navigation Patterns
- Use `navigate()` for button-like clicks that stay in app
- Use `<Link>` for text links and inline navigation
- Use modals for detail views that don't need their own URL
- Consider adding URL state for modal opens so back button works naturally

### Data Requirements
- useDashboardMetrics needs to return entity IDs for navigation
- May need to add new queries to fetch entity IDs efficiently
- Consider caching to prevent re-fetching when navigating back to dashboard

### Future Enhancements Not Included
- Activity log page (dedicated page for all activity history)
- Notifications panel (real-time activity updates)
- Deep linking to specific submissions/reviews
- Breadcrumb navigation for drill-down paths
- Analytics/reporting page with clickable charts
