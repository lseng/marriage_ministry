/**
 * E2E Tests for Password Sign-in
 * 
 * Tests the complete password authentication flow to ensure the 500 error is fixed
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Password Sign-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should successfully sign in with admin credentials', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard (not get 500 error)
    await expect(page).toHaveURL(/dashboard|coaches|couples/);
    
    // Should see user info or navigation
    await expect(page.getByText(/admin|dashboard/i)).toBeVisible();
  });

  test('should successfully sign in with coach credentials', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel(/email/i).fill(testUsers.coach.email);
    await page.getByLabel(/password/i).fill(testUsers.coach.password);

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard|coaches|couples/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in wrong credentials
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message (not 500 error)
    await expect(page.getByText(/invalid.*credentials|incorrect.*password/i)).toBeVisible();
    
    // Should still be on login page
    await expect(page).toHaveURL(/\//);
  });

  test('should not throw 500 error on authentication', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Monitor network requests for 500 errors
    let has500Error = false;
    page.on('response', (response) => {
      if (response.status() === 500) {
        has500Error = true;
      }
    });

    // Attempt sign in
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Should not have any 500 errors
    expect(has500Error).toBe(false);
    
    // Check console errors don't contain 500
    const has500InConsole = errors.some(err => err.includes('500'));
    expect(has500InConsole).toBe(false);
  });

  test('should load user profile after successful sign in', async ({ page }) => {
    // Sign in
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation
    await expect(page).not.toHaveURL('/');

    // Profile should be loaded (check for user-specific elements)
    // This validates that the profile was fetched successfully from the database
    await expect(page.getByText(testUsers.admin.email)).toBeVisible({ timeout: 10000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    // Sign in
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful sign in
    await expect(page).not.toHaveURL('/');

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page).not.toHaveURL('/');
    await expect(page.getByText(/admin|dashboard/i)).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    // Sign in first
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).not.toHaveURL('/');

    // Find and click sign out button
    await page.getByRole('button', { name: /sign out|logout/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/');
  });
});
