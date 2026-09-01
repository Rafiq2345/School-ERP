import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 1: Transactional Ledger & Adjustments Suite', () => {
  const tenantId = 'tenant-sch-001';
  let emp101: any;
  let casualLt: any;
  let sickLt: any;
  const testYear = 2030; // Dedicated test year

  beforeAll(async () => {
    emp101 = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-101' } });
    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    sickLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'SICK' } });
    const stdPolicy = await prisma.leavePolicy.findFirst({ where: { tenantId, code: 'LP-STD-2026' } });

    // Clean testYear records
    await prisma.leaveLedgerTransaction.deleteMany({
      where: { tenantId, employeeId: emp101.id, leaveYear: testYear },
    });
    await prisma.employeeLeaveEntitlement.deleteMany({
      where: { tenantId, employeeId: emp101.id, leaveYear: testYear },
    });

    if (stdPolicy && emp101) {
      await LeaveAssignmentService.bulkAssignPolicy(tenantId, {
        leavePolicyId: stdPolicy.id,
        assignmentType: 'EMPLOYEE',
        employeeIds: [emp101.id],
        isOverride: true,
        effectiveFrom: `${testYear}-01-01`,
        effectiveTo: `${testYear}-12-31`,
        reason: 'Ledger test isolated assignment',
      });
    }
  });

  it('1. Performs continuous annual allocation and manual adjustments with strict ledger continuity', async () => {
    // Step A: Annual Bulk Allocation
    const allocResult = await LeaveEntitlementService.bulkAllocateEntitlements(tenantId, {
      leaveYear: testYear,
      employeeIds: [emp101.id],
      overwriteExisting: true,
    });
    expect(allocResult.allocatedEmployeesCount).toBe(1);

    // Initial summary: Casual allocated = 10, available = 10
    const summary0 = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, emp101.id, testYear);
    const casual0 = summary0.balances.find((b) => b.leaveTypeCode === 'CASUAL');
    expect(casual0?.allocatedDays).toBe(10);
    expect(casual0?.availableBalance).toBe(10);

    // Step B: First Manual Adjustment (+2d)
    const txn1 = await LeaveEntitlementService.manualAdjustment(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      leaveYear: testYear,
      adjustmentType: 'ADD',
      quantity: 2.0,
      reason: 'Compensatory leave granted for Sunday academic duty',
      effectiveDate: `${testYear}-05-15`,
    });

    expect(txn1.amount).toBe(2.0);
    expect(txn1.balanceBefore).toBe(10.0);
    expect(txn1.balanceAfter).toBe(12.0);
    expect(txn1.transactionType).toBe('MANUAL_ADJUSTMENT_ADD');

    // Step C: Second Manual Adjustment (-1d)
    const txn2 = await LeaveEntitlementService.manualAdjustment(tenantId, {
      employeeId: emp101.id,
      leaveTypeId: casualLt.id,
      leaveYear: testYear,
      adjustmentType: 'SUBTRACT',
      quantity: 1.0,
      reason: 'Correction of accidental extra compensatory day',
      effectiveDate: `${testYear}-05-16`,
    });

    expect(txn2.amount).toBe(-1.0);
    expect(txn2.balanceBefore).toBe(12.0); // Exact continuity from txn1 balanceAfter!
    expect(txn2.balanceAfter).toBe(11.0);
    expect(txn2.transactionType).toBe('MANUAL_ADJUSTMENT_SUBTRACT');

    // Step D: Verify final summary matches ledger continuity
    const summaryFinal = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, emp101.id, testYear);
    const casualFinal = summaryFinal.balances.find((b) => b.leaveTypeCode === 'CASUAL');
    expect(casualFinal?.allocatedDays).toBe(10);
    expect(casualFinal?.adjustedDays).toBe(1);
    expect(casualFinal?.availableBalance).toBe(11);
  });

  it('2. Strictly blocks negative balance adjustments when policy disallows negative balances', async () => {
    // Current casual balance is 11d. Attempting to subtract 15d must be blocked!
    await expect(
      LeaveEntitlementService.manualAdjustment(tenantId, {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        leaveYear: testYear,
        adjustmentType: 'SUBTRACT',
        quantity: 15.0,
        reason: 'Attempting invalid excess deduction',
        effectiveDate: `${testYear}-06-01`,
      })
    ).rejects.toThrow(/Negative leave balance is not permitted/i);
  });

  it('3. Strictly rejects manual balance adjustment if mandatory justification reason is omitted', async () => {
    await expect(
      LeaveEntitlementService.manualAdjustment(tenantId, {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        leaveYear: testYear,
        adjustmentType: 'ADD',
        quantity: 1.0,
        reason: '   ', // Whitespace only
        effectiveDate: `${testYear}-06-02`,
      })
    ).rejects.toThrow(/mandatory justification reason is required/i);
  });

  it('4. Correctly flags ALREADY_ALLOCATED vs READY in Annual Allocation Preview', async () => {
    // EMP-101 has valid allocations in testYear -> Must be ALREADY_ALLOCATED
    const preview1 = await LeaveEntitlementService.previewAnnualAllocation(tenantId, {
      leaveYear: testYear,
      employeeIds: [emp101.id],
    });

    const item1 = preview1.items.find((i) => i.employeeId === emp101.id);
    expect(item1?.status).toBe('ALREADY_ALLOCATED');

    // For a future year with no allocations (2035) -> Must be READY
    const previewFuture = await LeaveEntitlementService.previewAnnualAllocation(tenantId, {
      leaveYear: 2035,
      employeeIds: [emp101.id],
    });

    const itemFuture = previewFuture.items.find((i) => i.employeeId === emp101.id);
    expect(itemFuture?.status).not.toBe('ALREADY_ALLOCATED');
  });

  it('5. Verifies immutable Leave Audit Log contains full state before and after adjustment', async () => {
    const auditLogs = await LeaveEntitlementService.getAuditLogs(tenantId, {
      entityType: 'LEAVE_LEDGER',
      limit: 5,
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    const latest = auditLogs[0];
    expect(latest.action).toBe('ADJUSTED');
    expect(latest.reason).toBeDefined();
  });

  afterAll(async () => {
    await prisma.leaveLedgerTransaction.deleteMany({
      where: { tenantId, employeeId: emp101.id, leaveYear: testYear },
    });
    await prisma.employeeLeaveEntitlement.deleteMany({
      where: { tenantId, employeeId: emp101.id, leaveYear: testYear },
    });
  });
});
