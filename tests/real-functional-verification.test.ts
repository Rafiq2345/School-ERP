import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '@/lib/services/shift-service';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';
import { HolidayService } from '@/lib/services/holiday-service';

const prisma = new PrismaClient();

describe('Real Functional Verification: Employee Work Schedules & Multi-Shift Attendance', () => {
  const tenantId = 'tenant-sch-001';

  it('1. Verifies Schedule Assignment for all 4 test employees', async () => {
    const dept = await prisma.department.findFirst({ where: { tenantId } });
    const desig = await prisma.designation.findFirst({ where: { tenantId } });

    // 4 Test Employees
    const empConfigs = [
      { no: 'EMP-101', fn: 'Muhammad', ln: 'Tariq', code: 'WS-FULLTIME' },
      { no: 'EMP-102', fn: 'Fatima', ln: 'Zahra', code: 'WS-PARTTIME' },
      { no: 'EMP-103', fn: 'Javed', ln: 'Miandad', code: 'WS-SECURITY-2X' },
      { no: 'EMP-104', fn: 'Usman', ln: 'Ali', code: 'WS-TRIPLE-3X' },
    ];

    for (const cfg of empConfigs) {
      let emp = await prisma.employee.findFirst({ where: { tenantId, employeeNo: cfg.no } });
      if (!emp) {
        emp = await prisma.employee.create({
          data: {
            tenantId,
            employeeNo: cfg.no,
            firstNameEn: cfg.fn,
            lastNameEn: cfg.ln,
            departmentId: dept?.id,
            designationId: desig?.id,
            currentStatus: 'ACTIVE',
            joiningDate: new Date('2024-01-01'),
          },
        });
      }

      const sched = await prisma.workSchedule.findFirst({ where: { tenantId, code: cfg.code } });
      expect(sched).toBeDefined();

      await WorkScheduleService.assignScheduleBulk(tenantId, {
        scheduleId: sched!.id,
        assignmentType: 'EMPLOYEE',
        employeeIds: [emp.id],
        isOverride: true,
        effectiveFrom: '2026-10-01',
        reason: `Assignment for ${cfg.no}`,
      });

      const res = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, emp.id, '2026-10-05');
      expect(res.scheduleId).toBe(sched!.id);
      expect(res.scheduleCode).toBe(cfg.code);
    }
  });

  it('2. Verifies Single, Double, and Triple Shift Segments loading on Monday (2026-10-05)', async () => {
    const rosterData = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, '2026-10-05');

    // EMP-101: Single Shift (Full-Time: 08:00 - 16:00)
    const r101 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-101')!;
    expect(r101).toBeDefined();
    expect(r101.scheduledShiftsCount).toBe(1);
    expect(r101.shiftSegments.length).toBe(1);
    expect(r101.shiftSegments[0].scheduledStartTime).toBe('08:00');
    expect(r101.shiftSegments[0].scheduledEndTime).toBe('16:00');

    // EMP-102: Double Shift (Part-Time on Mon: Morning 07:00-11:00 + Afternoon 12:00-16:00)
    const r102 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-102')!;
    expect(r102).toBeDefined();
    expect(r102.scheduledShiftsCount).toBe(2);
    expect(r102.shiftSegments.length).toBe(2);
    expect(r102.shiftSegments[0].scheduledStartTime).toBe('07:00');
    expect(r102.shiftSegments[0].scheduledEndTime).toBe('11:00');
    expect(r102.shiftSegments[1].scheduledStartTime).toBe('12:00');
    expect(r102.shiftSegments[1].scheduledEndTime).toBe('16:00');

    // EMP-103: Double Shift (Security: Morning 07:00-11:00 + Evening 17:00-21:00)
    const r103 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-103')!;
    expect(r103).toBeDefined();
    expect(r103.scheduledShiftsCount).toBe(2);
    expect(r103.shiftSegments.length).toBe(2);
    expect(r103.shiftSegments[0].scheduledStartTime).toBe('07:00');
    expect(r103.shiftSegments[0].scheduledEndTime).toBe('11:00');
    expect(r103.shiftSegments[1].scheduledStartTime).toBe('17:00');
    expect(r103.shiftSegments[1].scheduledEndTime).toBe('21:00');

    // EMP-104: Triple Shift (Morning + Afternoon + Evening)
    const r104 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-104')!;
    expect(r104).toBeDefined();
    expect(r104.scheduledShiftsCount).toBe(3);
    expect(r104.shiftSegments.length).toBe(3);
    expect(r104.shiftSegments[0].scheduledStartTime).toBe('07:00');
    expect(r104.shiftSegments[1].scheduledStartTime).toBe('12:00');
    expect(r104.shiftSegments[2].scheduledStartTime).toBe('17:00');
  });

  it('3. Verifies Worked Hours and Gap Exclusion on Double and Triple Shifts', async () => {
    const testDate = '2026-10-05';
    const rosterData = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDate);
    const r102 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-102')!;
    const r104 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-104')!;

    // Clean previous
    await prisma.employeeAttendanceAuditLog.deleteMany({
      where: { tenantId, attendanceDate: new Date('2026-10-05T00:00:00.000Z') },
    });
    await prisma.employeeAttendanceRecord.deleteMany({
      where: { tenantId, attendanceDate: new Date('2026-10-05T00:00:00.000Z') },
    });

    // Save EMP-102 (Morning 07:00-11:00 = 4.0h, Afternoon 12:00-16:00 = 4.0h)
    // Save EMP-104 (3 shifts of 4.0h each = 12.0h)
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date: testDate,
      records: [
        // EMP-102 Morning
        {
          employeeId: r102.employee.id,
          shiftId: r102.shiftSegments[0].shiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        // EMP-102 Afternoon
        {
          employeeId: r102.employee.id,
          shiftId: r102.shiftSegments[1].shiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '16:00',
          status: 'PRESENT',
        },
        // EMP-104 Shift 1
        {
          employeeId: r104.employee.id,
          shiftId: r104.shiftSegments[0].shiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          status: 'PRESENT',
        },
        // EMP-104 Shift 2
        {
          employeeId: r104.employee.id,
          shiftId: r104.shiftSegments[1].shiftId,
          scheduledStartTime: '12:00',
          scheduledEndTime: '16:00',
          checkInTime: '12:00',
          checkOutTime: '16:00',
          status: 'PRESENT',
        },
        // EMP-104 Shift 3
        {
          employeeId: r104.employee.id,
          shiftId: r104.shiftSegments[2].shiftId,
          scheduledStartTime: '17:00',
          scheduledEndTime: '21:00',
          checkInTime: '17:00',
          checkOutTime: '21:00',
          status: 'PRESENT',
        },
      ],
    });

    const updated = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDate);
    const u102 = updated.roster.find((r) => r.employee.employeeNo === 'EMP-102')!;
    const u104 = updated.roster.find((r) => r.employee.employeeNo === 'EMP-104')!;

    // EMP-102: Total Worked = 8.0h (11:00-12:00 gap excluded)
    expect(u102.totalWorkedHours).toBe(8.0);
    expect(u102.dailyStatus).toBe('PRESENT');

    // EMP-104: Total Worked = 12.0h (11:00-12:00 & 16:00-17:00 gaps excluded)
    expect(u104.totalWorkedHours).toBe(12.0);
    expect(u104.dailyStatus).toBe('PRESENT');
  });

  it('4. Verifies Late Arrival, Early Exit, and Partial Attendance', async () => {
    const testDate = '2026-10-06'; // Tuesday
    await prisma.employeeAttendanceAuditLog.deleteMany({
      where: { tenantId, attendanceDate: new Date('2026-10-06T00:00:00.000Z') },
    });
    await prisma.employeeAttendanceRecord.deleteMany({
      where: { tenantId, attendanceDate: new Date('2026-10-06T00:00:00.000Z') },
    });
    const rosterData = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDate);
    const r103 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-103')!;

    // EMP-103 on Tuesday: Morning (07:00-11:00) + Evening (17:00-21:00)
    // Mark Morning as Late + Early Exit (CheckIn 07:25 [15m late], CheckOut 10:30 [30m early exit])
    // Mark Evening as ABSENT
    await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date: testDate,
      records: [
        {
          employeeId: r103.employee.id,
          shiftId: r103.shiftSegments[0].shiftId,
          scheduledStartTime: '07:00',
          scheduledEndTime: '11:00',
          checkInTime: '07:25',
          checkOutTime: '10:30',
          status: 'LATE',
        },
        {
          employeeId: r103.employee.id,
          shiftId: r103.shiftSegments[1].shiftId,
          scheduledStartTime: '17:00',
          scheduledEndTime: '21:00',
          status: 'ABSENT',
        },
      ],
    });

    const updated = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDate);
    const u103 = updated.roster.find((r) => r.employee.employeeNo === 'EMP-103')!;

    expect(u103.totalLateMinutes).toBe(25);
    expect(u103.totalEarlyExitMinutes).toBe(30);
    expect(u103.totalWorkedHours).toBe(3.08); // 185m = 3.08h
    // Partial attendance does NOT mark whole employee absent
    expect(u103.dailyStatus).toBe('HALF_DAY');
  });

  it('5. Verifies Weekly Off and School Calendar Holiday recognition', async () => {
    // Sunday (2026-10-04)
    const sundayRoster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, '2026-10-04');
    const sunEmp = sundayRoster.roster.find((r) => r.employee.employeeNo === 'EMP-101')!;
    expect(sunEmp.scheduledShiftsCount).toBe(0);
    expect(sunEmp.dailyStatus).toBe('OFF_DAY');

    // Central School Calendar Holiday: Iqbal Day (2026-11-09)
    const holidayDate = '2026-11-09';
    await prisma.schoolHoliday.deleteMany({ where: { tenantId, startDate: new Date('2026-11-09T00:00:00.000Z') } });
    await HolidayService.createHoliday(tenantId, {
      title: 'Iqbal Day Public Holiday',
      holidayType: 'PUBLIC_HOLIDAY',
      startDate: holidayDate,
      endDate: holidayDate,
      scope: 'WHOLE_SCHOOL',
    });

    const holidayRoster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, holidayDate);
    expect(holidayRoster.isHoliday).toBe(true);
    expect(holidayRoster.holidayTitle).toBe('Iqbal Day Public Holiday');
    expect(holidayRoster.roster[0].dailyStatus).toBe('HOLIDAY');
  });

  it('6. Verifies Effective-Date & Historical Schedule Preservation', async () => {
    const emp102 = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-102' } });
    const schedFT = await prisma.workSchedule.findFirst({ where: { tenantId, code: 'WS-FULLTIME' } });

    // Starting 2026-11-01, switch EMP-102 to Full-Time Schedule
    await WorkScheduleService.assignScheduleBulk(tenantId, {
      scheduleId: schedFT!.id,
      assignmentType: 'EMPLOYEE',
      employeeIds: [emp102!.id],
      isOverride: true,
      effectiveFrom: '2026-11-01',
      reason: 'Promoted to full-time schedule from November',
    });

    // In October (Historical): Part-Time Schedule on Monday returns 2 shifts
    const octRes = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, emp102!.id, '2026-10-12');
    expect(octRes.scheduleCode).toBe('WS-PARTTIME');
    expect(octRes.shifts.length).toBe(2);

    // In November (New): Full-Time Schedule on Monday returns 1 shift
    const novRes = await WorkScheduleService.resolveWorkScheduleForEmployee(tenantId, emp102!.id, '2026-11-02');
    expect(novRes.scheduleCode).toBe('WS-FULLTIME');
    expect(novRes.shifts.length).toBe(1);
  });

  it('7. Verifies Mandatory Reason on Correction and Immutable Audit Trail', async () => {
    const testDate = '2026-10-05';
    const rosterData = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, testDate);
    const r102 = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-102')!;

    // 1. Missing reason throws error when modifying existing saved records
    await expect(
      EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
        date: testDate,
        records: [
          {
            employeeId: r102.employee.id,
            shiftId: r102.shiftSegments[0].shiftId,
            status: 'ON_LEAVE',
            remarks: 'Emergency leave',
          },
        ],
        correctionReason: '',
      })
    ).rejects.toThrow(/Mandatory correction reason is required/i);

    // 2. Valid correction saves and generates audit log
    const correctionResult = await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date: testDate,
      records: [
        {
          employeeId: r102.employee.id,
          shiftId: r102.shiftSegments[0].shiftId,
          status: 'PRESENT',
          checkInTime: '07:00',
          checkOutTime: '11:00',
          remarks: 'Corrected biometric sync timestamp',
        },
      ],
      correctionReason: 'Approved gate card log correction by HR Manager',
    });

    expect(correctionResult.success).toBe(true);
    expect(correctionResult.updatedCount).toBe(1);
    expect(correctionResult.auditLogsCreated).toBe(1);

    const auditLogs = await EmployeeAttendanceService.getEmployeeAttendanceCorrections(tenantId, {
      employeeId: r102.employee.id,
      date: testDate,
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0].correctionReason).toBe('Approved gate card log correction by HR Manager');
  });

  it('8. Verifies Monthly Attendance Register Matrix with Multi-Shift staff', async () => {
    const register = await EmployeeAttendanceService.getEmployeeMonthlyRegister(tenantId, 2026, 10);
    expect(register.year).toBe(2026);
    expect(register.month).toBe(10);
    expect(register.daysInMonth).toBe(31);

    // Ensure all 4 employees are present as distinct single rows
    const empNos = register.employees.map((e) => e.employeeNo);
    expect(empNos).toContain('EMP-101');
    expect(empNos).toContain('EMP-102');
    expect(empNos).toContain('EMP-103');
    expect(empNos).toContain('EMP-104');

    const emp102Row = register.employees.find((e) => e.employeeNo === 'EMP-102')!;
    expect(emp102Row.summary.presentDays).toBeGreaterThanOrEqual(1);
    expect(emp102Row.summary.totalWorkedHours).toBeGreaterThanOrEqual(4.0);
  });
});
