/**
 * PayrollDeductionInputService
 *
 * Generates and manages auditable payroll deduction evidence records for:
 *   1. Final-approved unpaid leave applications (LEAVE_APPLICATION)
 *   2. Attendance-based exceptions (ATTENDANCE_ABSENCE, ATTENDANCE_LATE_ACCUMULATION, ATTENDANCE_HALF_DAY, etc.)
 *
 * Design invariants:
 *  - Only APPROVED + isPaid=false leave applications generate deduction inputs.
 *  - Paid leave applications generate ZERO deduction records.
 *  - One record per (tenantId + deductionSourceKey + payrollPeriodStart) — DB-enforced unique.
 *  - deductionAmount is always null here: the future Payroll module populates it.
 *  - Records are never hard-deleted. Only REVERSED, CANCELLED, or SUPERSEDED.
 *  - Every state change is recorded in PayrollDeductionAuditLog (append-only).
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
  DeductionSourceType,
  PayrollDeductionInputQueryOptions,
} from '@/lib/types/payroll-deduction';

export class PayrollDeductionInputService {
  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  /**
   * Derives the calendar-month payroll period for a given date.
   * Returns { periodStart, periodEnd, periodLabel }.
   * e.g. 2026-09-10 → { 2026-09-01, 2026-09-30, "September 2026" }
   */
  public static derivePayrollPeriod(date: Date): {
    periodStart: Date;
    periodEnd: Date;
    periodLabel: string;
  } {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth(); // 0-indexed
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
  public static calendarDaysInPeriod(periodStart: Date, periodEnd: Date): number {
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

  public static formatInputDto(input: any): PayrollDeductionInputDto {
    return {
      id: input.id,
      tenantId: input.tenantId,
      policyId: input.policyId,
      policyCode: input.policy?.policyCode,
      policyName: input.policy?.policyName,
      sourceType: (input.sourceType as DeductionSourceType) || 'LEAVE_APPLICATION',
      leaveApplicationId: input.leaveApplicationId ?? null,
      applicationNumber: input.leaveApplication?.applicationNumber,
      attendanceRecordId: input.attendanceRecordId ?? null,
      attendanceDate: input.attendanceDate ? input.attendanceDate.toISOString().split('T')[0] : null,
      shiftId: input.shiftId ?? null,
      shiftName: input.shift?.name ?? null,
      deductionSourceKey: input.deductionSourceKey ?? null,
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
      fixedDivisorUsed: input.fixedDivisorUsed !== null && input.fixedDivisorUsed !== undefined ? Number(input.fixedDivisorUsed) : null,
      deductionAmount: input.deductionAmount !== null && input.deductionAmount !== undefined ? Number(input.deductionAmount) : null,
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
  // 1. GENERATE FOR APPROVED UNPAID LEAVE
  // ---------------------------------------------------------

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

    const sourceKey = `LEAVE:${application.id}`;
    const baseResult: PayrollDeductionGenerationResult = {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      sourceKey,
      employeeId: application.employeeId,
      skipped: false,
      wasIdempotent: false,
    };

    // Guard 1: Only APPROVED leave can generate payroll impact
    if (application.status !== 'APPROVED') {
      return { ...baseResult, skipped: true, skipReason: `status=${application.status}` };
    }

    // Guard 2: Only unpaid leave triggers a deduction
    if (application.isPaid === true) {
      console.info(
        `[PayrollDeductionInputService] Skipping: application ${application.applicationNumber} isPaid=true — no payroll deduction for paid leave.`
      );
      return { ...baseResult, skipped: true, skipReason: 'isPaid=true' };
    }

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

    const { periodStart, periodEnd, periodLabel } = this.derivePayrollPeriod(application.startDate);
    const calDays = this.calendarDaysInPeriod(periodStart, periodEnd);

    // Guard 3: Idempotency check
    const existing = await tx.payrollDeductionInput.findFirst({
      where: {
        tenantId,
        deductionSourceKey: sourceKey,
        payrollPeriodStart: periodStart,
      },
      include: {
        policy: true,
        leaveApplication: true,
        employee: true,
        leaveType: true,
      },
    });

    if (existing) {
      console.info(
        `[PayrollDeductionInputService] Idempotent: deduction input already exists for ${application.applicationNumber} period=${periodLabel}. Returning existing record.`
      );
      return {
        ...baseResult,
        wasIdempotent: true,
        deductionInput: this.formatInputDto(existing),
      };
    }

    const rawDeductionDays = Number(application.requestedDays);
    const deductionDays =
      policy.maxDeductionDaysPerPeriod !== null
        ? Math.min(rawDeductionDays, policy.maxDeductionDaysPerPeriod)
        : rawDeductionDays;

    const actorUser = actorUserId
      ? await tx.user.findUnique({ where: { id: actorUserId }, select: { id: true, username: true } })
      : null;
    const actorName = actorUser?.username ?? (actorUserId ? 'User' : 'System: Final Approval');

    const evidence: DeductionCalculationEvidence = {
      sourceType: 'LEAVE_APPLICATION',
      leaveApplicationNumber: application.applicationNumber,
      leaveTypeName: application.leaveType?.name ?? 'Unpaid Leave',
      leaveScope: application.leaveScope,
      requestedDays: rawDeductionDays,
      payrollPeriodStart: periodStart.toISOString().split('T')[0],
      payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
      payrollPeriodLabel: periodLabel,
      calendarDaysInPeriod: calDays,
      calculationBasis: policy.calculationBasis,
      fixedDivisorApplied: policy.fixedDivisor,
      policyCodeUsed: policy.policyCode,
      policyIdUsed: policy.id,
      policyNameUsed: policy.policyName,
      isPaid: false,
      deductionDays,
      deductionAmountNote: 'Base salary calculation deferred to Payroll module.',
      generatedAt: new Date().toISOString(),
      generatedByActor: actorName,
    };

    const created = await tx.payrollDeductionInput.create({
      data: {
        tenantId,
        policyId: policy.id,
        sourceType: 'LEAVE_APPLICATION',
        leaveApplicationId: application.id,
        deductionSourceKey: sourceKey,
        employeeId: application.employeeId,
        leaveTypeId: application.leaveTypeId,
        payrollPeriodStart: periodStart,
        payrollPeriodEnd: periodEnd,
        payrollPeriodLabel: periodLabel,
        deductionScope: policy.scope,
        calculationBasis: policy.calculationBasis,
        deductionDays,
        fixedDivisorUsed: policy.fixedDivisor,
        deductionAmount: null,
        currencyCode: 'PKR',
        status: 'PENDING',
        systemActorNote: `System: Final Approval ${application.applicationNumber}`,
        calculationEvidence: evidence as any,
        createdByUserId: actorUser?.id ?? null,
      },
      include: {
        policy: true,
        leaveApplication: true,
        employee: true,
        leaveType: true,
      },
    });

    await tx.payrollDeductionAuditLog.create({
      data: {
        tenantId,
        deductionInputId: created.id,
        action: 'GENERATED',
        actorUserId: actorUser?.id ?? null,
        actorName,
        previousStatus: 'N/A',
        newStatus: 'PENDING',
        reason: `Final approval of unpaid leave application ${application.applicationNumber}`,
        evidence: evidence as any,
      },
    });

    return {
      ...baseResult,
      wasIdempotent: false,
      deductionInput: this.formatInputDto(created),
    };
  }

  // ---------------------------------------------------------
  // 2. GENERATE / RECONCILE FOR ATTENDANCE EXCEPTION
  // ---------------------------------------------------------

  public static async generateAttendanceDeductionInput(
    tx: any,
    tenantId: string,
    params: {
      sourceType: DeductionSourceType;
      sourceKey: string;
      employeeId: string;
      policyId: string;
      attendanceRecordId?: string | null;
      attendanceDate: Date;
      shiftId?: string | null;
      deductionDays: number;
      evidence: DeductionCalculationEvidence;
      actorUserId?: string | null;
      actorName?: string | null;
      systemActorNote?: string | null;
    }
  ): Promise<PayrollDeductionInputDto> {
    const { periodStart, periodEnd, periodLabel } = this.derivePayrollPeriod(params.attendanceDate);

    // Idempotency check
    const existing = await tx.payrollDeductionInput.findFirst({
      where: {
        tenantId,
        deductionSourceKey: params.sourceKey,
        payrollPeriodStart: periodStart,
      },
      include: {
        policy: true,
        employee: true,
        shift: true,
      },
    });

    if (existing) {
      return this.formatInputDto(existing);
    }

    const policy = await tx.payrollDeductionPolicy.findUnique({
      where: { id: params.policyId },
    });
    if (!policy) throw new NotFoundError(`PayrollDeductionPolicy [${params.policyId}] not found.`);

    const actorUser = params.actorUserId
      ? await tx.user.findUnique({ where: { id: params.actorUserId }, select: { id: true, username: true } })
      : null;
    const actorName = actorUser?.username ?? params.actorName ?? 'System: Attendance Reconciliation';

    const created = await tx.payrollDeductionInput.create({
      data: {
        tenantId,
        policyId: policy.id,
        sourceType: params.sourceType,
        attendanceRecordId: params.attendanceRecordId ?? null,
        attendanceDate: params.attendanceDate,
        shiftId: params.shiftId ?? null,
        deductionSourceKey: params.sourceKey,
        employeeId: params.employeeId,
        payrollPeriodStart: periodStart,
        payrollPeriodEnd: periodEnd,
        payrollPeriodLabel: periodLabel,
        deductionScope: policy.scope,
        calculationBasis: policy.calculationBasis,
        deductionDays: params.deductionDays,
        fixedDivisorUsed: policy.fixedDivisor,
        deductionAmount: null,
        currencyCode: 'PKR',
        status: 'PENDING',
        systemActorNote: params.systemActorNote ?? 'Attendance Reconciliation Engine',
        calculationEvidence: params.evidence as any,
        createdByUserId: actorUser?.id ?? null,
      },
      include: {
        policy: true,
        employee: true,
        shift: true,
      },
    });

    await tx.payrollDeductionAuditLog.create({
      data: {
        tenantId,
        deductionInputId: created.id,
        action: 'GENERATED',
        actorUserId: actorUser?.id ?? null,
        actorName,
        previousStatus: 'N/A',
        newStatus: 'PENDING',
        reason: `Attendance exception generated (${params.sourceType})`,
        evidence: params.evidence as any,
      },
    });

    return this.formatInputDto(created);
  }

  // ---------------------------------------------------------
  // 3. REVERSAL / SUPERSEDING (NEVER HARD DELETE)
  // ---------------------------------------------------------

  public static async reverseDeductionInput(
    tenantId: string,
    inputId: string,
    reason: string,
    actorUserId?: string | null
  ): Promise<PayrollDeductionInputDto> {
    if (!reason || !reason.trim()) {
      throw new ValidationError('A reversal reason is required.');
    }

    return await prisma.$transaction(async (tx) => {
      const input = await tx.payrollDeductionInput.findFirst({
        where: { id: inputId, tenantId },
        include: { policy: true, leaveApplication: true, employee: true, leaveType: true, shift: true },
      });

      if (!input) throw new NotFoundError(`PayrollDeductionInput [${inputId}] not found.`);

      if (input.status === 'PROCESSED') {
        throw new ValidationError(
          `Cannot reverse deduction input [${input.id}]: it has already been PROCESSED by the Payroll module.`
        );
      }

      if (input.status === 'REVERSED') {
        return this.formatInputDto(input);
      }

      const actorUser = actorUserId
        ? await tx.user.findUnique({ where: { id: actorUserId }, select: { id: true, username: true } })
        : null;
      const actorName = actorUser?.username ?? (actorUserId ? 'User' : 'System: Reversal');

      const updated = await tx.payrollDeductionInput.update({
        where: { id: inputId },
        data: {
          status: 'REVERSED',
          reversalReason: reason.trim(),
          reversedAt: new Date(),
          reversedByUserId: actorUser?.id ?? null,
        },
        include: { policy: true, leaveApplication: true, employee: true, leaveType: true, shift: true },
      });

      await tx.payrollDeductionAuditLog.create({
        data: {
          tenantId,
          deductionInputId: inputId,
          action: 'REVERSED',
          actorUserId: actorUser?.id ?? null,
          actorName,
          previousStatus: input.status,
          newStatus: 'REVERSED',
          reason: reason.trim(),
          evidence: {
            reversedAt: new Date().toISOString(),
            reversedBy: actorName,
            originalEvidence: input.calculationEvidence,
          },
        },
      });

      return this.formatInputDto(updated);
    });
  }

  public static async supersedeDeductionInput(
    tx: any,
    tenantId: string,
    inputId: string,
    reason: string,
    replacementSourceKey: string,
    actorName: string = 'System: Attendance Reconciliation'
  ): Promise<PayrollDeductionInputDto> {
    const input = await tx.payrollDeductionInput.findFirst({
      where: { id: inputId, tenantId },
      include: { policy: true, leaveApplication: true, employee: true, leaveType: true, shift: true },
    });

    if (!input) throw new NotFoundError(`PayrollDeductionInput [${inputId}] not found.`);

    const updated = await tx.payrollDeductionInput.update({
      where: { id: inputId },
      data: {
        status: 'SUPERSEDED',
        reversalReason: reason,
        reversedAt: new Date(),
      },
      include: { policy: true, leaveApplication: true, employee: true, leaveType: true, shift: true },
    });

    await tx.payrollDeductionAuditLog.create({
      data: {
        tenantId,
        deductionInputId: inputId,
        action: 'SUPERSEDED',
        actorName,
        previousStatus: input.status,
        newStatus: 'SUPERSEDED',
        reason,
        evidence: {
          supersededBy: replacementSourceKey,
          supersededAt: new Date().toISOString(),
        },
      },
    });

    return this.formatInputDto(updated);
  }

  // ---------------------------------------------------------
  // 4. QUERIES
  // ---------------------------------------------------------

  public static async queryInputs(options: PayrollDeductionInputQueryOptions): Promise<{
    data: PayrollDeductionInputDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      tenantId,
      employeeId,
      sourceType,
      status,
      payrollPeriodStart,
      leaveApplicationId,
      attendanceDate,
      leaveTypeId,
      policyId,
      page = 1,
      pageSize = 50,
    } = options;

    const where: any = {
      tenantId,
      ...(employeeId && { employeeId }),
      ...(sourceType && { sourceType }),
      ...(status && { status }),
      ...(payrollPeriodStart && { payrollPeriodStart: new Date(payrollPeriodStart) }),
      ...(leaveApplicationId && { leaveApplicationId }),
      ...(attendanceDate && { attendanceDate: new Date(attendanceDate) }),
      ...(leaveTypeId && { leaveTypeId }),
      ...(policyId && { policyId }),
    };

    const [records, total] = await Promise.all([
      prisma.payrollDeductionInput.findMany({
        where,
        include: {
          policy: true,
          leaveApplication: { select: { applicationNumber: true } },
          employee: { select: { firstNameEn: true, lastNameEn: true, employeeNo: true } },
          leaveType: { select: { name: true } },
          shift: { select: { name: true } },
          auditLogs: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: [{ payrollPeriodStart: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payrollDeductionInput.count({ where }),
    ]);

    return {
      data: records.map(this.formatInputDto),
      total,
      page,
      pageSize,
    };
  }
}
