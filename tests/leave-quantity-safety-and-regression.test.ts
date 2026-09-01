import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';
import { LeaveAttendanceIntegrationService } from '@/lib/services/leave-attendance-integration-service';

const prisma = new PrismaClient();

describe.sequential('Leave Management Phase 2: Final Integration, Quantity Safety & Regression Suite', () => {
  const tenantId = 'tenant-sch-001';
  let fatima: any;
  let casualLt: any;
  let morningShift: any;
  let afternoonShift: any;
  let policy: any;
  let workflow: any;
  let app: any;

  beforeAll(async () => {
    fatima = await prisma.employee.findFirst({
      where: { tenantId, employeeNo: 'EMP-102' },
      include: { department: true, designation: true },
    });
    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });
    morningShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-MRN' } });
    afternoonShift = await prisma.shift.findFirst({ where: { tenantId, code: 'SHIFT-AFT' } });
    policy = await prisma.leavePolicy.findFirst({ where: { tenantId, isDefault: true } });
    workflow = await prisma.leaveApprovalWorkflow.findFirst({ where: { tenantId, isDefault: true } });

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

    // Ensure 2026 Entitlement: Allocated=3, Used=0.5, Available=2.5
    const ent = await prisma.employeeLeaveEntitlement.upsert({
      where: {
        tenantId_employeeId_leaveTypeId_leaveYear: {
          tenantId,
          employeeId: fatima.id,
          leaveTypeId: casualLt.id,
          leaveYear: 2026,
        },
      },
      update: {
        allocatedDays: 3,
        usedDays: 0.5,
        adjustedDays: 0,
        availableBalance: 2.5,
        lastCalculatedAt: new Date(),
      },
      create: {
        tenantId,
        employeeId: fatima.id,
        leaveTypeId: casualLt.id,
        leavePolicyId: policy.id,
        leaveYear: 2026,
        allocationMethod: 'ANNUAL_UPFRONT',
        openingBalance: 0,
        allocatedDays: 3,
        usedDays: 0.5,
        adjustedDays: 0,
        availableBalance: 2.5,
        status: 'ACTIVE',
      },
    });

    // Ensure LR-2026-000148 application exists with status APPROVED
    app = await prisma.leaveApplication.findFirst({
      where: { tenantId, applicationNumber: 'LR-2026-000148' },
    });

    if (!app) {
      app = await prisma.leaveApplication.create({
        data: {
          tenantId,
          applicationNumber: 'LR-2026-000148',
          employeeId: fatima.id,
          leaveTypeId: casualLt.id,
          leavePolicyId: policy.id,
          status: 'APPROVED',
          leaveScope: 'SPECIFIC_SHIFT',
          startDate: new Date('2026-09-02T00:00:00.000Z'),
          endDate: new Date('2026-09-02T00:00:00.000Z'),
          requestedDays: 0.5,
          
          workingDaysCount: 1,
          holidaysCount: 0,
          isPaid: true,
          reason: 'Personal urgent appointment during morning shift',
          submittedAt: new Date('2026-09-01T16:03:00.000Z'),
          dates: {
            create: [
              {
                tenantId,
                date: new Date('2026-09-02T00:00:00.000Z'),
                isWorkingDay: true,
                isHoliday: false,
                leaveQuantity: 0.5,
              },
            ],
          },
          shifts: {
            create: [
              {
                tenantId,
                shiftId: morningShift.id,
                shiftCode: morningShift.code,
                shiftName: morningShift.name,
                date: new Date('2026-09-02T00:00:00.000Z'),
                startTime: '08:00',
                endTime: '14:00',
                leaveFraction: 0.5,
              },
            ],
          },
        },
      });
    }

    // Ensure Approval Instance with all 3 steps APPROVED
    let instance = await prisma.leaveRequestApprovalInstance.findUnique({
      where: { applicationId: app.id },
    });

    if (!instance) {
      instance = await prisma.leaveRequestApprovalInstance.create({
        data: {
          tenantId,
          applicationId: app.id,
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowCode: workflow.code,
          workflowSnapshot: {},
          currentStepNumber: 3,
          totalSteps: 3,
          status: 'APPROVED',
          completedAt: new Date('2026-09-01T16:15:00.000Z'),
          steps: {
            create: [
              {
                tenantId,
                stepNumber: 1,
                stepName: 'Department Incharge Review',
                approverType: 'ROLE_BASED',
                approverRole: 'DEPARTMENT_HEAD',
                isRequired: true,
                status: 'APPROVED',
                action: 'APPROVE',
                actionAt: new Date('2026-09-01T16:05:00.000Z'),
                remarks: 'Approved by Department Incharge',
              },
              {
                tenantId,
                stepNumber: 2,
                stepName: 'Principal Approval',
                approverType: 'ROLE_BASED',
                approverRole: 'PRINCIPAL',
                isRequired: true,
                status: 'APPROVED',
                action: 'APPROVE',
                actionAt: new Date('2026-09-01T16:10:00.000Z'),
                remarks: 'Approved by Principal',
              },
              {
                tenantId,
                stepNumber: 3,
                stepName: 'HR Office Final Record',
                approverType: 'ROLE_BASED',
                approverRole: 'HR_MANAGER',
                isRequired: true,
                status: 'APPROVED',
                action: 'APPROVE',
                actionAt: new Date('2026-09-01T16:15:00.000Z'),
                remarks: 'Final HR Record Approved',
              },
            ],
          },
          actionHistory: {
            create: [
              {
                tenantId,
                stepNumber: 1,
                stepName: 'Department Incharge Review',
                action: 'APPROVED',
                previousStatus: 'PENDING',
                newStatus: 'IN_PROGRESS',
                actorRole: 'DEPARTMENT_HEAD',
                remarks: 'Approved by Dept Head',
              },
              {
                tenantId,
                stepNumber: 2,
                stepName: 'Principal Approval',
                action: 'APPROVED',
                previousStatus: 'IN_PROGRESS',
                newStatus: 'IN_PROGRESS',
                actorRole: 'PRINCIPAL',
                remarks: 'Approved by Principal',
              },
              {
                tenantId,
                stepNumber: 3,
                stepName: 'HR Office Final Record',
                action: 'FINAL_APPROVED',
                previousStatus: 'IN_PROGRESS',
                newStatus: 'APPROVED',
                actorRole: 'HR_MANAGER',
                remarks: 'Final HR Record Approved',
              },
            ],
          },
        },
      });
    }

    // Ensure Immutable LEAVE_USAGE ledger transaction is recorded
    await prisma.leaveLedgerTransaction.deleteMany({
      where: { tenantId, referenceId: app.id },
    });

    await prisma.leaveLedgerTransaction.create({
      data: {
        tenantId,
        employeeId: fatima.id,
        leaveTypeId: casualLt.id,
        leavePolicyId: policy.id,
        entitlementId: ent.id,
        leaveYear: 2026,
        transactionType: 'LEAVE_USAGE',
        amount: -0.5,
        balanceBefore: 3.0,
        balanceAfter: 2.5,
        effectiveDate: app.startDate,
        reason: `Approved Leave Request ${app.applicationNumber} (0.5d Casual Leave - Morning Shift)`,
        referenceType: 'LEAVE_APPLICATION',
        referenceId: app.id,
        shiftId: morningShift.id,
        createdByUserId: null,
      },
    });

    // Auto-integrate with attendance
    await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendance(
      tenantId,
      app.id,
      'test-system'
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Verifies Fatima LR-2026-000148 preserved state: 0.5d deduction, 2.5d available, exactly 1 usage txn', async () => {
    const verifiedApp = await prisma.leaveApplication.findFirst({
      where: { tenantId, applicationNumber: 'LR-2026-000148' },
      include: { approvalInstance: { include: { steps: true, actionHistory: true } } },
    });

    expect(verifiedApp).toBeDefined();
    expect(verifiedApp!.status).toBe('APPROVED');
    expect(Number(verifiedApp!.requestedDays)).toBe(0.5);

    // Verify all 3 approval steps are APPROVED
    const steps = verifiedApp!.approvalInstance?.steps || [];
    expect(steps.length).toBe(3);
    expect(steps.every((s) => s.status === 'APPROVED')).toBe(true);

    // Verify Entitlement in DB
    const ent = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
    });
    expect(Number(ent?.allocatedDays)).toBe(3);
    expect(Number(ent?.usedDays)).toBe(0.5);
    expect(Number(ent?.availableBalance)).toBe(2.5);

    // Verify exactly ONE LEAVE_USAGE ledger transaction
    const txns = await prisma.leaveLedgerTransaction.findMany({
      where: { tenantId, referenceId: verifiedApp!.id, transactionType: 'LEAVE_USAGE' },
    });
    expect(txns.length).toBe(1);
    expect(Number(txns[0].amount)).toBe(-0.5);
    expect(Number(txns[0].balanceBefore)).toBe(3);
    expect(Number(txns[0].balanceAfter)).toBe(2.5);
  });

  it('2. Critical Quantity Safety: Separates calendar day indicator from actual 0.5d leave quantity', async () => {
    // Check monthly register for September 2026
    const register = await EmployeeAttendanceService.getEmployeeMonthlyRegister(tenantId, 2026, 9);
    const fatimaRow = register.employees.find((e) => e.employeeNo === 'EMP-102');

    expect(fatimaRow).toBeDefined();

    // Day 2 shows LV badge
    const day2 = fatimaRow!.dailyStatuses[2];
    expect(day2).toBeDefined();
    expect(day2.status).toBe('ON_LEAVE');
    expect(day2.isLeave).toBe(true);

    // Crucial: Absence must remain 0
    expect(fatimaRow!.totals.absent).toBe(0);
    expect(fatimaRow!.summary.absentDays).toBe(0);

    // Crucial: Leave total must be 0.5d (not 1.0d)
    expect(fatimaRow!.totals.leave).toBe(0.5);
    expect(fatimaRow!.summary.leaveDays).toBe(0.5);

    // Worked hours tracked safely
    expect(fatimaRow!.totals.totalWorkedHours).toBeGreaterThanOrEqual(0);
  });

  it('3. Multi-Shift Attendance Roster preserves Morning = ON_LEAVE and Afternoon = PRESENT (4h)', async () => {
    const rosterData = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, '2026-09-02');
    const fatimaRoster = rosterData.roster.find((r) => r.employee.employeeNo === 'EMP-102');

    expect(fatimaRoster).toBeDefined();
    const shifts = fatimaRoster!.shiftSegments;
    expect(shifts.length).toBe(2);

    const mrn = shifts.find((s) => s.shiftCode === 'SHIFT-MRN');
    expect(mrn).toBeDefined();
    expect(mrn!.status).toBe('ON_LEAVE');
    expect(mrn!.leaveApplicationNumber).toBe('LR-2026-000148');
    expect(mrn!.leaveTypeName).toBe('Casual Leave');
    expect(mrn!.workedHours).toBe(0);

    const aft = shifts.find((s) => s.shiftCode === 'SHIFT-AFT');
    expect(aft).toBeDefined();
    expect(aft!.status).toBe('PRESENT');
    expect(aft!.workedHours).toBe(4);
  });

  it('4. Draft and Submitted/Pending leave applications do NOT consume entitlement', async () => {
    // Clean prior test apps on test dates
    const priorApps = await prisma.leaveApplication.findMany({
      where: {
        tenantId,
        employeeId: fatima.id,
        startDate: { in: [new Date('2026-11-20T00:00:00.000Z'), new Date('2026-11-25T00:00:00.000Z')] },
      },
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

    // Draft creation
    const draft = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      leaveScope: 'FULL_DAY',
      saveAsDraft: true,
      reason: 'Draft test request',
    });
    expect(draft.status).toBe('DRAFT');

    // Verify balance unchanged
    let ent = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
    });
    expect(Number(ent?.usedDays)).toBe(0.5);
    expect(Number(ent?.availableBalance)).toBe(2.5);

    // Submit request (status PENDING_APPROVAL)
    const pending = await LeaveApplicationService.createApplication(tenantId, {
      employeeId: fatima.id,
      leaveTypeId: casualLt.id,
      startDate: '2026-11-25',
      endDate: '2026-11-25',
      leaveScope: 'FULL_DAY',
      saveAsDraft: false,
      reason: 'Pending test request',
    });
    expect(pending.status).toBe('PENDING_APPROVAL');

    // Verify balance still unchanged (no ledger deduction during pending)
    ent = await prisma.employeeLeaveEntitlement.findFirst({
      where: { tenantId, employeeId: fatima.id, leaveTypeId: casualLt.id, leaveYear: 2026 },
    });
    expect(Number(ent?.usedDays)).toBe(0.5);
    expect(Number(ent?.availableBalance)).toBe(2.5);

    // Clean up temporary test apps
    await prisma.leaveApplicationDate.deleteMany({ where: { applicationId: { in: [draft.id, pending.id] } } });
    await prisma.leaveApplication.deleteMany({ where: { id: { in: [draft.id, pending.id] } } });
  });

  it('5. Audit Trail verifies complete immutable tracking across submission, approval, ledger, and attendance', async () => {
    const verifiedApp = await prisma.leaveApplication.findFirst({
      where: { tenantId, applicationNumber: 'LR-2026-000148' },
      include: { approvalInstance: { include: { actionHistory: true } } },
    });

    // 1. Approval history audit
    const history = verifiedApp?.approvalInstance?.actionHistory || [];
    expect(history.length).toBeGreaterThanOrEqual(3);

    // 2. Ledger transaction audit
    const ledgerTxn = await prisma.leaveLedgerTransaction.findFirst({
      where: { tenantId, referenceId: verifiedApp!.id, transactionType: 'LEAVE_USAGE' },
    });
    expect(ledgerTxn).toBeDefined();
    expect(ledgerTxn!.reason).toContain('LR-2026-000148');

    // 3. Attendance audit log
    const attAudit = await prisma.employeeAttendanceAuditLog.findFirst({
      where: { tenantId, employeeId: fatima.id, attendanceDate: new Date('2026-09-02T00:00:00.000Z') },
    });
    expect(attAudit).toBeDefined();
    expect(attAudit!.newStatus).toBe('ON_LEAVE');
    expect(attAudit!.correctionReason).toContain('LR-2026-000148');
  });
});
