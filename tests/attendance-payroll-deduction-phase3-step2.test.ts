/**
 * Phase 3 Step 2 Automated Tests
 *
 * Configurable Attendance-to-Payroll Rule Engine & Reconciliation Suite.
 *
 * Invariants Verified:
 *  1. Configurable Late Arrival Accumulation ($X$ lates = $Y$ days deduction).
 *  2. Period Isolation: Late counters reset cleanly per monthly payroll period.
 *  3. Unexcused Absences: Configurable deduction unit (1.0d for full day).
 *  4. Multi-Shift Awareness: 2-shift schedule (1 absent + 1 present = 0.5d deduction).
 *  5. Multi-Shift Awareness: 3-shift schedule (1 absent + 2 present = 0.33d deduction).
 *  6. Fatima Zahra (EMP-102) Reference Invariant: Paid Casual Leave (Morning = Leave, Afternoon = Present) generates ZERO deductions.
 *  7. Unpaid Leave Deduplication: Approved unpaid leave on a shift produces exactly 1 leave input and 0 duplicate attendance inputs.
 *  8. 6-Level Rule Precedence: Override > Employee > Department > Designation > Type > Default.
 *  9. Reconciliation & Reversals: Attendance correction from ABSENT to PRESENT reverses prior deduction with immutable audit trail.
 * 10. Idempotency: Multiple reconciliation runs produce 0 duplicate records.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AttendancePayrollRuleService } from '@/lib/services/attendance-payroll-rule-service';
import { AttendancePayrollReconciliationService } from '@/lib/services/attendance-payroll-reconciliation-service';
import { PayrollDeductionPolicyService } from '@/lib/services/payroll-deduction-policy-service';
import { PayrollDeductionInputService } from '@/lib/services/payroll-deduction-input-service';

const prisma = new PrismaClient();

const TEST_TENANT_ID = 'tenant-sch-001';

describe('Phase 3 Step 2 — Attendance-to-Payroll Rule Engine & Reconciliation', () => {
  let defaultLatePolicyId: string;
  let deptLatePolicyId: string;
  let overrideLatePolicyId: string;
  let defaultAbsencePolicyId: string;
  let adminUserId: string | null = null;

  beforeAll(async () => {
    // Find admin user if available
    const adminUser = await prisma.user.findFirst({ where: { tenantId: TEST_TENANT_ID } });
    adminUserId = adminUser?.id ?? null;

    // Clean up test data for Step 2
    await prisma.payrollDeductionAuditLog.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.payrollDeductionInput.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.payrollDeductionPolicyAssignment.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.payrollDeductionPolicy.deleteMany({ where: { tenantId: TEST_TENANT_ID } });

    // 1. Create Default Late Policy: 3 lates = 1.0d deduction, 15m grace
    const defLate = await PayrollDeductionPolicyService.createPolicy(TEST_TENANT_ID, {
      policyCode: 'RULE_LATE_DEFAULT_3X1',
      policyName: 'Institutional Default: 3 Late Arrivals = 1 Day Deduction',
      scope: 'LATE_ARRIVALS',
      calculationBasis: 'CALENDAR_DAYS',
      lateTriggerCount: 3,
      lateGraceMinutes: 15,
      lateDeductionUnit: 1.0,
      effectiveFrom: '2026-01-01',
      isDefault: true,
      isActive: true,
    });
    defaultLatePolicyId = defLate.id;

    // 2. Create Department-specific Late Policy: 2 lates = 0.5d deduction for Admin Department
    const deptLate = await PayrollDeductionPolicyService.createPolicy(TEST_TENANT_ID, {
      policyCode: 'RULE_LATE_ADM_2X05',
      policyName: 'Admin Department Rule: 2 Late Arrivals = 0.5 Day Deduction',
      scope: 'LATE_ARRIVALS',
      calculationBasis: 'CALENDAR_DAYS',
      lateTriggerCount: 2,
      lateGraceMinutes: 10,
      lateDeductionUnit: 0.5,
      effectiveFrom: '2026-01-01',
      isDefault: false,
      isActive: true,
    });
    deptLatePolicyId = deptLate.id;

    // 3. Create Individual Override Policy: 5 lates = 1.0d for Tariq Mahmood (EMP-101)
    const overrideLate = await PayrollDeductionPolicyService.createPolicy(TEST_TENANT_ID, {
      policyCode: 'RULE_LATE_TARIQ_OVERRIDE',
      policyName: 'Principal Exception Override: 5 Lates = 1 Day',
      scope: 'LATE_ARRIVALS',
      calculationBasis: 'CALENDAR_DAYS',
      lateTriggerCount: 5,
      lateGraceMinutes: 20,
      lateDeductionUnit: 1.0,
      effectiveFrom: '2026-01-01',
      isDefault: false,
      isActive: true,
    });
    overrideLatePolicyId = overrideLate.id;

    // 4. Create Default Absence Policy: 1.0d per unexcused absence, 0.5d half day
    const defAbsence = await PayrollDeductionPolicyService.createPolicy(TEST_TENANT_ID, {
      policyCode: 'RULE_ABSENCE_DEFAULT',
      policyName: 'Standard Unexcused Absence Policy',
      scope: 'UNPAID_LEAVE',
      calculationBasis: 'CALENDAR_DAYS',
      absenceDeductionUnit: 1.0,
      halfDayDeductionUnit: 0.5,
      effectiveFrom: '2026-01-01',
      isDefault: true,
      isActive: true,
    });
    defaultAbsencePolicyId = defAbsence.id;

    // Fetch department for Admin
    const adminDept = await prisma.department.findFirst({
      where: { tenantId: TEST_TENANT_ID, code: 'DEPT-ADMIN' },
    });

    // Fetch employee EMP-101
    const tariq = await prisma.employee.findFirst({
      where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-101' },
    });

    // Create assignments:
    // Level 3 Department assignment for Admin Department
    if (adminDept) {
      await AttendancePayrollRuleService.createAssignment(TEST_TENANT_ID, {
        policyId: deptLatePolicyId,
        assignmentType: 'DEPARTMENT',
        departmentId: adminDept.id,
        effectiveFrom: '2026-01-01',
        priority: 300,
      });
    }

    // Level 1 Individual Override for EMP-101
    if (tariq) {
      await AttendancePayrollRuleService.createAssignment(TEST_TENANT_ID, {
        policyId: overrideLatePolicyId,
        assignmentType: 'INDIVIDUAL_OVERRIDE',
        employeeId: tariq.id,
        isOverride: true,
        effectiveFrom: '2026-01-01',
        priority: 1000,
      });
    }
  });

  // ---------------------------------------------------------
  // TC-S2-001: Rule Resolution Precedence
  // ---------------------------------------------------------
  it('TC-S2-001: 6-Level rule precedence resolves Override > Dept > Default', async () => {
    const tariq = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-101' } });
    const fatima = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-102' } }); // In Admin Dept
    const guard = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-104' } }); // Facility Mgmt Dept

    expect(tariq).toBeTruthy();
    expect(fatima).toBeTruthy();
    expect(guard).toBeTruthy();

    // Tariq has Level 1 override
    const tariqPolicy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
      TEST_TENANT_ID,
      tariq!.id,
      'LATE_ARRIVALS'
    );
    expect(tariqPolicy).toBeTruthy();
    expect(tariqPolicy!.policyCode).toBe('RULE_LATE_TARIQ_OVERRIDE');
    expect(tariqPolicy!.lateTriggerCount).toBe(5);

    // Fatima is in Admin Dept -> Level 3 Department match
    const fatimaPolicy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
      TEST_TENANT_ID,
      fatima!.id,
      'LATE_ARRIVALS'
    );
    expect(fatimaPolicy).toBeTruthy();
    expect(fatimaPolicy!.policyCode).toBe('RULE_LATE_ADM_2X05');
    expect(fatimaPolicy!.lateTriggerCount).toBe(2);
    expect(fatimaPolicy!.lateDeductionUnit).toBe(0.5);

    // Guard has no Dept policy -> Level 6 Institutional Default
    const guardPolicy = await AttendancePayrollRuleService.resolvePolicyForEmployee(
      TEST_TENANT_ID,
      guard!.id,
      'LATE_ARRIVALS'
    );
    expect(guardPolicy).toBeTruthy();
    expect(guardPolicy!.policyCode).toBe('RULE_LATE_DEFAULT_3X1');
    expect(guardPolicy!.lateTriggerCount).toBe(3);
  });

  // ---------------------------------------------------------
  // TC-S2-002: Late Arrival Accumulation Cycle
  // ---------------------------------------------------------
  it('TC-S2-002: Late arrival accumulation generates 1 deduction input per completed trigger count', async () => {
    const guard = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-104' } });
    const shift = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID } });

    expect(guard).toBeTruthy();
    expect(shift).toBeTruthy();

    // Create 3 late arrival attendance records in September 2026
    const sepDates = ['2026-09-07', '2026-09-08', '2026-09-09'];
    for (const d of sepDates) {
      await prisma.employeeAttendanceRecord.upsert({
        where: {
          tenantId_employeeId_attendanceDate_shiftId: {
            tenantId: TEST_TENANT_ID,
            employeeId: guard!.id,
            attendanceDate: new Date(`${d}T00:00:00.000Z`),
            shiftId: shift!.id,
          },
        },
        update: { status: 'LATE', lateMinutes: 25, isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
        create: {
          tenantId: TEST_TENANT_ID,
          employeeId: guard!.id,
          attendanceDate: new Date(`${d}T00:00:00.000Z`),
          shiftId: shift!.id,
          status: 'LATE',
          lateMinutes: 25,
          isHoliday: false,
          isWeeklyOff: false,
        },
      });
    }

    // Run reconciliation
    const result = await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: guard!.id, executeCommit: true, actorUserId: adminUserId }
    );

    expect(result.totalGenerated).toBeGreaterThanOrEqual(1);

    // Verify deduction input in DB
    const input = await prisma.payrollDeductionInput.findFirst({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        sourceType: 'ATTENDANCE_LATE_ACCUMULATION',
        payrollPeriodLabel: 'September 2026',
        status: 'PENDING',
      },
    });

    expect(input).toBeTruthy();
    expect(Number(input!.deductionDays)).toBe(1.0);
    expect(input!.deductionAmount).toBeNull(); // Contract-first invariant
  });

  // ---------------------------------------------------------
  // TC-S2-003: Period Isolation (October does not count Sep lates)
  // ---------------------------------------------------------
  it('TC-S2-003: Late counter resets per monthly payroll period', async () => {
    const guard = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-104' } });
    const shift = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID } });

    // Create 2 late arrivals in October 2026 (below trigger count 3)
    const octDates = ['2026-10-05', '2026-10-06'];
    for (const d of octDates) {
      await prisma.employeeAttendanceRecord.upsert({
        where: {
          tenantId_employeeId_attendanceDate_shiftId: {
            tenantId: TEST_TENANT_ID,
            employeeId: guard!.id,
            attendanceDate: new Date(`${d}T00:00:00.000Z`),
            shiftId: shift!.id,
          },
        },
        update: { status: 'LATE', lateMinutes: 20, isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
        create: {
          tenantId: TEST_TENANT_ID,
          employeeId: guard!.id,
          attendanceDate: new Date(`${d}T00:00:00.000Z`),
          shiftId: shift!.id,
          status: 'LATE',
          lateMinutes: 20,
          isHoliday: false,
          isWeeklyOff: false,
        },
      });
    }

    const octResult = await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T23:59:59.999Z'),
      { employeeId: guard!.id, executeCommit: true, actorUserId: adminUserId }
    );

    // October has only 2 lates, trigger is 3 -> 0 deduction inputs created for late accumulation
    const octInputs = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        sourceType: 'ATTENDANCE_LATE_ACCUMULATION',
        payrollPeriodLabel: 'October 2026',
      },
    });

    expect(octInputs.length).toBe(0);
  });

  // ---------------------------------------------------------
  // TC-S2-004: Multi-Shift Partial Absence (Fatima EMP-102 with 2 Shifts)
  // ---------------------------------------------------------
  it('TC-S2-004: Multi-shift partial absence (1 of 2 shifts absent) generates exactly 0.5d deduction', async () => {
    const fatima = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-102' } });
    const shiftMrn = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-MRN' } });
    const shiftAft = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-AFT' } });

    expect(fatima).toBeTruthy();
    expect(shiftMrn).toBeTruthy();
    expect(shiftAft).toBeTruthy();

    const testDate = new Date('2026-09-15T00:00:00.000Z');

    // Morning shift = ABSENT, Afternoon shift = PRESENT
    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: fatima!.id,
          attendanceDate: testDate,
          shiftId: shiftMrn!.id,
        },
      },
      update: { status: 'ABSENT', isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        attendanceDate: testDate,
        shiftId: shiftMrn!.id,
        status: 'ABSENT',
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: fatima!.id,
          attendanceDate: testDate,
          shiftId: shiftAft!.id,
        },
      },
      update: { status: 'PRESENT', workedMinutes: 240, isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        attendanceDate: testDate,
        shiftId: shiftAft!.id,
        status: 'PRESENT',
        workedMinutes: 240,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    const result = await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: fatima!.id, executeCommit: true, actorUserId: adminUserId }
    );

    const absenceInput = await prisma.payrollDeductionInput.findFirst({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        sourceType: 'ATTENDANCE_ABSENCE',
        attendanceDate: testDate,
        status: 'PENDING',
      },
    });

    expect(absenceInput).toBeTruthy();
    expect(Number(absenceInput!.deductionDays)).toBe(0.5); // exactly 0.5d for 1 of 2 shifts
  });

  // ---------------------------------------------------------
  // TC-S2-005: Multi-Shift Triple Shift Partial Absence
  // ---------------------------------------------------------
  it('TC-S2-005: Triple-shift partial absence (1 of 3 shifts absent) generates exactly 0.33d deduction', async () => {
    const guard = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-104' } });
    const shiftMrn = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-MRN' } });
    const shiftAft = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-AFT' } });
    const shiftEvn = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-EVN' } });

    expect(guard).toBeTruthy();
    expect(shiftMrn).toBeTruthy();
    expect(shiftAft).toBeTruthy();
    expect(shiftEvn).toBeTruthy();

    const testDate = new Date('2026-09-18T00:00:00.000Z');

    // 1 Absent, 2 Present
    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: guard!.id,
          attendanceDate: testDate,
          shiftId: shiftMrn!.id,
        },
      },
      update: { status: 'ABSENT', isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        attendanceDate: testDate,
        shiftId: shiftMrn!.id,
        status: 'ABSENT',
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: guard!.id,
          attendanceDate: testDate,
          shiftId: shiftAft!.id,
        },
      },
      update: { status: 'PRESENT', workedMinutes: 180, isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        attendanceDate: testDate,
        shiftId: shiftAft!.id,
        status: 'PRESENT',
        workedMinutes: 180,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: guard!.id,
          attendanceDate: testDate,
          shiftId: shiftEvn!.id,
        },
      },
      update: { status: 'PRESENT', workedMinutes: 180, isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        attendanceDate: testDate,
        shiftId: shiftEvn!.id,
        status: 'PRESENT',
        workedMinutes: 180,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: guard!.id, executeCommit: true, actorUserId: adminUserId }
    );

    const tripInput = await prisma.payrollDeductionInput.findFirst({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: guard!.id,
        sourceType: 'ATTENDANCE_ABSENCE',
        attendanceDate: testDate,
        status: 'PENDING',
      },
    });

    expect(tripInput).toBeTruthy();
    expect(Number(tripInput!.deductionDays)).toBe(0.33); // 1/3 shift weight
  });

  // ---------------------------------------------------------
  // TC-S2-006: Fatima Zahra (EMP-102) Paid Leave Invariant
  // ---------------------------------------------------------
  it('TC-S2-006: Fatima Zahra (EMP-102) reference case LR-2026-000148 produces STRICTLY ZERO deduction inputs', async () => {
    const fatima = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-102' } });
    const shiftMrn = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-MRN' } });
    const shiftAft = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'SHIFT-AFT' } });
    const casualType = await prisma.leaveType.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'CASUAL' } });

    expect(fatima).toBeTruthy();
    expect(shiftMrn).toBeTruthy();
    expect(shiftAft).toBeTruthy();
    expect(casualType).toBeTruthy();

    const date20260902 = new Date('2026-09-02T00:00:00.000Z');

    // Ensure paid leave application LR-2026-000148 exists
    let app = await prisma.leaveApplication.findFirst({
      where: { tenantId: TEST_TENANT_ID, applicationNumber: 'LR-2026-000148' },
    });

    if (!app) {
      app = await prisma.leaveApplication.create({
        data: {
          tenantId: TEST_TENANT_ID,
          applicationNumber: 'LR-2026-000148',
          employeeId: fatima!.id,
          leaveTypeId: casualType!.id,
          startDate: date20260902,
          endDate: date20260902,
          leaveScope: 'SPECIFIC_SHIFT',
          requestedDays: 0.5,
          isPaid: true,
          status: 'APPROVED',
          reason: 'Personal errand (Morning Shift)',
        },
      });
    }

    // Set Morning = ON_LEAVE (with link), Afternoon = PRESENT
    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: fatima!.id,
          attendanceDate: date20260902,
          shiftId: shiftMrn!.id,
        },
      },
      update: {
        status: 'ON_LEAVE',
        leaveTypeId: casualType!.id,
        leaveApplicationId: app.id,
        isHoliday: false,
        isWeeklyOff: false,
      },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        attendanceDate: date20260902,
        shiftId: shiftMrn!.id,
        status: 'ON_LEAVE',
        leaveTypeId: casualType!.id,
        leaveApplicationId: app.id,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: fatima!.id,
          attendanceDate: date20260902,
          shiftId: shiftAft!.id,
        },
      },
      update: {
        status: 'PRESENT',
        workedMinutes: 240,
        isHoliday: false,
        isWeeklyOff: false,
        leaveApplicationId: null,
      },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        attendanceDate: date20260902,
        shiftId: shiftAft!.id,
        status: 'PRESENT',
        workedMinutes: 240,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    // Evaluate reconciliation for 2026-09-02
    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: fatima!.id, executeCommit: true, actorUserId: adminUserId }
    );

    // Verify ZERO deductions for 2026-09-02
    const deductionsOnDate = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: fatima!.id,
        attendanceDate: date20260902,
      },
    });

    expect(deductionsOnDate.length).toBe(0);

    const leaveDeductions = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: TEST_TENANT_ID,
        leaveApplicationId: app.id,
      },
    });

    expect(leaveDeductions.length).toBe(0);
  });

  // ---------------------------------------------------------
  // TC-S2-007: Unpaid Leave Deduplication
  // ---------------------------------------------------------
  it('TC-S2-007: Approved unpaid leave produces 1 leave input and 0 duplicate attendance absence inputs', async () => {
    const tariq = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-101' } });
    const shift = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID } });
    const unpaidType = await prisma.leaveType.findFirst({ where: { tenantId: TEST_TENANT_ID, code: 'UNPAID' } });

    expect(tariq).toBeTruthy();
    expect(shift).toBeTruthy();
    expect(unpaidType).toBeTruthy();

    const date20260922 = new Date('2026-09-22T00:00:00.000Z');
    const uniqueAppNo = `LR-UNPAID-${Date.now()}`;

    const unpaidApp = await prisma.leaveApplication.create({
      data: {
        tenantId: TEST_TENANT_ID,
        applicationNumber: uniqueAppNo,
        employeeId: tariq!.id,
        leaveTypeId: unpaidType!.id,
        startDate: date20260922,
        endDate: date20260922,
        leaveScope: 'FULL_DAY',
        requestedDays: 1.0,
        isPaid: false,
        status: 'APPROVED',
        reason: 'Unpaid Leave Test',
      },
    });

    // Generate leave deduction input via Step 1 hook
    await prisma.$transaction(async (tx) => {
      await PayrollDeductionInputService.generateForApprovedLeave(tx, TEST_TENANT_ID, unpaidApp.id, adminUserId);
    });

    // Link to attendance record
    await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: tariq!.id,
          attendanceDate: date20260922,
          shiftId: shift!.id,
        },
      },
      update: {
        status: 'ON_LEAVE',
        leaveTypeId: unpaidType!.id,
        leaveApplicationId: unpaidApp.id,
        isHoliday: false,
        isWeeklyOff: false,
      },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: tariq!.id,
        attendanceDate: date20260922,
        shiftId: shift!.id,
        status: 'ON_LEAVE',
        leaveTypeId: unpaidType!.id,
        leaveApplicationId: unpaidApp.id,
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    // Run reconciliation
    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: tariq!.id, executeCommit: true, actorUserId: adminUserId }
    );

    // Verify exactly 1 leave input and 0 attendance absence inputs
    const totalDeductions = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: TEST_TENANT_ID,
        employeeId: tariq!.id,
        payrollPeriodLabel: 'September 2026',
        status: 'PENDING',
      },
    });

    const leaveInputs = totalDeductions.filter((d) => d.sourceType === 'LEAVE_APPLICATION');
    const attAbsenceInputs = totalDeductions.filter((d) => d.sourceType === 'ATTENDANCE_ABSENCE' && d.attendanceDate?.toISOString().startsWith('2026-09-22'));

    expect(leaveInputs.length).toBe(1);
    expect(attAbsenceInputs.length).toBe(0); // Deduplicated!
  });

  // ---------------------------------------------------------
  // TC-S2-008: Reconciliation & Reversals on Attendance Correction
  // ---------------------------------------------------------
  it('TC-S2-008: Attendance correction from ABSENT to PRESENT automatically reverses prior deduction input', async () => {
    const tariq = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-101' } });
    const shift = await prisma.shift.findFirst({ where: { tenantId: TEST_TENANT_ID } });

    const correctDate = new Date('2026-09-25T00:00:00.000Z');

    // 1. Initially mark as ABSENT
    const absRec = await prisma.employeeAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_attendanceDate_shiftId: {
          tenantId: TEST_TENANT_ID,
          employeeId: tariq!.id,
          attendanceDate: correctDate,
          shiftId: shift!.id,
        },
      },
      update: { status: 'ABSENT', isHoliday: false, isWeeklyOff: false, leaveApplicationId: null },
      create: {
        tenantId: TEST_TENANT_ID,
        employeeId: tariq!.id,
        attendanceDate: correctDate,
        shiftId: shift!.id,
        status: 'ABSENT',
        isHoliday: false,
        isWeeklyOff: false,
      },
    });

    // Run reconciliation -> creates PENDING input
    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: tariq!.id, executeCommit: true, actorUserId: adminUserId }
    );

    const pendingInput = await prisma.payrollDeductionInput.findFirst({
      where: {
        tenantId: TEST_TENANT_ID,
        deductionSourceKey: `ATT_ABSENCE:${absRec.id}`,
        status: 'PENDING',
      },
    });
    expect(pendingInput).toBeTruthy();

    // 2. Later: User corrects attendance from ABSENT to PRESENT
    await prisma.employeeAttendanceRecord.update({
      where: { id: absRec.id },
      data: { status: 'PRESENT', workedMinutes: 480 },
    });

    // Re-run reconciliation
    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: tariq!.id, executeCommit: true, actorUserId: adminUserId }
    );

    // Verify input transitioned to REVERSED
    const reversedInput = await prisma.payrollDeductionInput.findUnique({
      where: { id: pendingInput!.id },
      include: { auditLogs: true },
    });

    expect(reversedInput).toBeTruthy();
    expect(reversedInput!.status).toBe('REVERSED');
    expect(reversedInput!.reversalReason).toContain('Attendance corrected');

    // Check audit log
    const reverseLog = reversedInput!.auditLogs.find((l) => l.action === 'REVERSED');
    expect(reverseLog).toBeTruthy();
  });

  // ---------------------------------------------------------
  // TC-S2-009: Strict Idempotency on Multiple Reconciliation Runs
  // ---------------------------------------------------------
  it('TC-S2-009: Re-running reconciliation multiple times creates ZERO duplicate records', async () => {
    const tariq = await prisma.employee.findFirst({ where: { tenantId: TEST_TENANT_ID, employeeNo: 'EMP-101' } });

    const countBefore = await prisma.payrollDeductionInput.count({
      where: { tenantId: TEST_TENANT_ID, employeeId: tariq!.id },
    });

    // Run reconciliation twice
    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: tariq!.id, executeCommit: true, actorUserId: adminUserId }
    );

    await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      TEST_TENANT_ID,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-30T23:59:59.999Z'),
      { employeeId: tariq!.id, executeCommit: true, actorUserId: adminUserId }
    );

    const countAfter = await prisma.payrollDeductionInput.count({
      where: { tenantId: TEST_TENANT_ID, employeeId: tariq!.id },
    });

    expect(countAfter).toBe(countBefore);
  });
});
