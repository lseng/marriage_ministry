import { Page, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * E2E Test Helper Functions
 */

/**
 * Login as a test user
 */
export async function login(page: Page, userType: keyof typeof testUsers = 'admin') {
  const user = testUsers[userType];

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to dashboard
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page).toHaveURL('/login');
}

/**
 * Navigate to a specific section
 */
export async function navigateTo(page: Page, section: 'dashboard' | 'coaches' | 'couples' | 'assignments') {
  await page.getByRole('link', { name: new RegExp(section, 'i') }).click();
  await expect(page).toHaveURL(`/${section}`);
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Fill a form field by label
 */
export async function fillField(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(page: Page, label: string, value: string) {
  await page.getByLabel(label).selectOption(value);
}

/**
 * Click a button by name
 */
export async function clickButton(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name }).click();
}

/**
 * Assert a toast notification appears
 */
export async function expectToast(page: Page, message: string | RegExp) {
  await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
}

/**
 * Assert table has specific number of rows
 */
export async function expectTableRowCount(page: Page, count: number) {
  await expect(page.getByRole('row')).toHaveCount(count + 1); // +1 for header
}

/**
 * Get table row by text content
 */
export function getTableRowByText(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Assert page has no accessibility violations (requires @axe-core/playwright)
 */
export async function checkA11y(_page: Page) {
  // Placeholder for accessibility testing
  // Install @axe-core/playwright and uncomment:
  // const results = await new AxeBuilder({ page }).analyze();
  // expect(results.violations).toEqual([]);
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(response =>
    (typeof urlPattern === 'string'
      ? response.url().includes(urlPattern)
      : urlPattern.test(response.url())) &&
    response.status() === 200
  );
}

/**
 * Seed test data via Supabase (for isolated test runs)
 */
export async function seedTestData(page: Page, data: Record<string, unknown>) {
  // This would typically call a test API endpoint or directly seed via Supabase client
  // For now, it's a placeholder
  console.log('Seeding test data:', data);
}

/**
 * Clean up test data after test
 */
export async function cleanupTestData(page: Page, ids: string[]) {
  // This would typically call a cleanup API endpoint
  console.log('Cleaning up test data:', ids);
}
