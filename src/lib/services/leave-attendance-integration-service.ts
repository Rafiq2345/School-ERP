import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { HolidayService } from './holiday-service';
import { WorkScheduleService } from './work-schedule-service';

const prisma = new PrismaClient();

export interface LeaveAttendanceIntegrationResult {
  applicationId: string;
  applicationNumber: string;
  employeeId: string;
  leaveScope: string;
  createdAttendanceRecords: number;
  updatedAttendanceRecords: number;
  auditLogsCreated: number;
  integratedShiftIds: string[];
}

export class LeaveAttendanceIntegrationService {
  /**
   * Normalizes a date to UTC midnight.
   */
  private static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new Error(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Helper to ensure shift ID satisfies foreign key constraints against Shift table.
   */
  public static async resolveValidShiftIdInTx(tx: any, tenantId: string, shiftId?: string | null): Promise<string> {
    if (shiftId) {
      const existingShift = await tx.shift.findFirst({ where: { tenantId, id: shiftId }, select: { id: true } });
      if (existingShift) return existingShift.id;
    }
    let fallback = await tx.shift.findFirst({ where: { tenantId }, select: { id: true } });
    if (!fallback) {
      fallback = await tx.shift.create({
        data: {
          tenantId,
          name: 'Standard Shift',
          code: 'SHIFT-STD-' + Date.now().toString().slice(-4),
          startTime: '08:00',
          endTime: '14:00',
          isDefault: true,
          isActive: true,
        },
        select: { id: true },
      });
    }
    return fallback.id;
  }

  /**
   * Auto-integrates an approved leave application into Employee Attendance within a transaction.
   * Only FINAL APPROVED leave applications can affect attendance.
   * Fully idempotent: duplicate execution updates existing links safely without duplication.
   */
  public static async integrateApprovedLeaveWithAttendanceInTx(
    tx: any,
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ): Promise<LeaveAttendanceIntegrationResult> {
    const application = await tx.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        employee: { include: { department: true, designation: true } },
        leaveType: true,
        leavePolicy: true,
        dates: { orderBy: { date: 'asc' } },
        shifts: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
      },
    });

    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application [${applicationId}] not found.`);
    }

    // STRICT INVARIANT 1: Only APPROVED leave applications affect Attendance
    if (application.status !== 'APPROVED') {
      return {
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        employeeId: application.employeeId,
        leaveScope: application.leaveScope,
        createdAttendanceRecords: 0,
        updatedAttendanceRecords: 0,
        auditLogsCreated: 0,
        integratedShiftIds: [],
      };
    }

    let createdAttendanceRecords = 0;
    let updatedAttendanceRecords = 0;
    let auditLogsCreated = 0;
    const integratedShiftIds: string[] = [];

    const actorUser = actorUserId
      ? await tx.user.findUnique({ where: { id: actorUserId } })
      : null;
    const validActorUserId = actorUser ? actorUser.id : null;

    // =========================================================================
    // CASE 1: SPECIFIC_SHIFT (Highest priority requirement)
    // =========================================================================
    if (application.leaveScope === 'SPECIFIC_SHIFT') {
      for (const shiftApp of application.shifts) {
        const attendanceDate = this.normalizeDate(shiftApp.date);
        const shiftId = shiftApp.shiftId;
        integratedShiftIds.push(shiftId);

        // Check if date is calendar holiday or weekly off
        const holidayCheck = await HolidayService.isDateHoliday(tenantId, attendanceDate);
        if (holidayCheck.isHoliday) {
          // If holiday/off-day, do not overwrite holiday attendance
          continue;
        }

        const existing = await tx.employeeAttendanceRecord.findUnique({
          where: {
            tenantId_employeeId_attendanceDate_shiftId: {
              tenantId,
              employeeId: application.employeeId,
              attendanceDate,
              shiftId,
            },
          },
        });

        const leaveRemark = `Approved Leave Request ${application.applicationNumber} (${application.leaveType.name} - ${shiftApp.shiftName})`;

        if (existing) {
          // Idempotency check: If already ON_LEAVE for this application, no-op
          if (existing.status === 'ON_LEAVE' && existing.leaveApplicationId === application.id) {
            continue;
          }

          const previousStatus = existing.status;

          await tx.employeeAttendanceRecord.update({
            where: { id: existing.id },
            data: {
              status: 'ON_LEAVE',
              leaveTypeId: application.leaveTypeId,
              leaveApplicationId: application.id,
              leaveScope: 'SPECIFIC_SHIFT',
              remarks: existing.remarks ? `${existing.remarks} | ${leaveRemark}` : leaveRemark,
              // Preserve existing punch times if present
            },
          });

          // Create audit log for automatic leave integration
          await tx.employeeAttendanceAuditLog.create({
            data: {
              tenantId,
              attendanceRecordId: existing.id,
              employeeId: application.employeeId,
              shiftId,
              attendanceDate,
              previousStatus,
              newStatus: 'ON_LEAVE',
              previousCheckIn: existing.checkInTime,
              newCheckIn: existing.checkInTime,
              previousCheckOut: existing.checkOutTime,
              newCheckOut: existing.checkOutTime,
              previousRemarks: existing.remarks,
              newRemarks: leaveRemark,
              correctionReason: `Attendance status changed from ${previousStatus} to ON_LEAVE due to final approval of ${application.applicationNumber}.`,
              correctedByUserId: validActorUserId,
            },
          });

          updatedAttendanceRecords++;
          auditLogsCreated++;
        } else {
          // Create new ON_LEAVE attendance record for the specific shift
          await tx.employeeAttendanceRecord.create({
            data: {
              tenantId,
              employeeId: application.employeeId,
              attendanceDate,
              shiftId,
              scheduledStartTime: shiftApp.startTime,
              scheduledEndTime: shiftApp.endTime,
              status: 'ON_LEAVE',
              leaveTypeId: application.leaveTypeId,
              leaveApplicationId: application.id,
              leaveScope: 'SPECIFIC_SHIFT',
              punchSource: 'LEAVE_INTEGRATION',
              remarks: leaveRemark,
              recordedByUserId: validActorUserId,
            },
          });

          createdAttendanceRecords++;
        }
      }
    }

    // =========================================================================
    // CASE 2: FULL_DAY
    // =========================================================================
    else if (application.leaveScope === 'FULL_DAY') {
      const workingDates = application.dates.filter((d: any) => d.isWorkingDay);

      for (const d of workingDates) {
        const attendanceDate = this.normalizeDate(d.date);

        // Check if calendar holiday or weekly off
        const holidayCheck = await HolidayService.isDateHoliday(tenantId, attendanceDate);
        if (holidayCheck.isHoliday) continue;

        // Resolve applicable scheduled shifts for this employee on this date
        const scheduleResolution = await WorkScheduleService.resolveWorkScheduleForEmployee(
          tenantId,
          application.employeeId,
          attendanceDate
        );

        if (!scheduleResolution.isWorkingDay || scheduleResolution.shifts.length === 0) {
          continue;
        }

        const leaveRemark = `Approved Full Day Leave ${application.applicationNumber} (${application.leaveType.name})`;

        for (const seg of scheduleResolution.shifts) {
          const shiftId = await LeaveAttendanceIntegrationService.resolveValidShiftIdInTx(tx, tenantId, seg.shiftId);
          integratedShiftIds.push(shiftId);

          const existing = await tx.employeeAttendanceRecord.findUnique({
            where: {
              tenantId_employeeId_attendanceDate_shiftId: {
                tenantId,
                employeeId: application.employeeId,
                attendanceDate,
                shiftId,
              },
            },
          });

          if (existing) {
            if (existing.status === 'ON_LEAVE' && existing.leaveApplicationId === application.id) {
              continue;
            }

            const previousStatus = existing.status;

            await tx.employeeAttendanceRecord.update({
              where: { id: existing.id },
              data: {
                status: 'ON_LEAVE',
                leaveTypeId: application.leaveTypeId,
                leaveApplicationId: application.id,
                leaveScope: 'FULL_DAY',
                remarks: existing.remarks ? `${existing.remarks} | ${leaveRemark}` : leaveRemark,
              },
            });

            await tx.employeeAttendanceAuditLog.create({
              data: {
                tenantId,
                attendanceRecordId: existing.id,
                employeeId: application.employeeId,
                shiftId,
                attendanceDate,
                previousStatus,
                newStatus: 'ON_LEAVE',
                previousCheckIn: existing.checkInTime,
                newCheckIn: existing.checkInTime,
                previousCheckOut: existing.checkOutTime,
                newCheckOut: existing.checkOutTime,
                previousRemarks: existing.remarks,
                newRemarks: leaveRemark,
                correctionReason: `Attendance status changed from ${previousStatus} to ON_LEAVE due to final approval of ${application.applicationNumber}.`,
                correctedByUserId: validActorUserId,
              },
            });

            updatedAttendanceRecords++;
            auditLogsCreated++;
          } else {
            await tx.employeeAttendanceRecord.create({
              data: {
                tenantId,
                employeeId: application.employeeId,
                attendanceDate,
                shiftId,
                scheduledStartTime: seg.scheduledStartTime,
                scheduledEndTime: seg.scheduledEndTime,
                status: 'ON_LEAVE',
                leaveTypeId: application.leaveTypeId,
                leaveApplicationId: application.id,
                leaveScope: 'FULL_DAY',
                punchSource: 'LEAVE_INTEGRATION',
                remarks: leaveRemark,
                recordedByUserId: validActorUserId,
              },
            });
            createdAttendanceRecords++;
          }
        }
      }
    }

    // =========================================================================
    // CASE 3: HALF_DAY
    // =========================================================================
    else if (application.leaveScope === 'HALF_DAY') {
      const workingDates = application.dates.filter((d: any) => d.isWorkingDay);

      for (const d of workingDates) {
        const attendanceDate = this.normalizeDate(d.date);
        const holidayCheck = await HolidayService.isDateHoliday(tenantId, attendanceDate);
        if (holidayCheck.isHoliday) continue;

        const scheduleResolution = await WorkScheduleService.resolveWorkScheduleForEmployee(
          tenantId,
          application.employeeId,
          attendanceDate
        );

        if (!scheduleResolution.isWorkingDay || scheduleResolution.shifts.length === 0) continue;

        const shifts = scheduleResolution.shifts;
        const halfDayPeriod = application.halfDayPeriod || 'FIRST_HALF';
        const leaveRemark = `Approved Half Day Leave (${halfDayPeriod}) ${application.applicationNumber} (${application.leaveType.name})`;

        // If employee has multiple shifts, first half maps to shift 0, second half maps to last shift
        let targetShift = shifts[0];
        if (shifts.length > 1 && halfDayPeriod === 'SECOND_HALF') {
          targetShift = shifts[shifts.length - 1];
        }

        const shiftId = await LeaveAttendanceIntegrationService.resolveValidShiftIdInTx(tx, tenantId, targetShift.shiftId);
        integratedShiftIds.push(shiftId);

        const existing = await tx.employeeAttendanceRecord.findUnique({
          where: {
            tenantId_employeeId_attendanceDate_shiftId: {
              tenantId,
              employeeId: application.employeeId,
              attendanceDate,
              shiftId,
            },
          },
        });

        if (existing) {
          if (existing.status === 'ON_LEAVE' && existing.leaveApplicationId === application.id) continue;

          const previousStatus = existing.status;

          await tx.employeeAttendanceRecord.update({
            where: { id: existing.id },
            data: {
              status: 'ON_LEAVE',
              leaveTypeId: application.leaveTypeId,
              leaveApplicationId: application.id,
              leaveScope: 'HALF_DAY',
              halfDayPeriod,
              remarks: existing.remarks ? `${existing.remarks} | ${leaveRemark}` : leaveRemark,
            },
          });

          await tx.employeeAttendanceAuditLog.create({
            data: {
              tenantId,
              attendanceRecordId: existing.id,
              employeeId: application.employeeId,
              shiftId: targetShift.shiftId,
              attendanceDate,
              previousStatus,
              newStatus: 'ON_LEAVE',
              previousCheckIn: existing.checkInTime,
              newCheckIn: existing.checkInTime,
              previousCheckOut: existing.checkOutTime,
              newCheckOut: existing.checkOutTime,
              previousRemarks: existing.remarks,
              newRemarks: leaveRemark,
              correctionReason: `Attendance status changed from ${previousStatus} to ON_LEAVE (${halfDayPeriod}) due to final approval of ${application.applicationNumber}.`,
              correctedByUserId: validActorUserId,
            },
          });

          updatedAttendanceRecords++;
          auditLogsCreated++;
        } else {
          await tx.employeeAttendanceRecord.create({
            data: {
              tenantId,
              employeeId: application.employeeId,
              attendanceDate,
              shiftId: targetShift.shiftId,
              scheduledStartTime: targetShift.scheduledStartTime,
              scheduledEndTime: targetShift.scheduledEndTime,
              status: 'ON_LEAVE',
              leaveTypeId: application.leaveTypeId,
              leaveApplicationId: application.id,
              leaveScope: 'HALF_DAY',
              halfDayPeriod,
              punchSource: 'LEAVE_INTEGRATION',
              remarks: leaveRemark,
              recordedByUserId: validActorUserId,
            },
          });
          createdAttendanceRecords++;
        }
      }
    }

    // =========================================================================
    // CASE 4: HOURLY (Short Leave Interval)
    // =========================================================================
    else if (application.leaveScope === 'HOURLY') {
      const attendanceDate = this.normalizeDate(application.startDate);
      const holidayCheck = await HolidayService.isDateHoliday(tenantId, attendanceDate);

      if (!holidayCheck.isHoliday) {
        const scheduleResolution = await WorkScheduleService.resolveWorkScheduleForEmployee(
          tenantId,
          application.employeeId,
          attendanceDate
        );

        if (scheduleResolution.shifts.length > 0) {
          // Attach interval to matching shift
          const targetShift = scheduleResolution.shifts[0];
          const shiftId = await LeaveAttendanceIntegrationService.resolveValidShiftIdInTx(tx, tenantId, targetShift.shiftId);
          integratedShiftIds.push(shiftId);

          const existing = await tx.employeeAttendanceRecord.findUnique({
            where: {
              tenantId_employeeId_attendanceDate_shiftId: {
                tenantId,
                employeeId: application.employeeId,
                attendanceDate,
                shiftId,
              },
            },
          });

          const intervalRemark = `Approved Short Leave (${application.startTime || '00:00'} - ${application.endTime || '00:00'}) ${application.applicationNumber}`;

          if (existing) {
            await tx.employeeAttendanceRecord.update({
              where: { id: existing.id },
              data: {
                leaveTypeId: application.leaveTypeId,
                leaveApplicationId: application.id,
                leaveScope: 'HOURLY',
                leaveStartTime: application.startTime,
                leaveEndTime: application.endTime,
                remarks: existing.remarks ? `${existing.remarks} | ${intervalRemark}` : intervalRemark,
                // Does NOT mark entire shift ON_LEAVE
              },
            });
            updatedAttendanceRecords++;
          } else {
            await tx.employeeAttendanceRecord.create({
              data: {
                tenantId,
                employeeId: application.employeeId,
                attendanceDate,
                shiftId,
                scheduledStartTime: targetShift.scheduledStartTime,
                scheduledEndTime: targetShift.scheduledEndTime,
                status: 'PRESENT', // Kept as standard working record with leave interval
                leaveTypeId: application.leaveTypeId,
                leaveApplicationId: application.id,
                leaveScope: 'HOURLY',
                leaveStartTime: application.startTime,
                leaveEndTime: application.endTime,
                punchSource: 'LEAVE_INTEGRATION',
                remarks: intervalRemark,
                recordedByUserId: validActorUserId,
              },
            });
            createdAttendanceRecords++;
          }
        }
      }
    }

    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      employeeId: application.employeeId,
      leaveScope: application.leaveScope,
      createdAttendanceRecords,
      updatedAttendanceRecords,
      auditLogsCreated,
      integratedShiftIds,
    };
  }

  /**
   * Standalone non-transactional helper for auto-integrating approved leave with attendance.
   */
  public static async integrateApprovedLeaveWithAttendance(
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ): Promise<LeaveAttendanceIntegrationResult> {
    return prisma.$transaction(async (tx) => {
      return this.integrateApprovedLeaveWithAttendanceInTx(tx, tenantId, applicationId, actorUserId);
    });
  }

  /**
   * Reverses or cancels attendance integration when a leave application is cancelled or revoked.
   */
  public static async reverseLeaveAttendanceInTx(
    tx: any,
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ): Promise<{ reversedCount: number }> {
    const linkedRecords = await tx.employeeAttendanceRecord.findMany({
      where: { tenantId, leaveApplicationId: applicationId },
    });

    for (const rec of linkedRecords) {
      if (rec.punchSource === 'LEAVE_INTEGRATION' && !rec.checkInTime && !rec.checkOutTime) {
        // Safe to remove purely system-generated placeholder record
        await tx.employeeAttendanceRecord.delete({ where: { id: rec.id } });
      } else {
        // If biometric/manual punch existed, reset status to PRESENT / UNMARKED and clear leave link
        await tx.employeeAttendanceRecord.update({
          where: { id: rec.id },
          data: {
            status: 'PRESENT',
            leaveTypeId: null,
            leaveApplicationId: null,
            leaveScope: null,
            halfDayPeriod: null,
            leaveStartTime: null,
            leaveEndTime: null,
          },
        });
      }
    }

    return { reversedCount: linkedRecords.length };
  }
}
