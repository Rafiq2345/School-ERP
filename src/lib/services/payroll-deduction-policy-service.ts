/**
 * PayrollDeductionPolicyService
 *
 * Manages configurable payroll deduction rules.
 * Rules are data — not hardcoded. Administrators configure rules per tenant/leave type.
 *
 * Phase 3 Step 1: Foundation for Attendance-to-Payroll deduction integration.
 * Supports: UNPAID_LEAVE, LATE_ARRIVALS, EARLY_DEPARTURE, SHORT_HOURS, HALF_DAY, CUSTOM scopes.
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import type {
  PayrollDeductionPolicyDto,
  CreatePayrollDeductionPolicyDto,
  UpdatePayrollDeductionPolicyDto,
  DeductionPolicyScope,
  DeductionCalculationBasis,
} from '@/lib/types/payroll-deduction';

export class PayrollDeductionPolicyService {
  // ---------------------------------------------------------
  // FORMATTERS
  // ---------------------------------------------------------

  private static formatPolicyDto(p: any): PayrollDeductionPolicyDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      policyCode: p.policyCode,
      policyName: p.policyName,
      scope: p.scope as DeductionPolicyScope,
      leaveTypeId: p.leaveTypeId ?? null,
      leaveTypeName: p.leaveType?.name ?? null,
      calculationBasis: p.calculationBasis as DeductionCalculationBasis,
      fixedDivisor: p.fixedDivisor !== null ? Number(p.fixedDivisor) : null,
      lateTriggerCount: p.lateTriggerCount ?? null,
      maxDeductionDaysPerPeriod: p.maxDeductionDaysPerPeriod !== null ? Number(p.maxDeductionDaysPerPeriod) : null,
      notes: p.notes ?? null,
      isActive: p.isActive,
      effectiveFrom: p.effectiveFrom.toISOString(),
      effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString() : null,
      createdByUserId: p.createdByUserId ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------
  // RESOLVE: find most specific active policy for a leave type
  // ---------------------------------------------------------

  /**
   * Resolves the most specific active PayrollDeductionPolicy for an UNPAID_LEAVE
   * for the given tenant and optionally leave type.
   *
   * Resolution order (most specific wins):
   *   1. Active policy matching (tenantId + leaveTypeId + scope=UNPAID_LEAVE)
   *   2. Active policy matching (tenantId + leaveTypeId=null + scope=UNPAID_LEAVE) — catch-all
   *
   * Returns null if no policy is configured (system will skip deduction generation).
   */
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

    const updated = await prisma.payrollDeductionPolicy.update({
      where: { id },
      data: {
        ...(input.policyCode !== undefined && { policyCode: input.policyCode.trim().toUpperCase() }),
        ...(input.policyName !== undefined && { policyName: input.policyName.trim() }),
        ...(input.scope !== undefined && { scope: input.scope }),
        ...(input.leaveTypeId !== undefined && { leaveTypeId: input.leaveTypeId }),
        ...(input.calculationBasis !== undefined && { calculationBasis: input.calculationBasis }),
        ...(input.fixedDivisor !== undefined && { fixedDivisor: input.fixedDivisor }),
        ...(input.lateTriggerCount !== undefined && { lateTriggerCount: input.lateTriggerCount }),
        ...(input.maxDeductionDaysPerPeriod !== undefined && { maxDeductionDaysPerPeriod: input.maxDeductionDaysPerPeriod }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.effectiveFrom !== undefined && { effectiveFrom: new Date(input.effectiveFrom) }),
        ...(input.effectiveTo !== undefined && { effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null }),
      },
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
