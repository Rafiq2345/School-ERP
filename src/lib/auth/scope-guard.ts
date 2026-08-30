import { AuthenticatedUser, DataScope, ModuleCode, PermissionAction } from '../types';
import { hasPermission } from './permission';
import { DataScopeManager } from '../scope/data-scope';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';

/**
 * Decouples WHAT a user can do (Permission) from WHERE a user can do it (DataScope).
 */
export function authorizeActionInScope(
  user: AuthenticatedUser | null,
  module: ModuleCode,
  action: PermissionAction,
  scope: DataScope
): void {
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  // 1. Evaluate Permission (WHAT)
  if (!hasPermission(user, module, action)) {
    throw new ForbiddenError(
      `Permission denied: You lack [${action}] permission on module [${module}].`
    );
  }

  // 2. Evaluate Scope Boundary (WHERE)
  if (!DataScopeManager.isEntityInScope(scope, { tenantId: user.tenantId })) {
    throw new ForbiddenError(
      `Scope violation: Action is not permitted outside your designated tenant boundary.`
    );
  }
}
