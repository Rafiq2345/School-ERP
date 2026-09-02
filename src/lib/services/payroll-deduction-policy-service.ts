/**
 * PayrollDeductionPolicyService
 *
 * Manages configurable payroll deduction rules.
 * Rules are data — not hardcoded. Administrators configure rules per tenant/leave type.
 *
 * Phase 3 Step 2: Configurable Attendance-to-Payroll deduction integration.
 * Supports: UNPAID_LEAVE, LATE_ARRIVALS, EARLY_DEPARTURE, SHORT_HOURS, HALF_DAY, CUSTOM scopes.
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import type {
  PayrollDeductionPolicyDto,
  CreatePayrollDeductionPolicyDto,
  UpdatePayrollDeductionPolicyDto,
  PayrollDeductionPolicyAssignmentDto,
  DeductionPolicyScope,
  DeductionCalculationBasis,
} from '@/lib/types/payroll-deduction';

export class PayrollDeductionPolicyService {
  // ---------------------------------------------------------
  // FORMATTERS
  // ---------------------------------------------------------

  public static formatPolicyDto(p: any): PayrollDeductionPolicyDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      policyCode: p.policyCode,
      policyName: p.policyName,
      scope: p.scope as DeductionPolicyScope,
      leaveTypeId: p.leaveTypeId ?? null,
      leaveTypeName: p.leaveType?.name ?? null,
      calculationBasis: p.calculationBasis as DeductionCalculationBasis,
      fixedDivisor: p.fixedDivisor !== null && p.fixedDivisor !== undefined ? Number(p.fixedDivisor) : null,
      lateTriggerCount: p.lateTriggerCount ?? null,
      lateGraceMinutes: p.lateGraceMinutes !== null && p.lateGraceMinutes !== undefined ? Number(p.lateGraceMinutes) : null,
      lateDeductionUnit: p.lateDeductionUnit !== null && p.lateDeductionUnit !== undefined ? Number(p.lateDeductionUnit) : null,
      absenceDeductionUnit: p.absenceDeductionUnit !== null && p.absenceDeductionUnit !== undefined ? Number(p.absenceDeductionUnit) : null,
      halfDayDeductionUnit: p.halfDayDeductionUnit !== null && p.halfDayDeductionUnit !== undefined ? Number(p.halfDayDeductionUnit) : null,
      earlyExitGraceMinutes: p.earlyExitGraceMinutes !== null && p.earlyExitGraceMinutes !== undefined ? Number(p.earlyExitGraceMinutes) : null,
      earlyExitDeductionUnit: p.earlyExitDeductionUnit !== null && p.earlyExitDeductionUnit !== undefined ? Number(p.earlyExitDeductionUnit) : null,
      isDefault: p.isDefault ?? false,
      maxDeductionDaysPerPeriod: p.maxDeductionDaysPerPeriod !== null && p.maxDeductionDaysPerPeriod !== undefined ? Number(p.maxDeductionDaysPerPeriod) : null,
      notes: p.notes ?? null,
      isActive: p.isActive,
      effectiveFrom: p.effectiveFrom ? p.effectiveFrom.toISOString() : new Date().toISOString(),
      effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString() : null,
      createdByUserId: p.createdByUserId ?? null,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  public static formatAssignmentDto(a: any): PayrollDeductionPolicyAssignmentDto {
    return {
      id: a.id,
      tenantId: a.tenantId,
      policyId: a.policyId,
      policyCode: a.policy?.policyCode,
      policyName: a.policy?.policyName,
      assignmentType: a.assignmentType,
      employeeId: a.employeeId ?? null,
      employeeName: a.employee
        ? `${a.employee.firstNameEn} ${a.employee.lastNameEn ?? ''}`.trim()
        : undefined,
      employeeNo: a.employee?.employeeNo,
      departmentId: a.departmentId ?? null,
      departmentName: a.department?.name,
      designationId: a.designationId ?? null,
      designationName: a.designation?.name,
      employmentTypeId: a.employmentTypeId ?? null,
      employmentTypeName: a.employmentType?.name,
      employeeCategoryId: a.employeeCategoryId ?? null,
      employeeCategoryName: a.employeeCategory?.name,
      isOverride: a.isOverride,
      priority: a.priority,
      effectiveFrom: a.effectiveFrom ? a.effectiveFrom.toISOString() : new Date().toISOString(),
      effectiveTo: a.effectiveTo ? a.effectiveTo.toISOString() : null,
      isActive: a.isActive,
      createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------
  // RESOLVE: find most specific active policy for a leave type
  // ---------------------------------------------------------

  public static async resolveUnpaidLeavePolicy(
    tenantId: string,
    leaveTypeId: string,
    now: Date = new Date()
  ): Promise<PayrollDeductionPolicyDto | null> {
    // 1. Try type-specific policy
    const specific = await prisma.payrollDeductionPolicy.findFirst({
      where: {
        tenantId,
        scope: 'UNPAID_LEAVE',
        leaveTypeId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (specific) return this.formatPolicyDto(specific);

    // 2. Try catch-all (leaveTypeId = null)
    const catchAll = await prisma.payrollDeductionPolicy.findFirst({
      where: {
        tenantId,
        scope: 'UNPAID_LEAVE',
        leaveTypeId: null,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      include: { leaveType: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (catchAll) return this.formatPolicyDto(catchAll);

    return null;
  }

  // ---------------------------------------------------------
  // ADMIN CRUD
  // ---------------------------------------------------------

  public static async listPolicies(tenantId: string): Promise<PayrollDeductionPolicyDto[]> {
    const policies = await prisma.payrollDeductionPolicy.findMany({
      where: { tenantId },
      include: { leaveType: { select: { name: true } } },
      orderBy: [{ scope: 'asc' }, { policyCode: 'asc' }],
    });
    return policies.map(this.formatPolicyDto);
  }

  public static async getPolicyById(tenantId: string, id: string): Promise<PayrollDeductionPolicyDto> {
    const policy = await prisma.payrollDeductionPolicy.findFirst({
      where: { id, tenantId },
      include: { leaveType: { select: { name: true } } },
    });
    if (!policy) throw new NotFoundError(`PayrollDeductionPolicy [${id}] not found.`);
    return this.formatPolicyDto(policy);
  }

  public static async createPolicy(
    tenantId: string,
    input: CreatePayrollDeductionPolicyDto,
    actorUserId?: string | null
  ): Promise<PayrollDeductionPolicyDto> {
    if (input.calculationBasis === 'FIXED_DIVISOR' && !input.fixedDivisor) {
      throw new ValidationError('fixedDivisor is required when calculationBasis is FIXED_DIVISOR.');
    }
    if (input.scope === 'LATE_ARRIVALS' && !input.lateTriggerCount) {
      throw new ValidationError('lateTriggerCount is required for LATE_ARRIVALS scope.');
    }

    const created = await prisma.payrollDeductionPolicy.create({
      data: {
        tenantId,
        policyCode: input.policyCode.trim().toUpperCase(),
        policyName: input.policyName.trim(),
        scope: input.scope,
        leaveTypeId: input.leaveTypeId ?? null,
        calculationBasis: input.calculationBasis,
        fixedDivisor: input.fixedDivisor ?? null,
        lateTriggerCount: input.lateTriggerCount ?? null,
        lateGraceMinutes: input.lateGraceMinutes ?? undefined,
        lateDeductionUnit: input.lateDeductionUnit ?? undefined,
        absenceDeductionUnit: input.absenceDeductionUnit ?? undefined,
        halfDayDeductionUnit: input.halfDayDeductionUnit ?? undefined,
        earlyExitGraceMinutes: input.earlyExitGraceMinutes ?? undefined,
        earlyExitDeductionUnit: input.earlyExitDeductionUnit ?? undefined,
        isDefault: input.isDefault ?? false,
        maxDeductionDaysPerPeriod: input.maxDeductionDaysPerPeriod ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        createdByUserId: actorUserId ?? null,
      },
      include: { leaveType: { select: { name: true } } },
    });
    return this.formatPolicyDto(created);
  }

  public static async updatePolicy(
    tenantId: string,
    id: string,
    input: UpdatePayrollDeductionPolicyDto,
    actorUserId?: string | null
  ): Promise<PayrollDeductionPolicyDto> {
    const existing = await prisma.payrollDeductionPolicy.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError(`PayrollDeductionPolicy [${id}] not found.`);

    if (
      (input.calculationBasis ?? existing.calculationBasis) === 'FIXED_DIVISOR' &&
      !(input.fixedDivisor ?? existing.fixedDivisor)
    ) {
      throw new ValidationError('fixedDivisor is required when calculationBasis is FIXED_DIVISOR.');
    }

    const updateData: any = {};
    if (input.policyCode !== undefined) updateData.policyCode = input.policyCode.trim().toUpperCase();
    if (input.policyName !== undefined) updateData.policyName = input.policyName.trim();
    if (input.scope !== undefined) updateData.scope = input.scope;
    if (input.leaveTypeId !== undefined) updateData.leaveTypeId = input.leaveTypeId;
    if (input.calculationBasis !== undefined) updateData.calculationBasis = input.calculationBasis;
    if (input.fixedDivisor !== undefined) updateData.fixedDivisor = input.fixedDivisor;
    if (input.lateTriggerCount !== undefined) updateData.lateTriggerCount = input.lateTriggerCount;
    if (input.lateGraceMinutes !== undefined) updateData.lateGraceMinutes = input.lateGraceMinutes;
    if (input.lateDeductionUnit !== undefined) updateData.lateDeductionUnit = input.lateDeductionUnit;
    if (input.absenceDeductionUnit !== undefined) updateData.absenceDeductionUnit = input.absenceDeductionUnit;
    if (input.halfDayDeductionUnit !== undefined) updateData.halfDayDeductionUnit = input.halfDayDeductionUnit;
    if (input.earlyExitGraceMinutes !== undefined) updateData.earlyExitGraceMinutes = input.earlyExitGraceMinutes;
    if (input.earlyExitDeductionUnit !== undefined) updateData.earlyExitDeductionUnit = input.earlyExitDeductionUnit;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
    if (input.maxDeductionDaysPerPeriod !== undefined) updateData.maxDeductionDaysPerPeriod = input.maxDeductionDaysPerPeriod;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.effectiveFrom !== undefined) updateData.effectiveFrom = new Date(input.effectiveFrom);
    if (input.effectiveTo !== undefined) updateData.effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;

    const updated = await (prisma.payrollDeductionPolicy.update as any)({
      where: { id },
      data: updateData,
      include: { leaveType: { select: { name: true } } },
    });
    return this.formatPolicyDto(updated);
  }

  public static async deactivatePolicy(
    tenantId: string,
    id: string,
    _actorUserId?: string | null
  ): Promise<PayrollDeductionPolicyDto> {
    const existing = await prisma.payrollDeductionPolicy.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError(`PayrollDeductionPolicy [${id}] not found.`);

    const updated = await prisma.payrollDeductionPolicy.update({
      where: { id },
      data: { isActive: false, effectiveTo: new Date() },
      include: { leaveType: { select: { name: true } } },
    });
    return this.formatPolicyDto(updated);
  }
}
