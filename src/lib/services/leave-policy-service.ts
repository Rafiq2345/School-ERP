import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { CreateLeavePolicyDto, LeavePolicyDto, UpdateLeavePolicyDto } from '@/lib/types/leave';
import { ValidationError, NotFoundError } from '@/lib/errors/app-error';

export class LeavePolicyService {
  /**
   * Retrieves all Leave Policies for a tenant
   */
  static async getLeavePolicies(
    tenantId: string,
    options: { status?: string; search?: string } = {}
  ): Promise<LeavePolicyDto[]> {
    const where: any = { tenantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const policies = await prisma.leavePolicy.findMany({
      where,
      include: {
        rules: {
          include: {
            leaveType: true,
          },
        },
        _count: {
          select: { assignments: { where: { isActive: true } } },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { status: 'asc' }, { name: 'asc' }],
    });

    return policies.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      code: p.code,
      description: p.description,
      isDefault: p.isDefault,
      status: p.status as any,
      effectiveFrom: p.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString().split('T')[0] : null,
      activeAssignmentsCount: p._count.assignments,
      rules: p.rules.map((r) => ({
        id: r.id,
        leavePolicyId: r.leavePolicyId,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveType.name,
        leaveTypeCode: r.leaveType.code,
        annualEntitlement: Number(r.annualEntitlement),
        isPaid: r.isPaid,
        isUnlimited: r.isUnlimited,
        allocationMethod: r.allocationMethod as any,
        minLeaveUnit: Number(r.minLeaveUnit),
        allowHalfDay: r.allowHalfDay,
        allowShiftWise: r.allowShiftWise,
        allowHourly: r.allowHourly,
        allowNegativeBalance: r.allowNegativeBalance,
        maxNegativeBalance: Number(r.maxNegativeBalance),
        maxConsecutiveDays: r.maxConsecutiveDays,
        probationTreatment: r.probationTreatment as any,
        probationEntitlement: r.probationEntitlement ? Number(r.probationEntitlement) : null,
        entitlementRelease: r.entitlementRelease as any,
        yearEndAction: r.yearEndAction as any,
        maxCarryForwardDays: r.maxCarryForwardDays ? Number(r.maxCarryForwardDays) : null,
        carryForwardExpiryMonths: r.carryForwardExpiryMonths,
        maxEncashableDays: r.maxEncashableDays ? Number(r.maxEncashableDays) : null,
        minBalanceForEncashment: r.minBalanceForEncashment ? Number(r.minBalanceForEncashment) : null,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single Leave Policy by ID
   */
  static async getLeavePolicyById(tenantId: string, id: string): Promise<LeavePolicyDto> {
    const p = await prisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: {
        rules: {
          include: {
            leaveType: true,
          },
        },
        _count: {
          select: { assignments: { where: { isActive: true } } },
        },
      },
    });

    if (!p) {
      throw new NotFoundError(`Leave Policy with ID [${id}] not found.`);
    }

    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      code: p.code,
      description: p.description,
      isDefault: p.isDefault,
      status: p.status as any,
      effectiveFrom: p.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString().split('T')[0] : null,
      activeAssignmentsCount: p._count.assignments,
      rules: p.rules.map((r) => ({
        id: r.id,
        leavePolicyId: r.leavePolicyId,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveType.name,
        leaveTypeCode: r.leaveType.code,
        annualEntitlement: Number(r.annualEntitlement),
        isPaid: r.isPaid,
        isUnlimited: r.isUnlimited,
        allocationMethod: r.allocationMethod as any,
        minLeaveUnit: Number(r.minLeaveUnit),
        allowHalfDay: r.allowHalfDay,
        allowShiftWise: r.allowShiftWise,
        allowHourly: r.allowHourly,
        allowNegativeBalance: r.allowNegativeBalance,
        maxNegativeBalance: Number(r.maxNegativeBalance),
        maxConsecutiveDays: r.maxConsecutiveDays,
        probationTreatment: r.probationTreatment as any,
        probationEntitlement: r.probationEntitlement ? Number(r.probationEntitlement) : null,
        entitlementRelease: r.entitlementRelease as any,
        yearEndAction: r.yearEndAction as any,
        maxCarryForwardDays: r.maxCarryForwardDays ? Number(r.maxCarryForwardDays) : null,
        carryForwardExpiryMonths: r.carryForwardExpiryMonths,
        maxEncashableDays: r.maxEncashableDays ? Number(r.maxEncashableDays) : null,
        minBalanceForEncashment: r.minBalanceForEncashment ? Number(r.minBalanceForEncashment) : null,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new Leave Policy with rules
   */
  static async createLeavePolicy(
    tenantId: string,
    data: CreateLeavePolicyDto,
    userId?: string
  ): Promise<LeavePolicyDto> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Leave Policy name is required.');
    }
    if (!data.code || !data.code.trim()) {
      throw new ValidationError('Leave Policy code is required.');
    }
    if (!data.effectiveFrom) {
      throw new ValidationError('Effective From date is required.');
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await prisma.leavePolicy.findFirst({
      where: { tenantId, code: normalizedCode },
    });
    if (existing) {
      throw new ValidationError(`Leave Policy with code [${normalizedCode}] already exists.`);
    }

    const effectiveFromDate = new Date(`${data.effectiveFrom.split('T')[0]}T00:00:00.000Z`);
    const effectiveToDate = data.effectiveTo
      ? new Date(`${data.effectiveTo.split('T')[0]}T00:00:00.000Z`)
      : null;

    if (effectiveToDate && effectiveToDate < effectiveFromDate) {
      throw new ValidationError('Effective To date cannot be earlier than Effective From date.');
    }

    if (!data.rules || data.rules.length === 0) {
      throw new ValidationError('At least one Leave Type rule is required in a Leave Policy.');
    }

    // Verify all leave types exist in tenant
    const leaveTypeIds = data.rules.map((r) => r.leaveTypeId);
    const uniqueIds = Array.from(new Set(leaveTypeIds));
    if (uniqueIds.length !== leaveTypeIds.length) {
      throw new ValidationError('Duplicate leave types configured in policy rules.');
    }

    const existingLeaveTypes = await prisma.leaveType.findMany({
      where: { tenantId, id: { in: uniqueIds } },
    });
    if (existingLeaveTypes.length !== uniqueIds.length) {
      throw new ValidationError('One or more referenced Leave Types do not exist in this tenant.');
    }

    const created = await prisma.$transaction(async (tx) => {
      // If marked default, reset other policies' isDefault
      if (data.isDefault) {
        await tx.leavePolicy.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const policy = await tx.leavePolicy.create({
        data: {
          tenantId,
          name: data.name.trim(),
          code: normalizedCode,
          description: data.description?.trim() || null,
          isDefault: data.isDefault ?? false,
          status: data.status || 'ACTIVE',
          effectiveFrom: effectiveFromDate,
          effectiveTo: effectiveToDate,
          rules: {
            create: data.rules.map((r) => ({
              leaveTypeId: r.leaveTypeId,
              annualEntitlement: r.annualEntitlement ?? 0,
              isPaid: r.isPaid ?? true,
              isUnlimited: r.isUnlimited ?? false,
              allocationMethod: r.allocationMethod || 'ANNUAL_UPFRONT',
              minLeaveUnit: r.minLeaveUnit ?? 0.5,
              allowHalfDay: r.allowHalfDay ?? true,
              allowShiftWise: r.allowShiftWise ?? true,
              allowHourly: r.allowHourly ?? false,
              allowNegativeBalance: r.allowNegativeBalance ?? false,
              maxNegativeBalance: r.maxNegativeBalance ?? 0,
              maxConsecutiveDays: r.maxConsecutiveDays || null,
              probationTreatment: r.probationTreatment || 'ALLOWED',
              probationEntitlement: r.probationEntitlement || null,
              entitlementRelease: r.entitlementRelease || 'ON_JOINING',
              yearEndAction: r.yearEndAction || 'EXPIRE',
              maxCarryForwardDays: r.maxCarryForwardDays || null,
              carryForwardExpiryMonths: r.carryForwardExpiryMonths || null,
              maxEncashableDays: r.maxEncashableDays || null,
              minBalanceForEncashment: r.minBalanceForEncashment || null,
            })),
          },
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: policy.id,
          action: 'CREATED',
          newState: policy as any,
          reason: 'Initial leave policy creation',
          userId: userId || null,
        },
      });

      return policy;
    });

    return this.getLeavePolicyById(tenantId, created.id);
  }

  /**
   * Updates an existing Leave Policy and its rules
   */
  static async updateLeavePolicy(
    tenantId: string,
    id: string,
    data: UpdateLeavePolicyDto,
    userId?: string
  ): Promise<LeavePolicyDto> {
    const existing = await prisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: { rules: true },
    });
    if (!existing) {
      throw new NotFoundError(`Leave Policy with ID [${id}] not found.`);
    }

    let normalizedCode = existing.code;
    if (data.code && data.code.trim()) {
      normalizedCode = data.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const codeConflict = await prisma.leavePolicy.findFirst({
          where: { tenantId, code: normalizedCode, id: { not: id } },
        });
        if (codeConflict) {
          throw new ValidationError(`Leave Policy with code [${normalizedCode}] already exists.`);
        }
      }
    }

    const effectiveFromDate = data.effectiveFrom
      ? new Date(`${data.effectiveFrom.split('T')[0]}T00:00:00.000Z`)
      : existing.effectiveFrom;
    const effectiveToDate =
      data.effectiveTo !== undefined
        ? data.effectiveTo
          ? new Date(`${data.effectiveTo.split('T')[0]}T00:00:00.000Z`)
          : null
        : existing.effectiveTo;

    if (effectiveToDate && effectiveToDate < effectiveFromDate) {
      throw new ValidationError('Effective To date cannot be earlier than Effective From date.');
    }

    await prisma.$transaction(async (tx) => {
      // If marked default, reset other policies' isDefault
      if (data.isDefault) {
        await tx.leavePolicy.updateMany({
          where: { tenantId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      // Update policy header
      await tx.leavePolicy.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : existing.name,
          code: normalizedCode,
          description: data.description !== undefined ? data.description?.trim() || null : existing.description,
          isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
          status: data.status || existing.status,
          effectiveFrom: effectiveFromDate,
          effectiveTo: effectiveToDate,
        },
      });

      // If rules provided, replace rules
      if (data.rules && data.rules.length > 0) {
        await tx.leavePolicyRule.deleteMany({
          where: { leavePolicyId: id },
        });

        await tx.leavePolicyRule.createMany({
          data: data.rules.map((r) => ({
            leavePolicyId: id,
            leaveTypeId: r.leaveTypeId,
            annualEntitlement: r.annualEntitlement ?? 0,
            isPaid: r.isPaid ?? true,
            isUnlimited: r.isUnlimited ?? false,
            allocationMethod: r.allocationMethod || 'ANNUAL_UPFRONT',
            minLeaveUnit: r.minLeaveUnit ?? 0.5,
            allowHalfDay: r.allowHalfDay ?? true,
            allowShiftWise: r.allowShiftWise ?? true,
            allowHourly: r.allowHourly ?? false,
            allowNegativeBalance: r.allowNegativeBalance ?? false,
            maxNegativeBalance: r.maxNegativeBalance ?? 0,
            maxConsecutiveDays: r.maxConsecutiveDays || null,
            probationTreatment: r.probationTreatment || 'ALLOWED',
            probationEntitlement: r.probationEntitlement || null,
            entitlementRelease: r.entitlementRelease || 'ON_JOINING',
            yearEndAction: r.yearEndAction || 'EXPIRE',
            maxCarryForwardDays: r.maxCarryForwardDays || null,
            carryForwardExpiryMonths: r.carryForwardExpiryMonths || null,
            maxEncashableDays: r.maxEncashableDays || null,
            minBalanceForEncashment: r.minBalanceForEncashment || null,
          })),
        });
      }

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: id,
          action: 'UPDATED',
          previousState: existing as any,
          newState: data as any,
          reason: 'Leave policy updated',
          userId: userId || null,
        },
      });
    });

    return this.getLeavePolicyById(tenantId, id);
  }

  /**
   * Deactivates or removes a Leave Policy
   */
  static async deleteLeavePolicy(tenantId: string, id: string, userId?: string): Promise<void> {
    const existing = await prisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: {
        assignments: { where: { isActive: true } },
        entitlements: true,
      },
    });

    if (!existing) {
      throw new NotFoundError(`Leave Policy with ID [${id}] not found.`);
    }

    if (existing.assignments.length > 0 || existing.entitlements.length > 0) {
      // In use: soft delete / deactivate
      await prisma.$transaction(async (tx) => {
        await tx.leavePolicy.update({
          where: { id },
          data: { status: 'INACTIVE' },
        });

        await tx.leaveAuditLog.create({
          data: {
            tenantId,
            entityType: 'LEAVE_POLICY',
            entityId: id,
            action: 'DEACTIVATED',
            previousState: { status: existing.status },
            newState: { status: 'INACTIVE' },
            reason: 'Deactivated policy with existing assignments/entitlements',
            userId: userId || null,
          },
        });
      });
      return;
    }

    // Direct deletion if unused
    await prisma.$transaction(async (tx) => {
      await tx.leavePolicyRule.deleteMany({
        where: { leavePolicyId: id },
      });
      await tx.leavePolicy.delete({
        where: { id },
      });

      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: id,
          action: 'DELETED',
          previousState: existing as any,
          newState: undefined,
          reason: 'Deleted unused leave policy',
          userId: userId || null,
        },
      });
    });
  }
}
