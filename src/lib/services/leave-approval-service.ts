import { prisma } from '@/lib/db/prisma';
import {
  LeaveRequestApprovalInstanceDto,
  LeaveRequestApprovalStepDto,
  LeaveApprovalActionHistoryDto,
  ApproverActionInputDto,
} from '@/lib/types/leave';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors/app-error';
import { LeaveAuditService } from './leave-audit-service';
import { LeaveWorkflowService } from './leave-workflow-service';
import { LeaveEntitlementService } from './leave-entitlement-service';
import { LeaveAttendanceIntegrationService } from './leave-attendance-integration-service';

export class LeaveApprovalService {
  /**
   * Formats DB Approval Instance to DTO
   */
  public static formatInstanceDto(instance: any): LeaveRequestApprovalInstanceDto {
    const steps: LeaveRequestApprovalStepDto[] = (instance.steps || [])
      .sort((a: any, b: any) => a.stepNumber - b.stepNumber)
      .map((s: any) => ({
        id: s.id,
        instanceId: s.instanceId,
        stepNumber: s.stepNumber,
        stepName: s.stepName,
        approverType: s.approverType,
        approverUserId: s.approverUserId || null,
        approverRole: s.approverRole || null,
        approverDesignationId: s.approverDesignationId || null,
        isRequired: s.isRequired,
        status: s.status,
        assignedAt: s.assignedAt ? s.assignedAt.toISOString() : null,
        actionAt: s.actionAt ? s.actionAt.toISOString() : null,
        actionByUserId: s.actionByUserId || null,
        actionByUserName: s.actionByUser ? s.actionByUser.username : null,
        action: s.action || null,
        remarks: s.remarks || null,
        clarificationDetails: s.clarificationDetails || null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

    const currentPendingStep = steps.find((s) => s.status === 'PENDING' || s.status === 'CLARIFICATION_REQUESTED') || null;

    const actionHistory: LeaveApprovalActionHistoryDto[] = (instance.actionHistory || [])
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((h: any) => ({
        id: h.id,
        instanceId: h.instanceId,
        stepId: h.stepId || null,
        stepNumber: h.stepNumber,
        stepName: h.stepName,
        action: h.action,
        actorUserId: h.actorUserId || null,
        actorName: h.actorName || (h.actor ? h.actor.username : 'System'),
        actorRole: h.actorRole || null,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        remarks: h.remarks || null,
        metadata: h.metadata || null,
        createdAt: h.createdAt.toISOString(),
      }));

    return {
      id: instance.id,
      tenantId: instance.tenantId,
      applicationId: instance.applicationId,
      workflowId: instance.workflowId || null,
      workflowName: instance.workflowName,
      workflowCode: instance.workflowCode,
      workflowSnapshot: instance.workflowSnapshot,
      currentStepNumber: instance.currentStepNumber,
      totalSteps: instance.totalSteps,
      status: instance.status,
      completedAt: instance.completedAt ? instance.completedAt.toISOString() : null,
      steps,
      actionHistory,
      currentPendingStep,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
    };
  }

  /**
   * Initializes or fetches an existing Approval Instance for a Leave Application
   */
  public static async initializeApprovalInstance(
    tenantId: string,
    applicationId: string,
    userId?: string
  ): Promise<LeaveRequestApprovalInstanceDto> {
    const existing = await prisma.leaveRequestApprovalInstance.findUnique({
      where: { applicationId },
      include: {
        steps: { include: { actionByUser: true }, orderBy: { stepNumber: 'asc' } },
        actionHistory: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (existing) {
      return this.formatInstanceDto(existing);
    }

    const application = await prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: { employee: true, leaveType: true },
    });

    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application [${applicationId}] not found.`);
    }

    // Resolve Workflow
    const resolved = await LeaveWorkflowService.resolveWorkflowForApplication(tenantId, {
      employeeId: application.employeeId,
      leaveTypeId: application.leaveTypeId,
      targetDate: application.startDate,
    });

    const workflow = resolved.workflow;
    const activeSteps = workflow.steps.filter((s) => s.isActive);

    if (activeSteps.length === 0) {
      throw new ValidationError(`Resolved workflow "${workflow.name}" has no active steps.`);
    }

    const workflowSnapshot = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowCode: workflow.code,
      version: workflow.version,
      resolutionSource: resolved.source,
      ruleId: resolved.ruleId || null,
      steps: activeSteps,
    };

    const userExists = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    const validUserId = userExists ? userExists.id : null;

    return prisma.$transaction(async (tx) => {
      const instance = await tx.leaveRequestApprovalInstance.create({
        data: {
          tenantId,
          applicationId: application.id,
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowCode: workflow.code,
          workflowSnapshot: workflowSnapshot as any,
          currentStepNumber: 1,
          totalSteps: activeSteps.length,
          status: 'IN_PROGRESS',
          steps: {
            create: activeSteps.map((step, idx) => ({
              tenantId,
              stepNumber: step.stepNumber,
              stepName: step.stepName,
              approverType: step.approverType,
              approverUserId: step.approverUserId || null,
              approverRole: step.approverRole || null,
              approverDesignationId: step.approverDesignationId || null,
              isRequired: step.isRequired,
              status: idx === 0 ? 'PENDING' : 'WAITING',
              assignedAt: idx === 0 ? new Date() : null,
            })),
          },
          actionHistory: {
            create: {
              tenantId,
              stepNumber: 1,
              stepName: activeSteps[0].stepName,
              action: 'INITIATED',
              actorUserId: validUserId,
              actorName: 'System / Applicant',
              previousStatus: 'DRAFT',
              newStatus: 'PENDING',
              remarks: `Application submitted. Routed to ${workflow.name} (Level 1: ${activeSteps[0].stepName})`,
              metadata: { resolutionSource: resolved.source },
            },
          },
        },
        include: {
          steps: { include: { actionByUser: true }, orderBy: { stepNumber: 'asc' } },
          actionHistory: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
        },
      });

      // Update application status to PENDING_APPROVAL if not already
      await tx.leaveApplication.update({
        where: { id: application.id },
        data: { status: 'PENDING_APPROVAL' },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: instance.id,
          action: 'ASSIGNED',
          reason: `Routed Leave Application ${application.applicationNumber} to approval workflow ${workflow.name}`,
          newState: instance as any,
          userId: validUserId,
        },
      });

      return this.formatInstanceDto(instance);
    });
  }

  /**
   * Retrieves approval instance for a leave application
   */
  public static async getApprovalInstanceForApplication(
    tenantId: string,
    applicationId: string
  ): Promise<LeaveRequestApprovalInstanceDto> {
    let instance = await prisma.leaveRequestApprovalInstance.findUnique({
      where: { applicationId },
      include: {
        steps: { include: { actionByUser: true }, orderBy: { stepNumber: 'asc' } },
        actionHistory: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!instance || instance.tenantId !== tenantId) {
      // Auto-initialize if application exists and is submitted/pending
      const app = await prisma.leaveApplication.findUnique({ where: { id: applicationId } });
      if (app && app.tenantId === tenantId) {
        return this.initializeApprovalInstance(tenantId, applicationId);
      }
      throw new NotFoundError(`Approval instance for application [${applicationId}] not found.`);
    }

    return this.formatInstanceDto(instance);
  }

  /**
   * Retrieves pending approvals for Approval Inbox
   */
  public static async getPendingApprovals(
    tenantId: string,
    options?: {
      onlyActionable?: boolean;
      approverUserId?: string;
      approverRoles?: string[];
      approverDesignationId?: string;
      employeeId?: string;
      departmentId?: string;
      leaveTypeId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = {
      tenantId,
      status: options?.status || { in: ['PENDING_APPROVAL', 'CLARIFICATION_REQUIRED', 'SENT_BACK'] },
    };

    if (options?.employeeId) {
      where.employeeId = options.employeeId;
    }
    if (options?.departmentId) {
      where.employee = { departmentId: options.departmentId };
    }
    if (options?.leaveTypeId) {
      where.leaveTypeId = options.leaveTypeId;
    }
    if (options?.search && options.search.trim()) {
      const s = options.search.trim();
      where.OR = [
        { applicationNumber: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { employee: { firstNameEn: { contains: s, mode: 'insensitive' } } },
        { employee: { lastNameEn: { contains: s, mode: 'insensitive' } } },
        { employee: { employeeNo: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const applications = await prisma.leaveApplication.findMany({
      where,
      include: {
        employee: {
          include: { department: true, designation: true, employmentType: true },
        },
        leaveType: true,
        leavePolicy: true,
        applicant: true,
        approvalInstance: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            actionHistory: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    // Ensure all pending applications have active approval instances
    for (const app of applications) {
      if (!app.approvalInstance) {
        try {
          await this.initializeApprovalInstance(tenantId, app.id);
          const reloaded = await prisma.leaveRequestApprovalInstance.findUnique({
            where: { applicationId: app.id },
            include: {
              steps: { orderBy: { stepNumber: 'asc' } },
              actionHistory: { orderBy: { createdAt: 'asc' } },
            },
          });
          if (reloaded) {
            app.approvalInstance = reloaded as any;
          }
        } catch (err: any) {
          console.warn(`Auto-initialization of approval instance for ${app.applicationNumber} failed:`, err.message);
        }
      }
    }

    const items = applications.map((app) => {
      const instance = app.approvalInstance;
      const currentStep = instance?.steps.find((s) => s.status === 'PENDING' || s.status === 'CLARIFICATION_REQUESTED') || null;

      // Check if current user is an authorized approver for this item
      let isActionableByCurrentUser = false;
      if (currentStep) {
        if (options?.approverRoles?.includes('SUPER_ADMIN') || options?.approverRoles?.includes('ADMIN')) {
          isActionableByCurrentUser = true;
        } else if (currentStep.approverType === 'USER' && currentStep.approverUserId === options?.approverUserId) {
          isActionableByCurrentUser = true;
        } else if (
          currentStep.approverType === 'ROLE' &&
          currentStep.approverRole &&
          options?.approverRoles?.includes(currentStep.approverRole)
        ) {
          isActionableByCurrentUser = true;
        } else if (
          currentStep.approverType === 'DESIGNATION' &&
          currentStep.approverDesignationId === options?.approverDesignationId
        ) {
          isActionableByCurrentUser = true;
        }
      }

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        employeeId: app.employeeId,
        employeeNo: app.employee.employeeNo,
        employeeName: `${app.employee.firstNameEn} ${app.employee.lastNameEn || ''}`.trim(),
        departmentName: app.employee.department?.name || 'General',
        designationName: app.employee.designation?.name || 'Staff',
        leaveTypeId: app.leaveTypeId,
        leaveTypeName: app.leaveType.name,
        leaveTypeCode: app.leaveType.code,
        isPaid: app.isPaid,
        leaveScope: app.leaveScope,
        startDate: app.startDate.toISOString().split('T')[0],
        endDate: app.endDate.toISOString().split('T')[0],
        requestedDays: Number(app.requestedDays),
        workingDaysCount: app.workingDaysCount,
        status: app.status,
        reason: app.reason,
        submittedAt: app.submittedAt ? app.submittedAt.toISOString() : app.createdAt.toISOString(),
        currentStepNumber: currentStep?.stepNumber || instance?.currentStepNumber || 1,
        totalSteps: instance?.totalSteps || 1,
        currentStepName: currentStep?.stepName || 'Pending Review',
        pendingApproverRole: currentStep?.approverRole || null,
        pendingApproverUserId: currentStep?.approverUserId || null,
        isActionableByCurrentUser,
        workflowName: instance?.workflowName || 'Default Workflow',
      };
    });

    const finalItems = options?.onlyActionable
      ? items.filter((i) => i.isActionableByCurrentUser)
      : items;

    return {
      total: finalItems.length,
      items: finalItems,
    };
  }

  /**
   * CORE APPROVER ACTION ENGINE:
   * Executes APPROVE, REJECT, SEND_BACK, or REQUEST_CLARIFICATION on the active approval step.
   */
  public static async processApproverAction(
    tenantId: string,
    params: {
      applicationId: string;
      actionInput: ApproverActionInputDto;
      actorUserId?: string;
      actorRoles?: string[];
      actorDesignationId?: string;
    }
  ): Promise<{
    applicationStatus: string;
    instanceStatus: string;
    stepStatus: string;
    message: string;
    instance: LeaveRequestApprovalInstanceDto;
  }> {
    const { applicationId, actionInput, actorUserId, actorRoles, actorDesignationId } = params;

    const application = await prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        employee: { include: { department: true, designation: true } },
        leaveType: true,
        approvalInstance: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            actionHistory: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application [${applicationId}] not found.`);
    }

    let instance = application.approvalInstance;
    if (!instance) {
      await this.initializeApprovalInstance(tenantId, applicationId, actorUserId);
      instance = await prisma.leaveRequestApprovalInstance.findUnique({
        where: { applicationId },
        include: {
          steps: { orderBy: { stepNumber: 'asc' } },
          actionHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    if (!instance) {
      throw new NotFoundError(`Approval workflow instance for [${applicationId}] could not be found or initialized.`);
    }

    if (instance.status === 'APPROVED' || instance.status === 'REJECTED' || instance.status === 'CANCELLED') {
      throw new ValidationError(`Cannot perform actions on a completed approval instance (Status: ${instance.status}).`);
    }

    // Find current pending step
    const steps = instance.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    const currentStep = steps.find((s) => s.status === 'PENDING' || s.status === 'CLARIFICATION_REQUESTED');

    if (!currentStep) {
      throw new ValidationError('No actionable pending approval step found on this application.');
    }

    // AUTHORIZATION VALIDATION
    const isSuperAdmin = actorRoles?.includes('SUPER_ADMIN') || actorRoles?.includes('ADMIN');
    let isAuthorized = isSuperAdmin;

    if (!isAuthorized) {
      if (currentStep.approverType === 'USER' && currentStep.approverUserId === actorUserId) {
        isAuthorized = true;
      } else if (
        currentStep.approverType === 'ROLE' &&
        currentStep.approverRole &&
        actorRoles?.includes(currentStep.approverRole)
      ) {
        isAuthorized = true;
      } else if (
        currentStep.approverType === 'DESIGNATION' &&
        currentStep.approverDesignationId === actorDesignationId
      ) {
        isAuthorized = true;
      }
    }

    // Allow applicant / employee to submit clarification response
    if (actionInput.action === 'SUBMIT_CLARIFICATION_RESPONSE') {
      if (
        application.applicantUserId === actorUserId ||
        application.employeeId === actorUserId ||
        isSuperAdmin ||
        !application.applicantUserId
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenError(
        `You are not authorized to perform action on Step ${currentStep.stepNumber} ("${currentStep.stepName}").`
      );
    }

    const actorUser = actorUserId
      ? await prisma.user.findUnique({ where: { id: actorUserId } })
      : null;
    const validActorUserId = actorUser ? actorUser.id : null;
    const actorName = actorUser ? actorUser.username : (isSuperAdmin ? 'Administrator' : 'Approver');
    const actorRole = actorRoles?.[0] || 'APPROVER';
    const actionDate = new Date();

    return prisma.$transaction(async (tx) => {
      let finalAppStatus = application.status;
      let finalInstanceStatus = instance.status;
      let stepNewStatus = currentStep.status;
      let actionMessage = '';

      if (actionInput.action === 'APPROVE') {
        stepNewStatus = 'APPROVED';
        await tx.leaveRequestApprovalStep.update({
          where: { id: currentStep.id },
          data: {
            status: 'APPROVED',
            actionAt: actionDate,
            actionByUserId: validActorUserId,
            action: 'APPROVE',
            remarks: actionInput.remarks ? actionInput.remarks.trim() : null,
          },
        });

        // Check for next step
        const nextStep = steps.find((s) => s.stepNumber === currentStep.stepNumber + 1);
        if (nextStep) {
          // Advance to next step
          await tx.leaveRequestApprovalStep.update({
            where: { id: nextStep.id },
            data: {
              status: 'PENDING',
              assignedAt: actionDate,
            },
          });

          await tx.leaveRequestApprovalInstance.update({
            where: { id: instance.id },
            data: {
              currentStepNumber: nextStep.stepNumber,
            },
          });

          finalInstanceStatus = 'IN_PROGRESS';
          finalAppStatus = 'PENDING_APPROVAL';
          actionMessage = `Step ${currentStep.stepNumber} approved. Advanced to Step ${nextStep.stepNumber} ("${nextStep.stepName}").`;
        } else {
          // Final Approval
          finalInstanceStatus = 'APPROVED';
          finalAppStatus = 'APPROVED';

          await tx.leaveRequestApprovalInstance.update({
            where: { id: instance.id },
            data: {
              status: 'APPROVED',
              completedAt: actionDate,
            },
          });

          await tx.leaveApplication.update({
            where: { id: application.id },
            data: {
              status: 'APPROVED',
            },
          });

          // Post to Entitlement Ledger transactionally
          await LeaveEntitlementService.recordLeaveUsageInTx(
            tx,
            tenantId,
            application.id,
            validActorUserId
          );

          // Integrate with Employee Attendance transactionally
          await LeaveAttendanceIntegrationService.integrateApprovedLeaveWithAttendanceInTx(
            tx,
            tenantId,
            application.id,
            validActorUserId
          );

          actionMessage = `Application ${application.applicationNumber} has been fully APPROVED, deducted from entitlement ledger, and integrated with attendance.`;
        }

        // Record History
        await tx.leaveApprovalActionHistory.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: currentStep.id,
            stepNumber: currentStep.stepNumber,
            stepName: currentStep.stepName,
            action: nextStep ? 'APPROVED' : 'FINAL_APPROVED',
            actorUserId: validActorUserId,
            actorName,
            actorRole,
            previousStatus: 'PENDING',
            newStatus: 'APPROVED',
            remarks: actionInput.remarks ? actionInput.remarks.trim() : 'Approved',
          },
        });
      } else if (actionInput.action === 'REJECT') {
        if (!actionInput.remarks || !actionInput.remarks.trim()) {
          throw new ValidationError('Remarks are mandatory when rejecting a leave application.');
        }

        stepNewStatus = 'REJECTED';
        finalInstanceStatus = 'REJECTED';
        finalAppStatus = 'REJECTED';

        await tx.leaveRequestApprovalStep.update({
          where: { id: currentStep.id },
          data: {
            status: 'REJECTED',
            actionAt: actionDate,
            actionByUserId: validActorUserId,
            action: 'REJECT',
            remarks: actionInput.remarks.trim(),
          },
        });

        // Skip subsequent waiting steps
        await tx.leaveRequestApprovalStep.updateMany({
          where: {
            instanceId: instance.id,
            stepNumber: { gt: currentStep.stepNumber },
          },
          data: { status: 'SKIPPED' },
        });

        await tx.leaveRequestApprovalInstance.update({
          where: { id: instance.id },
          data: {
            status: 'REJECTED',
            completedAt: actionDate,
          },
        });

        await tx.leaveApplication.update({
          where: { id: application.id },
          data: { status: 'REJECTED' },
        });

        actionMessage = `Application ${application.applicationNumber} has been REJECTED at Step ${currentStep.stepNumber}.`;

        await tx.leaveApprovalActionHistory.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: currentStep.id,
            stepNumber: currentStep.stepNumber,
            stepName: currentStep.stepName,
            action: 'REJECTED',
            actorUserId: validActorUserId,
            actorName,
            actorRole,
            previousStatus: 'PENDING',
            newStatus: 'REJECTED',
            remarks: actionInput.remarks.trim(),
          },
        });
      } else if (actionInput.action === 'SEND_BACK') {
        if (!actionInput.remarks || !actionInput.remarks.trim()) {
          throw new ValidationError('Remarks are mandatory when sending back a leave application.');
        }

        stepNewStatus = 'SENT_BACK';
        finalInstanceStatus = 'SENT_BACK';
        finalAppStatus = 'SENT_BACK';

        await tx.leaveRequestApprovalStep.update({
          where: { id: currentStep.id },
          data: {
            status: 'SENT_BACK',
            actionAt: actionDate,
            actionByUserId: validActorUserId,
            action: 'SEND_BACK',
            remarks: actionInput.remarks.trim(),
          },
        });

        await tx.leaveRequestApprovalInstance.update({
          where: { id: instance.id },
          data: { status: 'SENT_BACK' },
        });

        await tx.leaveApplication.update({
          where: { id: application.id },
          data: { status: 'SENT_BACK' },
        });

        actionMessage = `Application ${application.applicationNumber} sent back for revision: ${actionInput.remarks.trim()}`;

        await tx.leaveApprovalActionHistory.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: currentStep.id,
            stepNumber: currentStep.stepNumber,
            stepName: currentStep.stepName,
            action: 'SENT_BACK',
            actorUserId: validActorUserId,
            actorName,
            actorRole,
            previousStatus: 'PENDING',
            newStatus: 'SENT_BACK',
            remarks: actionInput.remarks.trim(),
          },
        });
      } else if (actionInput.action === 'REQUEST_CLARIFICATION') {
        if (!actionInput.remarks || !actionInput.remarks.trim()) {
          throw new ValidationError('Question / clarification details are required.');
        }

        stepNewStatus = 'CLARIFICATION_REQUESTED';
        finalInstanceStatus = 'CLARIFICATION_REQUIRED';
        finalAppStatus = 'CLARIFICATION_REQUIRED';

        const clarificationDetails = {
          question: actionInput.remarks.trim(),
          askedBy: actorUserId || null,
          askedByName: actorName,
          askedAt: actionDate.toISOString(),
        };

        await tx.leaveRequestApprovalStep.update({
          where: { id: currentStep.id },
          data: {
            status: 'CLARIFICATION_REQUESTED',
            action: 'REQUEST_CLARIFICATION',
            remarks: actionInput.remarks.trim(),
            clarificationDetails: clarificationDetails as any,
          },
        });

        await tx.leaveRequestApprovalInstance.update({
          where: { id: instance.id },
          data: { status: 'CLARIFICATION_REQUIRED' },
        });

        await tx.leaveApplication.update({
          where: { id: application.id },
          data: { status: 'CLARIFICATION_REQUIRED' },
        });

        actionMessage = `Clarification requested: "${actionInput.remarks.trim()}"`;

        await tx.leaveApprovalActionHistory.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: currentStep.id,
            stepNumber: currentStep.stepNumber,
            stepName: currentStep.stepName,
            action: 'CLARIFICATION_REQUESTED',
            actorUserId: validActorUserId,
            actorName,
            actorRole,
            previousStatus: 'PENDING',
            newStatus: 'CLARIFICATION_REQUESTED',
            remarks: actionInput.remarks.trim(),
            metadata: clarificationDetails,
          },
        });
      } else if (actionInput.action === 'SUBMIT_CLARIFICATION_RESPONSE') {
        if (!actionInput.clarificationResponse || !actionInput.clarificationResponse.trim()) {
          throw new ValidationError('Clarification response cannot be empty.');
        }

        stepNewStatus = 'PENDING';
        finalInstanceStatus = 'IN_PROGRESS';
        finalAppStatus = 'PENDING_APPROVAL';

        const existingDetails = (currentStep.clarificationDetails as any) || {};
        const updatedDetails = {
          ...existingDetails,
          response: actionInput.clarificationResponse.trim(),
          respondedBy: actorUserId || null,
          respondedByName: actorName,
          respondedAt: actionDate.toISOString(),
        };

        await tx.leaveRequestApprovalStep.update({
          where: { id: currentStep.id },
          data: {
            status: 'PENDING',
            clarificationDetails: updatedDetails as any,
          },
        });

        await tx.leaveRequestApprovalInstance.update({
          where: { id: instance.id },
          data: { status: 'IN_PROGRESS' },
        });

        await tx.leaveApplication.update({
          where: { id: application.id },
          data: { status: 'PENDING_APPROVAL' },
        });

        actionMessage = `Clarification response submitted: "${actionInput.clarificationResponse.trim()}"`;

        await tx.leaveApprovalActionHistory.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: currentStep.id,
            stepNumber: currentStep.stepNumber,
            stepName: currentStep.stepName,
            action: 'CLARIFICATION_RESPONDED',
            actorUserId: validActorUserId,
            actorName,
            actorRole,
            previousStatus: 'CLARIFICATION_REQUESTED',
            newStatus: 'PENDING',
            remarks: actionInput.clarificationResponse.trim(),
            metadata: updatedDetails,
          },
        });
      }

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: instance.id,
          action: actionInput.action === 'APPROVE' ? 'ALLOCATED' : 'ADJUSTED',
          reason: `Approver action [${actionInput.action}] on application ${application.applicationNumber} at Step ${currentStep.stepNumber}`,
          userId: validActorUserId,
        },
      });

      const freshInstance = await tx.leaveRequestApprovalInstance.findUnique({
        where: { id: instance.id },
        include: {
          steps: { include: { actionByUser: true }, orderBy: { stepNumber: 'asc' } },
          actionHistory: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
        },
      });

      return {
        applicationStatus: finalAppStatus,
        instanceStatus: finalInstanceStatus,
        stepStatus: stepNewStatus,
        message: actionMessage,
        instance: this.formatInstanceDto(freshInstance),
      };
    });
  }
}
