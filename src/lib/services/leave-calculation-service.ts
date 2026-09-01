import { prisma } from '@/lib/db/prisma';
import { ValidationError, NotFoundError } from '@/lib/errors/app-error';
import {
  LeaveCalculationPreviewInputDto,
  LeaveCalculationPreviewResultDto,
  LeaveCalculationDateBreakdown,
  LeaveCalculationShiftBreakdown,
  LeaveValidationWarning,
  ShiftSelectionItem,
} from '@/lib/types/leave';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';
import { HolidayService } from '@/lib/services/holiday-service';

export class LeaveCalculationService {
  /**
   * Normalizes date to UTC midnight.
   */
  public static normalizeDate(input: string | Date): Date {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));
      }
    }
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  public static formatDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  /**
   * Converts HH:MM to total minutes from midnight.
   */
  public static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return h * 60 + (m || 0);
  }

  /**
   * Core Leave Calculation & Validation Engine
   */
  public static async calculateLeavePreview(
    tenantId: string,
    input: LeaveCalculationPreviewInputDto,
    excludeApplicationId?: string
  ): Promise<LeaveCalculationPreviewResultDto> {
    const startDate = this.normalizeDate(input.startDate);
    const endDate = this.normalizeDate(input.endDate);

    if (endDate < startDate) {
      throw new ValidationError('End date cannot be earlier than start date.');
    }

    // 1. Fetch Employee
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        department: true,
        designation: true,
        employmentType: true,
      },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new NotFoundError(`Employee with ID [${input.employeeId}] not found.`);
    }

    // 2. Fetch Leave Type
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: input.leaveTypeId },
    });

    if (!leaveType || leaveType.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Type with ID [${input.leaveTypeId}] not found.`);
    }

    if (!leaveType.isActive) {
      throw new ValidationError(`Leave Type [${leaveType.name}] is currently inactive.`);
    }

    // 3. Resolve Applicable Leave Policy for the employee on startDate
    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(tenantId, employee.id, startDate);
    if (!resolved || !resolved.policy) {
      throw new ValidationError(
        `No active leave policy found for employee [${employee.firstNameEn} ${employee.lastNameEn}] on date ${this.formatDateString(startDate)}.`
      );
    }

    const policyRule = resolved.policy.rules?.find((r) => r.leaveTypeId === leaveType.id);
    if (!policyRule) {
      throw new ValidationError(
        `Leave Type [${leaveType.name}] is not configured under employee's active policy [${resolved.policy.name}].`
      );
    }

    // 4. Resolve Calendar, Working Days, and Holidays
    const holidays = await prisma.schoolHoliday.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    const weeklyOffSetting = await HolidayService.getWeeklyOffSetting(tenantId);
    const weeklyOffDays = new Set(weeklyOffSetting.daysOfWeek);

    // 5. Generate Date Breakdown & Scheduled Shifts Resolution
    const dateBreakdown: LeaveCalculationDateBreakdown[] = [];
    const shiftBreakdown: LeaveCalculationShiftBreakdown[] = [];

    const curr = new Date(startDate.getTime());
    let totalWorkingDays = 0;
    let totalHolidays = 0;
    let totalWeeklyOffs = 0;
    let totalRequestedDays = 0;
    let totalDurationHours = 0;

    const warnings: LeaveValidationWarning[] = [];
    const errors: LeaveValidationWarning[] = [];

    // Check scope permissions against policy rule and leave type
    const allowFullDay = leaveType.allowFullDay;
    const allowHalfDay = policyRule.allowHalfDay && leaveType.allowHalfDay;
    const allowShiftWise = policyRule.allowShiftWise && leaveType.allowShiftWise;
    const allowHourly = policyRule.allowHourly && leaveType.allowHourly;

    if (input.leaveScope === 'FULL_DAY' && !allowFullDay) {
      errors.push({
        field: 'leaveScope',
        code: 'SCOPE_NOT_ALLOWED',
        message: `Full-day leave is not permitted for ${leaveType.name} under current policy.`,
        severity: 'ERROR',
      });
    }

    if (input.leaveScope === 'HALF_DAY' && !allowHalfDay) {
      errors.push({
        field: 'leaveScope',
        code: 'SCOPE_NOT_ALLOWED',
        message: `Half-day leave is not permitted for ${leaveType.name} under current policy.`,
        severity: 'ERROR',
      });
    }

    if (
      (input.leaveScope === 'SPECIFIC_SHIFT' || input.leaveScope === 'MULTIPLE_SHIFTS') &&
      !allowShiftWise
    ) {
      errors.push({
        field: 'leaveScope',
        code: 'SCOPE_NOT_ALLOWED',
        message: `Shift-wise leave is not permitted for ${leaveType.name} under current policy.`,
        severity: 'ERROR',
      });
    }

    if (input.leaveScope === 'HOURLY' && !allowHourly) {
      errors.push({
        field: 'leaveScope',
        code: 'SCOPE_NOT_ALLOWED',
        message: `Hourly / Short leave is not permitted for ${leaveType.name} under current policy.`,
        severity: 'ERROR',
      });
    }

    // Hourly timing validation
    if (input.leaveScope === 'HOURLY') {
      if (!input.startTime || !input.endTime) {
        errors.push({
          field: 'startTime',
          code: 'TIME_REQUIRED',
          message: 'Start time and End time are required for hourly / short leave.',
          severity: 'ERROR',
        });
      } else {
        const startMin = this.timeToMinutes(input.startTime);
        const endMin = this.timeToMinutes(input.endTime);
        if (endMin <= startMin) {
          errors.push({
            field: 'endTime',
            code: 'INVALID_TIME_RANGE',
            message: 'End time must be later than start time.',
            severity: 'ERROR',
          });
        } else {
          totalDurationHours = (endMin - startMin) / 60;
        }
      }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    while (curr <= endDate) {
      const dateStr = this.formatDateString(curr);
      const dayOfWeek = curr.getUTCDay();

      // Check Holiday
      const matchedHoliday = holidays.find(
        (h) => this.normalizeDate(h.startDate) <= curr && this.normalizeDate(h.endDate) >= curr
      );
      const isHoliday = !!matchedHoliday;
      const isWeeklyOff = weeklyOffDays.has(dayOfWeek);
      const isWorkingDay = !isHoliday && !isWeeklyOff;

      if (isHoliday) totalHolidays++;
      else if (isWeeklyOff) totalWeeklyOffs++;
      else totalWorkingDays++;

      // Resolve Employee Scheduled Shifts on this date
      const resolvedSchedule = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, employee.id, curr);
      const scheduledShifts = resolvedSchedule?.shifts || [];

      let dateLeaveQty = 0;
      let notes = '';

      if (!isWorkingDay) {
        notes = isHoliday ? `Holiday: ${matchedHoliday?.title}` : 'Weekly Off';
      } else {
        // Calculate leave quantity for this working day
        if (input.leaveScope === 'FULL_DAY') {
          dateLeaveQty = 1.0;
        } else if (input.leaveScope === 'HALF_DAY') {
          dateLeaveQty = 0.5;
        } else if (input.leaveScope === 'SPECIFIC_SHIFT' || input.leaveScope === 'MULTIPLE_SHIFTS') {
          // Match selected shifts for this specific date
          const dateSelectedShifts = (input.selectedShifts || []).filter((s) => s.date === dateStr);
          if (dateSelectedShifts.length === 0) {
            warnings.push({
              field: 'selectedShifts',
              code: 'NO_SHIFT_SELECTED',
              message: `No shift selected for working date ${dateStr}.`,
              severity: 'WARNING',
            });
          } else {
            const totalScheduled = scheduledShifts.length || 1;
            const isAllShiftsSelected = dateSelectedShifts.length >= totalScheduled;

            for (const sel of dateSelectedShifts) {
              const matchedShift = scheduledShifts.find((s) => s.shiftId === sel.shiftId);
              if (!matchedShift) {
                warnings.push({
                  field: 'selectedShifts',
                  code: 'SHIFT_NOT_SCHEDULED',
                  message: `Shift [${sel.shiftName || sel.shiftCode}] is not on employee's scheduled duty for ${dateStr}.`,
                  severity: 'WARNING',
                });
              }
              const fraction = totalScheduled === 1 ? 1.0 : Number((1 / totalScheduled).toFixed(2));
              dateLeaveQty += fraction;
              shiftBreakdown.push({
                date: dateStr,
                shiftId: sel.shiftId,
                shiftCode: sel.shiftCode || matchedShift?.shiftCode || 'SHIFT',
                shiftName: sel.shiftName || matchedShift?.shiftName || 'Duty Shift',
                startTime: sel.startTime || matchedShift?.scheduledStartTime || '08:00',
                endTime: sel.endTime || matchedShift?.scheduledEndTime || '16:00',
                leaveFraction: fraction,
              });
            }

            if (isAllShiftsSelected) {
              dateLeaveQty = 1.0;
            }
          }
        } else if (input.leaveScope === 'HOURLY') {
          // Hourly leave: fraction of a standard 8-hour workday
          const dayHours = totalDurationHours > 0 ? totalDurationHours : 1;
          const dayFraction = Number((dayHours / 8.0).toFixed(2));
          dateLeaveQty = Math.max(Number(policyRule.minLeaveUnit || 0.13), dayFraction);
        }
      }

      totalRequestedDays += dateLeaveQty;

      dateBreakdown.push({
        date: dateStr,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        isWorkingDay,
        isHoliday,
        holidayName: matchedHoliday?.title || null,
        scheduledShiftsCount: scheduledShifts.length,
        scheduledShifts: scheduledShifts.map((s) => ({
          shiftId: s.shiftId,
          shiftCode: s.shiftCode,
          shiftName: s.shiftName,
          startTime: s.scheduledStartTime,
          endTime: s.scheduledEndTime,
        })),
        appliedScope: input.leaveScope,
        leaveQuantity: dateLeaveQty,
        notes,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // 6. Probation & Confirmation Status Validation
    const confirmationStatus = (employee.confirmationStatus as any) || 'CONFIRMED';
    const isProbation = confirmationStatus === 'PROBATION' || confirmationStatus === 'EXTENDED_PROBATION';

    if (isProbation) {
      if (policyRule.probationTreatment === 'NOT_ALLOWED') {
        errors.push({
          code: 'PROBATION_NOT_ALLOWED',
          message: `${leaveType.name} is not permitted for employees under probation or extended probation.`,
          severity: 'ERROR',
        });
      } else if (policyRule.entitlementRelease === 'ON_CONFIRMATION') {
        errors.push({
          code: 'CONFIRMATION_REQUIRED',
          message: `${leaveType.name} entitlement is only released upon formal HR confirmation.`,
          severity: 'ERROR',
        });
      }
    }

    // 7. Balance & Pending Requests Calculation
    const leaveYear = startDate.getUTCFullYear();
    const entitlementRecord = await prisma.employeeLeaveEntitlement.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        leaveYear,
      },
    });

    const allocatedDays = entitlementRecord ? Number(entitlementRecord.allocatedDays) : Number(policyRule.annualEntitlement || 0);
    const usedDays = entitlementRecord ? Number(entitlementRecord.usedDays) : 0;
    const adjustedDays = entitlementRecord ? Number(entitlementRecord.adjustedDays) : 0;
    const availableBalance = entitlementRecord
      ? Number(entitlementRecord.availableBalance)
      : Number(policyRule.annualEntitlement || 0);

    // Sum all pending applications for this employee, leave type, and year
    const pendingApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] },
        ...(excludeApplicationId ? { id: { not: excludeApplicationId } } : {}),
      },
      select: { requestedDays: true },
    });

    const pendingRequestedDays = pendingApps.reduce((acc, app) => acc + Number(app.requestedDays), 0);
    const effectiveRemainingBalance = Number((availableBalance - pendingRequestedDays).toFixed(2));
    const projectedBalanceAfterApproval = Number((effectiveRemainingBalance - totalRequestedDays).toFixed(2));

    // Probation limited entitlement check
    if (isProbation && policyRule.probationTreatment === 'LIMITED_ENTITLEMENT' && policyRule.probationEntitlement !== null) {
      const maxProbation = Number(policyRule.probationEntitlement);
      if (usedDays + pendingRequestedDays + totalRequestedDays > maxProbation) {
        errors.push({
          code: 'PROBATION_LIMIT_EXCEEDED',
          message: `Request of ${totalRequestedDays}d exceeds the probation entitlement limit of ${maxProbation}d (Used: ${usedDays}d, Pending: ${pendingRequestedDays}d).`,
          severity: 'ERROR',
        });
      }
    }

    // Balance / Negative balance validation
    const isUnlimited = Boolean(policyRule.isUnlimited || leaveType.isUnlimited || (!policyRule.isPaid && !leaveType.isPaid));
    if (!isUnlimited) {
      if (projectedBalanceAfterApproval < 0) {
        if (!policyRule.allowNegativeBalance) {
          errors.push({
            code: 'INSUFFICIENT_BALANCE',
            message: `Requested leave of ${totalRequestedDays}d exceeds effective remaining balance of ${effectiveRemainingBalance}d (Available: ${availableBalance}d, Pending: ${pendingRequestedDays}d).`,
            severity: 'ERROR',
          });
        } else {
          const maxNegative = Number(policyRule.maxNegativeBalance || 0);
          if (projectedBalanceAfterApproval < -maxNegative) {
            errors.push({
              code: 'MAX_NEGATIVE_BALANCE_EXCEEDED',
              message: `Projected balance of ${projectedBalanceAfterApproval}d exceeds the maximum permitted negative balance of -${maxNegative}d.`,
              severity: 'ERROR',
            });
          } else {
            warnings.push({
              code: 'NEGATIVE_BALANCE_APPLIED',
              message: `This request will result in a negative balance of ${projectedBalanceAfterApproval}d (allowed up to -${maxNegative}d).`,
              severity: 'WARNING',
            });
          }
        }
      }
    }

    // 8. Overlapping / Duplicate Application Protection
    const overlappingApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeApplicationId ? { id: { not: excludeApplicationId } } : {}),
      },
      include: {
        dates: true,
        shifts: true,
        leaveType: true,
      },
    });

    for (const app of overlappingApps) {
      // Check date-by-date overlap
      for (const d of dateBreakdown) {
        if (!d.isWorkingDay) continue;

        const appDateMatch = app.dates.find(
          (ad) => this.formatDateString(this.normalizeDate(ad.date)) === d.date && Number(ad.leaveQuantity) > 0
        );

        if (appDateMatch) {
          // If existing app is FULL_DAY or current request is FULL_DAY -> direct overlap
          if (app.leaveScope === 'FULL_DAY' || input.leaveScope === 'FULL_DAY') {
            errors.push({
              code: 'DUPLICATE_APPLICATION',
              message: `Employee already has a ${app.status} leave request (${app.applicationNumber} - ${app.leaveType.name}) covering ${d.date}.`,
              severity: 'ERROR',
            });
          } else if (app.leaveScope === 'HALF_DAY' && input.leaveScope === 'HALF_DAY') {
            // Half day vs Half day -> conflict if same half
            if (app.halfDayPeriod && input.halfDayPeriod && app.halfDayPeriod === input.halfDayPeriod) {
              errors.push({
                code: 'DUPLICATE_HALF_DAY',
                message: `Employee already has a ${app.status} ${app.halfDayPeriod} leave request (${app.applicationNumber}) on ${d.date}.`,
                severity: 'ERROR',
              });
            }
          } else if (
            (app.leaveScope === 'SPECIFIC_SHIFT' || app.leaveScope === 'MULTIPLE_SHIFTS') &&
            (input.leaveScope === 'SPECIFIC_SHIFT' || input.leaveScope === 'MULTIPLE_SHIFTS')
          ) {
            // Shift-specific overlap
            const appShiftsOnDate = app.shifts.filter(
              (s) => this.formatDateString(this.normalizeDate(s.date)) === d.date
            );
            const currentShiftsOnDate = shiftBreakdown.filter((s) => s.date === d.date);

            for (const cs of currentShiftsOnDate) {
              const matchedAppShift = appShiftsOnDate.find((as) => as.shiftId === cs.shiftId);
              if (matchedAppShift) {
                errors.push({
                  code: 'DUPLICATE_SHIFT_LEAVE',
                  message: `Employee already has a ${app.status} leave request (${app.applicationNumber}) for ${cs.shiftName} on ${d.date}.`,
                  severity: 'ERROR',
                });
              }
            }
          } else if (app.leaveScope === 'HOURLY' && input.leaveScope === 'HOURLY') {
            // Hourly overlap check
            if (app.startTime && app.endTime && input.startTime && input.endTime) {
              const appStart = this.timeToMinutes(app.startTime);
              const appEnd = this.timeToMinutes(app.endTime);
              const curStart = this.timeToMinutes(input.startTime);
              const curEnd = this.timeToMinutes(input.endTime);

              if (Math.max(appStart, curStart) < Math.min(appEnd, curEnd)) {
                errors.push({
                  code: 'DUPLICATE_HOURLY_LEAVE',
                  message: `Employee already has a ${app.status} hourly leave request (${app.applicationNumber}: ${app.startTime}-${app.endTime}) overlapping this period on ${d.date}.`,
                  severity: 'ERROR',
                });
              }
            }
          }
        }
      }
    }

    // 9. Attachment requirement check
    const requiresAttachment =
      Boolean(leaveType.attachmentRequired) &&
      totalRequestedDays > (leaveType.attachmentThresholdDays || 0);

    if (requiresAttachment) {
      warnings.push({
        code: 'ATTACHMENT_REQUIRED',
        message: `Supporting documentation is mandatory for ${leaveType.name} requests exceeding ${leaveType.attachmentThresholdDays} days.`,
        severity: 'WARNING',
      });
    }

    const totalCalendarDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      isValid: errors.length === 0,
      employee: {
        id: employee.id,
        employeeNo: employee.employeeNo,
        name: `${employee.firstNameEn} ${employee.lastNameEn}`,
        departmentName: employee.department?.name || 'Unassigned',
        designationName: employee.designation?.name || 'Unassigned',
        employmentTypeName: employee.employmentType?.name || 'Unassigned',
        confirmationStatus,
      },
      policy: {
        id: resolved.policy.id,
        name: resolved.policy.name,
        code: resolved.policy.code,
        rule: {
          annualEntitlement: policyRule.annualEntitlement ? Number(policyRule.annualEntitlement) : null,
          isPaid: policyRule.isPaid,
          isUnlimited: policyRule.isUnlimited,
          allowFullDay: leaveType.allowFullDay,
          allowHalfDay: policyRule.allowHalfDay,
          allowShiftWise: policyRule.allowShiftWise,
          allowHourly: policyRule.allowHourly,
          allowNegativeBalance: policyRule.allowNegativeBalance,
          maxNegativeBalance: Number(policyRule.maxNegativeBalance || 0),
          probationTreatment: policyRule.probationTreatment as any,
          probationEntitlement: policyRule.probationEntitlement ? Number(policyRule.probationEntitlement) : null,
          entitlementRelease: policyRule.entitlementRelease as any,
          attachmentRequired: leaveType.attachmentRequired,
          attachmentThresholdDays: leaveType.attachmentThresholdDays,
        },
      },
      leaveType: {
        id: leaveType.id,
        name: leaveType.name,
        code: leaveType.code,
        isPaid: leaveType.isPaid,
        isUnlimited: leaveType.isUnlimited,
        allowFullDay: leaveType.allowFullDay,
        allowHalfDay: leaveType.allowHalfDay,
        allowShiftWise: leaveType.allowShiftWise,
        allowHourly: leaveType.allowHourly,
      },
      calendarSummary: {
        totalCalendarDays,
        workingDaysCount: totalWorkingDays,
        holidaysCount: totalHolidays,
        weeklyOffCount: totalWeeklyOffs,
        totalRequestedDays: Number(totalRequestedDays.toFixed(2)),
        totalDurationHours: input.leaveScope === 'HOURLY' ? totalDurationHours : null,
      },
      dateBreakdown,
      shiftBreakdown,
      balanceSnapshot: {
        allocatedDays,
        usedDays,
        adjustedDays,
        availableBalance,
        pendingRequestedDays: Number(pendingRequestedDays.toFixed(2)),
        effectiveRemainingBalance,
        projectedBalanceAfterApproval,
        isUnlimited: policyRule.isUnlimited || leaveType.isUnlimited,
      },
      requiresAttachment,
      attachmentThresholdDays: leaveType.attachmentThresholdDays || 0,
      warnings,
      errors,
    };
  }
}
