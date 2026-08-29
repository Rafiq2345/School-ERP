import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  requirePermission,
  canAccessPortal,
  PERMISSION_ACTIONS,
} from '../src/lib/auth/permission';
import { AuthenticatedUser } from '../src/lib/types';
import { ForbiddenError, UnauthorizedError } from '../src/lib/errors/app-error';

describe('10-Action RBAC & Permission Engine', () => {
  const teacherUser: AuthenticatedUser = {
    id: 'u1',
    tenantId: 't1',
    username: 'teacher1',
    email: 'teacher1@school.com',
    userType: 'TEACHER',
    preferredLocale: 'en',
    roles: ['TEACHER'],
    permissions: ['ATTENDANCE:VIEW', 'ATTENDANCE:CREATE', 'EXAMS:VIEW'],
  };

  const adminUser: AuthenticatedUser = {
    id: 'u2',
    tenantId: 't1',
    username: 'admin1',
    email: 'admin@school.com',
    userType: 'ADMIN',
    preferredLocale: 'en',
    roles: ['SUPER_ADMIN'],
    permissions: ['*'],
  };

  it('should support all 10 core permission actions', () => {
    expect(PERMISSION_ACTIONS).toEqual([
      'VIEW',
      'CREATE',
      'EDIT',
      'DELETE',
      'APPROVE',
      'PRINT',
      'EXPORT',
      'PUBLISH',
      'UNPUBLISH',
      'REVERSE',
    ]);
  });

  it('should authorize granted permissions and deny ungranted permissions', () => {
    expect(hasPermission(teacherUser, 'ATTENDANCE', 'VIEW')).toBe(true);
    expect(hasPermission(teacherUser, 'ATTENDANCE', 'CREATE')).toBe(true);
    expect(hasPermission(teacherUser, 'ATTENDANCE', 'DELETE')).toBe(false);
    expect(hasPermission(teacherUser, 'BILLING', 'REVERSE')).toBe(false);
  });

  it('should allow super admin full permissions within tenant', () => {
    expect(hasPermission(adminUser, 'BILLING', 'REVERSE')).toBe(true);
    expect(hasPermission(adminUser, 'PUBLISHING', 'PUBLISH')).toBe(true);
  });

  it('should throw ForbiddenError when requirePermission fails', () => {
    expect(() => requirePermission(teacherUser, 'BILLING', 'REVERSE')).toThrow(ForbiddenError);
    expect(() => requirePermission(teacherUser, 'ATTENDANCE', 'VIEW')).not.toThrow();
  });

  it('should throw UnauthorizedError when user is null', () => {
    expect(() => requirePermission(null, 'ATTENDANCE', 'VIEW')).toThrow(UnauthorizedError);
  });

  it('should gate portal access based on userType', () => {
    expect(canAccessPortal(adminUser, 'admin')).toBe(true);
    expect(canAccessPortal(teacherUser, 'admin')).toBe(false);
    expect(canAccessPortal(teacherUser, 'teacher')).toBe(true);
    expect(canAccessPortal(teacherUser, 'parent')).toBe(false);
  });
});
