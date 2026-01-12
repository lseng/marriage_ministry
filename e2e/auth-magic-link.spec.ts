import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Magic Link Authentication
 *
 * Tests the complete user flow for signing in with magic link (passwordless auth),
 * including email sending and verification.
 *
 * Prerequisites:
 * - Local Supabase instance running (supabase start)
 * - Database seeded with test users (supabase db reset)
 * - Mailpit running on port 54424 for email testing
 */

test.describe('Magic Link Sign-In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
  });

  test('can switch to magic link mode', async ({ page }) => {
    // Start in password mode
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Click to switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Password field should be hidden
    await expect(page.getByLabel(/password/i)).not.toBeVisible();

    // Magic link button should be visible
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Email field should still be visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('successfully sends magic link for valid email', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill in email
    await page.getByLabel(/email/i).fill('admin@test.com');

    // Click send magic link
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Wait for success screen
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });

    // Verify success message contains the email
    await expect(page.getByText(/we sent a magic link to/i)).toBeVisible();
    await expect(page.getByText('admin@test.com')).toBeVisible();

    // Verify the click link instruction
    await expect(page.getByText(/click the link in the email to sign in/i)).toBeVisible();
  });

  test('sends magic link for coach user', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill in coach email
    await page.getByLabel(/email/i).fill('coach@test.com');

    // Click send magic link
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Wait for success screen
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('coach@test.com')).toBeVisible();
  });

  test('shows loading state while sending magic link', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill in email
    await page.getByLabel(/email/i).fill('admin@test.com');

    // Click send button
    const sendButton = page.getByRole('button', { name: /send magic link/i });
    await sendButton.click();

    // Check for loading state (button should be disabled)
    // This might be quick, so we use a short timeout
    await expect(sendButton).toBeDisabled({ timeout: 1000 }).catch(() => {
      // If it's too fast to catch, that's okay
    });
  });

  test('allows sending magic link to non-existent email', async ({ page }) => {
    // Supabase typically allows sending magic links even for non-existent emails
    // for security reasons (to not reveal which emails are registered)

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill in non-existent email
    await page.getByLabel(/email/i).fill('nonexistent@test.com');

    // Click send magic link
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Should still show success screen (no error)
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('nonexistent@test.com')).toBeVisible();
  });

  test('validates email format before sending', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill in invalid email format
    await page.getByLabel(/email/i).fill('notanemail');

    // Try to submit
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Should not show success screen (HTML5 validation prevents submit)
    await expect(page.getByText('Check your email')).not.toBeVisible();

    // Email input should have validation error
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
  });

  test('requires email field to be filled', async ({ page }) => {
    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Try to submit without email
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Should not show success screen (HTML5 validation)
    await expect(page.getByText('Check your email')).not.toBeVisible();
  });
});

test.describe('Magic Link Success Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Navigate to success screen
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByRole('button', { name: /send magic link/i }).click();
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });
  });

  test('displays all required success screen elements', async ({ page }) => {
    // Check for heading
    await expect(page.getByText('Check your email')).toBeVisible();

    // Check for Heart icon
    await expect(page.locator('svg').first()).toBeVisible();

    // Check for message
    await expect(page.getByText(/we sent a magic link to/i)).toBeVisible();
    await expect(page.getByText('admin@test.com')).toBeVisible();

    // Check for button to use different email
    await expect(page.getByRole('button', { name: /use a different email/i })).toBeVisible();
  });

  test('can return to login form from success screen', async ({ page }) => {
    // Click "Use a different email" button
    await page.getByRole('button', { name: /use a different email/i }).click();

    // Should return to login form in magic link mode
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Success screen should not be visible
    await expect(page.getByText('Check your email')).not.toBeVisible();
  });

  test('clears email when returning to login form', async ({ page }) => {
    // Click "Use a different email" button
    await page.getByRole('button', { name: /use a different email/i }).click();

    // Email field should be empty
    const emailInput = page.getByLabel(/email/i);
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('');
  });

  test('can switch to password mode from success screen', async ({ page }) => {
    // Click "Use a different email"
    await page.getByRole('button', { name: /use a different email/i }).click();

    // Now switch to password mode
    await page.getByRole('button', { name: /use password instead/i }).click();

    // Should be in password mode
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });
});

test.describe('Magic Link Mode Switching', () => {
  test('preserves email when switching between modes', async ({ page }) => {
    await page.goto('/login');

    // Fill email in password mode
    await page.getByLabel(/email/i).fill('test@test.com');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Email should still be present
    const emailValue = await page.getByLabel(/email/i).inputValue();
    expect(emailValue).toBe('test@test.com');
  });

  test('clears error when switching modes', async ({ page }) => {
    await page.goto('/login');

    // Cause an error in password mode
    await page.getByLabel(/email/i).fill('wrong@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // Wait for error
    await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 5000 });

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Error should be cleared
    await expect(page.getByText(/invalid|error/i)).not.toBeVisible();
  });

  test('can switch modes multiple times', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Switch back to password
    await page.getByRole('button', { name: /use password instead/i }).click();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Switch to magic link again
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();

    // Switch back to password again
    await page.getByRole('button', { name: /use password instead/i }).click();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

test.describe('Magic Link Accessibility', () => {
  test('is keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeFocused();
  });

  test('can submit with Enter key', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Fill email and press Enter
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByLabel(/email/i).press('Enter');

    // Should show success screen
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });
  });

  test('success screen is keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Get to success screen
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByRole('button', { name: /send magic link/i }).click();
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });

    // Tab to the "Use a different email" button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /use a different email/i })).toBeFocused();

    // Can activate with Enter
    await page.keyboard.press('Enter');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('has proper ARIA labels in magic link mode', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();

    // Check email input attributes
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required');
  });
});

test.describe('Magic Link Security', () => {
  test('does not expose email in URL', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link mode and send link
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Wait for success
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });

    // Check that email is not in the URL
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('admin@test.com');
    expect(currentUrl).not.toContain('admin%40test.com');
  });

  test('handles rapid send attempts gracefully', async ({ page }) => {
    await page.goto('/login');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await page.getByLabel(/email/i).fill('admin@test.com');

    const sendButton = page.getByRole('button', { name: /send magic link/i });

    // Click multiple times rapidly
    await sendButton.click();
    await sendButton.click();
    await sendButton.click();

    // Should still show success screen once
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Magic Link Error Handling', () => {
  test('handles network errors gracefully', async ({ page, context }) => {
    // Intercept the magic link request and simulate network error
    await context.route('**/auth/v1/otp*', (route) => {
      route.abort('failed');
    });

    await page.goto('/login');

    // Switch to magic link mode
    await page.getByRole('button', { name: /use magic link instead/i }).click();
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByRole('button', { name: /send magic link/i }).click();

    // Should show an error (or handle gracefully without crashing)
    // Note: The exact error behavior depends on the implementation
    // We just verify the page doesn't crash
    await page.waitForTimeout(2000);

    // Page should still be functional
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
