import { PrismaClient } from '@prisma/client';
import {
  EmployeeAttendanceStatus,
  EmployeePunchSource,
  EmployeeDTO,
  EmployeeAttendanceRecordDTO,
  ShiftSegmentAttendanceDTO,
  DailyEmployeeRosterItem,
  EmployeeAttendanceDashboardMetrics,
  EmployeeAttendanceCorrectionAuditDTO,
  PayrollAttendanceSummaryDTO,
} from '@/lib/types/employee-attendance';
import { HolidayService } from './holiday-service';
import { ShiftService, ResolvedShiftSegment } from './shift-service';
import { WorkScheduleService } from './work-schedule-service';

const prisma = new PrismaClient();

export interface SaveEmployeeAttendanceRecordInput {
  employeeId: string;
  shiftId: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  checkInTime?: string | null; // HH:MM
  checkOutTime?: string | null; // HH:MM
  status: EmployeeAttendanceStatus;
  leaveTypeId?: string | null;
  remarks?: string | null;
  punchSource?: EmployeePunchSource;
}

export interface SaveEmployeeAttendanceBatchInput {
  date: string; // YYYY-MM-DD
  records: SaveEmployeeAttendanceRecordInput[];
  correctionReason?: string;
  recordedByUserId?: string;
}

export class EmployeeAttendanceService {
  /**
   * Normalizes a date string or Date object to UTC midnight.
   */
  public static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new Error(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0));
  }

  /**
   * Helper to parse time string "HH:MM" into a UTC Date object on attendanceDate.
   */
  public static parseTimeToDate(dateStr: string, timeStr?: string | null): Date | null {
    if (!timeStr || !timeStr.trim()) return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;

    const base = new Date(dateStr);
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), h, m, 0, 0));
  }

  /**
   * Helper to format UTC Date object to "HH:MM".
   */
  public static formatTimeString(d?: Date | null): string | null {
    if (!d) return null;
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Calculates time metrics for an individual shift segment.
   */
  public static calculateTimeMetrics(params: {
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    checkIn?: string | Date | null;
    checkOut?: string | Date | null;
    graceMinutes?: number;
    earlyExitGraceMinutes?: number;
    breakMinutes?: number;
    minHoursFullDay?: number;
    minHoursHalfDay?: number;
  }): {
    lateMinutes: number;
    earlyExitMinutes: number;
    workedMinutes: number;
    workedHours: number;
    overtimeMinutes: number;
    isSuggestedHalfDay: boolean;
  } {
    const {
      scheduledStart,
      scheduledEnd,
      checkIn,
      checkOut,
      graceMinutes = 15,
      earlyExitGraceMinutes = 0,
      breakMinutes = 0,
      minHoursFullDay = 6.0,
      minHoursHalfDay = 3.5,
    } = params;

    let lateMinutes = 0;
    let earlyExitMinutes = 0;
    let rawWorkedMinutes = 0;
    let workedMinutes = 0;
    let overtimeMinutes = 0;

    const getMinutes = (t: string | Date | null | undefined): number | null => {
      if (!t) return null;
      if (typeof t === 'string' && t.includes(':')) {
        const [h, m] = t.split(':').map((v) => parseInt(v, 10));
        return isNaN(h) || isNaN(m) ? null : h * 60 + m;
      } else if (t instanceof Date) {
        return t.getUTCHours() * 60 + t.getUTCMinutes();
      }
      return null;
    };

    const inMin = getMinutes(checkIn);
    const outMin = getMinutes(checkOut);
    const schStartMin = getMinutes(scheduledStart);
    const schEndMin = getMinutes(scheduledEnd);

    // 1. Late Minutes
    if (inMin !== null && schStartMin !== null) {
      const diff = inMin - schStartMin;
      if (diff > graceMinutes) {
        lateMinutes = diff;
      }
    }

    // 2. Early Exit Minutes
    if (outMin !== null && schEndMin !== null) {
      if (schEndMin >= (schStartMin ?? 0)) {
        const diff = schEndMin - outMin;
        if (diff > earlyExitGraceMinutes) {
          earlyExitMinutes = diff;
        }
      } else {
        // Overnight scheduled shift
        const schDur = (1440 - (schStartMin ?? 0)) + schEndMin;
        const actDur = inMin !== null ? (outMin >= inMin ? outMin - inMin : (1440 - inMin) + outMin) : 0;
        if (schDur - actDur > earlyExitGraceMinutes) {
          earlyExitMinutes = schDur - actDur;
        }
      }
    }

    // 3. Worked Minutes (Gap between shifts is automatically excluded since calculated per segment)
    if (inMin !== null && outMin !== null) {
      if (outMin >= inMin) {
        rawWorkedMinutes = outMin - inMin;
      } else {
        // Overnight shift spanning midnight
        rawWorkedMinutes = (1440 - inMin) + outMin;
      }

      if (breakMinutes > 0 && rawWorkedMinutes >= 240) {
        workedMinutes = Math.max(0, rawWorkedMinutes - breakMinutes);
      } else {
        workedMinutes = rawWorkedMinutes;
      }
    }

    // 4. Overtime Minutes
    let scheduledDuration = 0;
    if (schStartMin !== null && schEndMin !== null) {
      if (schEndMin >= schStartMin) {
        scheduledDuration = schEndMin - schStartMin;
      } else {
        scheduledDuration = (1440 - schStartMin) + schEndMin;
      }
    }

    if (scheduledDuration > 0 && workedMinutes > scheduledDuration) {
      overtimeMinutes = workedMinutes - scheduledDuration;
    }

    const workedHours = Math.round((workedMinutes / 60) * 100) / 100;
    const isSuggestedHalfDay = workedHours > 0 && workedHours < minHoursFullDay && workedHours >= minHoursHalfDay;

    return {
      lateMinutes,
      earlyExitMinutes,
      workedMinutes,
      workedHours,
      overtimeMinutes,
      isSuggestedHalfDay,
    };
  }

  /**
   * Retrieves the daily employee attendance roster supporting multiple shifts per employee.
   */
  public static async getDailyEmployeeRoster(
    tenantId: string,
    dateStr: string,
    filters?: {
      departmentId?: string;
      designationId?: string;
      shiftId?: string;
      search?: string;
    }
  ): Promise<{
    date: string;
    isHoliday: boolean;
    isWeeklyOff: boolean;
    holidayTitle?: string;
    isAlreadyMarked: boolean;
    totalEmployees: number;
    roster: DailyEmployeeRosterItem[];
  }> {
    const date = this.normalizeDate(dateStr);
    const holidayCheck = await HolidayService.isDateHoliday(tenantId, date);

    const where: any = {
      tenantId,
      currentStatus: 'ACTIVE',
    };

    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.designationId) where.designationId = filters.designationId;
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { firstNameEn: { contains: term, mode: 'insensitive' } },
        { lastNameEn: { contains: term, mode: 'insensitive' } },
        { employeeNo: { contains: term, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        employeeCategory: true,
        employmentType: true,
        shift: true,
      },
      orderBy: [{ departmentId: 'asc' }, { employeeNo: 'asc' }],
    });

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, attendanceDate: date },
      include: {
        shift: true,
        leaveType: true,
        recordedBy: { select: { username: true } },
      },
    });

    // Map existing records by key: "employeeId:shiftId"
    const recordMap = new Map<string, any>();
    records.forEach((r) => {
      recordMap.set(`${r.employeeId}:${r.shiftId}`, r);
    });

    const isAlreadyMarked = records.length > 0;

    const roster: DailyEmployeeRosterItem[] = await Promise.all(
      employees.map(async (emp) => {
        // Resolve all active shift segments for this employee on this date
        const scheduleResolution = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, emp.id, date);
        const applicableShifts = scheduleResolution.shifts;

        const employeeDTO: EmployeeDTO = {
          id: emp.id,
          employeeNo: emp.employeeNo,
          firstNameEn: emp.firstNameEn,
          lastNameEn: emp.lastNameEn,
          fullNameUr: emp.fullNameUr,
          gender: emp.gender,
          dob: emp.dob?.toISOString(),
          nationalId: emp.nationalId,
          phone: emp.phone,
          email: emp.email,
          departmentId: emp.departmentId,
          departmentName: emp.department?.name,
          designationId: emp.designationId,
          designationName: emp.designation?.name,
          employeeCategoryId: emp.employeeCategoryId,
          employeeCategoryName: emp.employeeCategory?.name,
          employmentTypeId: emp.employmentTypeId,
          employmentTypeName: emp.employmentType?.name,
          shiftId: emp.shiftId,
          shiftName: applicableShifts[0]?.shiftName,
          shiftStartTime: applicableShifts[0]?.scheduledStartTime,
          shiftEndTime: applicableShifts[0]?.scheduledEndTime,
          joiningDate: emp.joiningDate.toISOString(),
          currentStatus: emp.currentStatus,
          standardWorkingHours: Number(emp.standardWorkingHours || 8),
        };

        // Build shift segment items
        const shiftSegments: ShiftSegmentAttendanceDTO[] = applicableShifts.map((seg) => {
          const rec = recordMap.get(`${emp.id}:${seg.shiftId}`);

          if (rec) {
            const workedM = rec.workedMinutes;
            const workedH = Math.round((workedM / 60) * 100) / 100;

            return {
              shiftId: seg.shiftId,
              shiftName: seg.shiftName,
              shiftCode: seg.shiftCode,
              scheduledStartTime: rec.scheduledStartTime || seg.scheduledStartTime,
              scheduledEndTime: rec.scheduledEndTime || seg.scheduledEndTime,
              scheduledDurationHours: seg.scheduledDurationHours,
              graceMinutes: seg.graceMinutes,
              earlyExitGraceMinutes: seg.earlyExitGraceMinutes,
              breakMinutes: seg.breakMinutes,
              minHoursFullDay: seg.minHoursFullDay,
              minHoursHalfDay: seg.minHoursHalfDay,
              isWorkingDay: seg.isWorkingDay,
              precedenceSource: seg.precedenceSource,
              attendanceRecordId: rec.id,
              isMarked: true,
              checkInTime: EmployeeAttendanceService.formatTimeString(rec.checkInTime),
              checkOutTime: EmployeeAttendanceService.formatTimeString(rec.checkOutTime),
              status: rec.status as EmployeeAttendanceStatus,
              lateMinutes: rec.lateMinutes,
              earlyExitMinutes: rec.earlyExitMinutes,
              workedMinutes: workedM,
              workedHours: workedH,
              overtimeMinutes: rec.overtimeMinutes,
              remarks: rec.remarks,
            };
          }

          // Unmarked Initial State
          let defaultStatus: EmployeeAttendanceStatus = 'PRESENT';
          if (holidayCheck.isHoliday) {
            defaultStatus = holidayCheck.isWeeklyOff ? 'OFF_DAY' : 'HOLIDAY';
          } else if (!seg.isWorkingDay) {
            defaultStatus = 'OFF_DAY';
          }

          const isNonWorking = holidayCheck.isHoliday || !seg.isWorkingDay;
          const checkInDefault = isNonWorking ? null : seg.scheduledStartTime;
          const checkOutDefault = isNonWorking ? null : seg.scheduledEndTime;

          const initialMetrics = EmployeeAttendanceService.calculateTimeMetrics({
            scheduledStart: seg.scheduledStartTime,
            scheduledEnd: seg.scheduledEndTime,
            checkIn: checkInDefault,
            checkOut: checkOutDefault,
            graceMinutes: seg.graceMinutes,
            earlyExitGraceMinutes: seg.earlyExitGraceMinutes,
            breakMinutes: seg.breakMinutes,
            minHoursFullDay: seg.minHoursFullDay,
            minHoursHalfDay: seg.minHoursHalfDay,
          });

          return {
            shiftId: seg.shiftId,
            shiftName: seg.shiftName,
            shiftCode: seg.shiftCode,
            scheduledStartTime: seg.scheduledStartTime,
            scheduledEndTime: seg.scheduledEndTime,
            scheduledDurationHours: seg.scheduledDurationHours,
            graceMinutes: seg.graceMinutes,
            earlyExitGraceMinutes: seg.earlyExitGraceMinutes,
            breakMinutes: seg.breakMinutes,
            minHoursFullDay: seg.minHoursFullDay,
            minHoursHalfDay: seg.minHoursHalfDay,
            isWorkingDay: seg.isWorkingDay,
            precedenceSource: seg.precedenceSource,
            attendanceRecordId: null,
            isMarked: false,
            checkInTime: checkInDefault,
            checkOutTime: checkOutDefault,
            status: defaultStatus,
            lateMinutes: initialMetrics.lateMinutes,
            earlyExitMinutes: initialMetrics.earlyExitMinutes,
            workedMinutes: initialMetrics.workedMinutes,
            workedHours: initialMetrics.workedHours,
            overtimeMinutes: initialMetrics.overtimeMinutes,
            remarks: null,
          };
        });

        // Calculate Daily Consolidated Totals
        const totalScheduledHours = shiftSegments.reduce((acc, s) => acc + s.scheduledDurationHours, 0);
        const totalWorkedHours = shiftSegments.reduce((acc, s) => acc + s.workedHours, 0);
        const totalLateMinutes = shiftSegments.reduce((acc, s) => acc + s.lateMinutes, 0);
        const totalEarlyExitMinutes = shiftSegments.reduce((acc, s) => acc + s.earlyExitMinutes, 0);
        const isFullyMarked = shiftSegments.length > 0 && shiftSegments.every((s) => s.isMarked);

        // Derive Consolidated Daily Status
        let dailyStatus: EmployeeAttendanceStatus = 'PRESENT';
        const hasPresent = shiftSegments.some((s) => s.status === 'PRESENT' || s.status === 'LATE');
        const hasAbsent = shiftSegments.some((s) => s.status === 'ABSENT');
        const allAbsent = shiftSegments.length > 0 && shiftSegments.every((s) => s.status === 'ABSENT');
        const allHoliday = shiftSegments.length > 0 && shiftSegments.every((s) => s.status === 'HOLIDAY' || s.status === 'OFF_DAY');
        const allLeave = shiftSegments.length > 0 && shiftSegments.every((s) => s.status === 'ON_LEAVE');

        if (shiftSegments.length === 0 || !scheduleResolution.isWorkingDay || holidayCheck.isHoliday) {
          dailyStatus = (holidayCheck.isWeeklyOff || !scheduleResolution.isWorkingDay) ? 'OFF_DAY' : 'HOLIDAY';
        } else if (allHoliday) {
          dailyStatus = holidayCheck.isWeeklyOff ? 'OFF_DAY' : 'HOLIDAY';
        } else if (allAbsent) {
          dailyStatus = 'ABSENT';
        } else if (allLeave) {
          dailyStatus = 'ON_LEAVE';
        } else if (hasPresent && hasAbsent) {
          dailyStatus = 'HALF_DAY';
        } else if (hasPresent) {
          if (totalLateMinutes > 0 && shiftSegments.some((s) => s.status === 'LATE')) {
            dailyStatus = 'LATE';
          } else {
            dailyStatus = 'PRESENT';
          }
        }

        return {
          employee: employeeDTO,
          scheduledShiftsCount: shiftSegments.length,
          totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
          totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
          totalLateMinutes,
          totalEarlyExitMinutes,
          dailyStatus,
          isFullyMarked,
          shiftSegments,
        };
      })
    );

    return {
      date: dateStr,
      isHoliday: holidayCheck.isHoliday,
      isWeeklyOff: holidayCheck.isWeeklyOff,
      holidayTitle: holidayCheck.holidayInfo?.title,
      isAlreadyMarked,
      totalEmployees: employees.length,
      roster,
    };
  }

  /**
   * Saves daily attendance batch supporting shift segments and mandatory correction audits.
   */
  public static async saveDailyEmployeeAttendance(
    tenantId: string,
    input: SaveEmployeeAttendanceBatchInput
  ): Promise<{
    success: boolean;
    date: string;
    totalRecords: number;
    createdCount: number;
    updatedCount: number;
    auditLogsCreated: number;
  }> {
    const { date: dateStr, records, correctionReason, recordedByUserId } = input;
    const date = this.normalizeDate(dateStr);

    return prisma.$transaction(async (tx) => {
      // 1. Fetch existing attendance records on this date
      const existingRecords = await tx.employeeAttendanceRecord.findMany({
        where: { tenantId, attendanceDate: date },
      });

      const existingMap = new Map<string, any>();
      existingRecords.forEach((r) => {
        existingMap.set(`${r.employeeId}:${r.shiftId}`, r);
      });

      const hasExistingRecords = existingRecords.length > 0;

      // 2. Validate mandatory correction reason on update
      if (hasExistingRecords && (!correctionReason || !correctionReason.trim())) {
        throw new Error('Mandatory correction reason is required when updating previously saved employee attendance.');
      }

      let createdCount = 0;
      let updatedCount = 0;
      let auditLogsCreated = 0;

      for (const rec of records) {
        const checkInDate = this.parseTimeToDate(dateStr, rec.checkInTime);
        const checkOutDate = this.parseTimeToDate(dateStr, rec.checkOutTime);

        // Fetch shift details for accurate metric calculation
        const shift = await tx.shift.findUnique({ where: { id: rec.shiftId } });
        const graceMinutes = shift?.graceMinutes ?? 15;
        const earlyExitGraceMinutes = shift?.earlyExitGraceMinutes ?? 0;
        const breakMinutes = shift?.breakMinutes ?? 0;
        const minHoursFullDay = Number(shift?.minHoursFullDay || 6.0);
        const minHoursHalfDay = Number(shift?.minHoursHalfDay || 3.5);

        const metrics = this.calculateTimeMetrics({
          scheduledStart: rec.scheduledStartTime,
          scheduledEnd: rec.scheduledEndTime,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          graceMinutes,
          earlyExitGraceMinutes,
          breakMinutes,
          minHoursFullDay,
          minHoursHalfDay,
        });

        const key = `${rec.employeeId}:${rec.shiftId}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Check if changed
          const isStatusChanged = existing.status !== rec.status;
          const isCheckInChanged = existing.checkInTime?.toISOString() !== checkInDate?.toISOString();
          const isCheckOutChanged = existing.checkOutTime?.toISOString() !== checkOutDate?.toISOString();
          const isRemarksChanged = (existing.remarks || '') !== (rec.remarks || '');

          if (isStatusChanged || isCheckInChanged || isCheckOutChanged || isRemarksChanged) {
            const updatedRec = await tx.employeeAttendanceRecord.update({
              where: { id: existing.id },
              data: {
                scheduledStartTime: rec.scheduledStartTime,
                scheduledEndTime: rec.scheduledEndTime,
                checkInTime: checkInDate,
                checkOutTime: checkOutDate,
                status: rec.status,
                lateMinutes: metrics.lateMinutes,
                earlyExitMinutes: metrics.earlyExitMinutes,
                workedMinutes: metrics.workedMinutes,
                overtimeMinutes: metrics.overtimeMinutes,
                leaveTypeId: rec.leaveTypeId || null,
                remarks: rec.remarks?.trim() || null,
                punchSource: rec.punchSource || 'MANUAL',
                recordedByUserId: recordedByUserId || null,
              },
            });

            // Create shift-specific audit log
            await tx.employeeAttendanceAuditLog.create({
              data: {
                tenantId,
                attendanceRecordId: existing.id,
                employeeId: rec.employeeId,
                shiftId: rec.shiftId,
                attendanceDate: date,
                previousStatus: existing.status,
                newStatus: rec.status,
                previousCheckIn: existing.checkInTime,
                newCheckIn: checkInDate,
                previousCheckOut: existing.checkOutTime,
                newCheckOut: checkOutDate,
                previousRemarks: existing.remarks,
                newRemarks: rec.remarks?.trim() || null,
                correctionReason: correctionReason!.trim(),
                correctedByUserId: recordedByUserId || null,
              },
            });

            updatedCount++;
            auditLogsCreated++;
          }
        } else {
          // Create new record
          await tx.employeeAttendanceRecord.create({
            data: {
              tenantId,
              employeeId: rec.employeeId,
              attendanceDate: date,
              shiftId: rec.shiftId,
              scheduledStartTime: rec.scheduledStartTime,
              scheduledEndTime: rec.scheduledEndTime,
              checkInTime: checkInDate,
              checkOutTime: checkOutDate,
              status: rec.status,
              lateMinutes: metrics.lateMinutes,
              earlyExitMinutes: metrics.earlyExitMinutes,
              workedMinutes: metrics.workedMinutes,
              overtimeMinutes: metrics.overtimeMinutes,
              leaveTypeId: rec.leaveTypeId || null,
              remarks: rec.remarks?.trim() || null,
              punchSource: rec.punchSource || 'MANUAL',
              recordedByUserId: recordedByUserId || null,
            },
          });
          createdCount++;
        }
      }

      return {
        success: true,
        date: dateStr,
        totalRecords: records.length,
        createdCount,
        updatedCount,
        auditLogsCreated,
      };
    });
  }

  /**
   * Retrieves dashboard statistics across all employees and shift segments.
   */
  public static async getEmployeeAttendanceDashboard(
    tenantId: string,
    dateStr: string
  ): Promise<EmployeeAttendanceDashboardMetrics> {
    const rosterData = await this.getDailyEmployeeRoster(tenantId, dateStr);
    const { roster, isHoliday, isWeeklyOff, holidayTitle } = rosterData;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;
    let earlyExitCount = 0;
    let unmarkedCount = 0;
    let totalScheduledShiftsCount = 0;
    let totalCompletedShiftsCount = 0;
    let totalWorkedHours = 0;

    roster.forEach((item) => {
      totalScheduledShiftsCount += item.scheduledShiftsCount;
      totalWorkedHours += item.totalWorkedHours;

      item.shiftSegments.forEach((seg) => {
        if (seg.isMarked) totalCompletedShiftsCount++;
      });

      if (!item.isFullyMarked) {
        unmarkedCount++;
      } else {
        if (item.dailyStatus === 'PRESENT') presentCount++;
        else if (item.dailyStatus === 'LATE') {
          presentCount++;
          lateCount++;
        } else if (item.dailyStatus === 'HALF_DAY') halfDayCount++;
        else if (item.dailyStatus === 'ON_LEAVE') leaveCount++;
        else if (item.dailyStatus === 'ABSENT') absentCount++;
      }

      if (item.totalEarlyExitMinutes > 0) earlyExitCount++;
    });

    const activeTotal = roster.length;
    const markedTotal = activeTotal - unmarkedCount;
    const attendancePercentage = markedTotal > 0 ? Math.round((presentCount / markedTotal) * 1000) / 10 : 0;

    return {
      date: dateStr,
      totalActiveEmployees: activeTotal,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      halfDayCount,
      earlyExitCount,
      unmarkedCount,
      totalScheduledShiftsCount,
      totalCompletedShiftsCount,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      attendancePercentage,
      isTodayHoliday: isHoliday,
      isTodayWeeklyOff: isWeeklyOff,
      holidayTitle,
      departmentBreakdown: [],
    };
  }

  /**
   * Retrieves Monthly Employee Attendance Register matrix without duplicating employees.
   */
  public static async getEmployeeMonthlyRegister(
    tenantId: string,
    year: number,
    month: number,
    filters?: { departmentId?: string; designationId?: string }
  ) {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
    const daysInMonth = endDate.getUTCDate();

    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        currentStatus: 'ACTIVE',
        ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters?.designationId ? { designationId: filters.designationId } : {}),
      },
      include: { department: true, designation: true },
      orderBy: [{ departmentId: 'asc' }, { employeeNo: 'asc' }],
    });

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: {
        tenantId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      include: { shift: true },
      orderBy: { attendanceDate: 'asc' },
    });

    // Group records by employeeId -> dateStr -> array of shift records
    const recordMap = new Map<string, Map<string, any[]>>();
    records.forEach((r) => {
      const dStr = r.attendanceDate.toISOString().split('T')[0];
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, new Map());
      const empMap = recordMap.get(r.employeeId)!;
      if (!empMap.has(dStr)) empMap.set(dStr, []);
      empMap.get(dStr)!.push(r);
    });

    const daysArray: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push(dStr);
    }

    const employeeRows = employees.map((emp) => {
      const empMap = recordMap.get(emp.id);
      let totalPresentDays = 0;
      let totalAbsentDays = 0;
      let totalLateDays = 0;
      let totalWorkedMinutes = 0;

      const days: Record<string, { status: string; workedHours: number; shiftCount: number }> = {};

      daysArray.forEach((dStr) => {
        const dayRecords = empMap?.get(dStr) || [];
        if (dayRecords.length > 0) {
          const dayWorkedMinutes = dayRecords.reduce((acc, r) => acc + r.workedMinutes, 0);
          const dayWorkedHours = Math.round((dayWorkedMinutes / 60) * 100) / 100;
          totalWorkedMinutes += dayWorkedMinutes;

          const hasPresent = dayRecords.some((r) => r.status === 'PRESENT' || r.status === 'LATE');
          const hasLate = dayRecords.some((r) => r.status === 'LATE');
          const allAbsent = dayRecords.every((r) => r.status === 'ABSENT');

          let dayStatus = 'PRESENT';
          if (allAbsent) dayStatus = 'ABSENT';
          else if (hasLate) {
            dayStatus = 'LATE';
            totalLateDays++;
          }

          if (hasPresent) totalPresentDays++;
          else if (allAbsent) totalAbsentDays++;

          days[dStr] = {
            status: dayStatus,
            workedHours: dayWorkedHours,
            shiftCount: dayRecords.length,
          };
        } else {
          days[dStr] = { status: 'UNMARKED', workedHours: 0, shiftCount: 0 };
        }
      });

      return {
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        name: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
        departmentName: emp.department?.name || 'General',
        designationName: emp.designation?.name || 'Staff',
        summary: {
          presentDays: totalPresentDays,
          absentDays: totalAbsentDays,
          lateDays: totalLateDays,
          totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        },
        days,
      };
    });

    return {
      year,
      month,
      daysInMonth,
      days: daysArray,
      employees: employeeRows,
    };
  }

  /**
   * Retrieves immutable audit corrections log.
   */
  public static async getEmployeeAttendanceCorrections(
    tenantId: string,
    filters?: { employeeId?: string; date?: string; limit?: number }
  ): Promise<EmployeeAttendanceCorrectionAuditDTO[]> {
    const where: any = { tenantId };
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.date) where.attendanceDate = this.normalizeDate(filters.date);

    const logs = await prisma.employeeAttendanceAuditLog.findMany({
      where,
      include: {
        employee: { include: { department: true } },
        shift: true,
        correctedBy: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return logs.map((log) => ({
      id: log.id,
      attendanceRecordId: log.attendanceRecordId,
      employeeId: log.employeeId,
      employeeNo: log.employee.employeeNo,
      employeeName: `${log.employee.firstNameEn} ${log.employee.lastNameEn || ''}`.trim(),
      departmentName: log.employee.department?.name,
      shiftId: log.shiftId,
      shiftName: log.shift?.name,
      shiftCode: log.shift?.code,
      attendanceDate: log.attendanceDate.toISOString().split('T')[0],
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      previousCheckIn: this.formatTimeString(log.previousCheckIn),
      newCheckIn: this.formatTimeString(log.newCheckIn),
      previousCheckOut: this.formatTimeString(log.previousCheckOut),
      newCheckOut: this.formatTimeString(log.newCheckOut),
      previousRemarks: log.previousRemarks,
      newRemarks: log.newRemarks,
      correctionReason: log.correctionReason,
      correctedByUserId: log.correctedByUserId,
      correctedByName: log.correctedBy?.username,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /**
   * Generates reliable payroll attendance summary data contract for future payroll integration.
   */
  public static async getPayrollAttendanceSummary(
    tenantId: string,
    periodStartStr: string,
    periodEndStr: string
  ): Promise<PayrollAttendanceSummaryDTO[]> {
    const periodStart = this.normalizeDate(periodStartStr);
    const periodEnd = this.normalizeDate(periodEndStr);

    const employees = await prisma.employee.findMany({
      where: { tenantId, currentStatus: 'ACTIVE' },
      include: { department: true, designation: true },
      orderBy: [{ departmentId: 'asc' }, { employeeNo: 'asc' }],
    });

    const records = await prisma.employeeAttendanceRecord.findMany({
      where: {
        tenantId,
        attendanceDate: { gte: periodStart, lte: periodEnd },
      },
    });

    const recordMap = new Map<string, any[]>();
    records.forEach((r) => {
      if (!recordMap.has(r.employeeId)) recordMap.set(r.employeeId, []);
      recordMap.get(r.employeeId)!.push(r);
    });

    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return employees.map((emp) => {
      const empRecords = recordMap.get(emp.id) || [];
      const presentShifts = empRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE');
      const absentShifts = empRecords.filter((r) => r.status === 'ABSENT');
      const leaveShifts = empRecords.filter((r) => r.status === 'ON_LEAVE');
      const halfDayShifts = empRecords.filter((r) => r.status === 'HALF_DAY');
      const lateShifts = empRecords.filter((r) => r.status === 'LATE' || r.lateMinutes > 0);

      const totalWorkedMinutes = empRecords.reduce((acc, r) => acc + r.workedMinutes, 0);
      const totalLateMinutes = empRecords.reduce((acc, r) => acc + r.lateMinutes, 0);
      const totalEarlyExitMinutes = empRecords.reduce((acc, r) => acc + r.earlyExitMinutes, 0);
      const totalOvertimeMinutes = empRecords.reduce((acc, r) => acc + r.overtimeMinutes, 0);

      const distinctPresentDates = new Set(presentShifts.map((r) => r.attendanceDate.toISOString().split('T')[0]));
      const distinctAbsentDates = new Set(absentShifts.map((r) => r.attendanceDate.toISOString().split('T')[0]));
      const distinctLeaveDates = new Set(leaveShifts.map((r) => r.attendanceDate.toISOString().split('T')[0]));

      return {
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
        departmentName: emp.department?.name,
        designationName: emp.designation?.name,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        totalCalendarDays: totalDays,
        totalNonWorkingDays: 0,
        totalWorkingDays: totalDays,
        totalScheduledShifts: empRecords.length,
        presentShiftsCount: presentShifts.length,
        absentShiftsCount: absentShifts.length,
        leaveShiftsCount: leaveShifts.length,
        halfDayShiftsCount: halfDayShifts.length,
        presentDays: distinctPresentDates.size,
        absentDays: distinctAbsentDates.size,
        leaveDays: distinctLeaveDates.size,
        lateArrivalCount: lateShifts.length,
        totalLateMinutes,
        totalEarlyExitMinutes,
        totalWorkedMinutes,
        totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        totalOvertimeMinutes,
        attendancePercentage:
          empRecords.length > 0 ? Math.round((presentShifts.length / empRecords.length) * 1000) / 10 : 0,
      };
    });
  }
}
