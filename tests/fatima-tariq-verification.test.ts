import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';
import { LeaveCalculationService } from '@/lib/services/leave-calculation-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

const prisma = new PrismaClient();

describe('Verification Suite: Fatima EMP-102 & Tariq EMP-101 Leave Policy & Dropdown Integration', () => {
  const tenantId = 'tenant-sch-001';
  let fatima: any;
  let tariq: any;

  beforeAll(async () => {
    fatima = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    tariq = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-101' },
      include: { department: true, designation: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Verifies Fatima EMP-102 database master data has Department and Designation', async () => {
    expect(fatima).toBeDefined();
    expect(fatima.firstNameEn).toBe('Fatima');
    expect(fatima.lastNameEn).toBe('Zahra');
    expect(fatima.department?.name).toBe('School Administration');
    expect(fatima.designation?.name).toBe('Academic Coordinator');
  });

  it('2. Verifies EmployeeAttendanceService.getDailyEmployeeRoster preserves department, designation, and confirmationStatus', async () => {
    const today = new Date().toISOString().split('T')[0];
    const rosterResult = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, today);

    const fatimaRoster = rosterResult.roster.find((r) => r.employee.employeeNo === 'EMP-102');
    expect(fatimaRoster).toBeDefined();
    expect(fatimaRoster?.employee.departmentName).toBe('School Administration');
    expect(fatimaRoster?.employee.department?.name).toBe('School Administration');
    expect(fatimaRoster?.employee.designationName).toBe('Academic Coordinator');
    expect(fatimaRoster?.employee.designation?.name).toBe('Academic Coordinator');
    expect(fatimaRoster?.employee.confirmationStatus).toBeDefined();

    const tariqRoster = rosterResult.roster.find((r) => r.employee.employeeNo === 'EMP-101');
    expect(tariqRoster).toBeDefined();
    expect(tariqRoster?.employee.departmentName).toBe('Faculty of Science & Math');
    expect(tariqRoster?.employee.designationName).toBe('Senior Science Teacher');
    expect(tariqRoster?.employee.confirmationStatus).toBeDefined();
  });

  it('3. Verifies Fatima EMP-102 policy resolution falls back correctly to Institutional Default Policy', async () => {
    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(tenantId, fatima.id, new Date('2026-05-15'));
    expect(resolved).toBeDefined();
    expect(resolved?.source).toBe('DEFAULT');
    expect(resolved?.policy.code).toBe('LP-STD-2026');
    expect(resolved?.policy.name).toBe('Standard School Staff Leave Policy 2026');
    expect(resolved?.policy.rules.length).toBeGreaterThan(0);
  });

  it('4. Verifies LeaveEntitlementService.getEmployeeLeaveSummary provides policy leave types and live balances for Fatima', async () => {
    const summary = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, fatima.id, 2026);
    expect(summary.employee.employeeNo).toBe('EMP-102');
    expect(summary.employee.departmentName).toBe('School Administration');
    expect(summary.employee.designationName).toBe('Academic Coordinator');

    expect(summary.currentPolicy).toBeDefined();
    expect(summary.currentPolicy?.code).toBe('LP-STD-2026');
    expect(summary.currentPolicy?.source).toBe('DEFAULT');

    expect(summary.balances.length).toBeGreaterThanOrEqual(4);
    const casual = summary.balances.find((b) => b.leaveTypeCode === 'CASUAL');
    const sick = summary.balances.find((b) => b.leaveTypeCode === 'SICK');
    const annual = summary.balances.find((b) => b.leaveTypeCode === 'ANNUAL');
    const unpaid = summary.balances.find((b) => b.leaveTypeCode === 'UNPAID');

    expect(casual).toBeDefined();
    expect(sick).toBeDefined();
    expect(annual).toBeDefined();
    expect(unpaid).toBeDefined();
  });

  it('5. Verifies LeaveEntitlementService.getEmployeeLeaveSummary provides policy leave types and live balances for Tariq', async () => {
    const summary = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, tariq.id, 2026);
    expect(summary.employee.employeeNo).toBe('EMP-101');
    expect(summary.employee.departmentName).toBe('Faculty of Science & Math');
    expect(summary.employee.designationName).toBe('Senior Science Teacher');

    expect(summary.currentPolicy).toBeDefined();
    expect(summary.balances.length).toBeGreaterThanOrEqual(4);
  });

  it('6. Verifies calculation engine preview calculates full-day leave correctly for Fatima EMP-102', async () => {
    const casualType = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    expect(casualType).toBeDefined();

    const preview = await LeaveCalculationService.calculateLeavePreview(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualType!.id,
      startDate: '2026-05-18',
      endDate: '2026-05-19',
      leaveScope: 'FULL_DAY',
    });

    expect(preview.policy.code).toBe('LP-STD-2026');
    expect(preview.calendarSummary.totalRequestedDays).toBe(2);
    expect(preview.calendarSummary.workingDaysCount).toBe(2);
    expect(preview.errors.length).toBe(0);
  });

  it('7. Verifies policy resolution on application date 2026-09-01 resolves active default policy for unassigned employee', async () => {
    const appDate = new Date('2026-09-01T00:00:00.000Z');
    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(tenantId, fatima.id, appDate);

    expect(resolved).toBeDefined();
    expect(resolved?.policy.code).toBe('LP-STD-2026');
    expect(resolved?.policy.status).toBe('ACTIVE');
    expect(resolved?.policy.effectiveFrom).toBe('2026-01-01');
    expect(resolved?.policy.effectiveTo).toBe('2026-12-31');
    expect(resolved?.source).toBe('DEFAULT');
  });

  it('8. Verifies both Muhammad Tariq (EMP-101) and Fatima Zahra (EMP-102) resolve policy and active rules on 2026-09-01', async () => {
    const appDate = new Date('2026-09-01T00:00:00.000Z');

    const tariqResolved = await LeaveAssignmentService.resolvePolicyForEmployee(tenantId, tariq.id, appDate);
    expect(tariqResolved).toBeDefined();
    expect(tariqResolved?.policy.name).toBe('Standard School Staff Leave Policy 2026');
    expect(tariqResolved?.policy.rules.length).toBe(4);

    const fatimaResolved = await LeaveAssignmentService.resolvePolicyForEmployee(tenantId, fatima.id, appDate);
    expect(fatimaResolved).toBeDefined();
    expect(fatimaResolved?.policy.name).toBe('Standard School Staff Leave Policy 2026');
    expect(fatimaResolved?.policy.rules.length).toBe(4);
  });
});
