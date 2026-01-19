# Feature: Profile Views for Coaches, Couples, and Own Profile

## Feature Description
Add profile view pages that display when clicking on a coach or couple from the lists, as well as a "My Profile" page accessible to all users. The profile views will show detailed information about the selected coach or couple, including their assigned relationships and activity history. Admins will have the ability to edit their own profile information.

Currently, clicking on a coach card in `CoachesList` navigates to `/coaches/:id` and clicking on a couple card in `CouplesList` navigates to `/couples/:id`, but these routes don't exist yet. This feature will:
1. Create `CoachProfile` page for viewing coach details
2. Create `CoupleProfile` page for viewing couple details
3. Create `MyProfile` page for users to view their own profile
4. Add profile editing capability for admin users
5. Add routes and navigation for all profile views

## User Story
As a **ministry administrator**
I want to **click on a coach or couple to view their full profile, and access my own profile**
So that **I can see detailed information, manage relationships, and update my own account settings**

As a **coach**
I want to **view my assigned couples' profiles and my own profile**
So that **I can understand their situation better and manage my account**

As a **couple**
I want to **view my own profile and my assigned coach's profile**
So that **I can see my information and know who is mentoring us**

## Problem Statement
The application currently has list views for coaches and couples with click handlers that navigate to profile routes (`/coaches/:id` and `/couples/:id`), but these profile pages don't exist. Users cannot see detailed information about coaches or couples, view their own profile, or edit their account settings. This limits the application's usability for understanding relationships and managing user accounts.

## Solution Statement
Create dedicated profile view components for coaches, couples, and user's own profile:

1. **CoachProfile** (`/coaches/:id`) - Shows coach details, assigned couples list, activity/homework review history
2. **CoupleProfile** (`/couples/:id`) - Shows couple details, assigned coach, assignment/homework history
3. **MyProfile** (`/profile`) - Shows current user's profile based on role, with edit capability for admins

Each profile view will:
- Display comprehensive information in a well-organized layout
- Show related entities (coach's couples, couple's coach)
- Display activity history (assignments, responses)
- Follow existing design patterns using Card, Avatar, Badge components
- Include a back navigation to return to the list

Admin profile editing will allow updating email and password.

## Relevant Files
Use these files to implement the feature:

### Existing Files to Extend
- `App.tsx` - Add routes for `/coaches/:id`, `/couples/:id`, `/profile`
- `components/layout/Sidebar.tsx` - Add "My Profile" navigation item for all roles
- `components/layout/AppLayout.tsx` - Add profile link in user dropdown menu
- `hooks/useCoaches.ts` - Already has `useCoach(id)` hook for fetching single coach with couples
- `hooks/useCouples.ts` - Need to add `useCouple(id)` hook for fetching single couple
- `services/coaches.ts` - Already has `getCoachWithCouples(id)` function
- `services/couples.ts` - Need to add `getCoupleWithDetails(id)` function
- `contexts/AuthContext.tsx` - Use for current user info and profile updates

### UI Components to Reuse
- `components/ui/card.tsx` - For profile sections
- `components/ui/avatar.tsx` - For profile image/initials
- `components/ui/badge.tsx` - For status badges
- `components/ui/button.tsx` - For actions
- `components/ui/tabs.tsx` - For organizing profile sections
- `components/ui/input.tsx` - For edit form fields
- `components/ui/modal.tsx` - For edit profile modal
- `components/ui/loading-spinner.tsx` - For loading states
- `components/ui/empty-state.tsx` - For empty data states

### New Files

#### Components
- `components/profile/CoachProfile.tsx` - Coach profile view page
- `components/profile/CoupleProfile.tsx` - Couple profile view page
- `components/profile/MyProfile.tsx` - Current user's profile page
- `components/profile/ProfileHeader.tsx` - Reusable profile header with avatar and basic info
- `components/profile/ProfileEditModal.tsx` - Modal for admin to edit their profile
- `components/profile/AssignmentHistoryList.tsx` - Reusable assignment history component

#### Hooks
- `hooks/useProfile.ts` - Hook for fetching and updating current user's profile data

#### Services
- `services/profile.ts` - Service functions for profile data and updates

## Implementation Plan

### Phase 1: Foundation
1. Create the profile service layer with functions for fetching detailed profile data
2. Create hooks for fetching coach, couple, and user profile data
3. Create shared profile components (ProfileHeader, AssignmentHistoryList)

### Phase 2: Core Implementation
1. Build CoachProfile page component with tabs for info, assigned couples, activity
2. Build CoupleProfile page component with tabs for info, coach, assignments
3. Build MyProfile page component that renders different views based on role
4. Build ProfileEditModal for admin users

### Phase 3: Integration
1. Add routes to App.tsx for all profile pages
2. Add "My Profile" to sidebar navigation
3. Add profile link to user dropdown in AppLayout
4. Connect profile pages to existing navigation (clicking coach/couple cards)
5. Write tests for all new components and hooks

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Profile Service Layer
- Create `services/profile.ts` with functions:
  - `getCurrentUserProfile()` - Get logged in user's profile with role-specific data
  - `updateUserEmail(email)` - Update user's email address
  - `updateUserPassword(currentPassword, newPassword)` - Change password
- Add `getCoupleWithDetails(id)` to `services/couples.ts` that fetches couple with coach info and assignment history

### Step 2: Create Profile Hooks
- Create `hooks/useProfile.ts` with:
  - `useCurrentProfile()` - Fetch current user's full profile data
  - `useUpdateProfile()` - Mutation hook for updating profile
- Add `useCouple(id)` hook to `hooks/useCouples.ts` for fetching single couple with details

### Step 3: Create Shared Profile Components
- Create `components/profile/ProfileHeader.tsx`:
  - Large avatar, name, email, status badge
  - Optional edit button
  - Back navigation link
- Create `components/profile/AssignmentHistoryList.tsx`:
  - List of assignments with status, date, and response preview
  - Empty state when no assignments

### Step 4: Build CoachProfile Page
- Create `components/profile/CoachProfile.tsx`:
  - Use `useCoach(id)` hook to fetch data
  - ProfileHeader with coach name, email, phone, status
  - Tabs component with:
    - "Overview" tab: Contact info, stats (total couples, active couples)
    - "Assigned Couples" tab: List of couples with links to their profiles
    - "Activity" tab: Recent homework reviews, assignment distributions
  - Loading and error states
  - Back button to `/coaches`

### Step 5: Build CoupleProfile Page
- Create `components/profile/CoupleProfile.tsx`:
  - Use `useCouple(id)` hook to fetch data
  - ProfileHeader with couple names, email, status
  - Tabs component with:
    - "Overview" tab: Contact info, wedding date, enrollment date, coach info
    - "Assignments" tab: Assignment history with statuses
    - "Homework" tab: Submitted homework responses
  - Loading and error states
  - Back button to `/couples`

### Step 6: Build MyProfile Page
- Create `components/profile/MyProfile.tsx`:
  - Use `useCurrentProfile()` hook
  - Render different content based on role:
    - Admin: Full profile with edit capability
    - Coach: Coach profile info + assigned couples summary
    - Couple: Couple profile info + coach info
  - Include ProfileEditModal for admin users

### Step 7: Build ProfileEditModal
- Create `components/profile/ProfileEditModal.tsx`:
  - Form fields for email change
  - Password change section (current password, new password, confirm)
  - Save and cancel buttons
  - Validation and error handling
  - Only accessible to admin role

### Step 8: Add Routes to App.tsx
- Add route `/coaches/:id` rendering CoachProfile with ProtectedRoute (admin only)
- Add route `/couples/:id` rendering CoupleProfile with ProtectedRoute (admin, coach)
- Add route `/profile` rendering MyProfile with ProtectedRoute (all roles)

### Step 9: Update Navigation
- Add "My Profile" nav item to Sidebar.tsx for all roles
- Add "View Profile" link to user dropdown menu in AppLayout.tsx
- Ensure clicking navigates to `/profile`

### Step 10: Write Unit Tests
- Create `components/profile/__tests__/CoachProfile.test.tsx`:
  - Test loading state
  - Test rendering coach data
  - Test tab navigation
  - Test error state
- Create `components/profile/__tests__/CoupleProfile.test.tsx`:
  - Test loading state
  - Test rendering couple data
  - Test tab navigation
  - Test error state
- Create `components/profile/__tests__/MyProfile.test.tsx`:
  - Test rendering for each role
  - Test edit modal for admin
- Create `hooks/__tests__/useProfile.test.ts`:
  - Test fetching profile data
  - Test updating profile

### Step 11: Write Integration Tests
- Create `components/profile/__tests__/ProfileNavigation.integration.test.tsx`:
  - Test clicking coach card navigates to profile
  - Test clicking couple card navigates to profile
  - Test back navigation

### Step 12: Run Validation Commands
- Run `npm run build` to check for TypeScript errors
- Run `npm run lint` to check for code quality issues
- Run `npm run test:run` to run unit tests

## Testing Strategy

### Unit Tests
- Test all profile components render correctly with mock data
- Test loading, error, and empty states
- Test ProfileEditModal form validation
- Test useProfile hook with mocked Supabase
- Test useCouple hook with mocked Supabase

### Integration Tests
- Test navigation from list to profile pages
- Test back navigation from profile to list
- Test profile edit flow for admin users
- Test role-based content rendering in MyProfile

### Edge Cases
- Coach with no assigned couples
- Couple with no assigned coach
- Couple with no assignment history
- Invalid coach/couple ID (404 handling)
- User with missing profile data
- Profile update failure handling
- Session expired during profile edit

## Acceptance Criteria

1. **Coach Profile View**
   - [x] Clicking a coach in CoachesList navigates to `/coaches/:id`
   - [x] Coach profile displays name, email, phone, status
   - [x] Coach profile shows list of assigned couples
   - [x] Each assigned couple links to their profile
   - [x] Back button returns to coaches list
   - [x] Only admin users can access coach profiles

2. **Couple Profile View**
   - [x] Clicking a couple in CouplesList navigates to `/couples/:id`
   - [x] Couple profile displays both names, email, phone, status
   - [x] Couple profile shows assigned coach with link
   - [x] Couple profile shows assignment history
   - [x] Back button returns to couples list
   - [x] Admin and coach users can access couple profiles

3. **My Profile View**
   - [x] All users can access `/profile` from sidebar
   - [x] Profile link available in user dropdown menu
   - [x] Profile displays role-appropriate information
   - [x] Admin users see edit button
   - [x] Non-admin users cannot edit profile

4. **Admin Profile Editing**
   - [x] Admin can click edit to open ProfileEditModal
   - [x] Admin can update email address
   - [x] Admin can change password
   - [x] Validation prevents invalid inputs
   - [x] Success/error feedback shown after save

5. **Navigation & UX**
   - [x] Loading spinners show during data fetch
   - [x] Error states displayed for failed fetches
   - [x] Empty states for missing data
   - [x] All profile pages are responsive

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run build` - Build the project to check for TypeScript errors
- `npm run lint` - Run linting to check for code quality issues
- `npm run test:run` - Run all unit tests
- `npm run test:e2e` - Run end-to-end tests (if applicable)

## Notes

### Design Considerations
- Profile pages should follow existing Card-based layout patterns
- Use Tabs component for organizing different sections
- Maintain consistent spacing using design system tokens
- ProfileHeader should be reusable across all profile types
- Consider mobile responsiveness for profile layouts

### Future Enhancements
- Profile photo upload capability
- Activity timeline visualization
- Export profile data
- Coach-to-coach messaging from profile
- Notes/comments section on couple profiles (coach visible only)

### Role Access Summary
| Route | Admin | Coach | Couple |
|-------|-------|-------|--------|
| `/coaches/:id` | Yes | No | No |
| `/couples/:id` | Yes | Yes (own assigned) | No |
| `/profile` | Yes (with edit) | Yes (view only) | Yes (view only) |

### Dependencies
- No new npm packages required
- Uses existing Supabase auth for password changes
- Uses existing UI components from design system
