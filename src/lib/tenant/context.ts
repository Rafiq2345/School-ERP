import { AsyncLocalStorage } from 'node:async_hooks';
import { TenantContext } from '../types';
import { TenantIsolationError } from '../errors/app-error';

// Tenant Context AsyncLocalStorage
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Runs a function within the scope of a specific tenant context.
 */
export function runWithTenant<T>(context: TenantContext, callback: () => T): T {
  return tenantStorage.run(context, callback);
}

/**
 * Gets the current active tenant context. Throws an error if called outside a tenant scope.
 */
export function getRequiredTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context || !context.tenantId) {
    throw new TenantIsolationError('Operation failed: No active tenant context resolved.');
  }
  return context;
}

/**
 * Gets the current active tenant context, or null if unauthenticated / system level.
 */
export function getOptionalTenantContext(): TenantContext | null {
  return tenantStorage.getStore() || null;
}

/**
 * Asserts that a target resource belongs to the currently active tenant.
 */
export function assertTenantOwnership(resourceTenantId: string): void {
  const current = getRequiredTenantContext();
  if (resourceTenantId !== current.tenantId) {
    throw new TenantIsolationError(
      `Access denied: Resource tenant (${resourceTenantId}) does not match current tenant (${current.tenantId})`
    );
  }
}
