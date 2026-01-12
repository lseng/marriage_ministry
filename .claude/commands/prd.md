# PRD (Product Requirements Document) Command

Generate a comprehensive Product Requirements Document from a rough idea or feature request.

## Input
$ARGUMENTS - Feature idea, user request, or problem statement

## Instructions

1. **Analyze the Input**
   - Extract core problem/need
   - Identify target users
   - Understand context within the marriage ministry app

2. **Generate PRD**

   Save to: `docs/prds/PRD-[feature-slug].md`

## PRD Template

```markdown
# PRD: [Feature Name]

**Status:** Draft | In Review | Approved | In Progress | Complete
**Author:** ADW Agent
**Created:** [Date]
**Last Updated:** [Date]

---

## 1. Overview

### 1.1 Problem Statement
[Clear description of the problem or opportunity]

### 1.2 Proposed Solution
[High-level description of what we're building]

### 1.3 Goals & Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| [Goal 1] | [How measured] | [Target value] |
| [Goal 2] | [How measured] | [Target value] |

---

## 2. User Stories

### 2.1 Primary User Stories
As a [role], I want to [action], so that [benefit].

| ID | Role | Story | Priority |
|----|------|-------|----------|
| US-001 | Coach | View all my assigned couples | Must Have |
| US-002 | Coach | Add notes after meetings | Must Have |
| US-003 | Admin | See overall program status | Should Have |

### 2.2 Acceptance Criteria

**US-001: View assigned couples**
- [ ] Couples list shows on dashboard
- [ ] Each couple shows names and status
- [ ] Can click to view couple details
- [ ] List is sorted by next session date

---

## 3. Functional Requirements

### 3.1 Features

#### Feature 1: [Name]
**Description:** [What it does]

**Requirements:**
- FR-1.1: [Requirement]
- FR-1.2: [Requirement]

**UI/UX:**
- [Visual/interaction requirements]

**Edge Cases:**
- [Edge case 1]: [How to handle]
- [Edge case 2]: [How to handle]

### 3.2 API Requirements

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/couples` | GET | List couples | Coach |
| `/api/couples/:id` | GET | Get couple | Coach |

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Page load < 2 seconds
- API response < 500ms

### 4.2 Security
- RLS policies for data access
- Authentication required

### 4.3 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support

### 4.4 Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (iOS Safari, Android Chrome)

---

## 5. Technical Design

### 5.1 Data Model

```sql
-- New/modified tables
CREATE TABLE feature_table (
  id UUID PRIMARY KEY,
  -- fields
);
```

### 5.2 Component Architecture

```
src/
├── components/
│   └── FeatureName/
│       ├── index.ts
│       ├── FeatureName.tsx
│       └── FeatureName.types.ts
├── hooks/
│   └── useFeatureName.ts
└── pages/
    └── FeaturePage.tsx
```

### 5.3 State Management
[How state is managed for this feature]

### 5.4 Dependencies
- [Library 1]: [Purpose]
- [Library 2]: [Purpose]

---

## 6. UI/UX Design

### 6.1 Wireframes
[ASCII wireframes or description]

```
┌─────────────────────────────────┐
│ Header                          │
├─────────────────────────────────┤
│ ┌─────────┐ ┌─────────────────┐ │
│ │ Sidebar │ │ Main Content    │ │
│ │         │ │                 │ │
│ └─────────┘ └─────────────────┘ │
└─────────────────────────────────┘
```

### 6.2 User Flows
1. User lands on page
2. User clicks [action]
3. System responds with [result]

### 6.3 Design System Components
- Button (primary, secondary)
- Card
- Table
- Form inputs

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Component rendering
- Hook behavior
- Utility functions

### 7.2 Integration Tests
- API calls with mocked backend
- Component interactions

### 7.3 E2E Tests
- Complete user flows
- Cross-browser testing
- Mobile testing

### 7.4 Test Cases

| ID | Type | Description | Expected Result |
|----|------|-------------|-----------------|
| TC-001 | E2E | Add new couple | Couple appears in list |
| TC-002 | Unit | Form validation | Error shown for invalid email |

---

## 8. Rollout Plan

### 8.1 Phases
1. **Development**: Build feature
2. **Testing**: QA and bug fixes
3. **Soft Launch**: Limited users
4. **Full Launch**: All users

### 8.2 Feature Flags
- `FEATURE_NAME_ENABLED`: Toggle feature visibility

### 8.3 Rollback Plan
- Disable feature flag
- Revert migration if needed

---

## 9. Open Questions

| Question | Owner | Status | Decision |
|----------|-------|--------|----------|
| [Question 1] | [Name] | Open | - |
| [Question 2] | [Name] | Resolved | [Decision] |

---

## 10. Appendix

### 10.1 Related Documents
- [Link to design files]
- [Link to related PRDs]

### 10.2 Changelog
| Date | Author | Changes |
|------|--------|---------|
| [Date] | ADW Agent | Initial draft |
```

## Output

1. Create the PRD file in `docs/prds/`
2. Create placeholder GitHub issue if requested
3. Report summary of what was created

## Example

Input: "We need a way for coaches to schedule and track meetings with their couples"

Creates: `docs/prds/PRD-meeting-scheduler.md`
