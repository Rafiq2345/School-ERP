/**
 * PayrollDeductionInputService
 *
 * Generates and manages auditable payroll deduction evidence records for
 * final-approved unpaid leave applications.
 *
 * Design invariants:
 *  - Only APPROVED + isPaid=false leave applications generate deduction inputs.
 *  - Draft, Pending, Rejected, Cancelled, or Sent Back → ZERO payroll impact.
 *  - One record per (tenantId + leaveApplicationId + payrollPeriodStart) — DB-enforced unique.
 *  - deductionAmount is always null here: the future Payroll module populates it.
 *  - Records are never hard-deleted. Only REVERSED or CANCELLED.
 *  - Every state change is recorded in PayrollDeductionAuditLog (append-only).
 *
 * Phase 3 Step 1: Payroll period = calendar month of the leave start date.
 * Future Phase: PayrollPeriod master table introduced by full Payroll module.
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { PayrollDeductionPolicyService } from './payroll-deduction-policy-service';
import type {
  PayrollDeductionInputDto,
  PayrollDeductionAuditLogDto,
  PayrollDeductionGenerationResult,
  DeductionCalculationEvidence,
  DeductionCalculationBasis,
  DeductionInputStatus,
  DeductionAuditAction,
  PayrollDeductionInputQueryOptions,
} from '@/lib/types/payroll-deduction';

export class PayrollDeductionInputService {
  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  /**
   * Derives the calendar-month payroll period for a given leave start date.
   * Returns { periodStart, periodEnd, periodLabel }.
   * e.g. 2026-09-10 → { 2026-09-01, 2026-09-30, "September 2026" }
   */
  public static derivePayrollPeriod(leaveStartDate: Date): {
    periodStart: Date;
    periodEnd: Date;
    periodLabel: string;
  } {
    const y = leaveStartDate.getUTCFullYear();
    const m = leaveStartDate.getUTCMonth(); // 0-indexed
    const periodStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)); // last day of month
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const periodLabel = `${monthNames[m]} ${y}`;
    return { periodStart, periodEnd, periodLabel };
  }

  /** Counts calendar days in a month for a given period. */
  private static calendarDaysInPeriod(periodStart: Date, periodEnd: Date): number {
    const diffMs = periodEnd.getTime() - periodStart.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  // ---------------------------------------------------------
  // FORMATTERS
  // ---------------------------------------------------------

  private static formatAuditLogDto(log: any): PayrollDeductionAuditLogDto {
    return {
      id: log.id,
      tenantId: log.tenantId,
      deductionInputId: log.deductionInputId,
      action: log.action as DeductionAuditAction,
      actorUserId: log.actorUserId ?? null,
      actorName: log.actorName ?? null,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      reason: log.reason ?? null,
      evidence: log.evidence ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private static formatInputDto(input: any): PayrollDeductionInputDto {
    return {
      id: input.id,
      tenantId: input.tenantId,
      policyId: input.policyId,
      policyCode: input.policy?.policyCode,
      policyName: input.policy?.policyName,
      leaveApplicationId: input.leaveApplicationId,
      applicationNumber: input.leaveApplication?.applicationNumber,
      employeeId: input.employeeId,
      employeeName: input.employee
        ? `${input.employee.firstNameEn} ${input.employee.lastNameEn ?? ''}`.trim()
        : undefined,
      employeeNo: input.employee?.employeeNo,
      leaveTypeId: input.leaveTypeId ?? null,
      leaveTypeName: input.leaveType?.name ?? null,
      payrollPeriodStart: input.payrollPeriodStart.toISOString().split('T')[0],
      payrollPeriodEnd: input.payrollPeriodEnd.toISOString().split('T')[0],
      payrollPeriodLabel: input.payrollPeriodLabel,
      deductionScope: input.deductionScope,
      calculationBasis: input.calculationBasis as DeductionCalculationBasis,
      deductionDays: Number(input.deductionDays),
      fixedDivisorUsed: input.fixedDivisorUsed !== null ? Number(input.fixedDivisorUsed) : null,
      deductionAmount: input.deductionAmount !== null ? Number(input.deductionAmount) : null,
      currencyCode: input.currencyCode,
      status: input.status as DeductionInputStatus,
      reversalReason: input.reversalReason ?? null,
      reversedAt: input.reversedAt ? input.reversedAt.toISOString() : null,
      reversedByUserId: input.reversedByUserId ?? null,
      systemActorNote: input.systemActorNote ?? null,
      calculationEvidence: input.calculationEvidence as DeductionCalculationEvidence,
      createdByUserId: input.createdByUserId ?? null,
      processedAt: input.processedAt ? input.processedAt.toISOString() : null,
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
      auditLogs: input.auditLogs?.map(PayrollDeductionInputService.formatAuditLogDto) ?? undefined,
    };
  }

  // ---------------------------------------------------------
  // CORE: Generate deduction input for a final-approved leave
  // ---------------------------------------------------------

  /**
   * Generates a PayrollDeductionInput for a final-approved unpaid leave application
   * within an existing Prisma transaction.
   *
   * Safe-skip conditions (logs warning, no throw):
   *  - Application is paid (isPaid=true)
   *  - Application status is not APPROVED
   *  - No active PayrollDeductionPolicy is configured for this tenant/leave type
   *  - Deduction input already exists for this application+period (idempotency)
   *
   * Callers: LeaveApprovalService.processApproverAction (final approval transaction)
   */
  public static async generateForApprovedLeave(
    tx: any,
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ): Promise<PayrollDeductionGenerationResult> {
    const application = await tx.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        employee: { select: { id: true, firstNameEn: true, lastNameEn: true, employeeNo: true } },
        leaveType: { select: { id: true, name: true, code: true } },
      },
    });

    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundError(`LeaveApplication [${applicationId}] not found.`);
    }

    const baseResult: PayrollDeductionGenerationResult = {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      employeeId: application.employeeId,
      skipped: false,
    };

    // Guard 1: Only APPROVED leave can generate payroll impact
    if (application.status !== 'APPROVED') {
      console.warn(
        `[PayrollDeductionInputService] Skipping: application ${application.applicationNumber} status=${application.status} (must be APPROVED)`
      );
      return { ...baseResult, skipped: true, skipReason: `status=${application.status}` };
    }

    // Guard 2: Only unpaid leave triggers a deduction
    if (application.isPaid === true) {
      console.info(
        `[PayrollDeductionInputService] Skipping: application ${application.applicationNumber} isPaid=true — no payroll deduction for paid leave.`
      );
      return { ...baseResult, skipped: true, skipReason: 'isPaid=true' };
    }

    // Resolve the payroll deduction policy (outside transaction for policy lookup)
    const policy = await PayrollDeductionPolicyService.resolveUnpaidLeavePolicy(
      tenantId,
      application.leaveTypeId
    );

    if (!policy) {
      console.warn(
        `[PayrollDeductionInputService] No active PayrollDeductionPolicy configured for tenant=${tenantId} leaveType=${application.leaveTypeId} scope=UNPAID_LEAVE. Skipping deduction generation.`
      );
      return {
        ...baseResult,
        skipped: true,
        skipReason: 'No active PayrollDeductionPolicy configured for this tenant/leave type',
      };
    }

    // Derive the payroll period from leave start date
    const { periodStart, periodEnd, periodLabel } = this.derivePayrollPeriod(application.startDate);
    const calendarDays = this.calendarDaysInPeriod(periodStart, periodEnd);
    const deductionDays = Number(application.requestedDays);
    const fixedDivisorUsed = policy.fixedDivisor ?? null;

    // Guard 3: Idempotency — check if deduction input already exists for this application+period
    const existing = await tx.payrollDeductionInput.findFirst({
      where: {
        tenantId,
        leaveApplicationId: application.id,
        payrollPeriodStart: periodStart,
      },
    });

    if (existing) {
      console.info(
        `[PayrollDeductionInputService] Idempotent: deduction input already exists for ${application.applicationNumber} period=${periodLabel}. Returning existing record.`
      );
      return {
        ...baseResult,
        skipped: false,
        wasIdempotent: true,
        deductionInput: {
          id: existing.id,
          tenantId: existing.tenantId,
          policyId: existing.policyId,
          leaveApplicationId: existing.leaveApplicationId,
          employeeId: existing.employeeId,
          leaveTypeId: existing.leaveTypeId ?? null,
          payrollPeriodStart: existing.payrollPeriodStart.toISOString().split('T')[0],
          payrollPeriodEnd: existing.payrollPeriodEnd.toISOString().split('T')[0],
          payrollPeriodLabel: existing.payrollPeriodLabel,
          deductionScope: existing.deductionScope,
          calculationBasis: existing.calculationBasis as DeductionCalculationBasis,
          deductionDays: Number(existing.deductionDays),
          fixedDivisorUsed: existing.fixedDivisorUsed !== null ? Number(existing.fixedDivisorUsed) : null,
          deductionAmount: null,
          currencyCode: existing.currencyCode,
          status: existing.status as DeductionInputStatus,
          reversalReason: null,
          reversedAt: null,
          reversedByUserId: null,
          systemActorNote: existing.systemActorNote ?? null,
          calculationEvidence: existing.calculationEvidence as DeductionCalculationEvidence,
          createdByUserId: existing.createdByUserId ?? null,
          processedAt: null,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        },
      };
    }

    // Build calculation evidence (full audit trail of what was used)
    const evidence: DeductionCalculationEvidence = {
      leaveApplicationNumber: application.applicationNumber,
      leaveTypeName: application.leaveType?.name ?? 'Unknown',
      leaveScope: application.leaveScope,
      requestedDays: deductionDays,
      payrollPeriodStart: periodStart.toISOString().split('T')[0],
      payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
      payrollPeriodLabel: periodLabel,
      calendarDaysInPeriod: calendarDays,
      calculationBasis: policy.calculationBasis as DeductionCalculationBasis,
      fixedDivisorApplied: fixedDivisorUsed,
      policyCodeUsed: policy.policyCode,
      policyIdUsed: policy.id,
      isPaid: application.isPaid,
      deductionDays,
      deductionAmountNote:
        'deductionAmount is null pending Payroll module salary data. Formula: (salary / divisor) x deductionDays',
      generatedAt: new Date().toISOString(),
      generatedByActor: actorUserId
        ? `User:${actorUserId}`
        : 'System: LeaveApprovalService.finalApproval',
    };

    // Create the deduction input inside the transaction
    const deductionInput = await tx.payrollDeductionInput.create({
      data: {
        tenantId,
        policyId: policy.id,
        leaveApplicationId: application.id,
        employeeId: application.employeeId,
        leaveTypeId: application.leaveTypeId,
        payrollPeriodStart: periodStart,
        payrollPeriodEnd: periodEnd,
        payrollPeriodLabel: periodLabel,
        deductionScope: 'UNPAID_LEAVE',
        calculationBasis: policy.calculationBasis,
        deductionDays,
        fixedDivisorUsed: fixedDivisorUsed,
        deductionAmount: null, // Populated by Payroll module when salary data is available
        currencyCode: 'PKR',
        status: 'PENDING',
        systemActorNote: `System: Final Approval ${application.applicationNumber}`,
        calculationEvidence: evidence as any,
        createdByUserId: actorUserId ?? null,
      },
    });

    // Create immutable audit log entry
    await tx.payrollDeductionAuditLog.create({
      data: {
        tenantId,
        deductionInputId: deductionInput.id,
        action: 'GENERATED',
        actorUserId: actorUserId ?? null,
        actorName: actorUserId ? `User:${actorUserId}` : 'System',
        previousStatus: 'N/A',
        newStatus: 'PENDING',
        reason: `Auto-generated on final approval of ${application.applicationNumber}`,
        evidence: evidence as any,
      },
    });

    console.info(
      `[PayrollDeductionInputService] Generated deduction input ${deductionInput.id} for ${application.applicationNumber} — deductionDays=${deductionDays} period=${periodLabel} policy=${policy.policyCode}`
    );

    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      employeeId: application.employeeId,
      skipped: false,
      wasIdempotent: false,
      deductionInput: {
        id: deductionInput.id,
        tenantId: deductionInput.tenantId,
        policyId: deductionInput.policyId,
        policyCode: policy.policyCode,
        policyName: policy.policyName,
        leaveApplicationId: deductionInput.leaveApplicationId,
        applicationNumber: application.applicationNumber,
        employeeId: deductionInput.employeeId,
        leaveTypeId: deductionInput.leaveTypeId ?? null,
        leaveTypeName: application.leaveType?.name ?? null,
        payrollPeriodStart: periodStart.toISOString().split('T')[0],
        payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
        payrollPeriodLabel: periodLabel,
        deductionScope: 'UNPAID_LEAVE',
        calculationBasis: policy.calculationBasis as DeductionCalculationBasis,
        deductionDays,
        fixedDivisorUsed,
        deductionAmount: null,
        currencyCode: 'PKR',
        status: 'PENDING',
        reversalReason: null,
        reversedAt: null,
        reversedByUserId: null,
        systemActorNote: `System: Final Approval ${application.applicationNumber}`,
        calculationEvidence: evidence,
        createdByUserId: actorUserId ?? null,
        processedAt: null,
        createdAt: deductionInput.createdAt.toISOString(),
        updatedAt: deductionInput.updatedAt.toISOString(),
      },
    };
  }

  // ---------------------------------------------------------
  // REVERSAL
  // ---------------------------------------------------------

  /**
   * Reverses a PayrollDeductionInput (e.g. when leave is later cancelled or revoked).
   * Creates an immutable audit log entry. The original record is preserved with status=REVERSED.
   * Financial records are never hard-deleted.
   */
  public static async reverseDeductionInput(
    tenantId: string,
    inputId: string,
    reason: string,
    actorUserId?: string | null,
    actorName?: string | null
  ): Promise<PayrollDeductionInputDto> {
    if (!reason || reason.trim().length < 3) {
      throw new ValidationError('A meaningful reversal reason is required (minimum 3 characters).');
    }

    const existing = await prisma.payrollDeductionInput.findFirst({
      where: { id: inputId, tenantId },
      include: {
        policy: true,
        leaveApplication: { select: { applicationNumber: true } },
        employee: { select: { id: true, firstNameEn: true, lastNameEn: true, employeeNo: true } },
        leaveType: { select: { name: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!existing) throw new NotFoundError(`PayrollDeductionInput [${inputId}] not found.`);

    if (existing.status === 'REVERSED' || existing.status === 'CANCELLED') {
      throw new ValidationError(
        `PayrollDeductionInput [${inputId}] is already ${existing.status} and cannot be reversed again.`
      );
    }

    const previousStatus = existing.status;

    const reversed = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollDeductionInput.update({
        where: { id: inputId },
        data: {
          status: 'REVERSED',
          reversalReason: reason.trim(),
          reversedAt: new Date(),
          reversedByUserId: actorUserId ?? null,
        },
        include: {
          policy: true,
          leaveApplication: { select: { applicationNumber: true } },
          employee: { select: { id: true, firstNameEn: true, lastNameEn: true, employeeNo: true } },
          leaveType: { select: { name: true } },
          auditLogs: { orderBy: { createdAt: 'asc' } },
        },
      });

      await tx.payrollDeductionAuditLog.create({
        data: {
          tenantId,
          deductionInputId: inputId,
          action: 'REVERSED',
          actorUserId: actorUserId ?? null,
          actorName: actorName ?? (actorUserId ? `User:${actorUserId}` : 'System'),
          previousStatus,
          newStatus: 'REVERSED',
          reason: reason.trim(),
          evidence: { reversedAt: new Date().toISOString(), reason: reason.trim() } as any,
        },
      });

      return updated;
    });

    return this.formatInputDto(reversed);
  }

  // ---------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------

  public static async listDeductionInputs(
    options: PayrollDeductionInputQueryOptions
  ): Promise<{ data: PayrollDeductionInputDto[]; total: number }> {
    const {
      tenantId, employeeId, status, payrollPeriodStart,
      leaveApplicationId, leaveTypeId, policyId,
      page = 1, pageSize = 20,
    } = options;

    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (leaveApplicationId) where.leaveApplicationId = leaveApplicationId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (policyId) where.policyId = policyId;
    if (payrollPeriodStart) {
      const d = new Date(payrollPeriodStart);
      where.payrollPeriodStart = { gte: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) };
    }

    const [data, total] = await prisma.$transaction([
      prisma.payrollDeductionInput.findMany({
        where,
        include: {
          policy: true,
          leaveApplication: { select: { applicationNumber: true } },
          employee: { select: { id: true, firstNameEn: true, lastNameEn: true, employeeNo: true } },
          leaveType: { select: { name: true } },
          auditLogs: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payrollDeductionInput.count({ where }),
    ]);

    return { data: data.map(this.formatInputDto), total };
  }

  public static async getDeductionInputById(
    tenantId: string,
    id: string
  ): Promise<PayrollDeductionInputDto> {
    const input = await prisma.payrollDeductionInput.findFirst({
      where: { id, tenantId },
      include: {
        policy: true,
        leaveApplication: { select: { applicationNumber: true } },
        employee: { select: { id: true, firstNameEn: true, lastNameEn: true, employeeNo: true } },
        leaveType: { select: { name: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!input) throw new NotFoundError(`PayrollDeductionInput [${id}] not found.`);
    return this.formatInputDto(input);
  }
}
