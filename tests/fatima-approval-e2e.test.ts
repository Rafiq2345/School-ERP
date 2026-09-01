import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';

const prisma = new PrismaClient();

describe.sequential('Fatima Zahra EMP-102 End-to-End Leave Request & Approval Inbox Suite', () => {
  const tenantId = 'tenant-sch-001';
  let fatima: any;
  let casualLt: any;
  let morningShift: any;
  let createdAppId: string;
  let applicationNumber: string;

  beforeAll(async () => {
    fatima = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    morningShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-MRN' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Submits multi-shift leave request for Fatima Zahra EMP-102 and verifies workflow linkage', async () => {
    expect(fatima).toBeDefined();
    expect(casualLt).toBeDefined();

    // Clean any prior application on 2026-09-08
    const existing = await prisma.leaveApplication.findMany({
      where: { tenantId, employeeId: fatima.id, startDate: new Date('2026-09-08T00:00:00.000Z') },
      include: { approvalInstance: true },
    });
    for (const e of existing) {
      if (e.approvalInstance) {
        await prisma.leaveApprovalActionHistory.deleteMany({ where: { instanceId: e.approvalInstance.id } });
        await prisma.leaveRequestApprovalStep.deleteMany({ where: { instanceId: e.approvalInstance.id } });
        await prisma.leaveRequestApprovalInstance.deleteMany({ where: { id: e.approvalInstance.id } });
      }
      await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: e.id } });
      await prisma.leaveApplicationShift.deleteMany({ where: { applicationId: e.id } });
      await prisma.leaveApplication.deleteMany({ where: { id: e.id } });
    }

    const app = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-09-08',
      endDate: '2026-09-08',
      leaveScope: 'SPECIFIC_SHIFT',
      selectedShifts: [
        {
          date: '2026-09-08',
          shiftId: morningShift.id,
          shiftCode: morningShift.code,
          shiftName: morningShift.name,
          startTime: morningShift.startTime,
          endTime: morningShift.endTime,
          leaveFraction: 0.5,
        },
      ],
      reason: 'Personal urgent appointment during morning shift',
    });

    expect(app.id).toBeDefined();
    expect(app.status).toBe('PENDING_APPROVAL');
    expect(app.requestedDays).toBe(0.5);
    createdAppId = app.id;
    applicationNumber = app.applicationNumber;

    // Initialize approval workflow instance
    await LeaveApprovalService.initializeApprovalInstance(tenantId, app.id);
  });

  it('2. Verifies Approval Workflow Instance is created on submission with all ordered steps', async () => {
    const instance = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, createdAppId);
    expect(instance).toBeDefined();
    expect(instance.workflowName).toBeDefined();
    expect(instance.status).toBe('IN_PROGRESS');
    expect(instance.totalSteps).toBeGreaterThanOrEqual(1);
    expect(instance.currentStepNumber).toBe(1);

    // Step 1 MUST be PENDING
    expect(instance.steps[0].stepNumber).toBe(1);
    expect(instance.steps[0].status).toBe('PENDING');
    expect(instance.steps[0].assignedAt).toBeDefined();

    // If more steps, future steps MUST be WAITING
    for (let i = 1; i < instance.steps.length; i++) {
      expect(instance.steps[i].status).toBe('WAITING');
    }

    // Action History must record INITIATED
    expect(instance.actionHistory.length).toBeGreaterThanOrEqual(1);
    expect(instance.actionHistory[0].action).toBe('INITIATED');
  });

  it('3. Verifies Approval Inbox includes this pending request under "All Pending"', async () => {
    const inbox = await LeaveApprovalService.getPendingApprovals(tenantId, {
      status: 'PENDING_APPROVAL',
    });

    expect(inbox.total).toBeGreaterThanOrEqual(1);
    const fatimaItem = inbox.items.find((i) => i.applicationNumber === applicationNumber);
    expect(fatimaItem).toBeDefined();
    expect(fatimaItem?.employeeName).toContain('Fatima');
    expect(fatimaItem?.requestedDays).toBe(0.5);
    expect(fatimaItem?.currentStepNumber).toBe(1);
  });

  it('4. Verifies "Actionable by Me" vs "All Pending" behavior', async () => {
    // A. Query with scope 'all' or no specific user
    const allPending = await LeaveApprovalService.getPendingApprovals(tenantId, {
      status: 'PENDING_APPROVAL',
    });
    expect(allPending.items.some((i) => i.applicationNumber === applicationNumber)).toBe(true);

    // B. Super Admin is authorized on all actionable steps
    const adminInbox = await LeaveApprovalService.getPendingApprovals(tenantId, {
      status: 'PENDING_APPROVAL',
      approverRoles: ['SUPER_ADMIN'],
    });
    const adminFatima = adminInbox.items.find((i) => i.applicationNumber === applicationNumber);
    expect(adminFatima?.isActionableByCurrentUser).toBe(true);
  });
});
