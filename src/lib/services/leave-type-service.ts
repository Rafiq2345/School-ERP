import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { CreateLeaveTypeDto, LeaveTypeDto, UpdateLeaveTypeDto } from '@/lib/types/leave';
import { ValidationError, NotFoundError } from '@/lib/errors/app-error';

export class LeaveTypeService {
  /**
   * Retrieves all Leave Types for a tenant with optional filtering
   */
  static async getLeaveTypes(
    tenantId: string,
    options: { isActive?: boolean; search?: string } = {}
  ): Promise<LeaveTypeDto[]> {
    const where: any = { tenantId };

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const types = await prisma.leaveType.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return types.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      code: t.code,
      description: t.description,
      isPaid: t.isPaid,
      isUnlimited: t.isUnlimited,
      annualLimit: t.annualLimit,
      defaultAllocationMethod: t.defaultAllocationMethod as any,
      minLeaveUnit: Number(t.minLeaveUnit),
      allowFullDay: t.allowFullDay,
      allowHalfDay: t.allowHalfDay,
      allowShiftWise: t.allowShiftWise,
      allowHourly: t.allowHourly,
      attachmentRequired: t.attachmentRequired,
      attachmentThresholdDays: t.attachmentThresholdDays,
      carryForwardAllowed: t.carryForwardAllowed,
      carryForwardLimit: t.carryForwardLimit,
      requiresApproval: t.requiresApproval,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single Leave Type by ID
   */
  static async getLeaveTypeById(tenantId: string, id: string): Promise<LeaveTypeDto> {
    const t = await prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!t) {
      throw new NotFoundError(`Leave type with ID [${id}] not found.`);
    }

    return {
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      code: t.code,
      description: t.description,
      isPaid: t.isPaid,
      isUnlimited: t.isUnlimited,
      annualLimit: t.annualLimit,
      defaultAllocationMethod: t.defaultAllocationMethod as any,
      minLeaveUnit: Number(t.minLeaveUnit),
      allowFullDay: t.allowFullDay,
      allowHalfDay: t.allowHalfDay,
      allowShiftWise: t.allowShiftWise,
      allowHourly: t.allowHourly,
      attachmentRequired: t.attachmentRequired,
      attachmentThresholdDays: t.attachmentThresholdDays,
      carryForwardAllowed: t.carryForwardAllowed,
      carryForwardLimit: t.carryForwardLimit,
      requiresApproval: t.requiresApproval,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new Leave Type
   */
  static async createLeaveType(
    tenantId: string,
    data: CreateLeaveTypeDto,
    userId?: string
  ): Promise<LeaveTypeDto> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Leave Type name is required.');
    }
    if (!data.code || !data.code.trim()) {
      throw new ValidationError('Leave Type code is required.');
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Check code uniqueness within tenant
    const existing = await prisma.leaveType.findFirst({
      where: { tenantId, code: normalizedCode },
    });
    if (existing) {
      throw new ValidationError(`Leave Type with code [${normalizedCode}] already exists.`);
    }

    const created = await prisma.$transaction(async (tx) => {
      const lt = await tx.leaveType.create({
        data: {
          tenantId,
          name: data.name.trim(),
          code: normalizedCode,
          description: data.description?.trim() || null,
          isPaid: data.isPaid ?? true,
          isUnlimited: data.isUnlimited ?? false,
          annualLimit: data.annualLimit !== undefined ? data.annualLimit : null,
          defaultAllocationMethod: data.defaultAllocationMethod || 'ANNUAL_UPFRONT',
          minLeaveUnit: data.minLeaveUnit ?? 0.5,
          allowFullDay: data.allowFullDay ?? true,
          allowHalfDay: data.allowHalfDay ?? true,
          allowShiftWise: data.allowShiftWise ?? true,
          allowHourly: data.allowHourly ?? false,
          attachmentRequired: data.attachmentRequired ?? false,
          attachmentThresholdDays: data.attachmentThresholdDays ?? 0,
          carryForwardAllowed: data.carryForwardAllowed ?? false,
          carryForwardLimit: data.carryForwardLimit ?? null,
          requiresApproval: data.requiresApproval ?? true,
          isActive: data.isActive ?? true,
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_TYPE',
          entityId: lt.id,
          action: 'CREATED',
          newState: lt as any,
          reason: 'Initial leave type creation',
          userId: userId || null,
        },
      });

      return lt;
    });

    return this.getLeaveTypeById(tenantId, created.id);
  }

  /**
   * Updates an existing Leave Type
   */
  static async updateLeaveType(
    tenantId: string,
    id: string,
    data: UpdateLeaveTypeDto,
    userId?: string
  ): Promise<LeaveTypeDto> {
    const existing = await prisma.leaveType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError(`Leave type with ID [${id}] not found.`);
    }

    let normalizedCode = existing.code;
    if (data.code && data.code.trim()) {
      normalizedCode = data.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const codeConflict = await prisma.leaveType.findFirst({
          where: { tenantId, code: normalizedCode, id: { not: id } },
        });
        if (codeConflict) {
          throw new ValidationError(`Leave Type with code [${normalizedCode}] already exists.`);
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lt = await tx.leaveType.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : existing.name,
          code: normalizedCode,
          description: data.description !== undefined ? data.description?.trim() || null : existing.description,
          isPaid: data.isPaid !== undefined ? data.isPaid : existing.isPaid,
          isUnlimited: data.isUnlimited !== undefined ? data.isUnlimited : existing.isUnlimited,
          annualLimit: data.annualLimit !== undefined ? data.annualLimit : existing.annualLimit,
          defaultAllocationMethod: data.defaultAllocationMethod || existing.defaultAllocationMethod,
          minLeaveUnit: data.minLeaveUnit !== undefined ? data.minLeaveUnit : existing.minLeaveUnit,
          allowFullDay: data.allowFullDay !== undefined ? data.allowFullDay : existing.allowFullDay,
          allowHalfDay: data.allowHalfDay !== undefined ? data.allowHalfDay : existing.allowHalfDay,
          allowShiftWise: data.allowShiftWise !== undefined ? data.allowShiftWise : existing.allowShiftWise,
          allowHourly: data.allowHourly !== undefined ? data.allowHourly : existing.allowHourly,
          attachmentRequired: data.attachmentRequired !== undefined ? data.attachmentRequired : existing.attachmentRequired,
          attachmentThresholdDays: data.attachmentThresholdDays !== undefined ? data.attachmentThresholdDays : existing.attachmentThresholdDays,
          carryForwardAllowed: data.carryForwardAllowed !== undefined ? data.carryForwardAllowed : existing.carryForwardAllowed,
          carryForwardLimit: data.carryForwardLimit !== undefined ? data.carryForwardLimit : existing.carryForwardLimit,
          requiresApproval: data.requiresApproval !== undefined ? data.requiresApproval : existing.requiresApproval,
          isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_TYPE',
          entityId: lt.id,
          action: 'UPDATED',
          previousState: existing as any,
          newState: lt as any,
          reason: 'Leave type configuration updated',
          userId: userId || null,
        },
      });

      return lt;
    });

    return this.getLeaveTypeById(tenantId, updated.id);
  }

  /**
   * Deactivates or removes a Leave Type (soft-delete / toggle)
   */
  static async deleteLeaveType(tenantId: string, id: string, userId?: string): Promise<void> {
    const existing = await prisma.leaveType.findFirst({
      where: { id, tenantId },
      include: {
        policyRules: true,
        entitlements: true,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Leave type with ID [${id}] not found.`);
    }

    if (existing.policyRules.length > 0 || existing.entitlements.length > 0) {
      // In use: soft delete / deactivate
      await prisma.$transaction(async (tx) => {
        await tx.leaveType.update({
          where: { id },
          data: { isActive: false },
        });

        await tx.leaveAuditLog.create({
          data: {
            tenantId,
            entityType: 'LEAVE_TYPE',
            entityId: id,
            action: 'DEACTIVATED',
            previousState: { isActive: true },
            newState: { isActive: false },
            reason: 'Deactivated due to existing policy or entitlement links',
            userId: userId || null,
          },
        });
      });
      return;
    }

    // Direct deletion if unused
    await prisma.$transaction(async (tx) => {
      await tx.leaveType.delete({
        where: { id },
      });

      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_TYPE',
          entityId: id,
          action: 'DELETED',
          previousState: existing as any,
          newState: undefined,
          reason: 'Deleted unused leave type',
          userId: userId || null,
        },
      });
    });
  }
}
