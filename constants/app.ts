// Application constants

export const APP_NAME = 'Marriage Ministry';
export const APP_VERSION = '0.1.0';

export const ROUTES = {
  HOME: '/',
  COACHES: '/coaches',
  COUPLES: '/couples',
  ASSIGNMENTS: '/assignments',
  SETTINGS: '/settings',
} as const;

export const COUPLE_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
} as const;

export const COACH_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const ASSIGNMENT_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  COACH: 'coach',
  COUPLE: 'couple',
} as const;
