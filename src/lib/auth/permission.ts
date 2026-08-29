import { AuthenticatedUser, ModuleCode, PermissionAction } from '../types';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';

/**
 * Standard 10 Actions supported across all School ERP modules
 */
export const PERMISSION_ACTIONS: PermissionAction[] = [
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
];

/**
 * Checks if an authenticated user possesses a specific permission code.
 */
export function hasPermission(
  user: AuthenticatedUser | null,
  module: ModuleCode,
  action: PermissionAction
): boolean {
  if (!user) return false;

  // School Admin with 'ADMIN' userType has full operational access within their tenant
  if (user.userType === 'ADMIN' && user.roles.includes('SUPER_ADMIN')) {
    return true;
  }

  const requiredCode = `${module}:${action}`;
  return user.permissions.includes(requiredCode) || user.permissions.includes(`${module}:*`);
}

/**
 * Backend authorization guard: Throws ForbiddenError if user lacks permission.
 */
export function requirePermission(
  user: AuthenticatedUser | null,
  module: ModuleCode,
  action: PermissionAction
): void {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!hasPermission(user, module, action)) {
    throw new ForbiddenError(
      `Permission denied: You do not have permission to perform [${action}] on module [${module}].`
    );
  }
}

/**
 * Checks if a user has access to a specific portal type.
 */
export function canAccessPortal(user: AuthenticatedUser | null, portal: 'admin' | 'staff' | 'teacher' | 'student' | 'parent'): boolean {
  if (!user) return false;

  switch (portal) {
    case 'admin':
      return user.userType === 'ADMIN';
    case 'staff':
      return user.userType === 'EMPLOYEE' || user.userType === 'ADMIN';
    case 'teacher':
      return user.userType === 'TEACHER' || user.userType === 'ADMIN';
    case 'student':
      return user.userType === 'STUDENT';
    case 'parent':
      return user.userType === 'PARENT';
    default:
      return false;
  }
}
