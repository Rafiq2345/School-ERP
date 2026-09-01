import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 2 Step 2: Dynamic Multi-Level Approval Workflow Suite', () => {
  let tenantId: string;
  let deptTeachingId: string;
  let deptAccountsId: string;
  let desigTeacherId: string;
  let empTeacherId: string;
  let empAccountsId: string;
  let empSpecialId: string;
  let casualLeaveTypeId: string;
  let annualLeaveTypeId: string;

  let academicWorkflowId: string;
  let accountsWorkflowId: string;
  let specialWorkflowId: string;
  let defaultWorkflowId: string;

  beforeAll(async () => {
    const suffix = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Workflow Academy ' + suffix,
        code: 'WF-TEN-' + suffix,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // Create Departments
    const dept1 = await prisma.department.create({
      data: { tenantId, name: 'Faculty of Science', code: 'DEPT-SCI-' + suffix },
    });
    deptTeachingId = dept1.id;

    const dept2 = await prisma.department.create({
      data: { tenantId, name: 'Accounts Department', code: 'DEPT-ACC-' + suffix },
    });
    deptAccountsId = dept2.id;

    // Create Designation
    const desig = await prisma.designation.create({
      data: { tenantId, departmentId: deptTeachingId, name: 'Senior Teacher', code: 'DESIG-TCH-' + suffix },
    });
    desigTeacherId = desig.id;

    // Create Employees
    const emp1 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-TCH-' + suffix,
        firstNameEn: 'Ahmad',
        lastNameEn: 'Khan',
        departmentId: deptTeachingId,
        designationId: desigTeacherId,
        currentStatus: 'ACTIVE',
        confirmationStatus: 'CONFIRMED',
      },
    });
    empTeacherId = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-ACC-' + suffix,
        firstNameEn: 'Bilal',
        lastNameEn: 'Saeed',
        departmentId: deptAccountsId,
        currentStatus: 'ACTIVE',
        confirmationStatus: 'CONFIRMED',
      },
    });
    empAccountsId = emp2.id;

    const emp3 = await prisma.employee.create({
      data: {
        tenantId,
        employeeNo: 'EMP-SPC-' + suffix,
        firstNameEn: 'Zainab',
        lastNameEn: 'Bibi',
        departmentId: deptTeachingId,
        currentStatus: 'ACTIVE',
        confirmationStatus: 'CONFIRMED',
      },
    });
    empSpecialId = emp3.id;

    // Create Leave Types
    const ltCasual = await prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Casual Leave ' + suffix,
        code: 'CASUAL-' + suffix,
        isPaid: true,
        isUnlimited: false,
        annualLimit: 10,
        allowFullDay: true,
      },
    });
    casualLeaveTypeId = ltCasual.id;

    const ltAnnual = await prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Annual Leave ' + suffix,
        code: 'ANNUAL-' + suffix,
        isPaid: true,
        isUnlimited: false,
        annualLimit: 15,
        allowFullDay: true,
      },
    });
    annualLeaveTypeId = ltAnnual.id;

    // Create Leave Policy and Policy Rule
    const policy = await prisma.leavePolicy.create({
      data: {
        tenantId,
        name: 'Standard Staff Leave Policy ' + suffix,
        code: 'POL-STD-' + suffix,
        isDefault: true,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01'),
        rules: {
          create: [
            {
              leaveTypeId: casualLeaveTypeId,
              annualEntitlement: 10,
              isPaid: true,
              allocationMethod: 'ANNUAL_UPFRONT',
            },
            {
              leaveTypeId: annualLeaveTypeId,
              annualEntitlement: 15,
              isPaid: true,
              allocationMethod: 'ANNUAL_UPFRONT',
            },
          ],
        },
      },
    });

    // Create Opening Entitlements
    await prisma.employeeLeaveEntitlement.createMany({
      data: [
        {
          tenantId,
          employeeId: empTeacherId,
          leaveTypeId: casualLeaveTypeId,
          leavePolicyId: policy.id,
          leaveYear: 2026,
          allocatedDays: 10,
          usedDays: 0,
                    availableBalance: 10,
        },
        {
          tenantId,
          employeeId: empAccountsId,
          leaveTypeId: casualLeaveTypeId,
          leavePolicyId: policy.id,
          leaveYear: 2026,
          allocatedDays: 10,
          usedDays: 0,
                    availableBalance: 10,
        },
        {
          tenantId,
          employeeId: empSpecialId,
          leaveTypeId: casualLeaveTypeId,
          leavePolicyId: policy.id,
          leaveYear: 2026,
          allocatedDays: 10,
          usedDays: 0,
                    availableBalance: 10,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Creates configurable multi-level approval workflows with ordered steps and validation', async () => {
    // 1. Academic Teaching Workflow: 3 steps (Incharge -> Principal -> HR)
    const wfAcademic = await LeaveWorkflowService.createWorkflow(tenantId, {
      name: 'Teacher Academic Leave Workflow',
      code: 'WF-ACADEMIC',
      description: '3-tier approval for academic faculty members',
      isDefault: false,
      isActive: true,
      steps: [
        { stepNumber: 1, stepName: 'Academic Incharge Review', approverType: 'ROLE', approverRole: 'ACADEMIC_INCHARGE', isRequired: true },
        { stepNumber: 2, stepName: 'Principal Approval', approverType: 'ROLE', approverRole: 'PRINCIPAL', isRequired: true },
        { stepNumber: 3, stepName: 'HR Final Record', approverType: 'ROLE', approverRole: 'HR_MANAGER', isRequired: true },
      ],
      rules: [
        { assignmentType: 'DEPARTMENT', departmentId: deptTeachingId },
      ],
    });
    expect(wfAcademic).toBeDefined();
    expect(wfAcademic.code).toBe('WF-ACADEMIC');
    expect(wfAcademic.steps.length).toBe(3);
    academicWorkflowId = wfAcademic.id;

    // 2. Accounts Department Workflow: 2 steps (Accounts Manager -> HR)
    const wfAccounts = await LeaveWorkflowService.createWorkflow(tenantId, {
      name: 'Accounts Staff Leave Workflow',
      code: 'WF-ACCOUNTS',
      isDefault: false,
      isActive: true,
      steps: [
        { stepNumber: 1, stepName: 'Accounts Manager Approval', approverType: 'ROLE', approverRole: 'ACCOUNTS_MANAGER', isRequired: true },
        { stepNumber: 2, stepName: 'HR Approval', approverType: 'ROLE', approverRole: 'HR_MANAGER', isRequired: true },
      ],
      rules: [
        { assignmentType: 'DEPARTMENT', departmentId: deptAccountsId },
      ],
    });
    expect(wfAccounts).toBeDefined();
    expect(wfAccounts.steps.length).toBe(2);
    accountsWorkflowId = wfAccounts.id;

    // 3. Special Employee Custom Override Workflow: 1 step (Direct Director Approval)
    const wfSpecial = await LeaveWorkflowService.createWorkflow(tenantId, {
      name: 'Director Fast-Track Workflow',
      code: 'WF-SPECIAL-OVERRIDE',
      isDefault: false,
      isActive: true,
      steps: [
        { stepNumber: 1, stepName: 'Director Approval', approverType: 'ROLE', approverRole: 'DIRECTOR', isRequired: true },
      ],
      rules: [
        { assignmentType: 'INDIVIDUAL_OVERRIDE', employeeId: empSpecialId, isOverride: true },
      ],
    });
    expect(wfSpecial.steps.length).toBe(1);
    specialWorkflowId = wfSpecial.id;

    // 4. Institutional Default Fallback Workflow: 2 steps (Principal -> HR)
    const wfDefault = await LeaveWorkflowService.createWorkflow(tenantId, {
      name: 'Standard Institutional Default Workflow',
      code: 'WF-INST-DEFAULT',
      isDefault: true,
      isActive: true,
      steps: [
        { stepNumber: 1, stepName: 'Principal Approval', approverType: 'ROLE', approverRole: 'PRINCIPAL', isRequired: true },
        { stepNumber: 2, stepName: 'HR Office', approverType: 'ROLE', approverRole: 'HR_MANAGER', isRequired: true },
      ],
    });
    expect(wfDefault.isDefault).toBe(true);
    defaultWorkflowId = wfDefault.id;
  });

  it('2. Prevents invalid workflow creation (empty steps, duplicate step numbers)', async () => {
    // Empty steps
    await expect(
      LeaveWorkflowService.createWorkflow(tenantId, {
        name: 'Invalid Workflow',
        code: 'WF-INVALID-1',
        steps: [],
      })
    ).rejects.toThrow(/must contain at least one/i);

    // Duplicate step numbers
    await expect(
      LeaveWorkflowService.createWorkflow(tenantId, {
        name: 'Duplicate Step Numbers',
        code: 'WF-INVALID-2',
        steps: [
          { stepNumber: 1, stepName: 'Review 1', approverType: 'ROLE', approverRole: 'ADMIN' },
          { stepNumber: 1, stepName: 'Review 2', approverType: 'ROLE', approverRole: 'PRINCIPAL' },
        ],
      })
    ).rejects.toThrow(/duplicate step number/i);
  });

  it('3. Dynamic Workflow Resolution Precedence: Custom Override > Department > Default Fallback', async () => {
    // A. Special Employee with Override -> Resolves WF-SPECIAL-OVERRIDE (Level 1)
    const resSpecial = await LeaveWorkflowService.resolveWorkflowForApplication(tenantId, {
      employeeId: empSpecialId,
      leaveTypeId: casualLeaveTypeId,
    });
    expect(resSpecial.workflow.code).toBe('WF-SPECIAL-OVERRIDE');
    expect(resSpecial.source).toBe('INDIVIDUAL_OVERRIDE');

    // B. Teacher Employee in Faculty of Science -> Resolves WF-ACADEMIC (Level 3 Department)
    const resTeacher = await LeaveWorkflowService.resolveWorkflowForApplication(tenantId, {
      employeeId: empTeacherId,
      leaveTypeId: casualLeaveTypeId,
    });
    expect(resTeacher.workflow.code).toBe('WF-ACADEMIC');
    expect(resTeacher.source).toBe('DEPARTMENT');

    // C. Accounts Employee in Accounts Department -> Resolves WF-ACCOUNTS (Level 3 Department)
    const resAccounts = await LeaveWorkflowService.resolveWorkflowForApplication(tenantId, {
      employeeId: empAccountsId,
      leaveTypeId: casualLeaveTypeId,
    });
    expect(resAccounts.workflow.code).toBe('WF-ACCOUNTS');
    expect(resAccounts.source).toBe('DEPARTMENT');
  });

  it('4. Request Submission initializes immutable Approval Instance with Step 1 PENDING and later steps WAITING', async () => {
    // Create leave application for Ahmad (Teacher)
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empTeacherId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-05-11',
        endDate: '2026-05-12',
        leaveScope: 'FULL_DAY',
        reason: 'Attending science teacher pedagogy seminar',
      },
      'usr-applicant-01'
    );

    expect(app.status).toBe('PENDING_APPROVAL');

    // Fetch Approval Instance
    const instance = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, app.id);
    expect(instance).toBeDefined();
    expect(instance.workflowCode).toBe('WF-ACADEMIC');
    expect(instance.status).toBe('IN_PROGRESS');
    expect(instance.totalSteps).toBe(3);
    expect(instance.currentStepNumber).toBe(1);

    // Verify Steps status: Step 1 is PENDING, Step 2 & 3 are WAITING
    expect(instance.steps[0].stepNumber).toBe(1);
    expect(instance.steps[0].status).toBe('PENDING');
    expect(instance.steps[0].assignedAt).toBeDefined();

    expect(instance.steps[1].stepNumber).toBe(2);
    expect(instance.steps[1].status).toBe('WAITING');
    expect(instance.steps[1].assignedAt).toBeNull();

    expect(instance.steps[2].stepNumber).toBe(3);
    expect(instance.steps[2].status).toBe('WAITING');
    expect(instance.steps[2].assignedAt).toBeNull();
  });

  it('5. Enforces security authorization on approver actions', async () => {
    // Create application for Accounts employee
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empAccountsId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        leaveScope: 'FULL_DAY',
        reason: 'Personal affairs',
      }
    );

    // Step 1 approver role is ACCOUNTS_MANAGER
    // Attempt action by unauthorized user (e.g. TEACHER role)
    await expect(
      LeaveApprovalService.processApproverAction(tenantId, {
        applicationId: app.id,
        actionInput: { action: 'APPROVE', remarks: 'Trying to unauthorizedly approve' },
        actorUserId: 'usr-unauthorized',
        actorRoles: ['TEACHER'],
      })
    ).rejects.toThrow(/not authorized/i);
  });

  it('6. Step-by-Step Approval progression from Step 1 -> Step 2 -> Final Approved', async () => {
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empTeacherId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-07-06',
        endDate: '2026-07-07',
        leaveScope: 'FULL_DAY',
        reason: 'Medical checkup and recovery',
      }
    );

    // Step 1: Academic Incharge Approves
    const resStep1 = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: { action: 'APPROVE', remarks: 'Lecture substitutions arranged' },
      actorUserId: 'usr-incharge',
      actorRoles: ['ACADEMIC_INCHARGE'],
    });

    expect(resStep1.stepStatus).toBe('APPROVED');
    expect(resStep1.applicationStatus).toBe('PENDING_APPROVAL');
    expect(resStep1.instance.currentStepNumber).toBe(2);
    expect(resStep1.instance.steps[0].status).toBe('APPROVED');
    expect(resStep1.instance.steps[1].status).toBe('PENDING'); // Step 2 now active
    expect(resStep1.instance.steps[2].status).toBe('WAITING');

    // Step 2: Principal Approves
    const resStep2 = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: { action: 'APPROVE', remarks: 'Approved by Principal' },
      actorUserId: 'usr-principal',
      actorRoles: ['PRINCIPAL'],
    });

    expect(resStep2.stepStatus).toBe('APPROVED');
    expect(resStep2.instance.currentStepNumber).toBe(3);
    expect(resStep2.instance.steps[1].status).toBe('APPROVED');
    expect(resStep2.instance.steps[2].status).toBe('PENDING'); // Step 3 now active

    // Step 3: HR Final Approval
    const resStep3 = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: { action: 'APPROVE', remarks: 'Final recorded in HR files' },
      actorUserId: 'usr-hr',
      actorRoles: ['HR_MANAGER'],
    });

    expect(resStep3.stepStatus).toBe('APPROVED');
    expect(resStep3.applicationStatus).toBe('APPROVED');
    expect(resStep3.instanceStatus).toBe('APPROVED');

    // Verify Application in DB is marked APPROVED
    const finalApp = await prisma.leaveApplication.findUnique({ where: { id: app.id } });
    expect(finalApp?.status).toBe('APPROVED');

    // Verify action history records all 3 stages + initial
    const finalInstance = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, app.id);
    expect(finalInstance.actionHistory.length).toBe(4); // INITIATED + 3 APPROVED
  });

  it('7. Rejection halts workflow immediately, marks instance REJECTED, and skips future steps', async () => {
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empTeacherId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-08-03',
        endDate: '2026-08-04',
        leaveScope: 'FULL_DAY',
        reason: 'Holiday extension',
      }
    );

    // Step 1: Incharge Rejects
    const resReject = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: { action: 'REJECT', remarks: 'Cannot approve leave during examination preparation days' },
      actorUserId: 'usr-incharge',
      actorRoles: ['ACADEMIC_INCHARGE'],
    });

    expect(resReject.applicationStatus).toBe('REJECTED');
    expect(resReject.instanceStatus).toBe('REJECTED');
    expect(resReject.stepStatus).toBe('REJECTED');

    // Verify future steps (2 and 3) are marked SKIPPED
    expect(resReject.instance.steps[0].status).toBe('REJECTED');
    expect(resReject.instance.steps[1].status).toBe('SKIPPED');
    expect(resReject.instance.steps[2].status).toBe('SKIPPED');

    // Verify DB Application
    const dbApp = await prisma.leaveApplication.findUnique({ where: { id: app.id } });
    expect(dbApp?.status).toBe('REJECTED');
  });

  it('8. Send Back routes application back with instructions while preserving audit trail', async () => {
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empAccountsId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-09-14',
        endDate: '2026-09-15',
        leaveScope: 'FULL_DAY',
        reason: 'Family event',
      }
    );

    // Send Back by Accounts Manager
    const resSendBack = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: { action: 'SEND_BACK', remarks: 'Please coordinate with junior accountant before submitting' },
      actorUserId: 'usr-accounts-mgr',
      actorRoles: ['ACCOUNTS_MANAGER'],
    });

    expect(resSendBack.applicationStatus).toBe('SENT_BACK');
    expect(resSendBack.instanceStatus).toBe('SENT_BACK');
    expect(resSendBack.stepStatus).toBe('SENT_BACK');

    const dbApp = await prisma.leaveApplication.findUnique({ where: { id: app.id } });
    expect(dbApp?.status).toBe('SENT_BACK');
  });

  it('9. Clarification Request / Response workflow cycle', async () => {
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empTeacherId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-10-12',
        endDate: '2026-10-13',
        leaveScope: 'FULL_DAY',
        reason: 'Workshop attendance',
      },
      'usr-teacher-ahmad'
    );

    // Step 1: Incharge requests clarification
    const resInquiry = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: {
        action: 'REQUEST_CLARIFICATION',
        remarks: 'Is this workshop sponsored by the school board or self-funded?',
      },
      actorUserId: 'usr-incharge',
      actorRoles: ['ACADEMIC_INCHARGE'],
    });

    expect(resInquiry.applicationStatus).toBe('CLARIFICATION_REQUIRED');
    expect(resInquiry.stepStatus).toBe('CLARIFICATION_REQUESTED');
    expect(resInquiry.instance.steps[0].clarificationDetails?.question).toContain('sponsored');

    // Step 1 Reply: Applicant responds
    const resReply = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: app.id,
      actionInput: {
        action: 'SUBMIT_CLARIFICATION_RESPONSE',
        clarificationResponse: 'It is sponsored by the provincial board with registration cert attached.',
      },
      actorUserId: 'usr-teacher-ahmad',
      actorRoles: ['TEACHER'],
    });

    expect(resReply.applicationStatus).toBe('PENDING_APPROVAL');
    expect(resReply.stepStatus).toBe('PENDING');
    expect(resReply.instance.steps[0].clarificationDetails?.response).toContain('provincial board');
  });

  it('10. Workflow Snapshot Immutability: Editing master workflow does NOT alter existing submitted request instances', async () => {
    // Create application
    const app = await LeaveApplicationService.createApplication(
      tenantId,
      {
        employeeId: empSpecialId,
        leaveTypeId: casualLeaveTypeId,
        startDate: '2026-11-02',
        endDate: '2026-11-03',
        leaveScope: 'FULL_DAY',
        reason: 'Personal urgent leave',
      }
    );

    const instanceBefore = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, app.id);
    expect(instanceBefore.workflowCode).toBe('WF-SPECIAL-OVERRIDE');
    expect(instanceBefore.totalSteps).toBe(1);

    // Edit Master Workflow WF-SPECIAL-OVERRIDE to have 2 steps
    await LeaveWorkflowService.updateWorkflow(tenantId, specialWorkflowId, {
      name: 'Director Fast-Track Workflow Modified',
      steps: [
        { stepNumber: 1, stepName: 'Step 1 - New Secretary Check', approverType: 'ROLE', approverRole: 'ADMIN' },
        { stepNumber: 2, stepName: 'Step 2 - Director Final', approverType: 'ROLE', approverRole: 'DIRECTOR' },
      ],
    });

    // Re-query historical instance for application
    const instanceAfter = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, app.id);
    // Historical instance MUST remain 1 step with snapshot intact
    expect(instanceAfter.totalSteps).toBe(1);
    expect(instanceAfter.steps.length).toBe(1);
    expect(instanceAfter.steps[0].stepName).toBe('Director Approval');
  });
});
