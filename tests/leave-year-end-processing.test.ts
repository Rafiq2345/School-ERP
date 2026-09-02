/**
 * Automated Test Suite for Leave Management Phase 3 Step 3:
 * Year-End Leave Processing Engine (Carry Forward / Encashment / Expiry / Reset / Reversals)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveYearEndService } from '../src/lib/services/leave-year-end-service';
import type { YearEndDispositionItemDto } from '../src/lib/types/leave';

const prisma = new PrismaClient();
const testTenantId = 'tenant-ye-test-' + Date.now();

describe('Leave Management Phase 3 Step 3: Year-End Leave Processing Engine', () => {
  let employee1: any;
  let employee2: any;
  let employee3: any;

  let leaveTypeCasual: any;
  let leaveTypeAnnual: any;
  let leaveTypeEncashable: any;
  let leaveTypeMixed: any;

  let policy: any;

  beforeAll(async () => {
    // 1. Create Tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Year-End Test Academy',
        code: 'YE-TEST-' + Date.now().toString().slice(-4),
        status: 'ACTIVE',
      },
    });

    // 2. Create Payroll Deduction Policy for tenant
    await prisma.payrollDeductionPolicy.create({
      data: {
        tenantId: testTenantId,
        policyCode: 'RULE_UNPAID_DEFAULT',
        policyName: 'Default Unpaid Calendar Policy',
        scope: 'UNPAID_LEAVE',
        calculationBasis: 'CALENDAR_DAYS',
        isActive: true,
      },
    });

    // 3. Create Leave Types
    leaveTypeCasual = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Casual Leave (Expire)',
        code: 'CL-EXP-' + Date.now().toString().slice(-4),
        isPaid: true,
        isActive: true,
      },
    });

    leaveTypeAnnual = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Annual Leave (Carry Forward)',
        code: 'AL-CF-' + Date.now().toString().slice(-4),
        isPaid: true,
        isActive: true,
        carryForwardAllowed: true,
      },
    });

    leaveTypeEncashable = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Earned Leave (Encash)',
        code: 'EL-ENC-' + Date.now().toString().slice(-4),
        isPaid: true,
        isActive: true,
      },
    });

    leaveTypeMixed = await prisma.leaveType.create({
      data: {
        tenantId: testTenantId,
        name: 'Executive Leave (Mixed)',
        code: 'EX-MIX-' + Date.now().toString().slice(-4),
        isPaid: true,
        isActive: true,
      },
    });

    // 4. Create Policy with Configured Year-End Actions
    policy = await prisma.leavePolicy.create({
      data: {
        tenantId: testTenantId,
        name: 'Institutional Year-End Policy',
        code: 'POL_YE_' + Date.now().toString().slice(-4),
        isDefault: true,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01'),
        rules: {
          create: [
            // Rule 1: EXPIRE
            {
              leaveTypeId: leaveTypeCasual.id,
              annualEntitlement: 10,
              isPaid: true,
              yearEndAction: 'EXPIRE',
            },
            // Rule 2: CARRY_FORWARD with cap of 5 days
            {
              leaveTypeId: leaveTypeAnnual.id,
              annualEntitlement: 15,
              isPaid: true,
              yearEndAction: 'CARRY_FORWARD',
              maxCarryForwardDays: 5,
            },
            // Rule 3: ENCASH with max 10 days, min balance 3 days
            {
              leaveTypeId: leaveTypeEncashable.id,
              annualEntitlement: 20,
              isPaid: true,
              yearEndAction: 'ENCASH',
              maxEncashableDays: 10,
              minBalanceForEncashment: 3,
            },
            // Rule 4: MIXED: carry forward up to 4, encash up to 4, expire excess
            {
              leaveTypeId: leaveTypeMixed.id,
              annualEntitlement: 25,
              isPaid: true,
              yearEndAction: 'MIXED',
              maxCarryForwardDays: 4,
              maxEncashableDays: 4,
              minBalanceForEncashment: 1,
            },
          ],
        },
      },
    });

    // 5. Create Employees
    employee1 = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        employeeNo: 'EMP-YE-101',
        firstNameEn: 'Zainab',
        lastNameEn: 'Akhtar',
        joiningDate: new Date('2025-01-01'),
        currentStatus: 'ACTIVE',
      },
    });

    employee2 = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        employeeNo: 'EMP-YE-102',
        firstNameEn: 'Bilal',
        lastNameEn: 'Khan',
        joiningDate: new Date('2025-01-01'),
        currentStatus: 'ACTIVE',
      },
    });

    employee3 = await prisma.employee.create({
      data: {
        tenantId: testTenantId,
        employeeNo: 'EMP-YE-103',
        firstNameEn: 'Sara',
        lastNameEn: 'Ahmed',
        joiningDate: new Date('2025-01-01'),
        currentStatus: 'ACTIVE',
      },
    });

    // 6. Assign Policy to Employees
    await prisma.leavePolicyAssignment.createMany({
      data: [
        {
          tenantId: testTenantId,
          leavePolicyId: policy.id,
          assignmentType: 'INSTITUTIONAL_DEFAULT',
          isActive: true,
          isOverride: false,
          effectiveFrom: new Date('2026-01-01'),
        },
      ],
    });

    // 7. Seed 2026 Entitlements and Initial Ledger
    // Employee 1: Casual (4d remaining), Annual (8d remaining), Encashable (6d remaining), Mixed (10d remaining)
    const ent1Casual = await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeCasual.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 10,
        usedDays: 6,
        availableBalance: 4,
      },
    });
    await prisma.leaveLedgerTransaction.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeCasual.id,
        entitlementId: ent1Casual.id,
        leaveYear: 2026,
        transactionType: 'ANNUAL_ALLOCATION',
        amount: 10,
        balanceBefore: 0,
        balanceAfter: 10,
        effectiveDate: new Date('2026-01-01'),
      },
    });

    const ent1Annual = await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeAnnual.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 15,
        usedDays: 7,
        availableBalance: 8,
      },
    });
    await prisma.leaveLedgerTransaction.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeAnnual.id,
        entitlementId: ent1Annual.id,
        leaveYear: 2026,
        transactionType: 'ANNUAL_ALLOCATION',
        amount: 15,
        balanceBefore: 0,
        balanceAfter: 15,
        effectiveDate: new Date('2026-01-01'),
      },
    });

    const ent1Encashable = await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeEncashable.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 20,
        usedDays: 14,
        availableBalance: 6,
      },
    });
    await prisma.leaveLedgerTransaction.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeEncashable.id,
        entitlementId: ent1Encashable.id,
        leaveYear: 2026,
        transactionType: 'ANNUAL_ALLOCATION',
        amount: 20,
        balanceBefore: 0,
        balanceAfter: 20,
        effectiveDate: new Date('2026-01-01'),
      },
    });

    const ent1Mixed = await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeMixed.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 25,
        usedDays: 15,
        availableBalance: 10,
      },
    });
    await prisma.leaveLedgerTransaction.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeMixed.id,
        entitlementId: ent1Mixed.id,
        leaveYear: 2026,
        transactionType: 'ANNUAL_ALLOCATION',
        amount: 25,
        balanceBefore: 0,
        balanceAfter: 25,
        effectiveDate: new Date('2026-01-01'),
      },
    });

    // Employee 2: Target year 2027 already has upfront allocation (12 days Annual Leave)
    await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee2.id,
        leaveTypeId: leaveTypeAnnual.id,
        leavePolicyId: policy.id,
        leaveYear: 2027,
        allocatedDays: 12,
        availableBalance: 12,
      },
    });

    // Employee 2: 2026 Annual Leave has 7 days remaining
    await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee2.id,
        leaveTypeId: leaveTypeAnnual.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 15,
        usedDays: 8,
        availableBalance: 7,
      },
    });

    // Employee 3: Zero and negative balance safety test
    await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee3.id,
        leaveTypeId: leaveTypeCasual.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 10,
        usedDays: 10,
        availableBalance: 0,
      },
    });

    await prisma.employeeLeaveEntitlement.create({
      data: {
        tenantId: testTenantId,
        employeeId: employee3.id,
        leaveTypeId: leaveTypeAnnual.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocatedDays: 10,
        usedDays: 12,
        availableBalance: -2,
      },
    });
  });

  afterAll(async () => {
    // Cleanup tenant
    await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
  });

  // TC-YE-001: Preview Accuracy
  it('TC-YE-001: Year-End Preview accurately calculates all disposition rules without writing to DB', async () => {
    const preview = await LeaveYearEndService.previewYearEndBatch(testTenantId, {
      sourceLeaveYear: 2026,
      targetLeaveYear: 2027,
    });

    expect(preview.sourceLeaveYear).toBe(2026);
    expect(preview.targetLeaveYear).toBe(2027);
    expect(preview.totalEmployees).toBe(3);
    expect(preview.alreadyProcessed).toBe(false);

    // Find Employee 1 Casual (EXPIRE)
    const emp1Casual = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeCasual.id);
    expect(emp1Casual).toBeDefined();
    expect(emp1Casual!.yearEndAction).toBe('EXPIRE');
    expect(emp1Casual!.availableBalance).toBe(4);
    expect(emp1Casual!.expiredDays).toBe(4);
    expect(emp1Casual!.carriedForwardDays).toBe(0);
    expect(emp1Casual!.encashedDays).toBe(0);

    // Find Employee 1 Annual (CARRY_FORWARD cap 5d)
    const emp1Annual = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeAnnual.id);
    expect(emp1Annual).toBeDefined();
    expect(emp1Annual!.yearEndAction).toBe('CARRY_FORWARD');
    expect(emp1Annual!.availableBalance).toBe(8);
    expect(emp1Annual!.carriedForwardDays).toBe(5);
    expect(emp1Annual!.expiredDays).toBe(3);
    expect(emp1Annual!.encashedDays).toBe(0);

    // Find Employee 1 Encashable (ENCASH max 10d)
    const emp1Encash = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeEncashable.id);
    expect(emp1Encash).toBeDefined();
    expect(emp1Encash!.yearEndAction).toBe('ENCASH');
    expect(emp1Encash!.availableBalance).toBe(6);
    expect(emp1Encash!.encashedDays).toBe(6);
    expect(emp1Encash!.expiredDays).toBe(0);
    expect(emp1Encash!.carriedForwardDays).toBe(0);

    // Find Employee 1 Mixed (MIXED: CF up to 4, Encash up to 4, Expire 2)
    const emp1Mixed = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeMixed.id);
    expect(emp1Mixed).toBeDefined();
    expect(emp1Mixed!.yearEndAction).toBe('MIXED');
    expect(emp1Mixed!.availableBalance).toBe(10);
    expect(emp1Mixed!.carriedForwardDays).toBe(4);
    expect(emp1Mixed!.encashedDays).toBe(4);
    expect(emp1Mixed!.expiredDays).toBe(2);

    // Zero and negative balances must be skipped
    const emp3Casual = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee3.id && it.leaveTypeId === leaveTypeCasual.id);
    expect(emp3Casual!.status).toBe('SKIPPED');

    const emp3Annual = preview.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee3.id && it.leaveTypeId === leaveTypeAnnual.id);
    expect(emp3Annual!.status).toBe('SKIPPED');
  });

  // TC-YE-002: Batch Execution & Immutable Ledger Postings
  it('TC-YE-002: Execute Year-End Batch posts EXPIRY, CARRY_FORWARD, and ENCASHMENT ledger transactions', async () => {
    const executedBatch = await LeaveYearEndService.executeYearEndBatch(
      testTenantId,
      { sourceLeaveYear: 2026, targetLeaveYear: 2027, notes: 'Automated Test Batch' },
      null
    );

    expect(executedBatch.status).toBe('COMPLETED');
    expect(executedBatch.batchNumber).toMatch(/^YEB-2026-\d{4}$/);

    // Check Employee 1 Casual Expiry Ledger
    const casualTxn = await prisma.leaveLedgerTransaction.findFirst({
      where: {
        tenantId: testTenantId,
        employeeId: employee1.id,
        leaveTypeId: leaveTypeCasual.id,
        transactionType: 'EXPIRY',
      },
    });
    expect(casualTxn).not.toBeNull();
    expect(Number(casualTxn!.amount)).toBe(-4);
    expect(Number(casualTxn!.balanceAfter)).toBe(0);
    expect(casualTxn!.referenceType).toBe('YEAR_END_BATCH');

    // Check Employee 1 Source Entitlement Closed
    const casualEnt = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee1.id, leaveTypeId: leaveTypeCasual.id, leaveYear: 2026 },
    });
    expect(casualEnt!.status).toBe('CLOSED');
    expect(Number(casualEnt!.availableBalance)).toBe(0);
    expect(Number(casualEnt!.expiredDays)).toBe(4);
  });

  // TC-YE-003: Carry-Forward preserves existing Target Year Entitlements
  it('TC-YE-003: Carry-Forward adds to Target Year carriedForwardDays without replacing existing allocations', async () => {
    // Employee 2 had 12d allocated upfront in 2027 and 7d in 2026 (cap 5d)
    const emp2Ent2027 = await prisma.employeeLeaveEntitlement.findFirst({
      where: {
        tenantId: testTenantId,
        employeeId: employee2.id,
        leaveTypeId: leaveTypeAnnual.id,
        leaveYear: 2027,
      },
    });

    expect(emp2Ent2027).not.toBeNull();
    expect(Number(emp2Ent2027!.allocatedDays)).toBe(12);
    expect(Number(emp2Ent2027!.carriedForwardDays)).toBe(5);
    expect(Number(emp2Ent2027!.availableBalance)).toBe(17); // 12 + 5

    // Verify Target Year Ledger
    const targetTxn = await prisma.leaveLedgerTransaction.findFirst({
      where: {
        tenantId: testTenantId,
        employeeId: employee2.id,
        leaveTypeId: leaveTypeAnnual.id,
        leaveYear: 2027,
        transactionType: 'CARRY_FORWARD',
      },
    });
    expect(targetTxn).not.toBeNull();
    expect(Number(targetTxn!.amount)).toBe(5);
    expect(Number(targetTxn!.balanceAfter)).toBe(17);
  });

  // TC-YE-004: Downstream Payroll Encashment Input Contract
  it('TC-YE-004: Encashment creates PayrollDeductionInput with deductionAmount strictly NULL', async () => {
    const encashmentInputs = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: testTenantId,
        sourceType: 'LEAVE_ENCASHMENT',
        employeeId: employee1.id,
      },
    });

    expect(encashmentInputs.length).toBeGreaterThanOrEqual(1);

    for (const inp of encashmentInputs) {
      expect(inp.deductionAmount).toBeNull(); // Contract-First invariant
      expect(inp.status).toBe('PENDING');
      expect(inp.deductionScope).toBe('CUSTOM');
      expect(inp.calculationEvidence).toBeDefined();
    }
  });

  // TC-YE-005: Idempotency Protection
  it('TC-YE-005: Duplicate execution for the same source year is blocked by validation error', async () => {
    await expect(
      LeaveYearEndService.executeYearEndBatch(
        testTenantId,
        { sourceLeaveYear: 2026, targetLeaveYear: 2027 },
        null
      )
    ).rejects.toThrow(/already completed/i);
  });

  // TC-YE-006: Reversal of Year-End Batch restores EXACT Pre-Batch Entitlement State
  it('TC-YE-006: Batch Reversal restores exact pre-execution balances and marks encashment inputs REVERSED', async () => {
    const batch = await prisma.leaveYearEndBatch.findFirst({
      where: { tenantId: testTenantId, sourceLeaveYear: 2026, status: 'COMPLETED' },
    });
    expect(batch).not.toBeNull();

    const reversed = await LeaveYearEndService.reverseBatch(
      testTenantId,
      batch!.id,
      null,
      'Administrative test reversal'
    );

    expect(reversed.status).toBe('REVERSED');
    expect(reversed.reversalReason).toBe('Administrative test reversal');

    // 1. Check Source Year Entitlements Restored to EXACT pre-execution state
    const emp1CasualEnt = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee1.id, leaveTypeId: leaveTypeCasual.id, leaveYear: 2026 },
    });
    expect(emp1CasualEnt!.status).toBe('ACTIVE');
    expect(Number(emp1CasualEnt!.availableBalance)).toBe(4);
    expect(Number(emp1CasualEnt!.expiredDays)).toBe(0);

    const emp1AnnualEnt = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee1.id, leaveTypeId: leaveTypeAnnual.id, leaveYear: 2026 },
    });
    expect(emp1AnnualEnt!.status).toBe('ACTIVE');
    expect(Number(emp1AnnualEnt!.availableBalance)).toBe(8);

    const emp1EncashEnt = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee1.id, leaveTypeId: leaveTypeEncashable.id, leaveYear: 2026 },
    });
    expect(emp1EncashEnt!.status).toBe('ACTIVE');
    expect(Number(emp1EncashEnt!.availableBalance)).toBe(6);
    expect(Number(emp1EncashEnt!.encashedDays)).toBe(0);

    const emp1MixedEnt = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee1.id, leaveTypeId: leaveTypeMixed.id, leaveYear: 2026 },
    });
    expect(emp1MixedEnt!.status).toBe('ACTIVE');
    expect(Number(emp1MixedEnt!.availableBalance)).toBe(10);

    // 2. Check Target Year Entitlement Decremented
    const emp2Ent2027 = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId: testTenantId, employeeId: employee2.id, leaveTypeId: leaveTypeAnnual.id, leaveYear: 2027 },
    });
    expect(Number(emp2Ent2027!.carriedForwardDays)).toBe(0);
    expect(Number(emp2Ent2027!.availableBalance)).toBe(12);

    // 3. Check Downstream Payroll Encashment Inputs Reverted
    const payrollInputs = await prisma.payrollDeductionInput.findMany({
      where: {
        tenantId: testTenantId,
        sourceType: 'LEAVE_ENCASHMENT',
      },
    });

    for (const inp of payrollInputs) {
      expect(inp.status).toBe('REVERSED');
      expect(inp.reversalReason).toBe('Administrative test reversal');
    }
  });

  // TC-YE-007: Preview Parity after Reversal (no balance inflation)
  it('TC-YE-007: Preview after reversal shows identical balances and totals as original pre-execution preview', async () => {
    const previewAfterReverse = await LeaveYearEndService.previewYearEndBatch(testTenantId, {
      sourceLeaveYear: 2026,
      targetLeaveYear: 2027,
    });

    expect(previewAfterReverse.alreadyProcessed).toBe(false);
    expect(previewAfterReverse.totalEmployees).toBe(3);

    // Check Employee 1 balances are not doubled
    const emp1Casual = previewAfterReverse.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeCasual.id);
    expect(emp1Casual!.availableBalance).toBe(4);

    const emp1Annual = previewAfterReverse.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeAnnual.id);
    expect(emp1Annual!.availableBalance).toBe(8);

    const emp1Encash = previewAfterReverse.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeEncashable.id);
    expect(emp1Encash!.availableBalance).toBe(6);

    const emp1Mixed = previewAfterReverse.items.find((it: YearEndDispositionItemDto) => it.employeeId === employee1.id && it.leaveTypeId === leaveTypeMixed.id);
    expect(emp1Mixed!.availableBalance).toBe(10);
  });

  // TC-YE-008: Second Reversal is blocked (Idempotent Reversal Protection)
  it('TC-YE-008: Reversing an already REVERSED batch is blocked by validation error', async () => {
    const batch = await prisma.leaveYearEndBatch.findFirst({
      where: { tenantId: testTenantId, sourceLeaveYear: 2026, status: 'REVERSED' },
    });
    expect(batch).not.toBeNull();

    await expect(
      LeaveYearEndService.reverseBatch(testTenantId, batch!.id, null, 'Second invalid reversal attempt')
    ).rejects.toThrow(/already been reversed/i);
  });

  // TC-YE-009: Controlled Rerun after Reversal
  it('TC-YE-009: Controlled rerun after reversal creates new batch while preserving historical reversed batch', async () => {
    const rerunBatch = await LeaveYearEndService.executeYearEndBatch(
      testTenantId,
      { sourceLeaveYear: 2026, targetLeaveYear: 2027, notes: 'Controlled Rerun Batch' },
      null
    );

    expect(rerunBatch.status).toBe('COMPLETED');
    expect(rerunBatch.batchNumber).toMatch(/^YEB-2026-\d{4}$/);

    const allBatches = await LeaveYearEndService.listBatches(testTenantId);
    expect(allBatches.length).toBe(2);

    const reversedRecord = allBatches.find((b) => b.status === 'REVERSED');
    expect(reversedRecord).toBeDefined();

    const completedRecord = allBatches.find((b) => b.status === 'COMPLETED');
    expect(completedRecord).toBeDefined();
  });
});
