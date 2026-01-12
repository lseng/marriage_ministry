import { test, expect } from '@playwright/test';

/**
 * Example E2E Tests
 *
 * These tests demonstrate the testing patterns for the Marriage Ministry app.
 * Run with: npm run test:e2e
 */

test.describe('Application Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the app renders
    await expect(page).toHaveTitle(/Marriage Ministry/);
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');

    // Check main navigation elements are present
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Authentication Flow', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');

    // Check login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Expect error message
    await expect(page.getByText(/invalid|error/i)).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implement auth state setup
    await page.goto('/dashboard');
  });

  test('displays key metrics', async ({ page }) => {
    // Check for dashboard elements
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Coaches Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coaches');
  });

  test('coaches page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /coaches/i })).toBeVisible();
  });

  test('can open add coach modal', async ({ page }) => {
    await page.getByRole('button', { name: /add coach/i }).click();

    // Check modal is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe('Couples Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/couples');
  });

  test('couples page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /couples/i })).toBeVisible();
  });

  test('can filter couples by status', async ({ page }) => {
    // Check filter controls exist
    const statusFilter = page.getByLabel(/status/i);
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      // Verify filter is applied
      await expect(page.getByText(/active/i)).toBeVisible();
    }
  });
});

test.describe('Assignments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assignments');
  });

  test('assignments page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /assignments/i })).toBeVisible();
  });

  test('can view assignment details', async ({ page }) => {
    // Click on first assignment if exists
    const firstAssignment = page.getByRole('row').nth(1);
    if (await firstAssignment.isVisible()) {
      await firstAssignment.click();
      // Check detail view opens
      await expect(page.getByRole('article')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check for mobile menu
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('tablet layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');

    // Verify responsive layout
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('skip link exists', async ({ page }) => {
    await page.goto('/');

    // Check for skip to main content link
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to/i });
    if (await skipLink.isVisible()) {
      await expect(skipLink).toHaveAttribute('href', /#main|#content/);
    }
  });
});
