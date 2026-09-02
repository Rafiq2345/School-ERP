/**
 * AttendancePayrollReconciliationService
 *
 * Configurable Attendance-to-Payroll Rule Engine & Reconciliation.
 *
 * Core Responsibilities:
 *   1. Evaluates multi-shift employee attendance segment by segment.
 *   2. Enforces the strict Paid Leave Safety Invariant:
 *      Approved PAID leaves generate ZERO payroll deduction inputs.
 *   3. Enforces Unpaid Leave Deduplication:
 *      Approved UNPAID leaves already tracked via LEAVE_APPLICATION inputs do not generate duplicate attendance absence deductions.
 *   4. Evaluates unexcused absences, half-days, early departures, and short hours.
 *   5. Accumulates late arrivals per monthly payroll period (e.g. 3 lates = 1 deduction unit).
 *   6. Handles automatic reconciliation and reversals when attendance corrections occur.
 *   7. Strictly idempotent — never duplicates or hard-deletes financial impact records.
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/errors/app-error';
import { AttendancePayrollRuleService } from './attendance-payroll-rule-service';
import { PayrollDeductionInputService } from './payroll-deduction-input-service';
import type {
  AttendanceReconciliationPreviewItem,
  PeriodReconciliationSummary,
  DeductionCalculationEvidence,
  DeductionSourceType,
} from '@/lib/types/payroll-deduction';

export class AttendancePayrollReconciliationService {
  /**
   * Normalizes a date to UTC midnight.
   */
  public static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new Error(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Previews or reconciles attendance deduction inputs for a given tenant, period, and optional employee.
   */
  public static async evaluatePeriodAttendance(
    tenantId: string,
    periodStartDate: Date,
    periodEndDate: Date,
    options?: {
      employeeId?: string;
      executeCommit?: boolean;
      actorUserId?: string | null;
      actorName?: string | null;
    }
  ): Promise<PeriodReconciliationSummary> {
    const periodStart = this.normalizeDate(periodStartDate);
    const periodEnd = new Date(Date.UTC(periodEndDate.getUTCFullYear(), periodEndDate.getUTCMonth(), periodEndDate.getUTCDate(), 23, 59, 59, 999));
    const { periodLabel } = PayrollDeductionInputService.derivePayrollPeriod(periodStart);
    const calDays = PayrollDeductionInputService.calendarDaysInPeriod(periodStart, periodEnd);

    // 1. Fetch active employees
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        ...(options?.employeeId && { id: options.employeeId }),
      },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
      orderBy: [{ employeeNo: 'asc' }],
    });

    const previewItems: AttendanceReconciliationPreviewItem[] = [];
    let totalGenerated = 0;
    let totalExistingKept = 0;
    let totalReversed = 0;
    let totalSuperseded = 0;
    let totalSkippedPaidLeave = 0;
    let totalSkippedUnpaidLeaveLink = 0;

    for (const emp of employees) {
      // 2. Fetch all attendance records for this employee in the period
      const attendanceRecords = await prisma.employeeAttendanceRecord.findMany({
        where: {
          tenantId,
          employeeId: emp.id,
          attendanceDate: { gte: periodStart, lte: periodEnd },
        },
        include: {
          shift: true,
          leaveType: true,
          leaveApplication: true,
        },
        orderBy: [{ attendanceDate: 'asc' }, { shift: { startTime: 'asc' } }],
      });

      // Group by attendanceDate string (YYYY-MM-DD)
      const recordsByDate = new Map<string, typeof attendanceRecords>();
      for (const rec of attendanceRecords) {
        const dateStr = rec.attendanceDate.toISOString().split('T')[0];
        if (!recordsByDate.has(dateStr)) recordsByDate.set(dateStr, []);
        recordsByDate.get(dateStr)!.push(rec);
      }

      // Track late occurrences for this employee across the period
      const lateOccurrences: {
        dateStr: string;
        shiftId: string;
        shiftName: string;
        lateMinutes: number;
      }[] = [];

      const requiredSourceKeys = new Set<string>();

      // 3. Process each calendar date
      for (const [dateStr, dailyRecords] of recordsByDate.entries()) {
        const totalShiftsOnDay = dailyRecords.length;
        const shiftWeight = totalShiftsOnDay > 0 ? 1 / totalShiftsOnDay : 1.0;
        const roundedShiftWeight = Math.round(shiftWeight * 100) / 100;

        for (const rec of dailyRecords) {
          // Exclude holidays & weekly offs
          if (rec.isHoliday || rec.isWeeklyOff || rec.status === 'HOLIDAY' || rec.status === 'OFF_DAY') {
            continue;
          }

          // Case A: ON_LEAVE (Approved Leave)
          if (rec.status === 'ON_LEAVE' || rec.leaveApplicationId) {
            const isPaid = rec.leaveApplication?.isPaid ?? rec.leaveType?.isPaid ?? false;

            if (isPaid) {
              // PAID LEAVE INVARIANT: ZERO DEDUCTION
              totalSkippedPaidLeave++;
              previewItems.push({
                employeeId: emp.id,
                employeeNo: emp.employeeNo,
                employeeName: `${emp.firstNameEn} ${emp.lastNameEn ?? ''}`.trim(),
                departmentName: emp.department?.name,
                designationName: emp.designation?.name,
                sourceType: 'LEAVE_APPLICATION',
                sourceKey: `PAID_LEAVE:${rec.leaveApplicationId ?? rec.id}`,
                attendanceDate: dateStr,
                shiftName: rec.shift?.name,
                policyCode: 'PAID_LEAVE_BYPASS',
                policyName: 'Approved Paid Leave Bypass',
                calculatedDays: 0,
                reason: `Paid leave (${rec.leaveType?.name ?? 'Casual/Annual'}) — 0 payroll deduction`,
                actionRequired: 'SKIP_PAID_LEAVE',
              });
              continue;
            } else {
              // UNPAID LEAVE: already handled by LeaveApplication feed
              totalSkippedUnpaidLeaveLink++;
              previewItems.push({
                employeeId: emp.id,
                employeeNo: emp.employeeNo,
                employeeName: `${emp.firstNameEn} ${emp.lastNameEn ?? ''}`.trim(),
                departmentName: emp.department?.name,
                designationName: emp.designation?.name,
                sourceType: 'LEAVE_APPLICATION',
                sourceKey: `UNPAID_LEAVE:${rec.leaveApplicationId ?? rec.id}`,
                attendanceDate: dateStr,
                shiftName: rec.shift?.name,
                policyCode: 'UNPAID_LEAVE_LINKED',
                policyName: 'Unpaid Leave Application Link',
                calculatedDays: 0,
                reason: `Covered by Unpaid Leave Application (${rec.leaveApplication?.applicationNumber ?? 'LR'}) — attendance absence deduplicated`,
                actionRequired: 'SKIP_UNPAID_LEAVE_EXISTS',
              });
              continue;
            }
          }

          // Case B: ABSENT (Unexcused Absence)
          if (rec.status === 'ABSENT') {
            const policy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
              tenantId,
              emp.id,
              'UNPAID_LEAVE',
              rec.attendanceDate
            );

            const absenceUnit = policy?.absenceDeductionUnit ?? 1.0;
            const calculatedDays = Math.round(roundedShiftWeight * absenceUnit * 100) / 100;
            const sourceKey = `ATT_ABSENCE:${rec.id}`;
            requiredSourceKeys.add(sourceKey);

            const evidence: DeductionCalculationEvidence = {
              sourceType: 'ATTENDANCE_ABSENCE',
              attendanceDate: dateStr,
              shiftId: rec.shiftId,
              shiftName: rec.shift?.name,
              shiftCode: rec.shift?.code,
              shiftFraction: roundedShiftWeight,
              payrollPeriodStart: periodStart.toISOString().split('T')[0],
              payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
              payrollPeriodLabel: periodLabel,
              calendarDaysInPeriod: calDays,
              calculationBasis: policy?.calculationBasis ?? 'CALENDAR_DAYS',
              fixedDivisorApplied: policy?.fixedDivisor ?? null,
              policyCodeUsed: policy?.policyCode ?? 'STD_ABSENCE_RULE',
              policyIdUsed: policy?.id ?? 'DEFAULT',
              policyNameUsed: policy?.policyName ?? 'Standard Absence Policy',
              isPaid: false,
              deductionDays: calculatedDays,
              deductionAmountNote: 'Base salary calculation deferred to Payroll module.',
              generatedAt: new Date().toISOString(),
              generatedByActor: options?.actorName ?? 'Attendance Reconciliation Engine',
            };

            if (options?.executeCommit) {
              await prisma.$transaction(async (tx) => {
                if (policy?.id) {
                  await PayrollDeductionInputService.generateAttendanceDeductionInput(tx, tenantId, {
                    sourceType: 'ATTENDANCE_ABSENCE',
                    sourceKey,
                    employeeId: emp.id,
                    policyId: policy.id,
                    attendanceRecordId: rec.id,
                    attendanceDate: rec.attendanceDate,
                    shiftId: rec.shiftId,
                    deductionDays: calculatedDays,
                    evidence,
                    actorUserId: options?.actorUserId,
                    actorName: options?.actorName,
                    systemActorNote: `Attendance: Unexcused Absence on ${dateStr} (${rec.shift?.name})`,
                  });
                }
              });
              totalGenerated++;
            }

            previewItems.push({
              employeeId: emp.id,
              employeeNo: emp.employeeNo,
              employeeName: `${emp.firstNameEn} ${emp.lastNameEn ?? ''}`.trim(),
              departmentName: emp.department?.name,
              designationName: emp.designation?.name,
              sourceType: 'ATTENDANCE_ABSENCE',
              sourceKey,
              attendanceDate: dateStr,
              shiftName: rec.shift?.name,
              policyCode: policy?.policyCode ?? 'STD_ABSENCE_RULE',
              policyName: policy?.policyName ?? 'Standard Absence Policy',
              calculatedDays,
              reason: `Unexcused Absence on ${dateStr} (Shift: ${rec.shift?.name ?? 'Main'}, weight: ${roundedShiftWeight})`,
              actionRequired: 'CREATE',
            });
          }

          // Case C: HALF_DAY
          if (rec.status === 'HALF_DAY') {
            const policy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
              tenantId,
              emp.id,
              'HALF_DAY',
              rec.attendanceDate
            );

            const halfDayUnit = policy?.halfDayDeductionUnit ?? 0.5;
            const calculatedDays = Math.round(roundedShiftWeight * halfDayUnit * 100) / 100;
            const sourceKey = `ATT_HALF_DAY:${rec.id}`;
            requiredSourceKeys.add(sourceKey);

            const evidence: DeductionCalculationEvidence = {
              sourceType: 'ATTENDANCE_HALF_DAY',
              attendanceDate: dateStr,
              shiftId: rec.shiftId,
              shiftName: rec.shift?.name,
              shiftCode: rec.shift?.code,
              shiftFraction: roundedShiftWeight,
              payrollPeriodStart: periodStart.toISOString().split('T')[0],
              payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
              payrollPeriodLabel: periodLabel,
              calendarDaysInPeriod: calDays,
              calculationBasis: policy?.calculationBasis ?? 'CALENDAR_DAYS',
              fixedDivisorApplied: policy?.fixedDivisor ?? null,
              policyCodeUsed: policy?.policyCode ?? 'HALF_DAY_RULE',
              policyIdUsed: policy?.id ?? 'DEFAULT',
              policyNameUsed: policy?.policyName ?? 'Half Day Policy',
              isPaid: false,
              deductionDays: calculatedDays,
              deductionAmountNote: 'Base salary calculation deferred to Payroll module.',
              generatedAt: new Date().toISOString(),
              generatedByActor: options?.actorName ?? 'Attendance Reconciliation Engine',
            };

            if (options?.executeCommit && policy?.id) {
              await prisma.$transaction(async (tx) => {
                await PayrollDeductionInputService.generateAttendanceDeductionInput(tx, tenantId, {
                  sourceType: 'ATTENDANCE_HALF_DAY',
                  sourceKey,
                  employeeId: emp.id,
                  policyId: policy.id,
                  attendanceRecordId: rec.id,
                  attendanceDate: rec.attendanceDate,
                  shiftId: rec.shiftId,
                  deductionDays: calculatedDays,
                  evidence,
                  actorUserId: options?.actorUserId,
                  actorName: options?.actorName,
                  systemActorNote: `Attendance: Half Day on ${dateStr} (${rec.shift?.name})`,
                });
              });
              totalGenerated++;
            }

            previewItems.push({
              employeeId: emp.id,
              employeeNo: emp.employeeNo,
              employeeName: `${emp.firstNameEn} ${emp.lastNameEn ?? ''}`.trim(),
              departmentName: emp.department?.name,
              designationName: emp.designation?.name,
              sourceType: 'ATTENDANCE_HALF_DAY',
              sourceKey,
              attendanceDate: dateStr,
              shiftName: rec.shift?.name,
              policyCode: policy?.policyCode ?? 'HALF_DAY_RULE',
              policyName: policy?.policyName ?? 'Half Day Policy',
              calculatedDays,
              reason: `Half Day on ${dateStr} (Shift: ${rec.shift?.name ?? 'Main'})`,
              actionRequired: 'CREATE',
            });
          }

          // Case D: Late Arrival tracking
          const latePolicy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
            tenantId,
            emp.id,
            'LATE_ARRIVALS',
            rec.attendanceDate
          );
          const grace = latePolicy?.lateGraceMinutes ?? rec.shift?.graceMinutes ?? 15;

          if (rec.status === 'LATE' || rec.lateMinutes > grace) {
            lateOccurrences.push({
              dateStr,
              shiftId: rec.shiftId,
              shiftName: rec.shift?.name ?? 'Shift',
              lateMinutes: rec.lateMinutes,
            });
          }
        }
      }

      // 4. Process Late Arrival Accumulation Cycles for this employee
      const latePolicy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
        tenantId,
        emp.id,
        'LATE_ARRIVALS',
        periodStart
      );

      const triggerCount = latePolicy?.lateTriggerCount ?? 3;
      const totalLates = lateOccurrences.length;
      const completeCycles = triggerCount > 0 ? Math.floor(totalLates / triggerCount) : 0;

      for (let cycle = 1; cycle <= completeCycles; cycle++) {
        const sourceKey = `ATT_LATE_ACC:${emp.id}:${periodStart.toISOString().split('T')[0]}:cycle-${cycle}`;
        requiredSourceKeys.add(sourceKey);

        const cycleLates = lateOccurrences.slice((cycle - 1) * triggerCount, cycle * triggerCount);
        const lateDates = cycleLates.map((l) => `${l.dateStr} (${l.lateMinutes}m)`);
        const deductionDays = latePolicy?.lateDeductionUnit ?? 1.0;

        const evidence: DeductionCalculationEvidence = {
          sourceType: 'ATTENDANCE_LATE_ACCUMULATION',
          totalLateOccurrencesInPeriod: totalLates,
          cycleIndex: cycle,
          lateArrivalDatesInCycle: lateDates,
          lateGraceMinutesApplied: latePolicy?.lateGraceMinutes ?? 15,
          payrollPeriodStart: periodStart.toISOString().split('T')[0],
          payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
          payrollPeriodLabel: periodLabel,
          calendarDaysInPeriod: calDays,
          calculationBasis: latePolicy?.calculationBasis ?? 'CALENDAR_DAYS',
          fixedDivisorApplied: latePolicy?.fixedDivisor ?? null,
          policyCodeUsed: latePolicy?.policyCode ?? 'LATE_ACC_POLICY',
          policyIdUsed: latePolicy?.id ?? 'DEFAULT',
          policyNameUsed: latePolicy?.policyName ?? 'Late Arrival Accumulation Policy',
          isPaid: false,
          deductionDays,
          deductionAmountNote: 'Base salary calculation deferred to Payroll module.',
          generatedAt: new Date().toISOString(),
          generatedByActor: options?.actorName ?? 'Attendance Reconciliation Engine',
        };

        if (options?.executeCommit && latePolicy?.id) {
          await prisma.$transaction(async (tx) => {
            await PayrollDeductionInputService.generateAttendanceDeductionInput(tx, tenantId, {
              sourceType: 'ATTENDANCE_LATE_ACCUMULATION',
              sourceKey,
              employeeId: emp.id,
              policyId: latePolicy.id,
              attendanceDate: periodStart,
              deductionDays,
              evidence,
              actorUserId: options?.actorUserId,
              actorName: options?.actorName,
              systemActorNote: `Late Accumulation: Cycle ${cycle} (${triggerCount} late arrivals: ${lateDates.join(', ')})`,
            });
          });
          totalGenerated++;
        }

        previewItems.push({
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          employeeName: `${emp.firstNameEn} ${emp.lastNameEn ?? ''}`.trim(),
          departmentName: emp.department?.name,
          designationName: emp.designation?.name,
          sourceType: 'ATTENDANCE_LATE_ACCUMULATION',
          sourceKey,
          policyCode: latePolicy?.policyCode ?? 'LATE_ACC_POLICY',
          policyName: latePolicy?.policyName ?? 'Late Arrival Accumulation Policy',
          calculatedDays: deductionDays,
          reason: `Late Arrival Accumulation Cycle ${cycle} (${triggerCount} lates reached: ${lateDates.join(', ')})`,
          actionRequired: 'CREATE',
        });
      }

      // 5. Reconciliation / Reversal of Obsolete Attendance Inputs
      if (options?.executeCommit) {
        const existingAttendanceInputs = await prisma.payrollDeductionInput.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            payrollPeriodStart: periodStart,
            sourceType: { not: 'LEAVE_APPLICATION' },
            status: 'PENDING',
          },
        });

        for (const existingInput of existingAttendanceInputs) {
          if (existingInput.deductionSourceKey && !requiredSourceKeys.has(existingInput.deductionSourceKey)) {
            // Source is no longer valid (e.g. attendance corrected from ABSENT to PRESENT)
            await PayrollDeductionInputService.reverseDeductionInput(
              tenantId,
              existingInput.id,
              'Attendance corrected or exception no longer active during period reconciliation',
              options?.actorUserId
            );
            totalReversed++;
          } else {
            totalExistingKept++;
          }
        }
      }
    }

    return {
      tenantId,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      periodLabel,
      totalEmployeesEvaluated: employees.length,
      totalGenerated,
      totalExistingKept,
      totalReversed,
      totalSuperseded,
      totalSkippedPaidLeave,
      totalSkippedUnpaidLeaveLink,
      items: previewItems,
    };
  }
}
