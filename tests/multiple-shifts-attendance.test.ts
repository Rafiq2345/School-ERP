import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '@/lib/services/shift-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

const prisma = new PrismaClient();

describe('Multiple Shifts per Employee & Complex Schedule Management Suite', () => {
  let tenantId: string;
  let deptId: string;
  let desigId: string;

  // Shift IDs
  let morningShiftId: string;   // 07:00 -> 11:00 (4.0 hrs)
  let afternoonShiftId: string; // 12:00 -> 16:00 (4.0 hrs)
  let eveningShiftId: string;   // 17:00 -> 21:00 (4.0 hrs)
  let fullTimeShiftId: string;  // 08:00 -> 16:00 (8.0 hrs)
  let nightShiftId: string;     // 22:00 -> 06:00 (8.0 hrs overnight)
  let fridayShiftId: string;    // 08:00 -> 12:30 (4.5 hrs)

  // Employee IDs
  let empSingleId: string;  // Employee A: Single shift
  let empDoubleId: string;  // Employee B: Double shift (Morning + Afternoon)
  let empTripleId: string;  // Employee C: Triple shift (Morning + Afternoon + Evening)
  let empNightId: string;   // Employee D: Cross-midnight night shift

  beforeAll(async () => {
    const suffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'MultiShift Campus ' + suffix,
        code: 'MS-TEN-' + suffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    const dept = await prisma.department.create({
      data: { tenantId, name: 'Operations & Faculty', code: 'DEPT-OPS-' + suffix },
    });
    deptId = dept.id;

    const desig = await prisma.designation.create({
      data: { tenantId, departmentId: deptId, name: 'Faculty Staff', code: 'DESIG-STF-' + suffix },
    });
    desigId = desig.id;

    // 1. Create Base Shifts
    const sMorning = await ShiftService.createShift(tenantId, {
      name: 'Morning Shift',
      code: 'SHIFT-MRN-' + suffix,
      startTime: '07:00',
      endTime: '11:00',
      graceMinutes: 10,
      breakMinutes: 0,
      minHoursFullDay: 3.5,
      minHoursHalfDay: 2.0,
      workingDays: [1, 2, 3, 4, 5, 6],
    });
    morningShiftId = sMorning.id;

    const sAfternoon = await ShiftService.createShift(tenantId, {
      name: 'Afternoon Shift',
      code: 'SHIFT-AFT-' + suffix,
      startTime: '12:00',
      endTime: '16:00',
      graceMinutes: 10,
      breakMinutes: 0,
      minHoursFullDay: 3.5,
      minHoursHalfDay: 2.0,
      workingDays: [1, 2, 3, 4, 5, 6],
    });
    afternoonShiftId = sAfternoon.id;

    const sEvening = await ShiftService.createShift(tenantId, {
      name: 'Evening Shift',
      code: 'SHIFT-EVN-' + suffix,
      startTime: '17:00',
      endTime: '21:00',
      graceMinutes: 10,
      breakMinutes: 0,
      minHoursFullDay: 3.5,
      minHoursHalfDay: 2.0,
      workingDays: [1, 2, 3, 4, 5, 6],
    });
    eveningShiftId = sEvening.id;

    const sFullTime = await ShiftService.createShift(tenantId, {
      name: 'Full Time Standard',
      code: 'SHIFT-FT-' + suffix,
      startTime: '08:00',
      endTime: '16:00',
      graceMinutes: 15,
      breakMinutes: 30,
      minHoursFullDay: 6.0,
      minHoursHalfDay: 3.5,
      workingDays: [1, 2, 3, 4, 5, 6],
      isDefault: true,
    });
    fullTimeShiftId = sFullTime.id;

    const sNight = await ShiftService.createShift(tenantId, {
      name: 'Night Watch Shift',
      code: 'SHIFT-NGT-' + suffix,
      startTime: '22:00',
      endTime: '06:00',
      graceMinutes: 15,
      breakMinutes: 0,
      minHoursFullDay: 6.0,
      minHoursHalfDay: 3.5,
      workingDays: [1, 2, 3, 4, 5, 6],
    });
    nightShiftId = sNight.id;

    const sFriday = await ShiftService.createShift(tenantId, {
      name: 'Special Friday Shift',
      code: 'SHIFT-FRI-' + suffix,
      startTime: '08:00',
      endTime: '12:30',
      graceMinutes: 10,
      breakMinutes: 0,
      workingDays: [5], // Friday only
    });
    fridayShiftId = sFriday.id;

    // 2. Create Test Employees
    const empA = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-A-SINGLE',
        firstNameEn: 'Ahmed',
        lastNameEn: 'Khan',
        departmentId: deptId,
        designationId: desigId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empSingleId = empA.id;

    const empB = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-B-DOUBLE',
        firstNameEn: 'Bilal',
        lastNameEn: 'Hassan',
        departmentId: deptId,
        designationId: desigId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empDoubleId = empB.id;

    const empC = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-C-TRIPLE',
        firstNameEn: 'Chaudhry',
        lastNameEn: 'Zubair',
        departmentId: deptId,
        designationId: desigId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empTripleId = empC.id;

    const empD = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-D-NIGHT',
        firstNameEn: 'Dawood',
        lastNameEn: 'Iqbal',
        departmentId: deptId,
        designationId: desigId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empNightId = empD.id;

    // 3. Assign Shifts
    // Employee A: Single shift (Full Time)
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [fullTimeShiftId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [empSingleId],
      effectiveFrom: '2026-09-01',
      reason: 'Single Full-Time Assignment',
    });

    // Employee B: Double Shift (Morning + Afternoon)
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [morningShiftId, afternoonShiftId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [empDoubleId],
      effectiveFrom: '2026-09-01',
      reason: 'Double Shift Assignment',
    });

    // Employee C: Triple Shift (Morning + Afternoon + Evening)
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [morningShiftId, afternoonShiftId, eveningShiftId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [empTripleId],
      effectiveFrom: '2026-09-01',
      reason: 'Triple Shift Assignment',
    });

    // Employee D: Night Shift
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [nightShiftId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [empNightId],
      effectiveFrom: '2026-09-01',
      reason: 'Night Guard Assignment',
    });
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.shiftAuditLog.deleteMany({ where: { tenantId } });
      await prisma.employeeShiftAssignment.deleteMany({ where: { tenantId } });
      await prisma.employeeAttendanceAuditLog.deleteMany({ where: { tenantId } });
      await prisma.employeeAttendanceRecord.deleteMany({ where: { tenantId } });
      await prisma.employee.deleteMany({ where: { tenantId } });
      await prisma.shift.deleteMany({ where: { tenantId } });
      await prisma.designation.deleteMany({ where: { tenantId } });
      await prisma.department.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await prisma.$disconnect();
  });

  // A. Single Shift Employee
  it('A. Resolves single shift employee with 1 scheduled shift segment', async () => {
    const shifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empSingleId, '2026-09-01');
    expect(shifts.length).toBe(1);
    expect(shifts[0].shiftId).toBe(fullTimeShiftId);
    expect(shifts[0].scheduledStartTime).toBe('08:00');
    expect(shifts[0].scheduledEndTime).toBe('16:00');
    expect(shifts[0].scheduledDurationHours).toBe(8.0);
  });

  // B. Double Shift Employee
  it('B. Resolves double shift employee with 2 independent non-overlapping shift segments', async () => {
    const shifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empDoubleId, '2026-09-01');
    expect(shifts.length).toBe(2);

    expect(shifts[0].shiftId).toBe(morningShiftId);
    expect(shifts[0].scheduledStartTime).toBe('07:00');
    expect(shifts[0].scheduledEndTime).toBe('11:00');

    expect(shifts[1].shiftId).toBe(afternoonShiftId);
    expect(shifts[1].scheduledStartTime).toBe('12:00');
    expect(shifts[1].scheduledEndTime).toBe('16:00');
  });

  // C. Triple Shift Employee
  it('C. Resolves triple shift employee with 3 independent shift segments', async () => {
    const shifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empTripleId, '2026-09-01');
    expect(shifts.length).toBe(3);

    expect(shifts[0].shiftName).toBe('Morning Shift');
    expect(shifts[1].shiftName).toBe('Afternoon Shift');
    expect(shifts[2].shiftName).toBe('Evening Shift');
  });

  // D. Correct Total Worked Hours Across Multiple Shifts
  it('D. Calculates correct consolidated daily total worked hours across multiple shifts', async () => {
    const date = '2026-09-02';

    // Save Employee B: Morning (07:00-11:00 = 4.0h) + Afternoon (12:00-16:00 = 4.0h)
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empDoubleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empDoubleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '16:00',
          status: 'PRESENT',
        },
      ],
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);
    const item = roster.roster.find((r) => r.employee.id === empDoubleId);

    expect(item).toBeDefined();
    expect(item?.scheduledShiftsCount).toBe(2);
    expect(item?.totalScheduledHours).toBe(8.0);
    expect(item?.totalWorkedHours).toBe(8.0);
    expect(item?.dailyStatus).toBe('PRESENT');
  });

  // E. Gap Between Shifts is NOT Counted as Worked Time
  it('E. Ensures gap between shifts (11:00 -> 12:00) is NOT counted as worked hours', async () => {
    const date = '2026-09-03';

    // Morning: 07:00 -> 11:00 (4h). Afternoon: 12:00 -> 15:30 (3.5h). Total must be 7.5h, NOT 8.5h.
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empDoubleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empDoubleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '15:30',
          status: 'PRESENT',
        },
      ],
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);
    const item = roster.roster.find((r) => r.employee.id === empDoubleId);

    expect(item?.totalWorkedHours).toBe(7.5);
  });

  // F. Late Arrival on Only One Shift
  it('F. Tracks late arrival on only the delayed shift and aggregates total late minutes', async () => {
    const date = '2026-09-04';

    // Morning on-time (07:00). Afternoon arrived at 12:25 (+25m late, with 10m grace -> +25m late)
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empDoubleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empDoubleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:25',
          checkOutTime: '16:00',
          status: 'LATE',
        },
      ],
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);
    const item = roster.roster.find((r) => r.employee.id === empDoubleId);

    expect(item?.shiftSegments[0].lateMinutes).toBe(0);
    expect(item?.shiftSegments[1].lateMinutes).toBe(25);
    expect(item?.totalLateMinutes).toBe(25);
    expect(item?.dailyStatus).toBe('LATE');
  });

  // G. Early Departure on Only One Shift
  it('G. Tracks early departure on only the early exit shift', async () => {
    const date = '2026-09-05';

    // Morning left early at 10:30 (30m early). Afternoon left on time at 16:00
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empDoubleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '10:30',
          status: 'EARLY_DEPARTURE',
        },
        {
          employeeId: empDoubleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '16:00',
          status: 'PRESENT',
        },
      ],
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);
    const item = roster.roster.find((r) => r.employee.id === empDoubleId);

    expect(item?.shiftSegments[0].earlyExitMinutes).toBe(30);
    expect(item?.shiftSegments[1].earlyExitMinutes).toBe(0);
    expect(item?.totalEarlyExitMinutes).toBe(30);
  });

  // H. One Shift Present + Second Shift Absent
  it('H. Handles partial attendance: one shift present (4.0h) + second shift absent (0h)', async () => {
    const date = '2026-09-08';

    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empDoubleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empDoubleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: null,
          checkOutTime: null,
          status: 'ABSENT',
        },
      ],
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);
    const item = roster.roster.find((r) => r.employee.id === empDoubleId);

    expect(item?.shiftSegments[0].status).toBe('PRESENT');
    expect(item?.shiftSegments[0].workedHours).toBe(4.0);
    expect(item?.shiftSegments[1].status).toBe('ABSENT');
    expect(item?.shiftSegments[1].workedHours).toBe(0);
    expect(item?.totalWorkedHours).toBe(4.0);
  });

  // I. Overlapping Shift Assignment Prevention
  it('I. Prevents overlapping shift assignment and returns clear error', async () => {
    // Create overlapping shift: 09:00 -> 14:00 (overlaps with Morning 07:00-11:00 and Afternoon 12:00-16:00)
    const sOverlap = await ShiftService.createShift(tenantId, {
      name: 'Midday Overlapping Shift',
      code: 'SHIFT-OVR-' + Date.now().toString().slice(-4),
      startTime: '09:00',
      endTime: '14:00',
      workingDays: [1, 2, 3, 4, 5, 6],
    });

    // Expect assignment of Morning + Overlapping Shift to throw error
    await expect(
      ShiftService.assignShiftBulk(tenantId, {
        shiftIds: [morningShiftId, sOverlap.id],
        assignmentType: 'EMPLOYEE',
        employeeIds: [empSingleId],
        effectiveFrom: '2026-09-01',
      })
    ).rejects.toThrow(/overlapping work shifts/i);
  });

  // J. Different Shifts on Different Weekdays
  it('J. Automatically resolves different shifts on different weekdays', async () => {
    // Friday Shift is only on Day 5 (Friday)
    // Friday: 2026-09-04
    const fridayShifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empDoubleId, '2026-09-04');
    expect(fridayShifts.length).toBeGreaterThanOrEqual(1);

    // Sunday: 2026-09-06 (Non-working day)
    const sundayShifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empDoubleId, '2026-09-06');
    expect(sundayShifts.length).toBe(0); // Sunday filtered out because not in workingDays
  });

  // K. Historical Effective-Dated Shift Change
  it('K. Preserves historical shift assignments when schedule changes on a future date', async () => {
    // Starting 2026-10-01, change Employee B from Double Shift to Single Full-Time Shift
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [fullTimeShiftId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [empDoubleId],
      effectiveFrom: '2026-10-01',
      reason: 'Realigned to Single Full-Time Shift',
    });

    // In September (Historical): Still returns 2 shifts (Morning + Afternoon)
    const septShifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empDoubleId, '2026-09-15');
    expect(septShifts.length).toBe(2);

    // In October (New Effective Schedule): Returns 1 shift (Full Time)
    const octShifts = await ShiftService.getApplicableShiftsForEmployee(tenantId, empDoubleId, '2026-10-05');
    expect(octShifts.length).toBe(1);
    expect(octShifts[0].shiftId).toBe(fullTimeShiftId);
  });

  // L. Holiday / Weekly-Off Behavior
  it('L. Automatically applies HOLIDAY / OFF_DAY status without marking absent', async () => {
    const holidayDate = '2026-11-09'; // Iqbal Day
    await prisma.schoolHoliday.create({
      data: {
        tenantId,
        title: 'Iqbal Day Public Holiday',
        startDate: new Date(holidayDate + 'T00:00:00.000Z'),
        endDate: new Date(holidayDate + 'T00:00:00.000Z'),
        holidayType: 'PUBLIC_HOLIDAY',
        scope: 'WHOLE_SCHOOL',
        status: 'ACTIVE',
      },
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, holidayDate);
    expect(roster.isHoliday).toBe(true);
    const item = roster.roster.find((r) => r.employee.id === empTripleId);
    expect(item?.dailyStatus).toBe('HOLIDAY');
    item?.shiftSegments.forEach((seg) => {
      expect(seg.status).toBe('HOLIDAY');
      expect(seg.checkInTime).toBeNull();
    });
  });

  // M. Shift-Specific Attendance Correction & Audit
  it('M. Corrects only one shift segment and creates shift-specific immutable audit record', async () => {
    const date = '2026-09-09';

    // 1. Initial Save
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empTripleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empTripleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '15:00', // initially wrong
          status: 'PRESENT',
        },
      ],
    });

    // 2. Correction: Only fix Afternoon shift check-out from 15:00 to 16:00
    const updateRes = await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date,
      records: [
        {
          employeeId: empTripleId,
          shiftId: morningShiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        {
          employeeId: empTripleId,
          shiftId: afternoonShiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '16:00', // Corrected
          status: 'PRESENT',
        },
      ],
      correctionReason: 'Biometric gate punch confirmed full shift completion',
    });

    expect(updateRes.updatedCount).toBe(1); // Only Afternoon shift updated
    expect(updateRes.auditLogsCreated).toBe(1);

    // Verify audit log has shiftId
    const auditLogs = await EmployeeAttendanceService.getEmployeeAttendanceCorrections(tenantId, {
      employeeId: empTripleId,
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0].shiftId).toBe(afternoonShiftId);
    expect(auditLogs[0].correctionReason).toContain('Biometric gate punch');
  });

  // N. Monthly Register Does Not Duplicate Employee Count
  it('N. Monthly Register does not duplicate employee counts for multi-shift staff', async () => {
    const register = await EmployeeAttendanceService.getEmployeeMonthlyRegister(tenantId, 2026, 9);
    // 4 employees created in beforeAll
    expect(register.employees.length).toBe(4);

    const empDoubleInRegister = register.employees.find((e) => e.employeeId === empDoubleId);
    expect(empDoubleInRegister).toBeDefined();
    expect(empDoubleInRegister?.summary.totalWorkedHours).toBeGreaterThan(0);
  });

  // O. Cross-Midnight Shift Duration Handling
  it('O. Correctly calculates cross-midnight night shift (22:00 -> 06:00) as 8.0 hours', async () => {
    const metrics = EmployeeAttendanceService.calculateTimeMetrics({
      scheduledStart: '22:00',
      scheduledEnd: '06:00',
      checkIn: '22:00',
      checkOut: '06:00',
      graceMinutes: 15,
    });

    expect(metrics.workedMinutes).toBe(480);
    expect(metrics.workedHours).toBe(8.0);
    expect(metrics.lateMinutes).toBe(0);
    expect(metrics.earlyExitMinutes).toBe(0);
  });
});
