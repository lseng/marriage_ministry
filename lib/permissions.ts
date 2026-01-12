import type { UserRole } from '../types/database';

export interface Permission {
  canManageCoaches: boolean;
  canViewAllCoaches: boolean;
  canManageCouples: boolean;
  canViewAllCouples: boolean;
  canAssignCoaches: boolean;
  canCreateAssignments: boolean;
  canDistributeAssignments: boolean;
  canViewAllSubmissions: boolean;
  canReviewHomework: boolean;
  canSubmitHomework: boolean;
  canCreateFormTemplates: boolean;
}

const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    canManageCoaches: true,
    canViewAllCoaches: true,
    canManageCouples: true,
    canViewAllCouples: true,
    canAssignCoaches: true,
    canCreateAssignments: true,
    canDistributeAssignments: true,
    canViewAllSubmissions: true,
    canReviewHomework: true,
    canSubmitHomework: false,
    canCreateFormTemplates: true,
  },
  coach: {
    canManageCoaches: false,
    canViewAllCoaches: false,
    canManageCouples: false,
    canViewAllCouples: false,
    canAssignCoaches: false,
    canCreateAssignments: false,
    canDistributeAssignments: false,
    canViewAllSubmissions: false,
    canReviewHomework: true,
    canSubmitHomework: false,
    canCreateFormTemplates: false,
  },
  couple: {
    canManageCoaches: false,
    canViewAllCoaches: false,
    canManageCouples: false,
    canViewAllCouples: false,
    canAssignCoaches: false,
    canCreateAssignments: false,
    canDistributeAssignments: false,
    canViewAllSubmissions: false,
    canReviewHomework: false,
    canSubmitHomework: true,
    canCreateFormTemplates: false,
  },
};

export function getPermissions(role: UserRole | null): Permission {
  if (!role) {
    return {
      canManageCoaches: false,
      canViewAllCoaches: false,
      canManageCouples: false,
      canViewAllCouples: false,
      canAssignCoaches: false,
      canCreateAssignments: false,
      canDistributeAssignments: false,
      canViewAllSubmissions: false,
      canReviewHomework: false,
      canSubmitHomework: false,
      canCreateFormTemplates: false,
    };
  }
  return rolePermissions[role];
}

export function hasPermission(
  role: UserRole | null,
  permission: keyof Permission
): boolean {
  return getPermissions(role)[permission];
}

export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin';
}

export function isCoach(role: UserRole | null): boolean {
  return role === 'coach';
}

export function isCouple(role: UserRole | null): boolean {
  return role === 'couple';
}

export function canAccessRoute(
  role: UserRole | null,
  route: string
): boolean {
  if (!role) return false;

  const routePermissions: Record<string, UserRole[]> = {
    '/': ['admin', 'coach', 'couple'],
    '/dashboard': ['admin', 'coach', 'couple'],
    '/coaches': ['admin'],
    '/couples': ['admin', 'coach'],
    '/assignments': ['admin', 'coach', 'couple'],
    '/forms': ['admin'],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return true; // Unknown routes are accessible by default

  return allowedRoles.includes(role);
}
