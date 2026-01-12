# E2E Test Generation Command

Generate comprehensive Playwright end-to-end tests for a feature or user flow.

## Input
$ARGUMENTS - Feature name, user story, or flow description

## Instructions

1. **Analyze the User Flow**
   - Identify all steps in the user journey
   - Map out all possible paths (success, failure, edge cases)
   - Identify required test data and preconditions
   - Note all assertions needed at each step

2. **Create Test Structure**
   - Group related tests in `test.describe` blocks
   - Use `test.beforeEach` for common setup
   - Use `test.afterEach` for cleanup
   - Create fixtures for reusable test data

3. **Test Coverage Requirements**
   - **Happy Path**: Complete successful flow
   - **Validation Errors**: Invalid inputs, missing fields
   - **Edge Cases**: Empty states, max limits, special characters
   - **Error Handling**: Network failures, server errors
   - **Responsive**: Test on desktop, tablet, mobile viewports
   - **Accessibility**: Keyboard navigation, screen reader compatibility

4. **Best Practices**
   - Use page object pattern for complex pages
   - Wait for network requests, not arbitrary timeouts
   - Take screenshots on failure
   - Use meaningful test names that describe the scenario
   - Isolate tests with unique test data

5. **Write the Tests**
   - Save to `e2e/[feature].spec.ts`
   - Use helpers from `e2e/utils/helpers.ts`
   - Use fixtures from `e2e/fixtures/test-data.ts`

## Output Format

Create the E2E test file with:
- Complete test suite covering all scenarios
- Page objects if needed
- Updated fixtures if new test data required

## Example

```typescript
// e2e/coach-management.spec.ts
import { test, expect } from '@playwright/test';
import { login, navigateTo, expectToast, waitForApiResponse } from './utils/helpers';
import { uniqueTestData } from './fixtures/test-data';

test.describe('Coach Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await navigateTo(page, 'coaches');
  });

  test.describe('Add Coach Flow', () => {
    test('successfully adds a new coach', async ({ page }) => {
      const { coach } = uniqueTestData();

      // Open add modal
      await page.getByRole('button', { name: /add coach/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill form
      await page.getByLabel(/first name/i).fill(coach.first_name);
      await page.getByLabel(/last name/i).fill(coach.last_name);
      await page.getByLabel(/email/i).fill(coach.email);
      await page.getByLabel(/phone/i).fill(coach.phone);

      // Submit and verify
      const responsePromise = waitForApiResponse(page, '/rest/v1/coaches');
      await page.getByRole('button', { name: /save/i }).click();
      await responsePromise;

      // Verify success
      await expectToast(page, /coach added/i);
      await expect(page.getByText(coach.email)).toBeVisible();
    });

    test('shows validation errors for invalid input', async ({ page }) => {
      await page.getByRole('button', { name: /add coach/i }).click();

      // Submit without filling required fields
      await page.getByRole('button', { name: /save/i }).click();

      // Check for validation messages
      await expect(page.getByText(/first name is required/i)).toBeVisible();
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('validates email format', async ({ page }) => {
      await page.getByRole('button', { name: /add coach/i }).click();

      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });
  });

  test.describe('Edit Coach Flow', () => {
    test('can edit existing coach', async ({ page }) => {
      // Click edit on first coach
      await page.getByRole('row').nth(1).getByRole('button', { name: /edit/i }).click();

      // Modify name
      const newName = `Updated-${Date.now()}`;
      await page.getByLabel(/first name/i).clear();
      await page.getByLabel(/first name/i).fill(newName);

      // Save
      await page.getByRole('button', { name: /save/i }).click();
      await expectToast(page, /updated/i);

      // Verify change persisted
      await expect(page.getByText(newName)).toBeVisible();
    });
  });

  test.describe('Delete Coach Flow', () => {
    test('confirms before deleting', async ({ page }) => {
      await page.getByRole('row').nth(1).getByRole('button', { name: /delete/i }).click();

      // Check confirmation dialog
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expect(page.getByText(/are you sure/i)).toBeVisible();
    });

    test('can cancel deletion', async ({ page }) => {
      const coachName = await page.getByRole('row').nth(1).textContent();

      await page.getByRole('row').nth(1).getByRole('button', { name: /delete/i }).click();
      await page.getByRole('button', { name: /cancel/i }).click();

      // Coach still exists
      await expect(page.getByText(coachName!.split(' ')[0])).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('table converts to cards on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Table should not be visible
      await expect(page.getByRole('table')).not.toBeVisible();

      // Cards should be visible instead
      await expect(page.getByRole('article').first()).toBeVisible();
    });
  });
});
```
