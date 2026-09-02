/**
 * AttendancePayrollRuleService
 *
 * Manages policy assignments and hierarchical rule resolution for attendance-to-payroll policies.
 * Evaluates the 6-level precedence engine:
 *   1. INDIVIDUAL_OVERRIDE (Priority 1000)
 *   2. EMPLOYEE (Priority 500)
 *   3. DEPARTMENT (Priority 300)
 *   4. DESIGNATION (Priority 200)
 *   5. EMPLOYMENT_TYPE / EMPLOYEE_CATEGORY (Priority 100)
 *   6. INSTITUTIONAL_DEFAULT (Priority 0)
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { PayrollDeductionPolicyService } from './payroll-deduction-policy-service';
import type {
  PayrollDeductionPolicyDto,
  PayrollDeductionPolicyAssignmentDto,
  CreatePayrollDeductionPolicyAssignmentDto,
  DeductionPolicyScope,
} from '@/lib/types/payroll-deduction';

export class AttendancePayrollRuleService {
  /**
   * Resolves the applicable PayrollDeductionPolicy for a given employee, scope, and date.
   * Traverses the 6-level precedence hierarchy:
   *   1. Individual override assignment (isOverride = true)
   *   2. Direct employee assignment
   *   3. Department assignment
   *   4. Designation assignment
   *   5. Employment type or category assignment
   *   6. Policy marked as isDefault = true (or tenant institutional fallback)
   */
  public static async resolvePolicyForEmployee(
    tenantId: string,
    employeeId: string,
    scope: DeductionPolicyScope = 'LATE_ARRIVALS',
    evaluationDate: Date = new Date()
  ): Promise<PayrollDeductionPolicyDto | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        departmentId: true,
        designationId: true,
        employmentTypeId: true,
        employeeCategoryId: true,
      },
    });

    if (!employee) return null;

    // Query all active assignments for this tenant and scope within effective date window
    const assignments = await prisma.payrollDeductionPolicyAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        effectiveFrom: { lte: evaluationDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluationDate } }],
        policy: {
          scope,
          isActive: true,
          effectiveFrom: { lte: evaluationDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluationDate } }],
        },
      },
      include: {
        policy: {
          include: {
            leaveType: { select: { name: true } },
            assignments: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // 1. Level 1: Individual Override
    const override = assignments.find(
      (a) => (a.assignmentType === 'INDIVIDUAL_OVERRIDE' || a.isOverride) && a.employeeId === employee.id
    );
    if (override && override.policy) return PayrollDeductionPolicyService.formatPolicyDto(override.policy);

    // 2. Level 2: Direct Employee Assignment
    const empMatch = assignments.find(
      (a) => a.assignmentType === 'EMPLOYEE' && a.employeeId === employee.id && !a.isOverride
    );
    if (empMatch && empMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(empMatch.policy);

    // 3. Level 3: Department Assignment
    if (employee.departmentId) {
      const deptMatch = assignments.find(
        (a) => a.assignmentType === 'DEPARTMENT' && a.departmentId === employee.departmentId
      );
      if (deptMatch && deptMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(deptMatch.policy);
    }

    // 4. Level 4: Designation Assignment
    if (employee.designationId) {
      const desigMatch = assignments.find(
        (a) => a.assignmentType === 'DESIGNATION' && a.designationId === employee.designationId
      );
      if (desigMatch && desigMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(desigMatch.policy);
    }

    // 5. Level 5: Employment Type / Category Assignment
    if (employee.employmentTypeId) {
      const empTypeMatch = assignments.find(
        (a) => a.assignmentType === 'EMPLOYMENT_TYPE' && a.employmentTypeId === employee.employmentTypeId
      );
      if (empTypeMatch && empTypeMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(empTypeMatch.policy);
    }
    if (employee.employeeCategoryId) {
      const catMatch = assignments.find(
        (a) => a.assignmentType === 'EMPLOYEE_CATEGORY' && a.employeeCategoryId === employee.employeeCategoryId
      );
      if (catMatch && catMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(catMatch.policy);
    }

    // 6. Level 6: Institutional Default Assignment or isDefault Policy Flag
    const instMatch = assignments.find((a) => a.assignmentType === 'INSTITUTIONAL_DEFAULT');
    if (instMatch && instMatch.policy) return PayrollDeductionPolicyService.formatPolicyDto(instMatch.policy);

    const defaultPolicy = await prisma.payrollDeductionPolicy.findFirst({
      where: {
        tenantId,
        scope,
        isDefault: true,
        isActive: true,
        effectiveFrom: { lte: evaluationDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluationDate } }],
      },
      include: { leaveType: { select: { name: true } }, assignments: true },
      orderBy: { createdAt: 'desc' },
    });
    if (defaultPolicy) return PayrollDeductionPolicyService.formatPolicyDto(defaultPolicy);

    // Fallback: any active policy matching scope
    const anyPolicy = await prisma.payrollDeductionPolicy.findFirst({
      where: {
        tenantId,
        scope,
        isActive: true,
        effectiveFrom: { lte: evaluationDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluationDate } }],
      },
      include: { leaveType: { select: { name: true } }, assignments: true },
      orderBy: { createdAt: 'desc' },
    });
    if (anyPolicy) return PayrollDeductionPolicyService.formatPolicyDto(anyPolicy);

    return null;
  }

  // ---------------------------------------------------------
  // ASSIGNMENT CRUD
  // ---------------------------------------------------------

  public static async listAssignments(
    tenantId: string,
    policyId?: string
  ): Promise<PayrollDeductionPolicyAssignmentDto[]> {
    const assignments = await prisma.payrollDeductionPolicyAssignment.findMany({
      where: {
        tenantId,
        ...(policyId && { policyId }),
      },
      include: {
        policy: { select: { policyCode: true, policyName: true } },
        employee: { select: { firstNameEn: true, lastNameEn: true, employeeNo: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
        employmentType: { select: { name: true } },
        employeeCategory: { select: { name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return assignments.map(PayrollDeductionPolicyService.formatAssignmentDto);
  }

  public static async createAssignment(
    tenantId: string,
    input: CreatePayrollDeductionPolicyAssignmentDto
  ): Promise<PayrollDeductionPolicyAssignmentDto> {
    const policy = await prisma.payrollDeductionPolicy.findFirst({
      where: { id: input.policyId, tenantId },
    });
    if (!policy) throw new NotFoundError(`PayrollDeductionPolicy [${input.policyId}] not found.`);

    // Assign default priority based on assignmentType if not explicitly passed
    let priority = input.priority;
    if (priority === undefined) {
      switch (input.assignmentType) {
        case 'INDIVIDUAL_OVERRIDE':
          priority = 1000;
          break;
        case 'EMPLOYEE':
          priority = 500;
          break;
        case 'DEPARTMENT':
          priority = 300;
          break;
        case 'DESIGNATION':
          priority = 200;
          break;
        case 'EMPLOYMENT_TYPE':
        case 'EMPLOYEE_CATEGORY':
          priority = 100;
          break;
        case 'INSTITUTIONAL_DEFAULT':
        default:
          priority = 0;
          break;
      }
    }

    const created = await prisma.payrollDeductionPolicyAssignment.create({
      data: {
        tenantId,
        policyId: input.policyId,
        assignmentType: input.assignmentType,
        employeeId: input.employeeId ?? null,
        departmentId: input.departmentId ?? null,
        designationId: input.designationId ?? null,
        employmentTypeId: input.employmentTypeId ?? null,
        employeeCategoryId: input.employeeCategoryId ?? null,
        isOverride: input.isOverride ?? input.assignmentType === 'INDIVIDUAL_OVERRIDE',
        priority,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        isActive: input.isActive ?? true,
      },
      include: {
        policy: { select: { policyCode: true, policyName: true } },
        employee: { select: { firstNameEn: true, lastNameEn: true, employeeNo: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
        employmentType: { select: { name: true } },
        employeeCategory: { select: { name: true } },
      },
    });

    return PayrollDeductionPolicyService.formatAssignmentDto(created);
  }

  public static async deleteAssignment(tenantId: string, id: string): Promise<void> {
    const existing = await prisma.payrollDeductionPolicyAssignment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundError(`PayrollDeductionPolicyAssignment [${id}] not found.`);
    await prisma.payrollDeductionPolicyAssignment.delete({ where: { id } });
  }
}
