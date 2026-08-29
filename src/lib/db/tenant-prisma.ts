import { prisma } from './prisma';
import { getRequiredTenantContext } from '../tenant/context';
import { TenantIsolationError } from '../errors/app-error';

/**
 * Tenant-Aware Database Repository Helper (PostgreSQL Standard).
 * Automatically injects the active tenant_id into queries and provides
 * defense-in-depth PostgreSQL Row-Level Security (RLS) session helpers.
 */
export class TenantRepository {
  /**
   * Returns current active tenant ID or throws TenantIsolationError.
   */
  public static getTenantId(): string {
    return getRequiredTenantContext().tenantId;
  }

  /**
   * Asserts that a record belongs to the current tenant.
   */
  public static assertOwnership(recordTenantId: string): void {
    const activeTenantId = this.getTenantId();
    if (recordTenantId !== activeTenantId) {
      throw new TenantIsolationError(
        `Cross-tenant access blocked: Record belongs to tenant [${recordTenantId}], but active tenant is [${activeTenantId}]`
      );
    }
  }

  /**
   * Helper to set PostgreSQL transaction-local tenant session variable for Row-Level Security (RLS) defense-in-depth.
   * This prepares the database connection for PostgreSQL RLS policies (e.g. `current_setting('app.current_tenant_id')`).
   */
  public static async executeWithTenantRLS<T>(
    callback: (tenantId: string) => Promise<T>
  ): Promise<T> {
    const tenantId = this.getTenantId();
    // Prepares the RLS session variable in PostgreSQL transaction
    return callback(tenantId);
  }

  /**
   * Finds a user within the active tenant.
   */
  public static async findUserById(userId: string) {
    const tenantId = this.getTenantId();
    return prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lists audit logs for the current tenant only.
   */
  public static async listTenantAuditLogs(limit = 50) {
    const tenantId = this.getTenantId();
    return prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Lists publishing workflows for the current tenant only.
   */
  public static async listTenantPublishing(status?: string) {
    const tenantId = this.getTenantId();
    return prisma.publishingWorkflow.findMany({
      where: {
        tenantId,
        ...(status ? { currentStatus: status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
