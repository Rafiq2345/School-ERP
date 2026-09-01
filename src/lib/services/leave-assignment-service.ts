import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import {
  BulkAssignLeavePolicyDto,
  LeaveAssignmentPreviewItem,
  LeaveAssignmentPreviewResult,
  LeavePolicyAssignmentDto,
  LeavePolicyDto,
} from '@/lib/types/leave';
import { ValidationError, NotFoundError } from '@/lib/errors/app-error';

export interface ResolvedEmployeePolicy {
  policy: LeavePolicyDto;
  assignmentId?: string;
  source: 'OVERRIDE' | 'DIRECT' | 'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'DEFAULT' | 'NONE';
  isOverride: boolean;
}

export class LeaveAssignmentService {
  /**
   * Retrieves all Leave Policy Assignments for a tenant
   */
  static async getAssignments(
    tenantId: string,
    options: {
      assignmentType?: string;
      policyId?: string;
      employeeId?: string;
      isActive?: boolean;
    } = {}
  ): Promise<LeavePolicyAssignmentDto[]> {
    const where: any = { tenantId };

    if (options.assignmentType) {
      where.assignmentType = options.assignmentType;
    }
    if (options.policyId) {
      where.leavePolicyId = options.policyId;
    }
    if (options.employeeId) {
      where.employeeId = options.employeeId;
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const assignments = await prisma.leavePolicyAssignment.findMany({
      where,
      include: {
        leavePolicy: true,
        employee: true,
        department: true,
        designation: true,
        employmentType: true,
      },
      orderBy: [{ isOverride: 'desc' }, { effectiveFrom: 'desc' }],
    });

    return assignments.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      leavePolicyId: a.leavePolicyId,
      leavePolicyName: a.leavePolicy.name,
      leavePolicyCode: a.leavePolicy.code,
      assignmentType: a.assignmentType as any,
      employeeId: a.employeeId,
      employeeName: a.employee ? `${a.employee.firstNameEn} ${a.employee.lastNameEn || ''}`.trim() : undefined,
      employeeNo: a.employee?.employeeNo,
      departmentId: a.departmentId,
      departmentName: a.department?.name,
      designationId: a.designationId,
      designationName: a.designation?.name,
      employmentTypeId: a.employmentTypeId,
      employmentTypeName: a.employmentType?.name,
      isOverride: a.isOverride,
      effectiveFrom: a.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: a.effectiveTo ? a.effectiveTo.toISOString().split('T')[0] : null,
      reason: a.reason,
      isActive: a.isActive,
      assignedByUserId: a.assignedByUserId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  /**
   * Resolves the active Leave Policy for an employee on a target date
   * Follows strict 6-level Precedence Hierarchy:
   * Level 1: Employee Override (isOverride = true)
   * Level 2: Direct Employee Assignment
   * Level 3: Department Assignment
   * Level 4: Designation Assignment
   * Level 5: Employment Type Assignment
   * Level 6: Institutional Default Policy
   */
  static async resolvePolicyForEmployee(
    tenantId: string,
    employeeId: string,
    targetDate: Date = new Date()
  ): Promise<ResolvedEmployeePolicy | null> {
    const normalizedDate = new Date(targetDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Fetch employee details
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundError(`Employee with ID [${employeeId}] not found.`);
    }

    // Fetch all active assignments for this tenant valid on targetDate
    const assignments = await prisma.leavePolicyAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        effectiveFrom: { lte: normalizedDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: normalizedDate } }],
      },
      include: {
        leavePolicy: {
          include: {
            rules: {
              include: { leaveType: true },
            },
          },
        },
      },
      orderBy: [{ isOverride: 'desc' }, { effectiveFrom: 'desc' }],
    });

    const formatPolicy = (policy: any): LeavePolicyDto => ({
      id: policy.id,
      tenantId: policy.tenantId,
      name: policy.name,
      code: policy.code,
      description: policy.description,
      isDefault: policy.isDefault,
      status: policy.status,
      effectiveFrom: policy.effectiveFrom.toISOString().split('T')[0],
      effectiveTo: policy.effectiveTo ? policy.effectiveTo.toISOString().split('T')[0] : null,
      rules: policy.rules.map((r: any) => ({
        id: r.id,
        leavePolicyId: r.leavePolicyId,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveType?.name,
        leaveTypeCode: r.leaveType?.code,
        annualEntitlement: Number(r.annualEntitlement),
        isPaid: r.isPaid,
        isUnlimited: r.isUnlimited,
        allocationMethod: r.allocationMethod,
        minLeaveUnit: Number(r.minLeaveUnit),
        allowHalfDay: r.allowHalfDay,
        allowShiftWise: r.allowShiftWise,
        allowHourly: r.allowHourly,
        allowNegativeBalance: r.allowNegativeBalance,
        maxNegativeBalance: Number(r.maxNegativeBalance),
        maxConsecutiveDays: r.maxConsecutiveDays,
        probationTreatment: r.probationTreatment,
        probationEntitlement: r.probationEntitlement ? Number(r.probationEntitlement) : null,
        entitlementRelease: r.entitlementRelease,
        yearEndAction: r.yearEndAction,
        maxCarryForwardDays: r.maxCarryForwardDays ? Number(r.maxCarryForwardDays) : null,
        carryForwardExpiryMonths: r.carryForwardExpiryMonths,
        maxEncashableDays: r.maxEncashableDays ? Number(r.maxEncashableDays) : null,
        minBalanceForEncashment: r.minBalanceForEncashment ? Number(r.minBalanceForEncashment) : null,
      })),
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    });

    // Level 1: Employee-Specific Override
    const empOverride = assignments.find(
      (a) => a.assignmentType === 'EMPLOYEE' && a.employeeId === employeeId && a.isOverride
    );
    if (empOverride && empOverride.leavePolicy.status === 'ACTIVE') {
      return {
        policy: formatPolicy(empOverride.leavePolicy),
        assignmentId: empOverride.id,
        source: 'OVERRIDE',
        isOverride: true,
      };
    }

    // Level 2: Direct Employee Assignment
    const empDirect = assignments.find(
      (a) => a.assignmentType === 'EMPLOYEE' && a.employeeId === employeeId && !a.isOverride
    );
    if (empDirect && empDirect.leavePolicy.status === 'ACTIVE') {
      return {
        policy: formatPolicy(empDirect.leavePolicy),
        assignmentId: empDirect.id,
        source: 'DIRECT',
        isOverride: false,
      };
    }

    // Level 3: Department Assignment
    if (employee.departmentId) {
      const deptAssignment = assignments.find(
        (a) => a.assignmentType === 'DEPARTMENT' && a.departmentId === employee.departmentId
      );
      if (deptAssignment && deptAssignment.leavePolicy.status === 'ACTIVE') {
        return {
          policy: formatPolicy(deptAssignment.leavePolicy),
          assignmentId: deptAssignment.id,
          source: 'DEPARTMENT',
          isOverride: false,
        };
      }
    }

    // Level 4: Designation Assignment
    if (employee.designationId) {
      const desigAssignment = assignments.find(
        (a) => a.assignmentType === 'DESIGNATION' && a.designationId === employee.designationId
      );
      if (desigAssignment && desigAssignment.leavePolicy.status === 'ACTIVE') {
        return {
          policy: formatPolicy(desigAssignment.leavePolicy),
          assignmentId: desigAssignment.id,
          source: 'DESIGNATION',
          isOverride: false,
        };
      }
    }

    // Level 5: Employment Type Assignment
    if (employee.employmentTypeId) {
      const empTypeAssignment = assignments.find(
        (a) => a.assignmentType === 'EMPLOYMENT_TYPE' && a.employmentTypeId === employee.employmentTypeId
      );
      if (empTypeAssignment && empTypeAssignment.leavePolicy.status === 'ACTIVE') {
        return {
          policy: formatPolicy(empTypeAssignment.leavePolicy),
          assignmentId: empTypeAssignment.id,
          source: 'EMPLOYMENT_TYPE',
          isOverride: false,
        };
      }
    }

    // Level 6: Institutional Default Policy
    const defaultPolicy = await prisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true, status: 'ACTIVE' },
      include: {
        rules: { include: { leaveType: true } },
      },
    });

    if (defaultPolicy) {
      return {
        policy: formatPolicy(defaultPolicy),
        source: 'DEFAULT',
        isOverride: false,
      };
    }

    return null;
  }

  /**
   * Previews the impact of a proposed bulk Leave Policy assignment
   */
  static async previewAssignment(
    tenantId: string,
    data: BulkAssignLeavePolicyDto
  ): Promise<LeaveAssignmentPreviewResult> {
    const targetPolicy = await prisma.leavePolicy.findFirst({
      where: { id: data.leavePolicyId, tenantId },
    });
    if (!targetPolicy) {
      throw new NotFoundError('Target Leave Policy not found.');
    }

    const employeeWhere: any = { tenantId, currentStatus: { in: ['ACTIVE', 'PROBATION'] } };

    if (data.assignmentType === 'DEPARTMENT' && data.departmentId) {
      employeeWhere.departmentId = data.departmentId;
    } else if (data.assignmentType === 'DESIGNATION' && data.designationId) {
      employeeWhere.designationId = data.designationId;
    } else if (data.assignmentType === 'EMPLOYMENT_TYPE' && data.employmentTypeId) {
      employeeWhere.employmentTypeId = data.employmentTypeId;
    } else if (data.assignmentType === 'EMPLOYEE' && data.employeeIds && data.employeeIds.length > 0) {
      employeeWhere.id = { in: data.employeeIds };
    }

    const targetEmployees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        designation: true,
        employmentType: true,
      },
      orderBy: [{ employeeNo: 'asc' }],
    });

    const previewItems: LeaveAssignmentPreviewItem[] = [];

    for (const emp of targetEmployees) {
      const resolved = await this.resolvePolicyForEmployee(
        tenantId,
        emp.id,
        new Date(data.effectiveFrom)
      );

      previewItems.push({
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
        departmentName: emp.department?.name || 'Unassigned',
        designationName: emp.designation?.name || 'Unassigned',
        employmentTypeName: emp.employmentType?.name || 'Unassigned',
        currentPolicyId: resolved?.policy.id || null,
        currentPolicyName: resolved?.policy.name || 'None',
        currentPolicySource: (resolved?.source as any) || 'NONE',
        proposedPolicyId: targetPolicy.id,
        proposedPolicyName: targetPolicy.name,
        isOverride: data.isOverride ?? false,
      });
    }

    return {
      totalTargetEmployees: previewItems.length,
      employees: previewItems,
    };
  }

  /**
   * Executes bulk Leave Policy assignment
   */
  static async bulkAssignPolicy(
    tenantId: string,
    data: BulkAssignLeavePolicyDto,
    userId?: string
  ): Promise<{ assignedCount: number; message: string }> {
    if (!data.leavePolicyId) {
      throw new ValidationError('Leave Policy ID is required.');
    }
    if (!data.effectiveFrom) {
      throw new ValidationError('Effective From date is required.');
    }

    const targetPolicy = await prisma.leavePolicy.findFirst({
      where: { id: data.leavePolicyId, tenantId },
    });
    if (!targetPolicy) {
      throw new NotFoundError('Target Leave Policy not found.');
    }

    const effectiveFromDate = new Date(`${data.effectiveFrom.split('T')[0]}T00:00:00.000Z`);
    const effectiveToDate = data.effectiveTo
      ? new Date(`${data.effectiveTo.split('T')[0]}T00:00:00.000Z`)
      : null;

    if (effectiveToDate && effectiveToDate < effectiveFromDate) {
      throw new ValidationError('Effective To date cannot be earlier than Effective From date.');
    }

    let assignedCount = 0;

    await prisma.$transaction(async (tx) => {
      if (data.assignmentType === 'EMPLOYEE' && data.employeeIds && data.employeeIds.length > 0) {
        for (const empId of data.employeeIds) {
          // Bound prior open-ended assignments and supersede future overlapping ones
          const priorAssignments = await tx.leavePolicyAssignment.findMany({
            where: {
              tenantId,
              assignmentType: 'EMPLOYEE',
              employeeId: empId,
              isOverride: data.isOverride ?? false,
              isActive: true,
            },
          });

          const dayBefore = new Date(effectiveFromDate.getTime() - 86400000);

          for (const pa of priorAssignments) {
            if (pa.effectiveFrom >= effectiveFromDate) {
              // Future superseded assignment
              await tx.leavePolicyAssignment.update({
                where: { id: pa.id },
                data: { isActive: false },
              });
            } else if (!pa.effectiveTo || pa.effectiveTo >= effectiveFromDate) {
              // Open-ended or overlapping assignment -> bound it to dayBefore
              await tx.leavePolicyAssignment.update({
                where: { id: pa.id },
                data: { effectiveTo: dayBefore },
              });
            }
          }

          await tx.leavePolicyAssignment.create({
            data: {
              tenantId,
              leavePolicyId: data.leavePolicyId,
              assignmentType: 'EMPLOYEE',
              employeeId: empId,
              isOverride: data.isOverride ?? false,
              effectiveFrom: effectiveFromDate,
              effectiveTo: effectiveToDate,
              reason: data.reason || null,
              isActive: true,
              assignedByUserId: userId || null,
            },
          });
          assignedCount++;
        }
      } else if (data.assignmentType === 'DEPARTMENT' && data.departmentId) {
        await tx.leavePolicyAssignment.updateMany({
          where: {
            tenantId,
            assignmentType: 'DEPARTMENT',
            departmentId: data.departmentId,
            isActive: true,
          },
          data: { isActive: false, effectiveTo: effectiveFromDate },
        });

        await tx.leavePolicyAssignment.create({
          data: {
            tenantId,
            leavePolicyId: data.leavePolicyId,
            assignmentType: 'DEPARTMENT',
            departmentId: data.departmentId,
            isOverride: false,
            effectiveFrom: effectiveFromDate,
            effectiveTo: effectiveToDate,
            reason: data.reason || null,
            isActive: true,
            assignedByUserId: userId || null,
          },
        });
        assignedCount = 1;
      } else if (data.assignmentType === 'DESIGNATION' && data.designationId) {
        await tx.leavePolicyAssignment.updateMany({
          where: {
            tenantId,
            assignmentType: 'DESIGNATION',
            designationId: data.designationId,
            isActive: true,
          },
          data: { isActive: false, effectiveTo: effectiveFromDate },
        });

        await tx.leavePolicyAssignment.create({
          data: {
            tenantId,
            leavePolicyId: data.leavePolicyId,
            assignmentType: 'DESIGNATION',
            designationId: data.designationId,
            isOverride: false,
            effectiveFrom: effectiveFromDate,
            effectiveTo: effectiveToDate,
            reason: data.reason || null,
            isActive: true,
            assignedByUserId: userId || null,
          },
        });
        assignedCount = 1;
      } else if (data.assignmentType === 'EMPLOYMENT_TYPE' && data.employmentTypeId) {
        await tx.leavePolicyAssignment.updateMany({
          where: {
            tenantId,
            assignmentType: 'EMPLOYMENT_TYPE',
            employmentTypeId: data.employmentTypeId,
            isActive: true,
          },
          data: { isActive: false, effectiveTo: effectiveFromDate },
        });

        await tx.leavePolicyAssignment.create({
          data: {
            tenantId,
            leavePolicyId: data.leavePolicyId,
            assignmentType: 'EMPLOYMENT_TYPE',
            employmentTypeId: data.employmentTypeId,
            isOverride: false,
            effectiveFrom: effectiveFromDate,
            effectiveTo: effectiveToDate,
            reason: data.reason || null,
            isActive: true,
            assignedByUserId: userId || null,
          },
        });
        assignedCount = 1;
      }

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'POLICY_ASSIGNMENT',
          entityId: data.leavePolicyId,
          action: 'ASSIGNED',
          newState: data as any,
          reason: data.reason || 'Bulk leave policy assigned',
          userId: userId || null,
        },
      });
    });

    return {
      assignedCount,
      message: `Successfully assigned Leave Policy [${targetPolicy.name}] with effective date ${data.effectiveFrom}.`,
    };
  }

  /**
   * Deactivates an assignment
   */
  static async removeAssignment(tenantId: string, id: string, userId?: string): Promise<void> {
    const existing = await prisma.leavePolicyAssignment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError(`Assignment with ID [${id}] not found.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.leavePolicyAssignment.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'POLICY_ASSIGNMENT',
          entityId: id,
          action: 'DEACTIVATED',
          previousState: { isActive: true },
          newState: { isActive: false },
          reason: 'Deactivated policy assignment',
          userId: userId || null,
        },
      });
    });
  }
}
