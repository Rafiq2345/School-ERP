import { prisma } from '@/lib/db/prisma';
import {
  LeaveApprovalWorkflowDto,
  CreateLeaveApprovalWorkflowDto,
  UpdateLeaveApprovalWorkflowDto,
  LeaveApprovalWorkflowRuleDto,
  CreateLeaveApprovalWorkflowRuleDto,
  CreateLeaveApprovalWorkflowStepDto,
} from '@/lib/types/leave';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors/app-error';
import { LeaveAuditService } from './leave-audit-service';

export class LeaveWorkflowService {
  /**
   * Normalizes a date to UTC midnight
   */
  public static normalizeDate(d: string | Date): Date {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) throw new ValidationError(`Invalid date: ${d}`);
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0));
  }

  /**
   * Formats a Date to YYYY-MM-DD string
   */
  public static formatDateString(d: Date | string): string {
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  }

  /**
   * Validates ordered workflow steps
   */
  private static validateWorkflowSteps(steps: CreateLeaveApprovalWorkflowStepDto[]): void {
    if (!steps || steps.length === 0) {
      throw new ValidationError('A leave approval workflow must contain at least one step.');
    }

    const activeSteps = steps.filter((s) => s.isActive !== false);
    if (activeSteps.length === 0) {
      throw new ValidationError('A leave approval workflow must contain at least one active step.');
    }

    const stepNumbers = new Set<number>();
    for (const step of steps) {
      if (!step.stepName || !step.stepName.trim()) {
        throw new ValidationError(`Step name is required for step number ${step.stepNumber}.`);
      }
      if (step.stepNumber < 1) {
        throw new ValidationError(`Step number must be >= 1. Received ${step.stepNumber}.`);
      }
      if (stepNumbers.has(step.stepNumber)) {
        throw new ValidationError(`Duplicate step number ${step.stepNumber} detected in workflow.`);
      }
      stepNumbers.add(step.stepNumber);

      // Validate approver source
      if (step.approverType === 'USER' && !step.approverUserId) {
        throw new ValidationError(`Step ${step.stepNumber} ("${step.stepName}") requires a specific User ID.`);
      }
      if (step.approverType === 'ROLE' && !step.approverRole) {
        throw new ValidationError(`Step ${step.stepNumber} ("${step.stepName}") requires an Approver Role.`);
      }
      if (step.approverType === 'DESIGNATION' && !step.approverDesignationId) {
        throw new ValidationError(`Step ${step.stepNumber} ("${step.stepName}") requires an Approver Designation ID.`);
      }
    }
  }

  /**
   * Formats DB LeaveApprovalWorkflow to DTO
   */
  public static formatWorkflowDto(workflow: any): LeaveApprovalWorkflowDto {
    return {
      id: workflow.id,
      tenantId: workflow.tenantId,
      name: workflow.name,
      code: workflow.code,
      description: workflow.description || null,
      isActive: workflow.isActive,
      isDefault: workflow.isDefault,
      effectiveFrom: this.formatDateString(workflow.effectiveFrom),
      effectiveTo: workflow.effectiveTo ? this.formatDateString(workflow.effectiveTo) : null,
      version: workflow.version || 1,
      createdByUserId: workflow.createdByUserId || null,
      rulesCount: workflow.rules?.length || 0,
      stepsCount: workflow.steps?.length || 0,
      rules: (workflow.rules || []).map((r: any) => this.formatRuleDto(r)),
      steps: (workflow.steps || [])
        .sort((a: any, b: any) => a.stepNumber - b.stepNumber)
        .map((s: any) => ({
          id: s.id,
          workflowId: s.workflowId,
          stepNumber: s.stepNumber,
          stepName: s.stepName,
          approverType: s.approverType,
          approverUserId: s.approverUserId || null,
          approverUserName: s.approverUser ? `${s.approverUser.username}` : null,
          approverRole: s.approverRole || null,
          approverDesignationId: s.approverDesignationId || null,
          approverDesignationName: s.approverDesignation?.name || null,
          isRequired: s.isRequired,
          autoApproveAfterDays: s.autoApproveAfterDays || null,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  /**
   * Formats DB Rule to DTO
   */
  public static formatRuleDto(rule: any): LeaveApprovalWorkflowRuleDto {
    return {
      id: rule.id,
      workflowId: rule.workflowId,
      assignmentType: rule.assignmentType,
      employeeId: rule.employeeId || null,
      employeeName: rule.employee ? `${rule.employee.firstNameEn} ${rule.employee.lastNameEn || ''}`.trim() : null,
      employeeNo: rule.employee?.employeeNo || null,
      departmentId: rule.departmentId || null,
      departmentName: rule.department?.name || null,
      designationId: rule.designationId || null,
      designationName: rule.designation?.name || null,
      employmentTypeId: rule.employmentTypeId || null,
      employmentTypeName: rule.employmentType?.name || null,
      leaveTypeId: rule.leaveTypeId || null,
      leaveTypeName: rule.leaveType?.name || null,
      isOverride: rule.isOverride,
      priority: rule.priority || 100,
      effectiveFrom: this.formatDateString(rule.effectiveFrom),
      effectiveTo: rule.effectiveTo ? this.formatDateString(rule.effectiveTo) : null,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves all Approval Workflows for tenant
   */
  public static async getWorkflows(
    tenantId: string,
    options?: { isActive?: boolean; search?: string }
  ): Promise<LeaveApprovalWorkflowDto[]> {
    const where: any = { tenantId };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.search && options.search.trim()) {
      const s = options.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const workflows = await prisma.leaveApprovalWorkflow.findMany({
      where,
      include: {
        rules: {
          include: {
            employee: true,
            department: true,
            designation: true,
            employmentType: true,
            leaveType: true,
          },
        },
        steps: {
          include: {
            approverUser: true,
            approverDesignation: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return workflows.map((w) => this.formatWorkflowDto(w));
  }

  /**
   * Retrieves a single Approval Workflow by ID
   */
  public static async getWorkflowById(tenantId: string, id: string): Promise<LeaveApprovalWorkflowDto> {
    const workflow = await prisma.leaveApprovalWorkflow.findUnique({
      where: { id },
      include: {
        rules: {
          include: {
            employee: true,
            department: true,
            designation: true,
            employmentType: true,
            leaveType: true,
          },
        },
        steps: {
          include: {
            approverUser: true,
            approverDesignation: true,
          },
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!workflow || workflow.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Approval Workflow with ID [${id}] not found.`);
    }

    return this.formatWorkflowDto(workflow);
  }

  /**
   * Creates a new Approval Workflow with its steps and optional applicability rules
   */
  public static async createWorkflow(
    tenantId: string,
    data: CreateLeaveApprovalWorkflowDto,
    userId?: string
  ): Promise<LeaveApprovalWorkflowDto> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Workflow name is required.');
    }
    if (!data.code || !data.code.trim()) {
      throw new ValidationError('Workflow code is required.');
    }

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();

    // Check code uniqueness
    const existing = await prisma.leaveApprovalWorkflow.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (existing) {
      throw new ConflictError(`A leave approval workflow with code [${code}] already exists.`);
    }

    this.validateWorkflowSteps(data.steps);

    const effectiveFrom = data.effectiveFrom ? this.normalizeDate(data.effectiveFrom) : this.normalizeDate(new Date());
    const effectiveTo = data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null;

    return prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await tx.leaveApprovalWorkflow.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.leaveApprovalWorkflow.create({
        data: {
          tenantId,
          name,
          code,
          description: data.description ? data.description.trim() : null,
          isActive: data.isActive ?? true,
          isDefault: Boolean(data.isDefault),
          effectiveFrom,
          effectiveTo,
          version: 1,
          createdByUserId: userId || null,
          steps: {
            create: data.steps.map((s) => ({
              tenantId,
              stepNumber: s.stepNumber,
              stepName: s.stepName.trim(),
              approverType: s.approverType,
              approverUserId: s.approverUserId || null,
              approverRole: s.approverRole ? s.approverRole.trim().toUpperCase() : null,
              approverDesignationId: s.approverDesignationId || null,
              isRequired: s.isRequired ?? true,
              autoApproveAfterDays: s.autoApproveAfterDays || null,
              isActive: s.isActive ?? true,
            })),
          },
          ...(data.rules && data.rules.length > 0
            ? {
                rules: {
                  create: data.rules.map((r) => ({
                    tenantId,
                    assignmentType: r.assignmentType,
                    employeeId: r.employeeId || null,
                    departmentId: r.departmentId || null,
                    designationId: r.designationId || null,
                    employmentTypeId: r.employmentTypeId || null,
                    leaveTypeId: r.leaveTypeId || null,
                    isOverride: Boolean(r.isOverride),
                    priority: r.priority || 100,
                    effectiveFrom: r.effectiveFrom ? this.normalizeDate(r.effectiveFrom) : effectiveFrom,
                    effectiveTo: r.effectiveTo ? this.normalizeDate(r.effectiveTo) : null,
                    isActive: r.isActive ?? true,
                  })),
                },
              }
            : {}),
        },
        include: {
          rules: {
            include: {
              employee: true,
              department: true,
              designation: true,
              employmentType: true,
              leaveType: true,
            },
          },
          steps: {
            include: {
              approverUser: true,
              approverDesignation: true,
            },
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: created.id,
          action: 'CREATED',
          reason: `Created Leave Approval Workflow: ${created.name} (${created.code}) with ${created.steps.length} steps`,
          newState: created as any,
          userId: userId || null,
        },
      });

      return this.formatWorkflowDto(created);
    });
  }

  /**
   * Updates an existing Approval Workflow
   */
  public static async updateWorkflow(
    tenantId: string,
    id: string,
    data: UpdateLeaveApprovalWorkflowDto,
    userId?: string
  ): Promise<LeaveApprovalWorkflowDto> {
    const existing = await prisma.leaveApprovalWorkflow.findUnique({
      where: { id },
      include: { rules: true, steps: true },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Approval Workflow with ID [${id}] not found.`);
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const code = data.code.trim().toUpperCase();
      const codeCheck = await prisma.leaveApprovalWorkflow.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new ConflictError(`Workflow with code [${code}] already exists.`);
      }
    }

    if (data.steps) {
      this.validateWorkflowSteps(data.steps);
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.leaveApprovalWorkflow.updateMany({
          where: { tenantId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      // If updating steps, recreate them
      if (data.steps) {
        await tx.leaveApprovalWorkflowStep.deleteMany({ where: { workflowId: id } });
      }

      const updated = await tx.leaveApprovalWorkflow.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.effectiveFrom ? { effectiveFrom: this.normalizeDate(data.effectiveFrom) } : {}),
          ...(data.effectiveTo !== undefined
            ? { effectiveTo: data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null }
            : {}),
          version: existing.version + 1,
          ...(data.steps
            ? {
                steps: {
                  create: data.steps.map((s) => ({
                    tenantId,
                    stepNumber: s.stepNumber,
                    stepName: s.stepName.trim(),
                    approverType: s.approverType,
                    approverUserId: s.approverUserId || null,
                    approverRole: s.approverRole ? s.approverRole.trim().toUpperCase() : null,
                    approverDesignationId: s.approverDesignationId || null,
                    isRequired: s.isRequired ?? true,
                    autoApproveAfterDays: s.autoApproveAfterDays || null,
                    isActive: s.isActive ?? true,
                  })),
                },
              }
            : {}),
        },
        include: {
          rules: {
            include: {
              employee: true,
              department: true,
              designation: true,
              employmentType: true,
              leaveType: true,
            },
          },
          steps: {
            include: {
              approverUser: true,
              approverDesignation: true,
            },
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_POLICY',
          entityId: updated.id,
          action: 'UPDATED',
          reason: `Updated Leave Approval Workflow: ${updated.name} (Version ${updated.version})`,
          previousState: existing as any,
          newState: updated as any,
          userId: userId || null,
        },
      });

      return this.formatWorkflowDto(updated);
    });
  }

  /**
   * Adds an applicability rule to a workflow
   */
  public static async addWorkflowRule(
    tenantId: string,
    workflowId: string,
    data: CreateLeaveApprovalWorkflowRuleDto,
    userId?: string
  ): Promise<LeaveApprovalWorkflowRuleDto> {
    const workflow = await prisma.leaveApprovalWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow || workflow.tenantId !== tenantId) {
      throw new NotFoundError(`Workflow with ID [${workflowId}] not found.`);
    }

    const created = await prisma.leaveApprovalWorkflowRule.create({
      data: {
        tenantId,
        workflowId,
        assignmentType: data.assignmentType,
        employeeId: data.employeeId || null,
        departmentId: data.departmentId || null,
        designationId: data.designationId || null,
        employmentTypeId: data.employmentTypeId || null,
        leaveTypeId: data.leaveTypeId || null,
        isOverride: Boolean(data.isOverride),
        priority: data.priority || 100,
        effectiveFrom: data.effectiveFrom ? this.normalizeDate(data.effectiveFrom) : this.normalizeDate(new Date()),
        effectiveTo: data.effectiveTo ? this.normalizeDate(data.effectiveTo) : null,
        isActive: data.isActive ?? true,
      },
      include: {
        employee: true,
        department: true,
        designation: true,
        employmentType: true,
        leaveType: true,
      },
    });

    await prisma.leaveAuditLog.create({
      data: {
        tenantId,
        entityType: 'LEAVE_POLICY',
        entityId: created.id,
        action: 'ASSIGNED',
        reason: `Added applicability rule to workflow ${workflow.name}: ${created.assignmentType}`,
        newState: created as any,
        userId: userId || null,
      },
    });

    return this.formatRuleDto(created);
  }

  /**
   * Deletes a workflow rule
   */
  public static async deleteWorkflowRule(tenantId: string, ruleId: string, userId?: string): Promise<boolean> {
    const rule = await prisma.leaveApprovalWorkflowRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.tenantId !== tenantId) {
      throw new NotFoundError(`Rule with ID [${ruleId}] not found.`);
    }

    await prisma.leaveApprovalWorkflowRule.delete({ where: { id: ruleId } });

    await prisma.leaveAuditLog.create({
      data: {
        tenantId,
        entityType: 'LEAVE_POLICY',
        entityId: ruleId,
        action: 'DEACTIVATED',
        reason: `Deleted workflow applicability rule [${ruleId}]`,
        previousState: rule as any,
        userId: userId || null,
      },
    });

    return true;
  }

  /**
   * DYNAMIC WORKFLOW RESOLUTION ENGINE:
   * Resolves the effective Approval Workflow for an employee application using 6-level precedence:
   * 1. Individual Employee Override (isOverride: true)
   * 2. Direct Employee Assignment
   * 3. Department Assignment
   * 4. Designation Assignment
   * 5. Employment Type Assignment
   * 6. Leave Type Specific Rule
   * 7. Institutional Default Workflow
   */
  public static async resolveWorkflowForApplication(
    tenantId: string,
    params: {
      employeeId: string;
      leaveTypeId?: string;
      targetDate?: string | Date;
    }
  ): Promise<{
    workflow: LeaveApprovalWorkflowDto;
    source:
      | 'INDIVIDUAL_OVERRIDE'
      | 'DIRECT_EMPLOYEE'
      | 'DEPARTMENT'
      | 'DESIGNATION'
      | 'EMPLOYMENT_TYPE'
      | 'LEAVE_TYPE'
      | 'INSTITUTIONAL_DEFAULT';
    ruleId?: string;
  }> {
    const date = params.targetDate ? this.normalizeDate(params.targetDate) : this.normalizeDate(new Date());

    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
      include: { department: true, designation: true, employmentType: true },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new NotFoundError(`Employee [${params.employeeId}] not found.`);
    }

    // Level 1: Individual Employee Override
    const empOverrideRule = await prisma.leaveApprovalWorkflowRule.findFirst({
      where: {
        tenantId,
        isActive: true,
        isOverride: true,
        employeeId: employee.id,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        ...(params.leaveTypeId ? { OR: [{ leaveTypeId: null }, { leaveTypeId: params.leaveTypeId }] } : {}),
      },
      include: {
        workflow: {
          include: {
            rules: true,
            steps: {
              include: { approverUser: true, approverDesignation: true },
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
      orderBy: [{ leaveTypeId: 'desc' }, { priority: 'asc' }],
    });

    if (empOverrideRule?.workflow && empOverrideRule.workflow.isActive) {
      return {
        workflow: this.formatWorkflowDto(empOverrideRule.workflow),
        source: 'INDIVIDUAL_OVERRIDE',
        ruleId: empOverrideRule.id,
      };
    }

    // Level 2: Direct Employee Assignment
    const empDirectRule = await prisma.leaveApprovalWorkflowRule.findFirst({
      where: {
        tenantId,
        isActive: true,
        isOverride: false,
        assignmentType: 'EMPLOYEE',
        employeeId: employee.id,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        ...(params.leaveTypeId ? { OR: [{ leaveTypeId: null }, { leaveTypeId: params.leaveTypeId }] } : {}),
      },
      include: {
        workflow: {
          include: {
            rules: true,
            steps: {
              include: { approverUser: true, approverDesignation: true },
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
      orderBy: [{ leaveTypeId: 'desc' }, { priority: 'asc' }],
    });

    if (empDirectRule?.workflow && empDirectRule.workflow.isActive) {
      return {
        workflow: this.formatWorkflowDto(empDirectRule.workflow),
        source: 'DIRECT_EMPLOYEE',
        ruleId: empDirectRule.id,
      };
    }

    // Level 3: Department Assignment
    if (employee.departmentId) {
      const deptRule = await prisma.leaveApprovalWorkflowRule.findFirst({
        where: {
          tenantId,
          isActive: true,
          assignmentType: 'DEPARTMENT',
          departmentId: employee.departmentId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          ...(params.leaveTypeId ? { OR: [{ leaveTypeId: null }, { leaveTypeId: params.leaveTypeId }] } : {}),
        },
        include: {
          workflow: {
            include: {
              rules: true,
              steps: {
                include: { approverUser: true, approverDesignation: true },
                orderBy: { stepNumber: 'asc' },
              },
            },
          },
        },
        orderBy: [{ leaveTypeId: 'desc' }, { priority: 'asc' }],
      });

      if (deptRule?.workflow && deptRule.workflow.isActive) {
        return {
          workflow: this.formatWorkflowDto(deptRule.workflow),
          source: 'DEPARTMENT',
          ruleId: deptRule.id,
        };
      }
    }

    // Level 4: Designation Assignment
    if (employee.designationId) {
      const desigRule = await prisma.leaveApprovalWorkflowRule.findFirst({
        where: {
          tenantId,
          isActive: true,
          assignmentType: 'DESIGNATION',
          designationId: employee.designationId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          ...(params.leaveTypeId ? { OR: [{ leaveTypeId: null }, { leaveTypeId: params.leaveTypeId }] } : {}),
        },
        include: {
          workflow: {
            include: {
              rules: true,
              steps: {
                include: { approverUser: true, approverDesignation: true },
                orderBy: { stepNumber: 'asc' },
              },
            },
          },
        },
        orderBy: [{ leaveTypeId: 'desc' }, { priority: 'asc' }],
      });

      if (desigRule?.workflow && desigRule.workflow.isActive) {
        return {
          workflow: this.formatWorkflowDto(desigRule.workflow),
          source: 'DESIGNATION',
          ruleId: desigRule.id,
        };
      }
    }

    // Level 5: Employment Type Assignment
    if (employee.employmentTypeId) {
      const empTypeRule = await prisma.leaveApprovalWorkflowRule.findFirst({
        where: {
          tenantId,
          isActive: true,
          assignmentType: 'EMPLOYMENT_TYPE',
          employmentTypeId: employee.employmentTypeId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          ...(params.leaveTypeId ? { OR: [{ leaveTypeId: null }, { leaveTypeId: params.leaveTypeId }] } : {}),
        },
        include: {
          workflow: {
            include: {
              rules: true,
              steps: {
                include: { approverUser: true, approverDesignation: true },
                orderBy: { stepNumber: 'asc' },
              },
            },
          },
        },
        orderBy: [{ leaveTypeId: 'desc' }, { priority: 'asc' }],
      });

      if (empTypeRule?.workflow && empTypeRule.workflow.isActive) {
        return {
          workflow: this.formatWorkflowDto(empTypeRule.workflow),
          source: 'EMPLOYMENT_TYPE',
          ruleId: empTypeRule.id,
        };
      }
    }

    // Level 6: Leave Type Specific Rule
    if (params.leaveTypeId) {
      const leaveTypeRule = await prisma.leaveApprovalWorkflowRule.findFirst({
        where: {
          tenantId,
          isActive: true,
          assignmentType: 'LEAVE_TYPE',
          leaveTypeId: params.leaveTypeId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        include: {
          workflow: {
            include: {
              rules: true,
              steps: {
                include: { approverUser: true, approverDesignation: true },
                orderBy: { stepNumber: 'asc' },
              },
            },
          },
        },
        orderBy: { priority: 'asc' },
      });

      if (leaveTypeRule?.workflow && leaveTypeRule.workflow.isActive) {
        return {
          workflow: this.formatWorkflowDto(leaveTypeRule.workflow),
          source: 'LEAVE_TYPE',
          ruleId: leaveTypeRule.id,
        };
      }
    }

    // Level 7: Institutional Default Workflow
    const defaultWorkflow = await prisma.leaveApprovalWorkflow.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      include: {
        rules: true,
        steps: {
          include: { approverUser: true, approverDesignation: true },
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (defaultWorkflow) {
      return {
        workflow: this.formatWorkflowDto(defaultWorkflow),
        source: 'INSTITUTIONAL_DEFAULT',
      };
    }

    // Fallback: Pick first active workflow
    const firstActive = await prisma.leaveApprovalWorkflow.findFirst({
      where: { tenantId, isActive: true },
      include: {
        rules: true,
        steps: {
          include: { approverUser: true, approverDesignation: true },
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (firstActive) {
      return {
        workflow: this.formatWorkflowDto(firstActive),
        source: 'INSTITUTIONAL_DEFAULT',
      };
    }

    throw new ValidationError('No active Leave Approval Workflow found for this institution.');
  }
}
