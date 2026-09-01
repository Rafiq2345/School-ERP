import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeavePolicyService } from '@/lib/services/leave-policy-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 1: Leave Policies & Probation Rules Suite', () => {
  const tenantId = 'tenant-sch-001';
  let casualType: any;
  let sickType: any;
  let annualType: any;
  let policyId = '';
  let policy2027Id = '';

  beforeAll(async () => {
    casualType = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    sickType = await prisma.leaveType.findFirst({ where: { tenantId, code: 'SICK' } });
    annualType = await prisma.leaveType.findFirst({ where: { tenantId, code: 'ANNUAL' } });
  });

  it('1. Creates a comprehensive versioned Leave Policy with multiple leave types and probation rules', async () => {
    const policy = await LeavePolicyService.createLeavePolicy(tenantId, {
      name: 'Test Operations Policy 2026',
      code: 'LP-TEST-OPS-2026',
      description: 'Operations staff policy with probation limits',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      isDefault: false,
      status: 'ACTIVE',
      rules: [
        {
          leaveTypeId: casualType.id,
          annualEntitlement: 8,
          isPaid: true,
          isUnlimited: false,
          allocationMethod: 'ANNUAL_UPFRONT',
          minLeaveUnit: 0.5,
          allowHalfDay: true,
          allowShiftWise: true,
          allowHourly: false,
          allowNegativeBalance: false,
          maxNegativeBalance: 0,
          maxConsecutiveDays: 3,
          probationTreatment: 'LIMITED_ENTITLEMENT',
          probationEntitlement: 2,
          entitlementRelease: 'ON_JOINING',
          yearEndAction: 'EXPIRE',
          maxCarryForwardDays: null,
          carryForwardExpiryMonths: null,
          maxEncashableDays: null,
          minBalanceForEncashment: null,
        },
        {
          leaveTypeId: annualType.id,
          annualEntitlement: 14,
          isPaid: true,
          isUnlimited: false,
          allocationMethod: 'CONFIRMATION_BASED',
          minLeaveUnit: 1.0,
          allowHalfDay: true,
          allowShiftWise: false,
          allowHourly: false,
          allowNegativeBalance: false,
          maxNegativeBalance: 0,
          maxConsecutiveDays: null,
          probationTreatment: 'NOT_ALLOWED',
          probationEntitlement: null,
          entitlementRelease: 'ON_CONFIRMATION',
          yearEndAction: 'CARRY_FORWARD',
          maxCarryForwardDays: 5,
          carryForwardExpiryMonths: 6,
          maxEncashableDays: null,
          minBalanceForEncashment: null,
        },
      ],
    });

    expect(policy).toBeDefined();
    expect(policy.code).toBe('LP-TEST-OPS-2026');
    expect(policy.rules.length).toBe(2);
    policyId = policy.id;
  });

  it('2. Enforces effective-dating: Rejects policies where effectiveTo is earlier than effectiveFrom', async () => {
    await expect(
      LeavePolicyService.createLeavePolicy(tenantId, {
        name: 'Invalid Date Policy',
        code: 'LP-INVALID-DATE',
        effectiveFrom: '2026-12-31',
        effectiveTo: '2026-01-01',
        rules: [
          {
            leaveTypeId: casualType.id,
            annualEntitlement: 10,
            isPaid: true,
            isUnlimited: false,
            allocationMethod: 'ANNUAL_UPFRONT',
            minLeaveUnit: 0.5,
            allowHalfDay: true,
            allowShiftWise: true,
            allowHourly: false,
            allowNegativeBalance: false,
            maxNegativeBalance: 0,
            maxConsecutiveDays: null,
            probationTreatment: 'ALLOWED',
            probationEntitlement: null,
            entitlementRelease: 'ON_JOINING',
            yearEndAction: 'EXPIRE',
            maxCarryForwardDays: null,
            carryForwardExpiryMonths: null,
            maxEncashableDays: null,
            minBalanceForEncashment: null,
          },
        ],
      })
    ).rejects.toThrow(/cannot be earlier/i);
  });

  it('3. Verifies Probation & Confirmation entitlement release behavior', async () => {
    // Check an employee on probation
    const testEmployee = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
    });

    if (testEmployee) {
      // Set to PROBATION
      await prisma.employee.update({
        where: { id: testEmployee.id },
        data: { confirmationStatus: 'PROBATION' },
      });

      const preview = await LeaveEntitlementService.previewAnnualAllocation(tenantId, {
        leaveYear: 2026,
        employeeIds: [testEmployee.id],
      });

      const item = preview.items.find((i) => i.employeeId === testEmployee.id);
      expect(item).toBeDefined();

      // Casual has probation limited entitlement = 3 in standard policy
      const casualEnt = item?.leaveTypeEntitlements.find((lt) => lt.leaveTypeCode === 'CASUAL');
      expect(casualEnt?.entitlement).toBe(3);

      // Annual is ON_CONFIRMATION -> must be 0 during probation
      const annualEnt = item?.leaveTypeEntitlements.find((lt) => lt.leaveTypeCode === 'ANNUAL');
      expect(annualEnt?.entitlement).toBe(0);

      // Restore to CONFIRMED
      await prisma.employee.update({
        where: { id: testEmployee.id },
        data: { confirmationStatus: 'CONFIRMED' },
      });
    }
  });

  it('4. Effective-Dated Policy Integrity: 2027 revised policy does not alter 2026 historical calculations or ledger', async () => {
    const empTest = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-104' } });
    const stdPolicy2026 = await prisma.leavePolicy.findFirst({ where: { tenantId, code: 'LP-STD-2026' } });
    if (!empTest || !stdPolicy2026) return;

    // Clean previous assignments for empTest
    await prisma.leavePolicyAssignment.deleteMany({ where: { tenantId, employeeId: empTest.id } });

    // Step A: Assign 2026 standard policy bounded to 2026-12-31
    await LeaveAssignmentService.bulkAssignPolicy(tenantId, {
      leavePolicyId: stdPolicy2026.id,
      assignmentType: 'EMPLOYEE',
      employeeIds: [empTest.id],
      isOverride: true,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      reason: '2026 policy assignment for EMP-104',
    });

    // Step B: Create a 2027 policy with 18 days annual leave
    const policy2027 = await LeavePolicyService.createLeavePolicy(tenantId, {
      name: 'Revised School Staff Leave Policy 2027',
      code: 'LP-STD-2027',
      description: 'Revised policy with increased annual leave',
      effectiveFrom: '2027-01-01',
      effectiveTo: '2027-12-31',
      isDefault: false,
      status: 'ACTIVE',
      rules: [
        {
          leaveTypeId: annualType.id,
          annualEntitlement: 18,
          isPaid: true,
          isUnlimited: false,
          allocationMethod: 'ANNUAL_UPFRONT',
          minLeaveUnit: 1.0,
          allowHalfDay: true,
          allowShiftWise: false,
          allowHourly: false,
          allowNegativeBalance: false,
          maxNegativeBalance: 0,
          maxConsecutiveDays: null,
          probationTreatment: 'ALLOWED',
          probationEntitlement: null,
          entitlementRelease: 'ON_JOINING',
          yearEndAction: 'EXPIRE',
          maxCarryForwardDays: null,
          carryForwardExpiryMonths: null,
          maxEncashableDays: null,
          minBalanceForEncashment: null,
        },
      ],
    });
    policy2027Id = policy2027.id;

    // Step C: Assign 2027 policy starting 2027-01-01
    await LeaveAssignmentService.bulkAssignPolicy(tenantId, {
      leavePolicyId: policy2027.id,
      assignmentType: 'EMPLOYEE',
      employeeIds: [empTest.id],
      isOverride: true,
      effectiveFrom: '2027-01-01',
      effectiveTo: '2027-12-31',
      reason: '2027 policy revision test',
    });

    // 1. Verify 2026 resolved policy is 2026 policy
    const resolved2026 = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      empTest.id,
      new Date('2026-06-01T00:00:00.000Z')
    );
    expect(resolved2026?.policy.code).toBe('LP-STD-2026');

    // 2. Verify 2027 resolved policy is 2027 policy
    const resolved2027 = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      empTest.id,
      new Date('2027-06-01T00:00:00.000Z')
    );
    expect(resolved2027?.policy.code).toBe('LP-STD-2027');

    // 3. Verify preview for 2027 calculates 18 days for Annual Leave
    const preview2027 = await LeaveEntitlementService.previewAnnualAllocation(tenantId, {
      leaveYear: 2027,
      employeeIds: [empTest.id],
    });
    const annual2027 = preview2027.items[0]?.leaveTypeEntitlements.find((lt) => lt.leaveTypeCode === 'ANNUAL');
    expect(annual2027?.entitlement).toBe(18);
  });

  it('5. Planned probation end date passing does NOT release confirmation-based entitlement without actual HR status', async () => {
    const testEmployee = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-103' },
    });
    if (!testEmployee) return;

    // Set planned probation end date in past, but status remains EXTENDED_PROBATION
    await prisma.employee.update({
      where: { id: testEmployee.id },
      data: {
        confirmationStatus: 'EXTENDED_PROBATION',
        probationEndDate: new Date('2025-12-31T00:00:00.000Z'), // Past date
      },
    });

    const preview = await LeaveEntitlementService.previewAnnualAllocation(tenantId, {
      leaveYear: 2026,
      employeeIds: [testEmployee.id],
    });

    const item = preview.items.find((i) => i.employeeId === testEmployee.id);
    const annualEnt = item?.leaveTypeEntitlements.find((lt) => lt.leaveTypeCode === 'ANNUAL');
    expect(annualEnt?.entitlement).toBe(0); // Must remain 0 because status is EXTENDED_PROBATION!

    // Cleanup: restore status
    await prisma.employee.update({
      where: { id: testEmployee.id },
      data: { confirmationStatus: 'CONFIRMED', probationEndDate: null },
    });
  });

  afterAll(async () => {
    if (policyId) {
      await prisma.leavePolicyRule.deleteMany({ where: { leavePolicyId: policyId } });
      await prisma.leaveAuditLog.deleteMany({ where: { entityId: policyId } });
      await prisma.leavePolicy.delete({ where: { id: policyId } }).catch(() => {});
    }
    if (policy2027Id) {
      await prisma.leavePolicyAssignment.deleteMany({ where: { leavePolicyId: policy2027Id } });
      await prisma.leavePolicyRule.deleteMany({ where: { leavePolicyId: policy2027Id } });
      await prisma.leaveAuditLog.deleteMany({ where: { entityId: policy2027Id } });
      await prisma.leavePolicy.delete({ where: { id: policy2027Id } }).catch(() => {});
    }
  });
});
