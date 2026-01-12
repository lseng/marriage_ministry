# Run Tests Command

Execute tests and handle failures with automatic fixes.

## Input
$ARGUMENTS - Test type (all, unit, e2e) and optional file path

## Instructions

1. **Parse Arguments**
   - If no args: run all tests
   - If "unit" or "e2e": run specific test type
   - If file path: run tests for that specific file

2. **Execute Tests**

   For unit tests:
   ```bash
   npm run test:run
   # or for specific file:
   npm run test:run -- path/to/file.test.ts
   ```

   For e2e tests:
   ```bash
   npm run test:e2e
   # or for specific file:
   npm run test:e2e -- e2e/feature.spec.ts
   ```

   For all tests:
   ```bash
   npm run test:all
   ```

3. **Analyze Results**
   - Parse test output for failures
   - Identify failing test names and error messages
   - Categorize failures:
     - **Assertion failures**: Expected vs actual mismatch
     - **Runtime errors**: Exceptions, undefined access
     - **Timeout failures**: Async operations not completing
     - **Setup failures**: Missing mocks, environment issues

4. **Self-Healing Loop** (if failures detected)

   For each failing test:

   a. **Diagnose the issue**
      - Read the failing test code
      - Read the implementation code being tested
      - Analyze the error message and stack trace

   b. **Determine fix location**
      - Is the test wrong? (incorrect assertion, outdated expectation)
      - Is the implementation wrong? (bug in code)
      - Is the setup wrong? (missing mock, wrong fixture)

   c. **Apply the fix**
      - Edit the appropriate file
      - Keep changes minimal and focused

   d. **Re-run the specific test**
      ```bash
      npm run test:run -- --testNamePattern="failing test name"
      ```

   e. **Verify fix**
      - If still failing, try alternative fix
      - Maximum 3 attempts per test

5. **Report Results**

   Output format:
   ```
   Test Results Summary
   ====================
   Total:    XX tests
   Passed:   XX tests
   Failed:   XX tests
   Fixed:    XX tests (auto-healed)
   Skipped:  XX tests

   Coverage:
   - Statements: XX%
   - Branches:   XX%
   - Functions:  XX%
   - Lines:      XX%

   Remaining Failures:
   - test name: reason it couldn't be fixed

   Recommendations:
   - Suggested manual fixes or improvements
   ```

## Self-Healing Examples

### Example 1: Outdated Selector
```
Error: Unable to find element with text: "Submit"
```
Fix: Update test to use current button text:
```typescript
// Before
await page.getByRole('button', { name: 'Submit' }).click();
// After
await page.getByRole('button', { name: 'Save' }).click();
```

### Example 2: Async Timing
```
Error: Timeout waiting for element
```
Fix: Add proper wait:
```typescript
// Before
expect(page.getByText('Success')).toBeVisible();
// After
await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
```

### Example 3: Mock Data Mismatch
```
Error: Expected 5 but received 3
```
Fix: Update mock data to match test expectation:
```typescript
// Before
const mockData = createMockCoach({ assigned_couples_count: 3 });
// After
const mockData = createMockCoach({ assigned_couples_count: 5 });
```

## Important Rules

1. **Never skip tests** - Always try to fix them
2. **Minimal changes** - Fix only what's broken
3. **Log all changes** - Report what was modified
4. **Preserve intent** - Don't change what the test is testing
5. **Escalate if stuck** - After 3 attempts, report as needing manual intervention
