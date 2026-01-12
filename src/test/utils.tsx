import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

/**
 * Test Providers Wrapper
 * Wraps components with all necessary providers for testing
 */
interface TestProvidersProps {
  children: React.ReactNode;
}

function TestProviders({ children }: TestProvidersProps) {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
}

/**
 * Custom render function that wraps component with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { route = '/', ...renderOptions } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  const user = userEvent.setup();

  return {
    user,
    ...render(ui, {
      wrapper: TestProviders,
      ...renderOptions,
    }),
  };
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock data generators
 */
export const createMockCoach = (overrides = {}) => ({
  id: crypto.randomUUID(),
  user_id: crypto.randomUUID(),
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-123-4567',
  status: 'active' as const,
  assigned_couples_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockCouple = (overrides = {}) => ({
  id: crypto.randomUUID(),
  husband_first_name: 'Michael',
  husband_last_name: 'Smith',
  wife_first_name: 'Sarah',
  wife_last_name: 'Smith',
  email: 'smiths@example.com',
  phone: '555-987-6543',
  coach_id: null,
  status: 'active' as const,
  wedding_date: null,
  enrollment_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockAssignment = (overrides = {}) => ({
  id: crypto.randomUUID(),
  title: 'Week 1: Introduction',
  description: 'Getting to know each other',
  content: 'Assignment content here...',
  week_number: 1,
  due_date: null,
  created_by: crypto.randomUUID(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
