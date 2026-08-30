import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolePermissionService } from '../src/lib/services/role-permission-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    permission: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rolePermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return { prisma: mockPrisma };
});

describe('Central Roles & Permissions Service Tests', () => {
  const tenantId = 'tenant-sch-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-seeds standard permissions and creates default system roles if none exist', async () => {
    vi.mocked(prisma.permission.findMany).mockResolvedValue([
      { id: 'p-1', code: 'CONFIG:VIEW', module: 'CONFIG', action: 'VIEW' },
      { id: 'p-2', code: 'CONFIG:CREATE', module: 'CONFIG', action: 'CREATE' },
    ] as any);

    vi.mocked(prisma.role.findMany).mockResolvedValueOnce([]);

    vi.mocked(prisma.role.create).mockResolvedValueOnce({
      id: 'role-super-admin',
      tenantId,
      name: 'Super Administrator',
      code: 'SUPER_ADMIN',
      isSystem: true,
    } as any);

    const roles = await RolePermissionService.ensureDefaultTenantRoles(tenantId);
    expect(roles).toHaveLength(1);
    expect(roles[0].code).toBe('SUPER_ADMIN');
    expect(prisma.role.create).toHaveBeenCalled();
  });

  it('creates a custom role and prevents duplicate role codes', async () => {
    vi.mocked(prisma.role.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    vi.mocked(prisma.role.create).mockResolvedValue({
      id: 'role-custom-1',
      tenantId,
      name: 'Accountant',
      code: 'ACCOUNTANT',
      isSystem: false,
    } as any);

    const created = await RolePermissionService.createRole(
      tenantId,
      { name: 'Accountant', description: 'Financial ledger operator' },
      'usr-admin-01'
    );

    expect(created.code).toBe('ACCOUNTANT');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CREATE',
        entityType: 'ROLE',
      }),
    });

    // Test Duplicate code rejection
    vi.mocked(prisma.role.findFirst).mockResolvedValueOnce({ id: 'existing' } as any);
    await expect(
      RolePermissionService.createRole(tenantId, { name: 'Accountant' }, 'usr-admin-01')
    ).rejects.toThrow('already exists');
  });

  it('assigns permissions in a transaction and prevents Super Admin administrative lockout', async () => {
    const customRole = {
      id: 'role-custom-1',
      tenantId,
      name: 'Teacher',
      code: 'TEACHER',
      isSystem: false,
      rolePermissions: [],
    };
    vi.mocked(prisma.role.findUnique).mockResolvedValue(customRole as any);

    const result = await RolePermissionService.assignRolePermissions(
      tenantId,
      'role-custom-1',
      ['p-1', 'p-2'],
      'usr-admin-01'
    );

    expect(result.count).toBe(2);
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { tenantId, roleId: 'role-custom-1' },
    });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { tenantId, roleId: 'role-custom-1', permissionId: 'p-1' },
        { tenantId, roleId: 'role-custom-1', permissionId: 'p-2' },
      ],
    });

    // Test Super Admin lockout protection
    const superAdminRole = {
      id: 'role-super-admin',
      tenantId,
      name: 'Super Administrator',
      code: 'SUPER_ADMIN',
      isSystem: true,
      rolePermissions: [],
    };
    vi.mocked(prisma.role.findUnique).mockResolvedValue(superAdminRole as any);
    vi.mocked(prisma.permission.findMany).mockResolvedValue([
      { id: 'p-sec-1', module: 'SECURITY' },
      { id: 'p-cfg-1', module: 'CONFIG' },
    ] as any);

    await expect(
      RolePermissionService.assignRolePermissions(tenantId, 'role-super-admin', ['p-other'], 'usr-admin-01')
    ).rejects.toThrow('Lockout Prevention');
  });

  it('resolves effective permissions for user from multiple roles', async () => {
    const userWithRoles = {
      id: 'usr-1',
      tenantId,
      userRoles: [
        {
          role: {
            code: 'ACCOUNTANT',
            isSystem: false,
            rolePermissions: [
              { permission: { code: 'BILLING:VIEW' } },
              { permission: { code: 'BILLING:CREATE' } },
            ],
          },
        },
        {
          role: {
            code: 'TEACHER',
            isSystem: false,
            rolePermissions: [
              { permission: { code: 'ATTENDANCE:VIEW' } },
              { permission: { code: 'ATTENDANCE:CREATE' } },
            ],
          },
        },
      ],
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithRoles as any);

    const effective = await RolePermissionService.resolveUserEffectivePermissions('usr-1', tenantId);

    expect(effective).toContain('BILLING:VIEW');
    expect(effective).toContain('BILLING:CREATE');
    expect(effective).toContain('ATTENDANCE:VIEW');
    expect(effective).toContain('ATTENDANCE:CREATE');
  });
});
