# Validate Command (Self-Healing Test Runner)

Run all tests with automatic fix attempts for failures. This is the final validation step before any PR or commit.

## Input
$ARGUMENTS - Optional: "quick" for fast validation, "full" for comprehensive, or specific test type

## Validation Levels

| Level | Unit Tests | E2E Tests | Build | Lint | Design Audit |
|-------|------------|-----------|-------|------|--------------|
| quick | ✓ | - | ✓ | ✓ | - |
| full | ✓ | ✓ | ✓ | ✓ | ✓ |
| unit | ✓ | - | - | - | - |
| e2e | - | ✓ | - | - | - |

Default: `full`

## Self-Healing Algorithm

```
for each failing_test in test_results:
    attempts = 0
    while test_fails and attempts < 3:
        error = analyze_error(failing_test)
        fix = determine_fix(error)
        apply_fix(fix)
        rerun_test(failing_test)
        attempts++

    if still_failing:
        add_to_manual_review(failing_test)
```

## Error Analysis Patterns

### Pattern 1: Selector Not Found
```
Error: Unable to find element with role "button" and name "Submit"
```
**Diagnosis:** UI element changed or doesn't exist
**Fix Strategy:**
1. Search codebase for the element
2. Find current text/role
3. Update test selector

### Pattern 2: Assertion Mismatch
```
Expected: 5
Received: 3
```
**Diagnosis:** Either test expectation or implementation is wrong
**Fix Strategy:**
1. Check if implementation recently changed
2. Verify test data/mocks are correct
3. Update assertion or fix implementation

### Pattern 3: Timeout
```
Error: Timeout of 5000ms exceeded
```
**Diagnosis:** Async operation not completing
**Fix Strategy:**
1. Increase timeout if reasonable
2. Check for missing awaits
3. Verify mock is resolving

### Pattern 4: Type Error
```
TypeError: Cannot read property 'x' of undefined
```
**Diagnosis:** Null/undefined value accessed
**Fix Strategy:**
1. Add null check in implementation
2. Fix mock data to include property
3. Add optional chaining

### Pattern 5: Network Error
```
Error: fetch failed
```
**Diagnosis:** API mock not configured
**Fix Strategy:**
1. Add MSW handler for the endpoint
2. Check test setup imports mock handlers

## Execution Steps

### Step 1: Run TypeScript Check
```bash
npx tsc --noEmit
```
If fails: Fix type errors before proceeding

### Step 2: Run Linter
```bash
npm run lint
```
If fails: Auto-fix with `npm run lint -- --fix`

### Step 3: Run Unit Tests
```bash
npm run test:run -- --reporter=json --outputFile=test-results/unit.json
```

### Step 4: Analyze Unit Test Failures
For each failure:
1. Read the test file
2. Read the implementation file
3. Analyze error message
4. Attempt fix
5. Rerun specific test

### Step 5: Run E2E Tests (if full validation)
```bash
npm run test:e2e -- --reporter=json
```

### Step 6: Analyze E2E Failures
For each failure:
1. Read the spec file
2. Check screenshots/traces
3. Analyze error
4. Attempt fix
5. Rerun specific test

### Step 7: Design Audit (if full validation)
```bash
# Run on changed files
git diff --name-only | grep -E '\.(tsx|ts)$' | xargs -I {} /design_audit {}
```

## Output Report

```markdown
# Validation Report

**Timestamp:** [datetime]
**Level:** [quick|full]
**Duration:** [time]

## Summary
| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅ Pass | No errors |
| Lint | ✅ Pass | 0 warnings |
| Unit Tests | ✅ Pass | 45/45 passed |
| E2E Tests | ✅ Pass | 23/23 passed |
| Design Audit | ⚠️ Warnings | 2 minor issues |

## Self-Healing Actions

### Successfully Fixed (3)
1. **test: CoachCard renders name**
   - Error: Expected "John Doe" but got "Doe, John"
   - Fix: Updated assertion to match new name format
   - File: `src/components/__tests__/CoachCard.test.tsx:23`

2. **e2e: can add new coach**
   - Error: Timeout waiting for success toast
   - Fix: Increased timeout from 5s to 10s
   - File: `e2e/coach.spec.ts:45`

3. **test: useCoach returns data**
   - Error: Mock not returning expected shape
   - Fix: Updated mock to include new `phone` field
   - File: `src/test/mocks/supabase.ts:34`

### Manual Review Required (1)
1. **e2e: login with invalid credentials**
   - Error: Expected error message not appearing
   - Attempts: 3
   - Reason: Unclear if test or implementation issue
   - Action Required: Review auth error handling

## Coverage Report
| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 78% | 70% | ✅ |
| Branches | 72% | 70% | ✅ |
| Functions | 81% | 70% | ✅ |
| Lines | 77% | 70% | ✅ |

## Files Modified During Self-Healing
- `src/components/__tests__/CoachCard.test.tsx` (+2, -2)
- `e2e/coach.spec.ts` (+1, -1)
- `src/test/mocks/supabase.ts` (+5, -1)

## Recommendations
1. Consider adding retry logic to flaky E2E test
2. Update mock data to stay in sync with schema
3. Add missing test for edge case in CoupleForm

## Ready for PR: ✅ YES
All checks pass. Code is ready for pull request.
```

## Exit Codes

- `0`: All validations passed
- `1`: Failures that couldn't be auto-fixed
- `2`: Critical errors (build failed, etc.)

## Integration with ADW

This command is automatically called by:
- `/implement` - After implementation complete
- `/commit` - Before creating commit
- `/pull_request` - Before creating PR

Can be disabled with `--skip-validation` flag (not recommended).
