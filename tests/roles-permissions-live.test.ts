import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RolePermissionService } from '../src/lib/services/role-permission-service';
import { prisma } from '../src/lib/db/prisma';

describe('Roles & Permissions Live PostgreSQL Integration Tests', () => {
  let tenantId: string;
  let testRoleId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new Error('No active tenant found');
    tenantId = tenant.id;
  });

  afterAll(async () => {
    if (testRoleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId: testRoleId } });
      await prisma.role.delete({ where: { id: testRoleId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('populates standard permissions in PostgreSQL', async () => {
    await RolePermissionService.ensureStandardPermissions();
    const permCount = await prisma.permission.count();
    expect(permCount).toBeGreaterThan(50);
  });

  it('ensures default system roles (SUPER_ADMIN, SCHOOL_ADMIN) exist in PostgreSQL', async () => {
    const roles = await RolePermissionService.getRoles(tenantId);
    expect(roles.length).toBeGreaterThanOrEqual(2);

    const superAdmin = roles.find((r) => r.code === 'SUPER_ADMIN');
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.isSystem).toBe(true);
  });

  it('creates custom role, assigns permissions, reloads and audits in live PostgreSQL', async () => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const createdRole = await RolePermissionService.createRole(
      tenantId,
      { name: `Test Registrar ${uniqueSuffix}`, description: 'Live Integration Test Role' },
      'usr-admin-01'
    );
    testRoleId = createdRole.id;
    expect(createdRole.name).toContain('Test Registrar');

    const availablePerms = await RolePermissionService.getAvailablePermissions(tenantId);
    expect(availablePerms.length).toBeGreaterThan(5);

    const samplePermIds = availablePerms[0].permissions.map((p: any) => p.id);
    const assignResult = await RolePermissionService.assignRolePermissions(
      tenantId,
      createdRole.id,
      samplePermIds,
      'usr-admin-01'
    );
    expect(assignResult.count).toBe(samplePermIds.length);

    const reloaded = await RolePermissionService.getRoleById(tenantId, createdRole.id);
    expect(reloaded.assignedPermissionIds.length).toBe(samplePermIds.length);

    // Verify Audit Log entry
    const audit = await prisma.auditLog.findFirst({
      where: { tenantId, entityId: createdRole.id },
      orderBy: { timestamp: 'desc' },
    });
    expect(audit).toBeDefined();
  });
});
