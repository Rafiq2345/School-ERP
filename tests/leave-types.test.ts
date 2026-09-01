import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { LeaveTypeService } from '@/lib/services/leave-type-service';

describe('Leave Management Phase 1: Leave Types Master Suite', () => {
  const tenantId = 'tenant-sch-001';
  let testTypeId = '';

  it('1. Creates a new configurable Leave Type with custom unit and attachment rules', async () => {
    const created = await LeaveTypeService.createLeaveType(tenantId, {
      name: 'Maternity Leave Test',
      code: 'MATERNITY_TEST',
      description: 'Test maternity leave with document requirement',
      isPaid: true,
      isUnlimited: false,
      annualLimit: 90,
      defaultAllocationMethod: 'ANNUAL_UPFRONT',
      minLeaveUnit: 1.0,
      allowFullDay: true,
      allowHalfDay: false,
      allowShiftWise: false,
      allowHourly: false,
      attachmentRequired: true,
      attachmentThresholdDays: 0,
      isActive: true,
    });

    expect(created).toBeDefined();
    expect(created.code).toBe('MATERNITY_TEST');
    expect(created.isPaid).toBe(true);
    expect(created.allowFullDay).toBe(true);
    expect(created.allowHalfDay).toBe(false);
    expect(created.attachmentRequired).toBe(true);
    testTypeId = created.id;
  });

  it('2. Prevents creating duplicate Leave Type codes within the same tenant', async () => {
    await expect(
      LeaveTypeService.createLeaveType(tenantId, {
        name: 'Duplicate Maternity',
        code: 'MATERNITY_TEST',
        isPaid: true,
      })
    ).rejects.toThrow(/already exists/i);
  });

  it('3. Updates existing Leave Type properties and preserves audit log', async () => {
    const updated = await LeaveTypeService.updateLeaveType(tenantId, testTypeId, {
      annualLimit: 95,
      description: 'Updated description for maternity leave',
    });

    expect(updated.annualLimit).toBe(95);
    expect(updated.description).toBe('Updated description for maternity leave');

    const audit = await prisma.leaveAuditLog.findFirst({
      where: { tenantId, entityType: 'LEAVE_TYPE', entityId: testTypeId, action: 'UPDATED' },
    });
    expect(audit).toBeDefined();
  });

  it('4. Creates an Unlimited Unpaid Leave Type with hourly / short leave permission', async () => {
    const unpaidType = await LeaveTypeService.createLeaveType(tenantId, {
      name: 'Short Hourly Leave Test',
      code: 'SHORT_TEST',
      isPaid: false,
      isUnlimited: true,
      minLeaveUnit: 0.125,
      allowFullDay: false,
      allowHalfDay: false,
      allowShiftWise: false,
      allowHourly: true,
    });

    expect(unpaidType.isPaid).toBe(false);
    expect(unpaidType.isUnlimited).toBe(true);
    expect(unpaidType.allowHourly).toBe(true);

    // Cleanup
    await prisma.leaveType.delete({ where: { id: unpaidType.id } });
  });

  afterAll(async () => {
    if (testTypeId) {
      await prisma.leaveAuditLog.deleteMany({ where: { entityId: testTypeId } });
      await prisma.leaveType.delete({ where: { id: testTypeId } }).catch(() => {});
    }
  });
});
