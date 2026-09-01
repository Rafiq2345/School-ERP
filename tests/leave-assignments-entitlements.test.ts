import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 1: Policy Assignments & Precedence Suite', () => {
  const tenantId = 'tenant-sch-001';
  let defaultPolicy: any;
  let customPolicy: any;
  let emp101: any;
  let emp102: any;
  const testYear = 2028; // Isolated test year

  beforeAll(async () => {
    defaultPolicy = await prisma.leavePolicy.findFirst({
      where: { tenantId, code: 'LP-STD-2026' },
      include: { rules: { include: { leaveType: true } } },
    });

    emp101 = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-101' } });
    emp102 = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-102' } });

    // Create a special executive policy with full rules
    customPolicy = await prisma.leavePolicy.upsert({
      where: { tenantId_code: { tenantId, code: 'LP-EXEC-TEST' } },
      update: { status: 'ACTIVE' },
      create: {
        tenantId,
        name: 'Executive Leadership Test Policy',
        code: 'LP-EXEC-TEST',
        isDefault: false,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    const sickLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'SICK' } });

    if (casualLt) {
      await prisma.leavePolicyRule.upsert({
        where: { leavePolicyId_leaveTypeId: { leavePolicyId: customPolicy.id, leaveTypeId: casualLt.id } },
        update: { annualEntitlement: 14 },
        create: {
          leavePolicyId: customPolicy.id,
          leaveTypeId: casualLt.id,
          annualEntitlement: 14,
          isPaid: true,
          allocationMethod: 'ANNUAL_UPFRONT',
        },
      });
    }
    if (sickLt) {
      await prisma.leavePolicyRule.upsert({
        where: { leavePolicyId_leaveTypeId: { leavePolicyId: customPolicy.id, leaveTypeId: sickLt.id } },
        update: { annualEntitlement: 14 },
        create: {
          leavePolicyId: customPolicy.id,
          leaveTypeId: sickLt.id,
          annualEntitlement: 14,
          isPaid: true,
          allocationMethod: 'ANNUAL_UPFRONT',
        },
      });
    }
  });

  it('1. Resolves Institutional Default Policy (Level 6) when no direct or group assignments exist', async () => {
    // Remove existing assignments for emp101
    await prisma.leavePolicyAssignment.deleteMany({
      where: { tenantId, employeeId: emp101.id },
    });

    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      emp101.id,
      new Date('2026-06-01T00:00:00.000Z')
    );

    expect(resolved).toBeDefined();
    expect(resolved?.policy.code).toBe('LP-STD-2026');
  });

  it('2. Previews and executes bulk policy assignment by Department', async () => {
    if (!emp101.departmentId) return;

    const preview = await LeaveAssignmentService.previewAssignment(tenantId, {
      leavePolicyId: customPolicy.id,
      assignmentType: 'DEPARTMENT',
      departmentId: emp101.departmentId,
      effectiveFrom: '2026-01-01',
    });

    expect(preview.totalTargetEmployees).toBeGreaterThan(0);

    const result = await LeaveAssignmentService.bulkAssignPolicy(tenantId, {
      leavePolicyId: customPolicy.id,
      assignmentType: 'DEPARTMENT',
      departmentId: emp101.departmentId,
      effectiveFrom: '2026-01-01',
      reason: 'Department policy assignment test',
    });

    expect(result.assignedCount).toBeGreaterThanOrEqual(1);

    // Verify precedence resolved to DEPARTMENT
    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      emp101.id,
      new Date('2026-06-01T00:00:00.000Z')
    );

    expect(resolved?.source).toBe('DEPARTMENT');
    expect(resolved?.policy.code).toBe('LP-EXEC-TEST');
  });

  it('3. Individual Employee Override (Level 1) takes precedence over Department assignment', async () => {
    const overrideResult = await LeaveAssignmentService.bulkAssignPolicy(tenantId, {
      leavePolicyId: defaultPolicy.id,
      assignmentType: 'EMPLOYEE',
      employeeIds: [emp101.id],
      isOverride: true,
      effectiveFrom: '2026-01-01',
      reason: 'Personal override for EMP-101',
    });

    expect(overrideResult.assignedCount).toBe(1);

    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      emp101.id,
      new Date('2026-06-01T00:00:00.000Z')
    );

    expect(resolved?.source).toBe('OVERRIDE');
    expect(resolved?.isOverride).toBe(true);
    expect(resolved?.policy.code).toBe('LP-STD-2026');
  });

  it('4. Executes bulk annual entitlement allocation and records ledger entries', async () => {
    // Clean previous entitlements for testYear
    await prisma.leaveLedgerTransaction.deleteMany({
      where: { tenantId, employeeId: { in: [emp101.id, emp102.id] }, leaveYear: testYear },
    });
    await prisma.employeeLeaveEntitlement.deleteMany({
      where: { tenantId, employeeId: { in: [emp101.id, emp102.id] }, leaveYear: testYear },
    });

    const allocResult = await LeaveEntitlementService.bulkAllocateEntitlements(tenantId, {
      leaveYear: testYear,
      employeeIds: [emp101.id, emp102.id],
      overwriteExisting: true,
    });

    expect(allocResult.allocatedEmployeesCount).toBe(2);
    expect(allocResult.transactionsCount).toBeGreaterThanOrEqual(2);

    const emp101Summary = await LeaveEntitlementService.getEmployeeLeaveSummary(
      tenantId,
      emp101.id,
      testYear
    );

    expect(emp101Summary.balances.length).toBeGreaterThan(0);
    const casualBalance = emp101Summary.balances.find((b) => b.leaveTypeCode === 'CASUAL');
    expect(casualBalance?.availableBalance).toBe(10);
  });

  afterAll(async () => {
    await prisma.leavePolicyAssignment.deleteMany({
      where: { tenantId, leavePolicyId: customPolicy.id },
    });
    await prisma.leavePolicyRule.deleteMany({ where: { leavePolicyId: customPolicy.id } });
    await prisma.leavePolicy.delete({ where: { id: customPolicy.id } }).catch(() => {});
  });
});
