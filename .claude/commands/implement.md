# Implement Command (Test-Driven)

Implement a plan with comprehensive testing. The implementation is NOT complete until all tests pass.

## Input
$ARGUMENTS - Path to plan file or plan content

## Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Read Plan  │────▶│  Implement  │────▶│ Write Tests │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
              ┌───────────┐     ┌─────────────┐
              │ Run Tests │────▶│ Tests Pass? │
              └───────────┘     └─────────────┘
                    ▲                 │
                    │    No           │ Yes
                    │    ┌────────────┴────────────┐
                    │    ▼                         ▼
              ┌───────────┐                 ┌───────────┐
              │ Fix Issues│                 │  Complete │
              └───────────┘                 └───────────┘
```

## Instructions

### Phase 1: Understand the Plan
1. Read the plan file completely
2. Identify all components/features to implement
3. Map out dependencies between components
4. List all files that need to be created or modified

### Phase 2: Implement Core Functionality
For each feature in the plan:
1. Create/modify necessary files
2. Follow design system patterns
3. Use TypeScript strictly (no `any` types)
4. Add proper error handling
5. Ensure accessibility

### Phase 3: Write Comprehensive Tests

For EACH implemented feature, create:

#### Unit Tests (Vitest)
- Test all component props and variants
- Test hooks with different inputs
- Test utility functions
- Test error states
- Save to: `src/**/__tests__/[name].test.tsx`

#### Integration Tests (Vitest)
- Test component interactions
- Test data flow
- Test with mocked Supabase
- Save to: `src/**/__tests__/[name].integration.test.tsx`

#### E2E Tests (Playwright)
- Test complete user flows
- Test happy paths
- Test error scenarios
- Test edge cases
- Test responsive behavior
- Save to: `e2e/[feature].spec.ts`

### Phase 4: Test Execution Loop

```bash
# Run all tests
npm run test:all
```

**If tests fail:**
1. Analyze the failure message
2. Determine if the issue is in:
   - Implementation code → Fix the bug
   - Test code → Fix incorrect assertion
   - Test setup → Fix mocks/fixtures
3. Apply the fix
4. Re-run tests
5. Repeat until ALL tests pass

**Maximum attempts per test:** 3
**If still failing after 3 attempts:** Flag for manual review

### Phase 5: Quality Checks

Before marking complete, verify:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] No TypeScript errors: `npm run build`
- [ ] No lint errors: `npm run lint`
- [ ] Design audit passes: `/design_audit [files]`
- [ ] Code coverage meets thresholds (70%+)

## Test Requirements Per Feature

| Feature Type | Unit Tests | Integration Tests | E2E Tests |
|--------------|------------|-------------------|-----------|
| Component | Required | If has API calls | If user-facing |
| Hook | Required | Required | - |
| Page | Required | Required | Required |
| API/Service | Required | Required | Required |
| Utility | Required | - | - |

## Example Implementation Flow

**Plan:** Add coach profile page

1. **Implement:**
   - `src/pages/CoachProfile.tsx`
   - `src/hooks/useCoach.ts`
   - `src/components/CoachDetails/`

2. **Write Tests:**
   ```typescript
   // src/pages/__tests__/CoachProfile.test.tsx
   describe('CoachProfile', () => {
     it('renders loading state', ...);
     it('renders coach details', ...);
     it('handles error state', ...);
   });

   // src/hooks/__tests__/useCoach.test.ts
   describe('useCoach', () => {
     it('fetches coach data', ...);
     it('handles loading state', ...);
     it('handles errors', ...);
   });

   // e2e/coach-profile.spec.ts
   test('can view coach profile', ...);
   test('can edit coach profile', ...);
   test('shows error for invalid coach', ...);
   ```

3. **Run Tests:**
   ```bash
   npm run test:run
   # If fails: fix and retry
   npm run test:e2e
   # If fails: fix and retry
   ```

4. **Quality Check:**
   ```bash
   npm run build
   npm run lint
   ```

## Report Format

Upon completion, provide:

```markdown
## Implementation Complete

### Features Implemented
- [x] Feature 1: description
- [x] Feature 2: description

### Tests Created
- Unit tests: X tests across Y files
- Integration tests: X tests across Y files
- E2E tests: X tests across Y files

### Test Results
- Total: XX tests
- Passed: XX tests
- Failed: 0 tests

### Coverage
- Statements: XX%
- Branches: XX%
- Functions: XX%
- Lines: XX%

### Files Changed
[git diff --stat output]

### Self-Healing Actions
- Fixed: [description of any auto-fixed issues]
- Retried: X tests required fixes

### Quality Checks
- [x] TypeScript: No errors
- [x] Lint: No errors
- [x] Design audit: Passed
```

## Critical Rules

1. **NEVER** mark implementation complete with failing tests
2. **ALWAYS** write tests for new code
3. **ALWAYS** run the full test suite before completion
4. **ALWAYS** fix test failures, don't skip or delete tests
5. **NEVER** use `// @ts-ignore` or `eslint-disable` without justification
