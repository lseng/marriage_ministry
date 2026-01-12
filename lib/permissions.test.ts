import { describe, it, expect } from 'vitest';
import { getPermissions, hasPermission, isAdmin, isCoach, isCouple, canAccessRoute } from './permissions';

describe('permissions', () => {
  describe('getPermissions', () => {
    it('should return all permissions for admin role', () => {
      const permissions = getPermissions('admin');

      expect(permissions.canManageCoaches).toBe(true);
      expect(permissions.canViewAllCoaches).toBe(true);
      expect(permissions.canManageCouples).toBe(true);
      expect(permissions.canViewAllCouples).toBe(true);
      expect(permissions.canAssignCoaches).toBe(true);
      expect(permissions.canCreateAssignments).toBe(true);
      expect(permissions.canDistributeAssignments).toBe(true);
      expect(permissions.canViewAllSubmissions).toBe(true);
      expect(permissions.canReviewHomework).toBe(true);
      expect(permissions.canSubmitHomework).toBe(false);
      expect(permissions.canCreateFormTemplates).toBe(true);
    });

    it('should return coach permissions for coach role', () => {
      const permissions = getPermissions('coach');

      expect(permissions.canManageCoaches).toBe(false);
      expect(permissions.canViewAllCoaches).toBe(false);
      expect(permissions.canViewAllCouples).toBe(false);
      expect(permissions.canManageCouples).toBe(false);
      expect(permissions.canAssignCoaches).toBe(false);
      expect(permissions.canCreateAssignments).toBe(false);
      expect(permissions.canDistributeAssignments).toBe(false);
      expect(permissions.canViewAllSubmissions).toBe(false);
      expect(permissions.canReviewHomework).toBe(true);
      expect(permissions.canSubmitHomework).toBe(false);
      expect(permissions.canCreateFormTemplates).toBe(false);
    });

    it('should return couple permissions for couple role', () => {
      const permissions = getPermissions('couple');

      expect(permissions.canManageCoaches).toBe(false);
      expect(permissions.canViewAllCoaches).toBe(false);
      expect(permissions.canViewAllCouples).toBe(false);
      expect(permissions.canManageCouples).toBe(false);
      expect(permissions.canAssignCoaches).toBe(false);
      expect(permissions.canCreateAssignments).toBe(false);
      expect(permissions.canDistributeAssignments).toBe(false);
      expect(permissions.canViewAllSubmissions).toBe(false);
      expect(permissions.canReviewHomework).toBe(false);
      expect(permissions.canSubmitHomework).toBe(true);
      expect(permissions.canCreateFormTemplates).toBe(false);
    });

    it('should return no permissions for null role', () => {
      const permissions = getPermissions(null);

      expect(permissions.canManageCoaches).toBe(false);
      expect(permissions.canViewAllCouples).toBe(false);
      expect(permissions.canManageCouples).toBe(false);
      expect(permissions.canSubmitHomework).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true when admin has permission', () => {
      expect(hasPermission('admin', 'canManageCoaches')).toBe(true);
      expect(hasPermission('admin', 'canCreateAssignments')).toBe(true);
    });

    it('should return false when coach lacks permission', () => {
      expect(hasPermission('coach', 'canManageCoaches')).toBe(false);
      expect(hasPermission('coach', 'canCreateAssignments')).toBe(false);
    });

    it('should return true when coach has permission', () => {
      expect(hasPermission('coach', 'canReviewHomework')).toBe(true);
    });

    it('should return true when couple has permission', () => {
      expect(hasPermission('couple', 'canSubmitHomework')).toBe(true);
    });

    it('should return false when couple lacks permission', () => {
      expect(hasPermission('couple', 'canReviewHomework')).toBe(false);
      expect(hasPermission('couple', 'canManageCoaches')).toBe(false);
    });

    it('should return false for null role', () => {
      expect(hasPermission(null, 'canManageCoaches')).toBe(false);
    });
  });

  describe('role checks', () => {
    it('should identify admin role', () => {
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('coach')).toBe(false);
      expect(isAdmin('couple')).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });

    it('should identify coach role', () => {
      expect(isCoach('coach')).toBe(true);
      expect(isCoach('admin')).toBe(false);
      expect(isCoach('couple')).toBe(false);
      expect(isCoach(null)).toBe(false);
    });

    it('should identify couple role', () => {
      expect(isCouple('couple')).toBe(true);
      expect(isCouple('admin')).toBe(false);
      expect(isCouple('coach')).toBe(false);
      expect(isCouple(null)).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('should allow admin to access all routes', () => {
      expect(canAccessRoute('admin', '/')).toBe(true);
      expect(canAccessRoute('admin', '/coaches')).toBe(true);
      expect(canAccessRoute('admin', '/couples')).toBe(true);
      expect(canAccessRoute('admin', '/forms')).toBe(true);
    });

    it('should restrict coach access', () => {
      expect(canAccessRoute('coach', '/')).toBe(true);
      expect(canAccessRoute('coach', '/coaches')).toBe(false);
      expect(canAccessRoute('coach', '/couples')).toBe(true);
      expect(canAccessRoute('coach', '/forms')).toBe(false);
    });

    it('should restrict couple access', () => {
      expect(canAccessRoute('couple', '/')).toBe(true);
      expect(canAccessRoute('couple', '/coaches')).toBe(false);
      expect(canAccessRoute('couple', '/couples')).toBe(false);
      expect(canAccessRoute('couple', '/assignments')).toBe(true);
    });

    it('should deny access for null role', () => {
      expect(canAccessRoute(null, '/')).toBe(false);
      expect(canAccessRoute(null, '/coaches')).toBe(false);
    });

    it('should allow access to unknown routes by default', () => {
      expect(canAccessRoute('admin', '/unknown')).toBe(true);
      expect(canAccessRoute('coach', '/unknown')).toBe(true);
    });
  });
});
