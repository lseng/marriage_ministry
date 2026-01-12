/**
 * E2E Test Data Fixtures
 *
 * Consistent test data for Playwright tests
 */

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'User',
  },
  coach: {
    email: 'coach@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Coach',
  },
};

export const testCoaches = [
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@test.com',
    phone: '555-111-1111',
    status: 'active' as const,
  },
  {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@test.com',
    phone: '555-222-2222',
    status: 'active' as const,
  },
];

export const testCouples = [
  {
    husband_first_name: 'Michael',
    husband_last_name: 'Johnson',
    wife_first_name: 'Sarah',
    wife_last_name: 'Johnson',
    email: 'johnsons@test.com',
    phone: '555-333-3333',
    status: 'active' as const,
    wedding_date: '2024-06-15',
  },
  {
    husband_first_name: 'David',
    husband_last_name: 'Williams',
    wife_first_name: 'Emily',
    wife_last_name: 'Williams',
    email: 'williams@test.com',
    phone: '555-444-4444',
    status: 'active' as const,
    wedding_date: '2024-08-20',
  },
];

export const testAssignments = [
  {
    title: 'Week 1: Communication Foundations',
    description: 'Learn the basics of effective communication in marriage',
    content: `
## Overview
This week focuses on building strong communication foundations.

## Tasks
1. Read Chapter 1 of the workbook
2. Complete the communication styles assessment
3. Practice active listening exercise with your partner

## Discussion Questions
- What is your natural communication style?
- How does stress affect how you communicate?
    `.trim(),
    week_number: 1,
  },
  {
    title: 'Week 2: Conflict Resolution',
    description: 'Healthy approaches to handling disagreements',
    content: `
## Overview
This week covers conflict resolution strategies.

## Tasks
1. Read Chapter 2 of the workbook
2. Identify your conflict triggers
3. Practice the "pause and reflect" technique

## Discussion Questions
- What topics tend to cause conflict in your relationship?
- How do you typically respond to conflict?
    `.trim(),
    week_number: 2,
  },
];

/**
 * Generate unique test data with timestamps
 */
export function uniqueTestData() {
  const timestamp = Date.now();
  return {
    coach: {
      ...testCoaches[0],
      email: `test-coach-${timestamp}@test.com`,
    },
    couple: {
      ...testCouples[0],
      email: `test-couple-${timestamp}@test.com`,
    },
    assignment: {
      ...testAssignments[0],
      title: `Test Assignment ${timestamp}`,
    },
  };
}
