import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';

const prisma = new PrismaClient();

describe.sequential('Leave Management Phase 2: Final Approval Entitlement Ledger Deduction Suite', () => {
  const tenantId = 'tenant-sch-001';
  let fatima: any;
  let casualLt: any;
  let morningShift: any;
  let testAppId: string;
  let appNumber: string;

  beforeAll(async () => {
    fatima = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    morningShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-MRN' } });

    // Assign double shift schedule to Fatima
    const dblSchedule = await prisma.workSchedule.findFirst({
      where: { tenantId, code: 'WS-TEACHING-2X' },
    });
    if (dblSchedule && fatima) {
      await prisma.employeeScheduleAssignment.deleteMany({
        where: { tenantId, employeeId: fatima.id },
      });
      await prisma.employeeScheduleAssignment.create({
        data: {
          tenantId,
          scheduleId: dblSchedule.id,
          employeeId: fatima.id,
          assignmentType: 'EMPLOYEE',
          isOverride: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: new Date('2026-12-31T00:00:00.000Z'),
          isActive: true,
        },
      });
    }

    // Clean prior test applications for 2026-10-15
    const priorApps = await prisma.leaveApplication.findMany({
      where: { tenantId, employeeId: fatima.id, startDate: new Date('2026-10-15T00:00:00.000Z') },
      include: { approvalInstance: true },
    });
    for (const a of priorApps) {
      if (a.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: a.approvalInstance.id } });
      }
      await prisma.leaveLedgerTransaction.deleteMany({ where: { referenceId: a.id } });
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: a.id } });
    }

    // Set Fatima's fresh initial balance for test suite
    await prisma.employeeLeaveEntitlement.updateMany({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
      data: { allocatedDays: 3, usedDays: 0, adjustedDays: 0, availableBalance: 3 },
    });

    // Create the test application in beforeAll
    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: '2026-10-15',
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Morning appointment duty coverage',
    });

    testAppId = app.id;
    appNumber = app.applicationNumber;

    // Initialize approval instance
    await LeaveApprovalService.initializeApprovalInstance(tenantId, testAppId);
  });

  afterAll(async () => {
    // Clean test application 2026-10-15
    const priorApps = await prisma.leaveApplication.findMany({
      where: { tenantId, employeeId: fatima.id, startDate: new Date('2026-10-15T00:00:00.000Z') },
      include: { approvalInstance: true },
    });
    for (const a of priorApps) {
      if (a.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: a.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: a.approvalInstance.id } });
      }
      await prisma.leaveLedgerTransaction.deleteMany({ where: { referenceId: a.id } });
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: a.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: a.id } });
    }

    // Restore Fatima's verified 2026 state with LR-2026-000148 deducted (Allocated=3, Used=0.5, Available=2.5)
    await prisma.employeeLeaveEntitlement.updateMany({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
      data: { allocatedDays: 3, usedDays: 0.5, adjustedDays: 0, availableBalance: 2.5 },
    });

    await prisma.$disconnect();
  });

  it('1. Submits 0.5d Specific Shift leave application for Fatima Zahra EMP-102 (Morning Shift on 2026-10-15)', async () => {
    const app = await prisma.leaveApplication.findUnique({ where: { id: testAppId } });
    expect(app).toBeDefined();
    expect(app!.status).toBe('PENDING_APPROVAL');
    expect(Number(app!.requestedDays)).toBe(0.5);

    // Verify Entitlement is NOT yet deducted during pending approval
    const entBefore = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
    });
    expect(Number(entBefore?.allocatedDays)).toBe(3);
    expect(Number(entBefore?.usedDays)).toBe(0);
  });

  it('2. Step 1 (Department Incharge) Approval advances workflow without ledger deduction', async () => {
    const step1Result = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: testAppId,
      actionInput: { action: 'APPROVE', remarks: 'Step 1 Approved by Dept Incharge' },
      actorRoles: ['DEPARTMENT_HEAD'],
    });

    expect(step1Result.instance.currentStepNumber).toBe(2);
    expect(step1Result.instanceStatus).toBe('IN_PROGRESS');

    // Ledger must NOT have usage deduction yet
    const txn = await prisma.leaveLedgerTransaction.findFirst({
      where: { tenantId, referenceId: testAppId, transactionType: 'LEAVE_USAGE' },
    });
    expect(txn).toBeNull();
  });

  it('3. Step 2 (Principal) Approval advances workflow to Step 3 without ledger deduction', async () => {
    const step2Result = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: testAppId,
      actionInput: { action: 'APPROVE', remarks: 'Step 2 Approved by Principal' },
      actorRoles: ['PRINCIPAL'],
    });

    expect(step2Result.instance.currentStepNumber).toBe(3);
    expect(step2Result.instanceStatus).toBe('IN_PROGRESS');

    const txn = await prisma.leaveLedgerTransaction.findFirst({
      where: { tenantId, referenceId: testAppId, transactionType: 'LEAVE_USAGE' },
    });
    expect(txn).toBeNull();
  });

  it('4. Step 3 (HR Office Final Approval) atomically posts 0.5d deduction to Entitlement Ledger', async () => {
    const step3Result = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: testAppId,
      actionInput: { action: 'APPROVE', remarks: 'Step 3 Final HR Record Approved' },
      actorRoles: ['HR_MANAGER'],
    });

    expect(step3Result.instanceStatus).toBe('APPROVED');

    // Verify Application Status is APPROVED
    const app = await prisma.leaveApplication.findUnique({ where: { id: testAppId } });
    expect(app?.status).toBe('APPROVED');

    // Verify Employee Entitlement Summary in DB reflects deduction
    const entAfter = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
    });
    expect(Number(entAfter?.allocatedDays)).toBe(3);
    expect(Number(entAfter?.usedDays)).toBeGreaterThanOrEqual(0.5);
    expect(Number(entAfter?.availableBalance)).toBeLessThanOrEqual(2.5);

    // Verify Immutable LeaveLedgerTransaction in DB
    const txns = await prisma.leaveLedgerTransaction.findMany({
      where: { tenantId, referenceId: testAppId, transactionType: 'LEAVE_USAGE' },
    });
    expect(txns.length).toBe(1);
    expect(Number(txns[0].amount)).toBe(-0.5);
  });

  it('5. Prevents double deduction on duplicate / retry execution (Idempotency)', async () => {
    // Replay recordLeaveUsage for the same application
    const retryResult = await LeaveEntitlementService.recordLeaveUsage(
      tenantId,
      testAppId,
      'test-actor'
    );

    // Should return existing transaction and not create a second one
    expect(retryResult).toBeDefined();

    const txnCount = await prisma.leaveLedgerTransaction.count({
      where: { tenantId, referenceId: testAppId, transactionType: 'LEAVE_USAGE' },
    });
    expect(txnCount).toBe(1);
  });

  it('6. Verifies Employee Leave Summary API returns updated Used (P2) and Ledger History', async () => {
    const summary = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, fatima.id, 2026);
    expect(summary).toBeDefined();

    const casualBalance = summary.balances.find((b) => b.leaveTypeId === casualLt.id);
    expect(casualBalance).toBeDefined();
    expect(Number(casualBalance?.allocatedDays)).toBe(3);
    expect(Number(casualBalance?.usedDays)).toBeGreaterThanOrEqual(0.5);
    expect(Number(casualBalance?.availableBalance)).toBeLessThanOrEqual(2.5);

    // Transaction history must contain LEAVE_USAGE
    const usageTxn = summary.recentTransactions.find(
      (h) => h.referenceId === testAppId && h.transactionType === 'LEAVE_USAGE'
    );
    expect(usageTxn).toBeDefined();
    expect(Number(usageTxn?.amount)).toBe(-0.5);
  });
});
