import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '@/lib/services/shift-service';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

const prisma = new PrismaClient();

describe('Work Schedule & Duty Pattern Management Suite', () => {
  let tenantId: string;
  let deptTeachingId: string;
  let deptAccountsId: string;
  let desigTeacherId: string;
  let empFullTimeId: string;
  let empPartTimeId: string;
  let empSecurityId: string;

  // Shifts
  let morningShiftId: string;   // 07:00 -> 11:00
  let afternoonShiftId: string; // 12:00 -> 16:00
  let eveningShiftId: string;   // 17:00 -> 21:00
  let fullDayShiftId: string;   // 08:00 -> 16:00
  let fridayShiftId: string;    // 08:00 -> 12:30

  // Schedules
  let fullTimeScheduleId: string;
  let partTimeScheduleId: string;
  let securityDoubleScheduleId: string;

  beforeAll(async () => {
    const suffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Duty Schedule Academy ' + suffix,
        code: 'SCHED-TEN-' + suffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    const dept1 = await prisma.department.create({
      data: { tenantId, name: 'Teaching Faculty', code: 'DEPT-TCH-' + suffix },
    });
    deptTeachingId = dept1.id;

    const dept2 = await prisma.department.create({
      data: { tenantId, name: 'Accounts Dept', code: 'DEPT-ACC-' + suffix },
    });
    deptAccountsId = dept2.id;

    const desig = await prisma.designation.create({
      data: { tenantId, departmentId: deptTeachingId, name: 'Faculty Member', code: 'DESIG-FCL-' + suffix },
    });
    desigTeacherId = desig.id;

    // 1. Create Base Work Shifts (Reusable Time Blocks)
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

    const sFull = await ShiftService.createShift(tenantId, {
      name: 'Full Day Shift',
      code: 'SHIFT-FULL-' + suffix,
      startTime: '08:00',
      endTime: '16:00',
      graceMinutes: 15,
      breakMinutes: 30,
      minHoursFullDay: 6.0,
      minHoursHalfDay: 3.5,
      workingDays: [1, 2, 3, 4, 5, 6],
      isDefault: true,
    });
    fullDayShiftId = sFull.id;

    const sFri = await ShiftService.createShift(tenantId, {
      name: 'Friday Special Shift',
      code: 'SHIFT-FRI-' + suffix,
      startTime: '08:00',
      endTime: '12:30',
      graceMinutes: 10,
      breakMinutes: 0,
      workingDays: [5],
    });
    fridayShiftId = sFri.id;

    // 2. Create Reusable Work Schedules (Weekly Duty Patterns)
    // Full-Time Schedule: Mon-Thu (Full Day), Fri (Friday Special), Sat/Sun (Off)
    const schedFT = await WorkScheduleService.createWorkSchedule(tenantId, {
      name: 'Full-Time Staff Schedule',
      code: 'WS-FT-' + suffix,
      description: 'Standard 5-day academic faculty duty pattern',
      isDefault: true,
      days: [
        { dayOfWeek: 1, isWorkingDay: true, shiftIds: [fullDayShiftId] },
        { dayOfWeek: 2, isWorkingDay: true, shiftIds: [fullDayShiftId] },
        { dayOfWeek: 3, isWorkingDay: true, shiftIds: [fullDayShiftId] },
        { dayOfWeek: 4, isWorkingDay: true, shiftIds: [fullDayShiftId] },
        { dayOfWeek: 5, isWorkingDay: true, shiftIds: [fridayShiftId] },
        { dayOfWeek: 6, isWorkingDay: false, shiftIds: [] },
        { dayOfWeek: 0, isWorkingDay: false, shiftIds: [] },
      ],
    });
    fullTimeScheduleId = schedFT.id;

    // Part-Time Schedule: Mon/Wed (Morning + Afternoon), Tue/Thu/Fri (Morning only), Sat/Sun (Off)
    const schedPT = await WorkScheduleService.createWorkSchedule(tenantId, {
      name: 'Part-Time Teaching Schedule',
      code: 'WS-PT-' + suffix,
      description: 'Variable morning and afternoon teaching schedule',
      days: [
        { dayOfWeek: 1, isWorkingDay: true, shiftIds: [morningShiftId, afternoonShiftId] },
        { dayOfWeek: 2, isWorkingDay: true, shiftIds: [morningShiftId] },
        { dayOfWeek: 3, isWorkingDay: true, shiftIds: [morningShiftId, afternoonShiftId] },
        { dayOfWeek: 4, isWorkingDay: true, shiftIds: [morningShiftId] },
        { dayOfWeek: 5, isWorkingDay: true, shiftIds: [morningShiftId] },
        { dayOfWeek: 6, isWorkingDay: false, shiftIds: [] },
        { dayOfWeek: 0, isWorkingDay: false, shiftIds: [] },
      ],
    });
    partTimeScheduleId = schedPT.id;

    // Security Double Shift Schedule: Mon-Sat (Morning + Evening), Sun (Off)
    const schedSec = await WorkScheduleService.createWorkSchedule(tenantId, {
      name: 'Security Double Shift Schedule',
      code: 'WS-SEC-' + suffix,
      description: 'Split morning and evening security duty schedule',
      days: [
        { dayOfWeek: 1, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 2, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 3, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 4, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 5, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 6, isWorkingDay: true, shiftIds: [morningShiftId, eveningShiftId] },
        { dayOfWeek: 0, isWorkingDay: false, shiftIds: [] },
      ],
    });
    securityDoubleScheduleId = schedSec.id;

    // 3. Create Test Employees
    const emp1 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-FT-01',
        firstNameEn: 'Kamran',
        lastNameEn: 'Akmal',
        departmentId: deptTeachingId,
        designationId: desigTeacherId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empFullTimeId = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-PT-01',
        firstNameEn: 'Sana',
        lastNameEn: 'Mir',
        departmentId: deptTeachingId,
        designationId: desigTeacherId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empPartTimeId = emp2.id;

    const emp3 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-SEC-01',
        firstNameEn: 'Javed',
        lastNameEn: 'Miandad',
        departmentId: deptAccountsId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    empSecurityId = emp3.id;

    // Assign Schedules:
    // Teaching Department -> Full Time Schedule
    await WorkScheduleService.assignScheduleBulk(tenantId, {
      scheduleId: fullTimeScheduleId,
      assignmentType: 'DEPARTMENT',
      departmentId: deptTeachingId,
      effectiveFrom: '2026-09-01',
      reason: 'Teaching faculty standard schedule',
    });

    // Sana Mir (EMP-PT-01) -> Part Time Schedule Override
    await WorkScheduleService.assignScheduleBulk(tenantId, {
      scheduleId: partTimeScheduleId,
      assignmentType: 'EMPLOYEE',
      employeeIds: [empPartTimeId],
      isOverride: true,
      effectiveFrom: '2026-09-01',
      reason: 'Part-time faculty individual duty schedule override',
    });
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.shiftAuditLog.deleteMany({ where: { tenantId } });
      await prisma.employeeScheduleAssignment.deleteMany({ where: { tenantId } });
      await prisma.workScheduleDay.deleteMany({ where: { workSchedule: { tenantId } } });
      await prisma.workSchedule.deleteMany({ where: { tenantId } });
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

  // 1. One-shift schedule on regular weekday
  it('1. Resolves single-shift day (Monday) for Full-Time staff', async () => {
    const mondayDate = '2026-09-07'; // Monday
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empFullTimeId, mondayDate);

    expect(res.isWorkingDay).toBe(true);
    expect(res.scheduleId).toBe(fullTimeScheduleId);
    expect(res.shifts.length).toBe(1);
    expect(res.shifts[0].scheduledStartTime).toBe('08:00');
    expect(res.shifts[0].scheduledEndTime).toBe('16:00');
    expect(res.shifts[0].scheduledDurationHours).toBe(8.0);
  });

  // 2. Different shift on Friday
  it('2. Automatically applies Friday special shift (08:00 -> 12:30) as defined in the Work Schedule', async () => {
    const fridayDate = '2026-09-04'; // Friday
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empFullTimeId, fridayDate);

    expect(res.isWorkingDay).toBe(true);
    expect(res.shifts.length).toBe(1);
    expect(res.shifts[0].shiftId).toBe(fridayShiftId);
    expect(res.shifts[0].scheduledStartTime).toBe('08:00');
    expect(res.shifts[0].scheduledEndTime).toBe('12:30');
    expect(res.shifts[0].scheduledDurationHours).toBe(4.5);
  });

  // 3. Weekly Off Day
  it('3. Identifies Saturday/Sunday as non-working Off Days with 0 scheduled shifts', async () => {
    const sundayDate = '2026-09-06'; // Sunday
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empFullTimeId, sundayDate);

    expect(res.isWorkingDay).toBe(false);
    expect(res.shifts.length).toBe(0);
  });

  // 4. Double-shift day in Part-Time Schedule
  it('4. Resolves double-shift day (Monday: Morning + Afternoon) for Part-Time faculty', async () => {
    const mondayDate = '2026-09-07'; // Monday
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empPartTimeId, mondayDate);

    expect(res.isWorkingDay).toBe(true);
    expect(res.precedenceSource).toBe('EMPLOYEE_OVERRIDE');
    expect(res.shifts.length).toBe(2);

    expect(res.shifts[0].shiftId).toBe(morningShiftId);
    expect(res.shifts[0].scheduledStartTime).toBe('07:00');
    expect(res.shifts[0].scheduledEndTime).toBe('11:00');

    expect(res.shifts[1].shiftId).toBe(afternoonShiftId);
    expect(res.shifts[1].scheduledStartTime).toBe('12:00');
    expect(res.shifts[1].scheduledEndTime).toBe('16:00');
  });

  // 5. Single-shift day in Part-Time Schedule (Tuesday: Morning only)
  it('5. Resolves single-shift day (Tuesday: Morning only) for Part-Time faculty on non-split days', async () => {
    const tuesdayDate = '2026-09-08'; // Tuesday
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empPartTimeId, tuesdayDate);

    expect(res.isWorkingDay).toBe(true);
    expect(res.shifts.length).toBe(1);
    expect(res.shifts[0].shiftId).toBe(morningShiftId);
  });

  // 6. Overlap Prevention on Day Configuration
  it('6. Rejects creating a Work Schedule containing overlapping shifts on any working day', async () => {
    const sOverlap = await ShiftService.createShift(tenantId, {
      name: 'Midday Overlap Shift',
      code: 'SOVR-' + Date.now().toString().slice(-4),
      startTime: '09:00',
      endTime: '14:00',
    });

    await expect(
      WorkScheduleService.createWorkSchedule(tenantId, {
        name: 'Invalid Overlapping Schedule',
        code: 'WS-INVALID-' + Date.now().toString().slice(-4),
        days: [
          { dayOfWeek: 1, isWorkingDay: true, shiftIds: [morningShiftId, sOverlap.id] }, // Overlaps on Monday
        ],
      })
    ).rejects.toThrow(/contains overlapping work shifts/i);
  });

  // 7. Bulk Schedule Assignment by Department with Preview
  it('7. Generates assignment preview and bulk assigns Work Schedule by Department', async () => {
    const preview = await WorkScheduleService.previewScheduleAssignment(tenantId, {
      scheduleId: securityDoubleScheduleId,
      assignmentType: 'DEPARTMENT',
      departmentId: deptAccountsId,
      effectiveDate: '2026-09-01',
    });

    expect(preview.totalAffected).toBe(1);
    expect(preview.employees[0].employeeId).toBe(empSecurityId);

    const assignRes = await WorkScheduleService.assignScheduleBulk(tenantId, {
      scheduleId: securityDoubleScheduleId,
      assignmentType: 'DEPARTMENT',
      departmentId: deptAccountsId,
      effectiveFrom: '2026-09-01',
      reason: 'Security duty split schedule',
    });

    expect(assignRes.success).toBe(true);
    expect(assignRes.affectedEmployeesCount).toBe(1);

    // Verify resolved schedule
    const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empSecurityId, '2026-09-07');
    expect(res.scheduleId).toBe(securityDoubleScheduleId);
    expect(res.shifts.length).toBe(2); // Morning + Evening
  });

  // 8. Effective-Dated History Preservation
  it('8. Preserves historical schedule when employee schedule changes on a future date', async () => {
    // Starting 2026-10-01, change Sana Mir (EMP-PT-01) from Part-Time Schedule to Full-Time Schedule
    await WorkScheduleService.assignScheduleBulk(tenantId, {
      scheduleId: fullTimeScheduleId,
      assignmentType: 'EMPLOYEE',
      employeeIds: [empPartTimeId],
      isOverride: true,
      effectiveFrom: '2026-10-01',
      reason: 'Promoted to full-time faculty contract',
    });

    // In September (Historical): Still returns Part-Time Schedule (2 shifts on Monday)
    const septRes = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empPartTimeId, '2026-09-14');
    expect(septRes.scheduleId).toBe(partTimeScheduleId);
    expect(septRes.shifts.length).toBe(2);

    // In October (New Schedule): Returns Full-Time Schedule (1 shift on Monday)
    const octRes = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, empPartTimeId, '2026-10-05');
    expect(octRes.scheduleId).toBe(fullTimeScheduleId);
    expect(octRes.shifts.length).toBe(1);
  });

  // 9. Employee Attendance Integration
  it('9. Employee Attendance roster dynamically populates shifts from the applicable Work Schedule', async () => {
    const date = '2026-09-07'; // Monday
    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date);

    const empFT = roster.roster.find((r) => r.employee.id === empFullTimeId);
    expect(empFT?.scheduledShiftsCount).toBe(1);
    expect(empFT?.totalScheduledHours).toBe(8.0);

    const empPT = roster.roster.find((r) => r.employee.id === empPartTimeId);
    expect(empPT?.scheduledShiftsCount).toBe(2);
    expect(empPT?.totalScheduledHours).toBe(8.0);
  });
});
