import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ShiftService } from '@/lib/services/shift-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

const prisma = new PrismaClient();

describe('Work Shift & Employee Schedule Management Suite', () => {
  let tenantId: string;
  let deptAccountsId: string;
  let deptTeachingId: string;
  let desigAccountantId: string;
  let desigTeacherId: string;
  let fullTimeShiftId: string;
  let morningShiftId: string;
  let accountsShiftId: string;
  let emp1Id: string;
  let emp2Id: string;
  let emp3Id: string;

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Shift Academy ' + uniqueSuffix,
        code: 'SHIFT-TEN-' + uniqueSuffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // Departments & Designations
    const dept1 = await prisma.department.create({
      data: { tenantId, name: 'Accounts Department', code: 'DEPT-ACC-' + uniqueSuffix },
    });
    deptAccountsId = dept1.id;

    const dept2 = await prisma.department.create({
      data: { tenantId, name: 'Teaching Faculty', code: 'DEPT-TCH-' + uniqueSuffix },
    });
    deptTeachingId = dept2.id;

    const desig1 = await prisma.designation.create({
      data: { tenantId, departmentId: deptAccountsId, name: 'Accountant', code: 'DESIG-ACC-' + uniqueSuffix },
    });
    desigAccountantId = desig1.id;

    const desig2 = await prisma.designation.create({
      data: { tenantId, departmentId: deptTeachingId, name: 'Teacher', code: 'DESIG-TCH-' + uniqueSuffix },
    });
    desigTeacherId = desig2.id;

    // Create Base Reusable Shifts
    const s1 = await ShiftService.createShift(tenantId, {
      name: 'Full Time Standard Shift',
      code: 'SHIFT-FT-' + uniqueSuffix,
      startTime: '08:00',
      endTime: '16:00',
      graceMinutes: 15,
      earlyExitGraceMinutes: 5,
      breakMinutes: 30, // 30m break
      minHoursFullDay: 6.0,
      minHoursHalfDay: 3.5,
      workingDays: [1, 2, 3, 4, 5, 6],
      daySpecificTimings: {
        '5': { startTime: '08:00', endTime: '12:30' }, // Friday special timing (4.5 hrs)
      },
      isDefault: true,
    });
    fullTimeShiftId = s1.id;

    const s2 = await ShiftService.createShift(tenantId, {
      name: 'Part Time Morning Shift',
      code: 'SHIFT-PT-' + uniqueSuffix,
      startTime: '08:00',
      endTime: '12:00',
      graceMinutes: 10,
      breakMinutes: 0,
      minHoursFullDay: 4.0,
      minHoursHalfDay: 2.0,
      workingDays: [1, 2, 3, 4, 5],
      isDefault: false,
    });
    morningShiftId = s2.id;

    const s3 = await ShiftService.createShift(tenantId, {
      name: 'Accounts Shift',
      code: 'SHIFT-ACC-' + uniqueSuffix,
      startTime: '08:30',
      endTime: '16:30',
      graceMinutes: 15,
      breakMinutes: 45,
      isDefault: false,
    });
    accountsShiftId = s3.id;

    // Create Test Employees
    const emp1 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-ACC-01',
        firstNameEn: 'Kamran',
        lastNameEn: 'Akmal',
        departmentId: deptAccountsId,
        designationId: desigAccountantId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    emp1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-TCH-01',
        firstNameEn: 'Zainab',
        lastNameEn: 'Bibi',
        departmentId: deptTeachingId,
        designationId: desigTeacherId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    emp2Id = emp2.id;

    const emp3 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-TCH-02',
        firstNameEn: 'Usman',
        lastNameEn: 'Ali',
        departmentId: deptTeachingId,
        designationId: desigTeacherId,
        joiningDate: new Date('2025-01-01T00:00:00.000Z'),
        currentStatus: 'ACTIVE',
      },
    });
    emp3Id = emp3.id;
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

  // 1. Reusable Shift Creation
  it('1. Creates reusable shifts with variable timings, grace periods, and break rules', async () => {
    const shift = await ShiftService.getShiftById(tenantId, fullTimeShiftId);
    expect(shift).toBeDefined();
    expect(shift?.startTime).toBe('08:00');
    expect(shift?.endTime).toBe('16:00');
    expect(shift?.breakMinutes).toBe(30);
    expect(shift?.isDefault).toBe(true);

    const timingsObj = shift?.daySpecificTimings as Record<string, any>;
    expect(timingsObj['5'].startTime).toBe('08:00');
    expect(timingsObj['5'].endTime).toBe('12:30');
  });

  // 2. Default Institutional Shift Fallback
  it('2. Automatically falls back to Institutional Default Shift when no specific assignment exists', async () => {
    // Unassigned employee on Tuesday (2026-09-01)
    const applicable = await ShiftService.getApplicableShiftForEmployee(tenantId, emp2Id, '2026-09-01');

    expect(applicable.shiftId).toBe(fullTimeShiftId);
    expect(applicable.precedenceSource).toBe('INSTITUTIONAL_DEFAULT');
    expect(applicable.scheduledStartTime).toBe('08:00');
    expect(applicable.scheduledEndTime).toBe('16:00');
  });

  // 3. Bulk Shift Assignment by Department
  it('3. Bulk assigns Accounts Shift to Accounts Department with preview', async () => {
    // 3a. Preview
    const preview = await ShiftService.previewShiftAssignment(tenantId, {
      assignmentType: 'DEPARTMENT',
      departmentId: deptAccountsId,
      effectiveDate: '2026-09-01',
    });
    expect(preview.totalAffected).toBe(1);
    expect(preview.employees[0].employeeId).toBe(emp1Id);

    // 3b. Bulk Assign
    const assignRes = await ShiftService.assignShiftBulk(tenantId, {
      shiftId: accountsShiftId,
      assignmentType: 'DEPARTMENT',
      departmentId: deptAccountsId,
      effectiveFrom: '2026-09-01',
      reason: 'Accounts Department standard schedule',
    });
    expect(assignRes.success).toBe(true);
    expect(assignRes.affectedEmployeesCount).toBe(1);

    // 3c. Verify Department Precedence
    const applicable = await ShiftService.getApplicableShiftForEmployee(tenantId, emp1Id, '2026-09-01');
    expect(applicable.shiftId).toBe(accountsShiftId);
    expect(applicable.precedenceSource).toBe('DEPARTMENT_ASSIGNMENT');
    expect(applicable.scheduledStartTime).toBe('08:30');
    expect(applicable.scheduledEndTime).toBe('16:30');
  });

  // 4. Employee-Specific Custom Override (Highest Precedence)
  it('4. Applies employee-specific override which supersedes department/default shifts', async () => {
    // Override Usman (emp3) in Teaching to Part Time Morning Shift
    const overrideRes = await ShiftService.assignShiftBulk(tenantId, {
      shiftId: morningShiftId,
      assignmentType: 'EMPLOYEE',
      employeeIds: [emp3Id],
      isOverride: true,
      effectiveFrom: '2026-09-01',
      reason: 'Part-time faculty contract override',
    });
    expect(overrideRes.success).toBe(true);

    const applicable = await ShiftService.getApplicableShiftForEmployee(tenantId, emp3Id, '2026-09-01');
    expect(applicable.shiftId).toBe(morningShiftId);
    expect(applicable.precedenceSource).toBe('EMPLOYEE_OVERRIDE');
    expect(applicable.scheduledStartTime).toBe('08:00');
    expect(applicable.scheduledEndTime).toBe('12:00');
    expect(applicable.minHoursFullDay).toBe(4.0);
  });

  // 5. Effective-Dated History Preservation
  it('5. Preserves historical shift assignments when an employee schedule changes on a future date', async () => {
    // Change Usman (emp3) override from Morning Shift to Full Time Shift starting from Oct 1
    await ShiftService.assignShiftBulk(tenantId, {
      shiftId: fullTimeShiftId,
      assignmentType: 'EMPLOYEE',
      employeeIds: [emp3Id],
      isOverride: true,
      effectiveFrom: '2026-10-01',
      reason: 'Promoted to full-time faculty',
    });

    // In September (Historical Date): Still returns Morning Shift (08:00 - 12:00)
    const septSchedule = await ShiftService.getApplicableShiftForEmployee(tenantId, emp3Id, '2026-09-15');
    expect(septSchedule.shiftId).toBe(morningShiftId);
    expect(septSchedule.scheduledEndTime).toBe('12:00');

    // In October (New Effective Date): Returns Full Time Shift (08:00 - 16:00)
    const octSchedule = await ShiftService.getApplicableShiftForEmployee(tenantId, emp3Id, '2026-10-05');
    expect(octSchedule.shiftId).toBe(fullTimeShiftId);
    expect(octSchedule.scheduledEndTime).toBe('16:00');
  });

  // 6. Day-Specific Variable Timings (Friday Timing Override)
  it('6. Automatically applies variable Friday timing (08:00 - 12:30) for configured shifts', async () => {
    // Friday: Sept 4, 2026
    const fridaySchedule = await ShiftService.getApplicableShiftForEmployee(tenantId, emp2Id, '2026-09-04');
    expect(fridaySchedule.scheduledStartTime).toBe('08:00');
    expect(fridaySchedule.scheduledEndTime).toBe('12:30');

    // Monday: Sept 7, 2026
    const mondaySchedule = await ShiftService.getApplicableShiftForEmployee(tenantId, emp2Id, '2026-09-07');
    expect(mondaySchedule.scheduledStartTime).toBe('08:00');
    expect(mondaySchedule.scheduledEndTime).toBe('16:00');
  });

  // 7. Audit Log Tracking
  it('7. Records immutable audit logs for shift modifications and bulk assignments', async () => {
    const auditLogs = await ShiftService.getShiftAuditLogs(tenantId);
    expect(auditLogs.length).toBeGreaterThanOrEqual(3);

    const bulkLog = auditLogs.find((l) => l.action === 'BULK_ASSIGNED' || l.action === 'OVERRIDE_CREATED');
    expect(bulkLog).toBeDefined();
    expect(bulkLog?.affectedEmployeesCount).toBeGreaterThan(0);
  });
});
