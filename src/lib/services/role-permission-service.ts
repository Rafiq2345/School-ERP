import { prisma } from '../db/prisma';
import { MODULE_REGISTRY, getAllModules, isModuleEnabledForTenant } from '../modules/module-registry';
import { ModuleCode, PermissionAction, ProductTier } from '../types';
import { PERMISSION_ACTIONS } from '../auth/permission';

export interface CreateRoleDTO {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class RolePermissionService {
  public static async ensureStandardPermissions() {
    const modules = getAllModules();
    const actions: PermissionAction[] = PERMISSION_ACTIONS;

    const existing = await prisma.permission.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((p) => p.code));

    const toCreate: { module: string; action: string; code: string; description: string }[] = [];

    for (const mod of modules) {
      for (const act of actions) {
        const code = `${mod.code}:${act}`;
        if (!existingCodes.has(code)) {
          toCreate.push({
            module: mod.code,
            action: act,
            code,
            description: `Permission to ${act.toLowerCase()} within ${mod.nameEn}`,
          });
        }
      }
    }

    if (toCreate.length > 0) {
      for (const p of toCreate) {
        await prisma.permission.upsert({
          where: { code: p.code },
          update: { module: p.module, action: p.action, description: p.description },
          create: p,
        });
      }
    }
  }

  public static async ensureDefaultTenantRoles(tenantId: string) {
    await this.ensureStandardPermissions();

    const existingRoles = await prisma.role.findMany({ where: { tenantId } });
    if (existingRoles.length > 0) return existingRoles;

    const allPermissions = await prisma.permission.findMany();

    const superAdmin = await prisma.role.create({
      data: {
        tenantId,
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        description: 'Full institutional administrative access with system protection.',
        isSystem: true,
        rolePermissions: {
          create: allPermissions.map((p) => ({
            tenantId,
            permissionId: p.id,
          })),
        },
      },
    });

    const schoolAdminPermissions = allPermissions.filter((p) => p.action !== 'REVERSE' || p.module === 'BILLING');
    await prisma.role.create({
      data: {
        tenantId,
        name: 'School Administrator',
        code: 'SCHOOL_ADMIN',
        description: 'Day-to-day administrative operations and school management.',
        isSystem: true,
        rolePermissions: {
          create: schoolAdminPermissions.map((p) => ({
            tenantId,
            permissionId: p.id,
          })),
        },
      },
    });

    return [superAdmin];
  }

  public static async getRoles(tenantId: string) {
    await this.ensureDefaultTenantRoles(tenantId);

    const roles = await prisma.role.findMany({
      where: { tenantId },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      code: r.code,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissionCount: r._count.rolePermissions,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  public static async getRoleById(tenantId: string, roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new Error('Role not found');
    }

    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      assignedPermissionIds: role.rolePermissions.map((rp) => rp.permissionId),
      assignedPermissionCodes: role.rolePermissions.map((rp) => rp.permission.code),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  public static async createRole(tenantId: string, data: CreateRoleDTO, userId?: string) {
    const name = data.name.trim();
    if (!name) throw new Error('Role name is required');

    let code = (data.code || name.replace(/\s+/g, '_').toUpperCase()).trim();
    code = code.replace(/[^A-Z0-9_]/gi, '').toUpperCase();

    if (!code) throw new Error('Valid role code is required');

    const existingCode = await prisma.role.findFirst({
      where: { tenantId, code },
    });
    if (existingCode) {
      throw new Error(`A role with code "${code}" already exists in this school.`);
    }

    const existingName = await prisma.role.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new Error(`A role with name "${name}" already exists in this school.`);
    }

    const created = await prisma.role.create({
      data: {
        tenantId,
        name,
        code,
        description: data.description?.trim() || null,
        isSystem: false,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'CREATE',
      entityType: 'ROLE',
      entityId: created.id,
      newValues: created,
      changeSummary: `Created new role "${created.name}" (${created.code})`,
    });

    return created;
  }

  public static async updateRole(tenantId: string, roleId: string, data: UpdateRoleDTO, userId?: string) {
    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Role not found');
    }

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error('Role name cannot be empty');

      const duplicate = await prisma.role.findFirst({
        where: {
          tenantId,
          name: { equals: name, mode: 'insensitive' },
          id: { not: roleId },
        },
      });
      if (duplicate) {
        throw new Error(`Another role with name "${name}" already exists.`);
      }

      updateData.name = name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
    });

    await this.logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType: 'ROLE',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      changeSummary: `Updated role "${updated.name}"`,
    });

    return updated;
  }

  public static async assignRolePermissions(
    tenantId: string,
    roleId: string,
    permissionIds: string[],
    userId?: string
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    if (!role || role.tenantId !== tenantId) {
      throw new Error('Role not found');
    }

    if (role.isSystem && role.code === 'SUPER_ADMIN') {
      const allSecAndConfigPerms = await prisma.permission.findMany({
        where: { module: { in: ['SECURITY', 'CONFIG'] } },
        select: { id: true },
      });
      const requiredIds = allSecAndConfigPerms.map((p) => p.id);
      const hasAllCritical = requiredIds.every((id) => permissionIds.includes(id));

      if (!hasAllCritical) {
        throw new Error(
          'Lockout Prevention: System Super Administrator role must retain Security and Administration Configuration permissions.'
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { tenantId, roleId },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pId) => ({
            tenantId,
            roleId,
            permissionId: pId,
          })),
        });
      }

      await this.logAudit({
        tenantId,
        userId,
        action: 'UPDATE',
        entityType: 'ROLE_PERMISSIONS',
        entityId: roleId,
        oldValues: { permissionCount: role.rolePermissions.length },
        newValues: { permissionCount: permissionIds.length },
        changeSummary: `Assigned ${permissionIds.length} permissions to role "${role.name}"`,
      });

      return { success: true, count: permissionIds.length };
    });
  }

  public static async getAvailablePermissions(
    tenantId: string,
    tier: ProductTier = 'BASE',
    overrides?: Record<string, boolean>
  ) {
    await this.ensureStandardPermissions();

    const allPermissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    const modules = getAllModules();
    const grouped: any[] = [];

    for (const mod of modules) {
      const isEnabled = isModuleEnabledForTenant(mod.code, tier, overrides);
      const modPerms = allPermissions.filter((p) => p.module === mod.code);

      grouped.push({
        moduleCode: mod.code,
        moduleNameEn: mod.nameEn,
        moduleNameUr: mod.nameUr,
        category: mod.category,
        isBaseModule: mod.isBaseModule,
        isEnabled,
        permissions: modPerms.map((p) => ({
          id: p.id,
          action: p.action,
          code: p.code,
          description: p.description,
        })),
      });
    }

    return grouped;
  }

  public static async resolveUserEffectivePermissions(userId: string, tenantId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.tenantId !== tenantId) return [];

    const permissionSet = new Set<string>();

    for (const ur of user.userRoles) {
      if (ur.role.isSystem && ur.role.code === 'SUPER_ADMIN') {
        permissionSet.add('*');
      }
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return Array.from(permissionSet);
  }

  private static async logAudit(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    changeSummary?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId || 'usr-admin-01',
          module: 'SECURITY',
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          oldValues: params.oldValues || null,
          newValues: params.newValues || null,
          changeSummary: params.changeSummary || null,
        },
      });
    } catch {
      // Non-blocking
    }
  }
}
