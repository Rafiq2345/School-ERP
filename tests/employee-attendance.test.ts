import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';
import { HolidayService } from '@/lib/services/holiday-service';
import { ShiftService } from '@/lib/services/shift-service';

const prisma = new PrismaClient();

describe('Attendance Management Phase 2: Employee Attendance Suite', () => {
  let tenantId: string;
  let deptFacultyId: string;
  let deptAdminId: string;
  let desigTeacherId: string;
  let desigCoordinatorId: string;
  let shiftStandardId: string;
  let shiftMorningId: string;
  let emp1Id: string;
  let emp2Id: string;
  let emp3Id: string;

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Employee Attendance Academy ' + uniqueSuffix,
        code: 'EMP-ATT-' + uniqueSuffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // Departments
    const dept1 = await prisma.department.create({
      data: { tenantId, name: 'Faculty of Science & Math', code: 'DEPT-SCI-' + uniqueSuffix },
    });
    deptFacultyId = dept1.id;

    const dept2 = await prisma.department.create({
      data: { tenantId, name: 'School Administration', code: 'DEPT-ADM-' + uniqueSuffix },
    });
    deptAdminId = dept2.id;

    // Designations
    const desig1 = await prisma.designation.create({
      data: { tenantId, departmentId: deptFacultyId, name: 'Senior Teacher', code: 'DESIG-TCH-' + uniqueSuffix },
    });
    desigTeacherId = desig1.id;

    const desig2 = await prisma.designation.create({
      data: { tenantId, departmentId: deptAdminId, name: 'Academic Coordinator', code: 'DESIG-CRD-' + uniqueSuffix },
    });
    desigCoordinatorId = desig2.id;

    // Shifts
    const shift1 = await ShiftService.createShift(tenantId, {
      name: 'Full Day Standard',
      code: 'SHIFT-FULL-' + uniqueSuffix,
      startTime: '08:00',
      endTime: '16:00',
      graceMinutes: 15,
      breakMinutes: 30,
      minHoursFullDay: 6.0,
      minHoursHalfDay: 3.5,
      workingDays: [1, 2, 3, 4, 5, 6],
      isDefault: true,
    });
    shiftStandardId = shift1.id;

    const shift2 = await ShiftService.createShift(tenantId, {
      name: 'Morning Part-Time',
      code: 'SHIFT-MRN-' + uniqueSuffix,
      startTime: '08:00',
      endTime: '14:00',
      graceMinutes: 10,
      breakMinutes: 0,
      minHoursFullDay: 5.0,
      minHoursHalfDay: 3.0,
      workingDays: [1, 2, 3, 4, 5],
    });
    shiftMorningId = shift2.id;

    // Employees
    const emp1 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-SCI-001',
        firstNameEn: 'Muhammad',
        lastNameEn: 'Tariq',
        departmentId: deptFacultyId,
        designationId: desigTeacherId,
        shiftId: shiftStandardId,
        joiningDate: new Date('2024-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
        standardWorkingHours: 8.0,
      },
    });
    emp1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-ADM-001',
        firstNameEn: 'Fatima',
        lastNameEn: 'Zahra',
        departmentId: deptAdminId,
        designationId: desigCoordinatorId,
        shiftId: shiftStandardId,
        joiningDate: new Date('2024-02-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
        standardWorkingHours: 8.0,
      },
    });
    emp2Id = emp2.id;

    const emp3 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-SCI-002',
        firstNameEn: 'Zainab',
        lastNameEn: 'Bibi',
        departmentId: deptFacultyId,
        designationId: desigTeacherId,
        shiftId: shiftStandardId,
        joiningDate: new Date('2024-03-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
        standardWorkingHours: 8.0,
      },
    });
    emp3Id = emp3.id;

    // Direct shift assignments
    await ShiftService.assignShiftBulk(tenantId, {
      shiftIds: [shiftStandardId],
      assignmentType: 'EMPLOYEE',
      employeeIds: [emp1Id, emp2Id, emp3Id],
      effectiveFrom: '2026-09-01',
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

  // A. Time Metrics & Dynamic Worked Hours Calculation
  it('A. Accurately calculates dynamic worked hours, late minutes, early exit, and break deductions', () => {
    // 1. Full 8h shift on-time
    const resOnTime = EmployeeAttendanceService.calculateTimeMetrics({
      scheduledStart: '08:00',
      scheduledEnd: '16:00',
      checkIn: '08:00',
      checkOut: '16:00',
      graceMinutes: 15,
      breakMinutes: 30,
    });
    expect(resOnTime.lateMinutes).toBe(0);
    expect(resOnTime.earlyExitMinutes).toBe(0);
    expect(resOnTime.workedMinutes).toBe(450); // 480 - 30m break
    expect(resOnTime.workedHours).toBe(7.5);

    // 2. 6h shift
    const res6h = EmployeeAttendanceService.calculateTimeMetrics({
      scheduledStart: '08:00',
      scheduledEnd: '14:00',
      checkIn: '08:00',
      checkOut: '14:00',
      graceMinutes: 10,
      breakMinutes: 0,
    });
    expect(res6h.workedMinutes).toBe(360);
    expect(res6h.workedHours).toBe(6.0);

    // 3. Late Arrival
    const resLate = EmployeeAttendanceService.calculateTimeMetrics({
      scheduledStart: '08:00',
      scheduledEnd: '14:00',
      checkIn: '08:35',
      checkOut: '14:00',
      graceMinutes: 15,
    });
    expect(resLate.lateMinutes).toBe(35);
    expect(resLate.workedMinutes).toBe(325);
  });

  // B. First-time Save
  it('B. Saves daily employee attendance for the first time without correction modal', async () => {
    const testDate = '2026-10-05';

    const saveRes = await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date: testDate,
      records: [
        {
          employeeId: emp1Id,
          shiftId: shiftStandardId,
          scheduledStartTime: '08:00',
          scheduledEndTime: '16:00',
          checkInTime: '08:00',
          checkOutTime: '16:00',
          status: 'PRESENT',
        },
        {
          employeeId: emp2Id,
          shiftId: shiftStandardId,
          scheduledStartTime: '08:00',
          scheduledEndTime: '16:00',
          checkInTime: '08:25',
          checkOutTime: '16:00',
          status: 'LATE',
        },
        {
          employeeId: emp3Id,
          shiftId: shiftStandardId,
          scheduledStartTime: '08:00',
          scheduledEndTime: '16:00',
          status: 'ABSENT',
        },
      ],
    });

    expect(saveRes.success).toBe(true);
    expect(saveRes.createdCount).toBe(3);
    expect(saveRes.updatedCount).toBe(0);
    expect(saveRes.auditLogsCreated).toBe(0);

    const stored = await prisma.employeeAttendanceRecord.findMany({
      where: { tenantId, attendanceDate: new Date('2026-10-05T00:00:00.000Z') },
    });
    expect(stored.length).toBe(3);
  });

  // C. Dashboard Metrics
  it('C. Computes accurate Employee Attendance Dashboard stats and totals', async () => {
    const testDate = '2026-10-05';
    const dash = await EmployeeAttendanceService.getEmployeeAttendanceDashboard(tenantId, testDate);

    expect(dash.totalActiveEmployees).toBe(3);
    expect(dash.presentCount).toBe(2); // 1 present + 1 late
    expect(dash.lateCount).toBe(1);
    expect(dash.absentCount).toBe(1);
    expect(dash.unmarkedCount).toBe(0);
    expect(dash.attendancePercentage).toBe(66.7);
  });

  // D. Correction with Mandatory Reason
  it('D. Requires justification on updating existing attendance and creates immutable audit log', async () => {
    const testDate = '2026-10-05';

    // 1. Missing reason throws error
    await expect(
      EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
        date: testDate,
        records: [
          {
            employeeId: emp3Id,
            shiftId: shiftStandardId,
            scheduledStartTime: '08:00',
            scheduledEndTime: '16:00',
            status: 'ON_LEAVE',
            remarks: 'Emergency leave approved',
          },
        ],
        correctionReason: '',
      })
    ).rejects.toThrow(/Mandatory correction reason is required/);

    // 2. Valid reason succeeds
    const correctionRes = await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      date: testDate,
      records: [
        {
          employeeId: emp3Id,
          shiftId: shiftStandardId,
          scheduledStartTime: '08:00',
          scheduledEndTime: '16:00',
          status: 'ON_LEAVE',
          remarks: 'Medical leave certificate verified',
        },
      ],
      correctionReason: 'Medical certificate submitted and approved by Principal',
    });

    expect(correctionRes.success).toBe(true);
    expect(correctionRes.updatedCount).toBe(1);
    expect(correctionRes.auditLogsCreated).toBe(1);

    const auditLogs = await EmployeeAttendanceService.getEmployeeAttendanceCorrections(tenantId, {
      employeeId: emp3Id,
    });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].previousStatus).toBe('ABSENT');
    expect(auditLogs[0].newStatus).toBe('ON_LEAVE');
  });

  // E. Central School Calendar & Holiday Awareness
  it('E. Integrates with Central School Calendar for non-working days and overrides', async () => {
    const holidayDate = '2026-11-09'; // Iqbal Day

    await HolidayService.createHoliday(tenantId, {
      title: 'Iqbal Day Public Holiday',
      holidayType: 'PUBLIC_HOLIDAY',
      startDate: holidayDate,
      endDate: holidayDate,
      scope: 'WHOLE_SCHOOL',
    });

    const roster = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, holidayDate);
    expect(roster.isHoliday).toBe(true);
    expect(roster.holidayTitle).toBe('Iqbal Day Public Holiday');
    expect(roster.roster[0].dailyStatus).toBe('HOLIDAY');
  });

  // F. Monthly Employee Attendance Register Matrix
  it('F. Generates monthly employee attendance register without duplicating employees', async () => {
    const register = await EmployeeAttendanceService.getEmployeeMonthlyRegister(tenantId, 2026, 10);

    expect(register.year).toBe(2026);
    expect(register.month).toBe(10);
    expect(register.daysInMonth).toBe(31);
    expect(register.days.length).toBe(31);
    expect(register.employees.length).toBe(3);

    const emp1Row = register.employees.find((e) => e.employeeId === emp1Id);
    expect(emp1Row).toBeDefined();
    expect(emp1Row?.summary.presentDays).toBeGreaterThanOrEqual(1);
  });

  // G. Payroll Attendance Summary Contract
  it('G. Extracts payroll-ready summary: working days, present days, leave, late minutes, and worked hours', async () => {
    const payroll = await EmployeeAttendanceService.getPayrollAttendanceSummary(
      tenantId,
      '2026-10-01',
      '2026-10-31'
    );

    expect(payroll.length).toBe(3);
    const emp1Summary = payroll.find((p) => p.employeeId === emp1Id);
    expect(emp1Summary?.presentShiftsCount).toBeGreaterThanOrEqual(1);
  });
});
