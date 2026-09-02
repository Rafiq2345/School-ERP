/**
 * Phase 3 Step 1 — Configurable Payroll Deduction Foundation
 * Test Suite: payroll-deduction-phase3-step1.test.ts
 *
 * Test Coverage (9 cases):
 *  TC-PD-001: Paid leave → zero payroll deduction records generated
 *  TC-PD-002: Unpaid leave + no policy → graceful skip (no throw, no record)
 *  TC-PD-003: Unpaid leave + active CALENDAR_DAYS policy → deduction input created
 *  TC-PD-004: Idempotency — re-running generateForApprovedLeave returns existing record
 *  TC-PD-005: Payroll period derivation (start=first day, end=last day, label correct)
 *  TC-PD-006: deductionAmount is always null (never set without salary data)
 *  TC-PD-007: Audit log created on generation with action=GENERATED
 *  TC-PD-008: Reversal — status changes to REVERSED, audit log with action=REVERSED
 *  TC-PD-009: Phase 2 regression — Fatima Zahra (EMP-102, paid leave) → zero deduction records
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { PayrollDeductionPolicyService } from '@/lib/services/payroll-deduction-policy-service';
import { PayrollDeductionInputService } from '@/lib/services/payroll-deduction-input-service';

// ---------------------------------------------------------------
// Test Data Setup Helpers
// ---------------------------------------------------------------

let testTenantId: string;
let testEmployeeId: string;
let testLeaveTypeId: string;     // unpaid leave type
let paidLeaveTypeId: string;     // paid leave type
let testPolicyId: string;

async function ensureTestData() {
  // Tenant
  let tenant = await prisma.tenant.findFirst({ where: { code: 'PD_TEST' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'PayrollDeduction Test School', code: 'PD_TEST', status: 'ACTIVE' },
    });
  }
  testTenantId = tenant.id;

  // Department + Designation
  let dept = await prisma.department.findFirst({ where: { tenantId: testTenantId, code: 'PD_DEPT' } });
  if (!dept) dept = await prisma.department.create({ data: { tenantId: testTenantId, name: 'PD Dept', code: 'PD_DEPT' } });

  let desig = await prisma.designation.findFirst({ where: { tenantId: testTenantId, code: 'PD_DESIG' } });
  if (!desig) desig = await prisma.designation.create({ data: { tenantId: testTenantId, name: 'PD Designation', code: 'PD_DESIG' } });

  let empCat = await prisma.employeeCategory.findFirst({ where: { tenantId: testTenantId, code: 'PD_CAT' } });
  if (!empCat) empCat = await prisma.employeeCategory.create({ data: { tenantId: testTenantId, name: 'PD Category', code: 'PD_CAT' } });

  let empType = await prisma.employmentType.findFirst({ where: { tenantId: testTenantId, code: 'PD_FULL' } });
  if (!empType) empType = await prisma.employmentType.create({ data: { tenantId: testTenantId, name: 'PD Full Time', code: 'PD_FULL' } });

  // Employee
  let employee = await prisma.employee.findFirst({ where: { tenantId: testTenantId, employeeNo: 'EMP-PD-001' } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        employeeNo: 'EMP-PD-001',
        firstNameEn: 'Test',
        lastNameEn: 'Employee',
        joiningDate: new Date('2024-01-01'),
        currentStatus: 'ACTIVE',
        departmentId: dept.id,
        designationId: desig.id,
        employeeCategoryId: empCat.id,
        employmentTypeId: empType.id,
      },
    });
  }
  testEmployeeId = employee.id;

  // Unpaid Leave Type
  let unpdLt = await prisma.leaveType.findFirst({ where: { tenantId: testTenantId, code: 'LWP_PD' } });
  if (!unpdLt) {
    unpdLt = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Leave Without Pay (Test)',
        code: 'LWP_PD',
        isPaid: false,
        annualLimit: 30,
        isActive: true,
        allowFullDay: true,
        allowHalfDay: true,
        allowShiftWise: true,
        allowHourly: false,
        defaultAllocationMethod: 'MANUAL',
        isUnlimited: false,
        minLeaveUnit: 0.5,
        attachmentRequired: false,
      },
    });
  }
  testLeaveTypeId = unpdLt.id;

  // Paid Leave Type
  let pdLt = await prisma.leaveType.findFirst({ where: { tenantId: testTenantId, code: 'CL_PD' } });
  if (!pdLt) {
    pdLt = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Casual Leave (Test)',
        code: 'CL_PD',
        isPaid: true,
        annualLimit: 12,
        isActive: true,
        allowFullDay: true,
        allowHalfDay: true,
        allowShiftWise: true,
        allowHourly: false,
        defaultAllocationMethod: 'MANUAL',
        isUnlimited: false,
        minLeaveUnit: 0.5,
        attachmentRequired: false,
      },
    });
  }
  paidLeaveTypeId = pdLt.id;
}

async function createTestLeaveApplication({
  isPaid,
  leaveTypeId,
  startDate = new Date('2026-09-10'),
  status = 'APPROVED',
  requestedDays = 1.0,
}: {
  isPaid: boolean;
  leaveTypeId: string;
  startDate?: Date;
  status?: string;
  requestedDays?: number;
}) {
  // Generate unique application number
  const num = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return prisma.leaveApplication.create({
    data: {
      tenantId: testTenantId,
      applicationNumber: `LR-PD-${num}`,
      employeeId: testEmployeeId,
      leaveTypeId,
      status,
      leaveScope: 'FULL_DAY',
      startDate,
      endDate: startDate,
      requestedDays,
      isPaid,
      reason: 'Test leave reason',
      submittedAt: new Date(),
    },
  });
}

async function createTestPolicy(calculationBasis = 'CALENDAR_DAYS', leaveTypeId?: string) {
  const code = `LWP_POLICY_${Date.now()}`;
  return PayrollDeductionPolicyService.createPolicy(testTenantId, {
    policyCode: code,
    policyName: 'LWP Deduction Policy (Test)',
    scope: 'UNPAID_LEAVE',
    leaveTypeId: leaveTypeId ?? null,
    calculationBasis: calculationBasis as any,
    fixedDivisor: calculationBasis === 'FIXED_DIVISOR' ? 26 : null,
    isActive: true,
  });
}

// ---------------------------------------------------------------
// SETUP / TEARDOWN
// ---------------------------------------------------------------

beforeAll(async () => {
  await ensureTestData();
});

afterAll(async () => {
  // Clean up test deduction data only
  await prisma.payrollDeductionAuditLog.deleteMany({ where: { tenantId: testTenantId } });
  await prisma.payrollDeductionInput.deleteMany({ where: { tenantId: testTenantId } });
  await prisma.payrollDeductionPolicy.deleteMany({ where: { tenantId: testTenantId } });
  await prisma.leaveApplication.deleteMany({ where: { tenantId: testTenantId } });
  // Note: we leave employees/leave types intact for easier re-runs
  await prisma.$disconnect();
});

// ---------------------------------------------------------------
// TEST CASES
// ---------------------------------------------------------------

describe('Phase 3 Step 1 — Payroll Deduction Foundation', () => {

  // TC-PD-001
  it('TC-PD-001: Paid leave → zero payroll deduction records generated', async () => {
    const app = await createTestLeaveApplication({ isPaid: true, leaveTypeId: paidLeaveTypeId });

    const result = await prisma.$transaction(async (tx) => {
      return PayrollDeductionInputService.generateForApprovedLeave(
        tx, testTenantId, app.id, null
      );
    });

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain('isPaid=true');

    const count = await prisma.payrollDeductionInput.count({
      where: { leaveApplicationId: app.id },
    });
    expect(count).toBe(0);
  });

  // TC-PD-002
  it('TC-PD-002: Unpaid leave + no policy → graceful skip, no throw, no record', async () => {
    // Deactivate all policies for this tenant to ensure no policy resolves
    await prisma.payrollDeductionPolicy.updateMany({
      where: { tenantId: testTenantId },
      data: { isActive: false },
    });

    const app = await createTestLeaveApplication({ isPaid: false, leaveTypeId: testLeaveTypeId });

    // Run directly — the service must NOT throw even when no policy is configured
    const result = await prisma.$transaction(async (tx) => {
      return PayrollDeductionInputService.generateForApprovedLeave(
        tx, testTenantId, app.id, null
      );
    });

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toMatch(/No active PayrollDeductionPolicy/i);

    const count = await prisma.payrollDeductionInput.count({
      where: { leaveApplicationId: app.id },
    });
    expect(count).toBe(0);
  });

  // TC-PD-003
  it('TC-PD-003: Unpaid leave + active CALENDAR_DAYS policy → deduction input created', async () => {
    const policy = await createTestPolicy('CALENDAR_DAYS', testLeaveTypeId);
    testPolicyId = policy.id;

    const app = await createTestLeaveApplication({
      isPaid: false,
      leaveTypeId: testLeaveTypeId,
      requestedDays: 1.0,
    });

    const result = await prisma.$transaction(async (tx) => {
      return PayrollDeductionInputService.generateForApprovedLeave(
        tx, testTenantId, app.id, null
      );
    });

    expect(result.skipped).toBe(false);
    expect(result.wasIdempotent).toBe(false);
    expect(result.deductionInput).toBeDefined();
    expect(result.deductionInput!.deductionDays).toBe(1.0);
    expect(result.deductionInput!.status).toBe('PENDING');
    expect(result.deductionInput!.calculationBasis).toBe('CALENDAR_DAYS');
    expect(result.deductionInput!.payrollPeriodLabel).toBe('September 2026');
    expect(result.deductionInput!.policyCode).toBe(policy.policyCode);
  });

  // TC-PD-004
  it('TC-PD-004: Idempotency — re-running generateForApprovedLeave returns existing record', async () => {
    // Use same application from TC-PD-003 (reuse by finding a PENDING one)
    const existingInput = await prisma.payrollDeductionInput.findFirst({
      where: { tenantId: testTenantId, status: 'PENDING' },
    });
    expect(existingInput).not.toBeNull();

    const result = await prisma.$transaction(async (tx) => {
      return PayrollDeductionInputService.generateForApprovedLeave(
        tx, testTenantId, existingInput!.leaveApplicationId, null
      );
    });

    expect(result.skipped).toBe(false);
    expect(result.wasIdempotent).toBe(true);
    expect(result.deductionInput!.id).toBe(existingInput!.id);

    // Confirm still exactly one record
    const count = await prisma.payrollDeductionInput.count({
      where: { leaveApplicationId: existingInput!.leaveApplicationId },
    });
    expect(count).toBe(1);
  });

  // TC-PD-005
  it('TC-PD-005: Payroll period derivation — start=first day, end=last day, label correct', () => {
    const testCases = [
      { date: new Date('2026-09-10'), expectedStart: '2026-09-01', expectedEnd: '2026-09-30', label: 'September 2026' },
      { date: new Date('2026-01-01'), expectedStart: '2026-01-01', expectedEnd: '2026-01-31', label: 'January 2026' },
      { date: new Date('2026-02-15'), expectedStart: '2026-02-01', expectedEnd: '2026-02-28', label: 'February 2026' },
      { date: new Date('2024-02-15'), expectedStart: '2024-02-01', expectedEnd: '2024-02-29', label: 'February 2024' }, // leap year
      { date: new Date('2026-12-31'), expectedStart: '2026-12-01', expectedEnd: '2026-12-31', label: 'December 2026' },
    ];

    for (const tc of testCases) {
      const { periodStart, periodEnd, periodLabel } = PayrollDeductionInputService.derivePayrollPeriod(tc.date);
      expect(periodStart.toISOString().split('T')[0]).toBe(tc.expectedStart);
      expect(periodEnd.toISOString().split('T')[0]).toBe(tc.expectedEnd);
      expect(periodLabel).toBe(tc.label);
    }
  });

  // TC-PD-006
  it('TC-PD-006: deductionAmount is always null (never set without salary data)', async () => {
    const inputs = await prisma.payrollDeductionInput.findMany({
      where: { tenantId: testTenantId },
    });
    for (const input of inputs) {
      expect(input.deductionAmount).toBeNull();
    }
  });

  // TC-PD-007
  it('TC-PD-007: Audit log created on generation with action=GENERATED', async () => {
    const input = await prisma.payrollDeductionInput.findFirst({
      where: { tenantId: testTenantId, status: 'PENDING' },
    });
    expect(input).not.toBeNull();

    const auditLog = await prisma.payrollDeductionAuditLog.findFirst({
      where: { tenantId: testTenantId, deductionInputId: input!.id, action: 'GENERATED' },
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog!.previousStatus).toBe('N/A');
    expect(auditLog!.newStatus).toBe('PENDING');
    expect(auditLog!.evidence).toBeDefined();
  });

  // TC-PD-008
  it('TC-PD-008: Reversal — status changes to REVERSED, audit log with action=REVERSED', async () => {
    const input = await prisma.payrollDeductionInput.findFirst({
      where: { tenantId: testTenantId, status: 'PENDING' },
    });
    expect(input).not.toBeNull();

    const reversed = await PayrollDeductionInputService.reverseDeductionInput(
      testTenantId,
      input!.id,
      'Leave application cancelled by employee',
      null,
      'System Test'
    );

    expect(reversed.status).toBe('REVERSED');
    expect(reversed.reversalReason).toBe('Leave application cancelled by employee');
    expect(reversed.reversedAt).not.toBeNull();

    const auditLog = await prisma.payrollDeductionAuditLog.findFirst({
      where: { tenantId: testTenantId, deductionInputId: input!.id, action: 'REVERSED' },
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog!.previousStatus).toBe('PENDING');
    expect(auditLog!.newStatus).toBe('REVERSED');
    expect(auditLog!.reason).toBe('Leave application cancelled by employee');
  });

  // TC-PD-009
  it('TC-PD-009: Phase 2 regression — Fatima Zahra (EMP-102, paid leave) → zero deduction records', async () => {
    // Find Fatima Zahra's leave application (LR-2026-000148) — may not exist in test DB,
    // but we verify: any approved PAID leave for any employee in any tenant generates 0 deduction records.
    const paidApprovedApps = await prisma.leaveApplication.findMany({
      where: {
        isPaid: true,
        status: 'APPROVED',
      },
      take: 10,
    });

    for (const app of paidApprovedApps) {
      const deductionCount = await prisma.payrollDeductionInput.count({
        where: { leaveApplicationId: app.id },
      });
      expect(deductionCount).toBe(0);
    }

    // Also verify via service that it would be skipped
    if (paidApprovedApps.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        return PayrollDeductionInputService.generateForApprovedLeave(
          tx,
          paidApprovedApps[0].tenantId,
          paidApprovedApps[0].id,
          null
        );
      });
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('isPaid=true');
    }
  });
});
