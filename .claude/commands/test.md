# Test Generation Command

Generate comprehensive tests for the specified file or feature.

## Input
$ARGUMENTS - File path, component name, or feature description to test

## Instructions

1. **Analyze the Target**
   - Read the file/component to understand its functionality
   - Identify all public APIs, props, states, and side effects
   - Map out dependencies and external integrations

2. **Identify Test Cases**
   - Happy path scenarios
   - Edge cases (empty states, max values, null/undefined)
   - Error conditions and error handling
   - Boundary conditions
   - User interaction flows
   - Async operations and loading states

3. **Generate Unit Tests** (Vitest + React Testing Library)
   - Create test file at `src/**/__tests__/[name].test.tsx` or `src/**/[name].test.tsx`
   - Test each function/method individually
   - Mock external dependencies (Supabase, APIs)
   - Use test utilities from `src/test/utils.tsx`
   - Follow AAA pattern: Arrange, Act, Assert

4. **Generate Integration Tests** (if applicable)
   - Test component interactions
   - Test data flow between components
   - Test with realistic mock data

5. **Generate E2E Tests** (Playwright)
   - Create test file at `e2e/[feature].spec.ts`
   - Test complete user workflows
   - Test across different viewports
   - Use helpers from `e2e/utils/helpers.ts`
   - Include visual assertions

6. **Test Quality Checklist**
   - [ ] Tests are deterministic (no flaky tests)
   - [ ] Tests are independent (no shared state)
   - [ ] Tests have descriptive names
   - [ ] Tests cover error scenarios
   - [ ] Tests use proper async/await
   - [ ] Mocks are properly cleaned up

## Output Format

Create the test files and report:
- Number of test cases generated
- Coverage areas addressed
- Any gaps or manual testing recommendations

## Example

For a component `src/components/CoachCard.tsx`:

```typescript
// src/components/__tests__/CoachCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { CoachCard } from '../CoachCard';
import { createMockCoach } from '@/test/utils';

describe('CoachCard', () => {
  it('renders coach name correctly', () => {
    const coach = createMockCoach({ first_name: 'John', last_name: 'Doe' });
    render(<CoachCard coach={coach} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays assigned couples count', () => {
    const coach = createMockCoach({ assigned_couples_count: 5 });
    render(<CoachCard coach={coach} />);
    expect(screen.getByText(/5 couples/i)).toBeInTheDocument();
  });

  it('handles click event', async () => {
    const onClick = vi.fn();
    const coach = createMockCoach();
    const { user } = render(<CoachCard coach={coach} onClick={onClick} />);

    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith(coach);
  });

  it('shows inactive badge when coach is inactive', () => {
    const coach = createMockCoach({ status: 'inactive' });
    render(<CoachCard coach={coach} />);
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });
});
```
