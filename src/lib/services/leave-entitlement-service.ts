import { PrismaClient } from '@prisma/client';
import {
  BulkAllocateEntitlementDto,
  EmployeeLeaveSummaryDto,
  EntitlementAllocationPreviewItem,
  EntitlementAllocationPreviewResult,
  LeaveLedgerTransactionDto,
  ManualLeaveAdjustmentDto,
} from '@/lib/types/leave';
import { ValidationError, NotFoundError } from '@/lib/errors/app-error';
import { LeaveAssignmentService } from './leave-assignment-service';

const prisma = new PrismaClient();

export class LeaveEntitlementService {
  /**
   * Previews the entitlement allocation for employees for a given leave year
   */
  static async previewAnnualAllocation(
    tenantId: string,
    data: BulkAllocateEntitlementDto
  ): Promise<EntitlementAllocationPreviewResult> {
    if (!data.leaveYear) {
      throw new ValidationError('Leave Year is required.');
    }

    const employeeWhere: any = { tenantId, currentStatus: { in: ['ACTIVE', 'PROBATION'] } };

    if (data.departmentId) {
      employeeWhere.departmentId = data.departmentId;
    }
    if (data.designationId) {
      employeeWhere.designationId = data.designationId;
    }
    if (data.employmentTypeId) {
      employeeWhere.employmentTypeId = data.employmentTypeId;
    }
    if (data.employeeIds && data.employeeIds.length > 0) {
      employeeWhere.id = { in: data.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        designation: true,
        employmentType: true,
        leaveEntitlements: {
          where: { leaveYear: data.leaveYear },
          include: { leaveType: true },
        },
      },
      orderBy: [{ employeeNo: 'asc' }],
    });

    const previewDate = new Date(`${data.leaveYear}-01-01T00:00:00.000Z`);
    const previewItems: EntitlementAllocationPreviewItem[] = [];

    let readyCount = 0;
    let alreadyAllocatedCount = 0;
    let needsRecalculationCount = 0;
    let hasOverrideCount = 0;

    for (const emp of employees) {
      const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
        tenantId,
        emp.id,
        previewDate
      );

      if (!resolved || !resolved.policy) {
        continue;
      }

      const policy = resolved.policy;
      const existingEntitlements = emp.leaveEntitlements;
      const hasOverride = resolved.isOverride;

      const confirmationStatus = (emp.confirmationStatus as any) || 'CONFIRMED';
      const isProbation = confirmationStatus === 'PROBATION' || confirmationStatus === 'EXTENDED_PROBATION';

      const leaveTypeEntitlements = policy.rules.map((r) => {
        let entitlementAmount = r.annualEntitlement;

        // Apply Probation & Confirmation Rules
        if (isProbation) {
          if (r.probationTreatment === 'NOT_ALLOWED' || r.probationTreatment === 'UNPAID_ONLY') {
            entitlementAmount = 0;
          } else if (r.probationTreatment === 'LIMITED_ENTITLEMENT' && r.probationEntitlement !== null) {
            entitlementAmount = r.probationEntitlement;
          }
          if (r.entitlementRelease === 'ON_CONFIRMATION' || r.entitlementRelease === 'PRORATED_AFTER_CONFIRMATION') {
            // Unreleased until actual HR confirmation status
            entitlementAmount = 0;
          }
        }

        return {
          leaveTypeId: r.leaveTypeId,
          leaveTypeName: r.leaveTypeName || 'Unknown',
          leaveTypeCode: r.leaveTypeCode || 'UNKNOWN',
          entitlement: entitlementAmount,
          allocationMethod: r.allocationMethod,
          isUnlimited: r.isUnlimited,
        };
      });

      // Determine accurate allocation status
      // An employee is ALREADY_ALLOCATED if all finite leave types in their policy have been allocated matching policy entitlement
      const finiteRules = leaveTypeEntitlements.filter((lt) => !lt.isUnlimited && lt.entitlement > 0);
      const allocatedFiniteRecords = existingEntitlements.filter(
        (e) => Number(e.allocatedDays) > 0 && !e.leaveType.isUnlimited
      );

      const isFullyAllocated =
        finiteRules.length > 0 &&
        finiteRules.every((lt) => {
          const match = existingEntitlements.find((e) => e.leaveTypeId === lt.leaveTypeId);
          return match && Number(match.allocatedDays) === lt.entitlement;
        });

      const isPartiallyOrMismatched =
        allocatedFiniteRecords.length > 0 && !isFullyAllocated;

      let status: EntitlementAllocationPreviewItem['status'] = 'READY';
      if (isFullyAllocated) {
        status = 'ALREADY_ALLOCATED';
        alreadyAllocatedCount++;
      } else if (isPartiallyOrMismatched) {
        status = 'NEEDS_RECALCULATION';
        needsRecalculationCount++;
      } else if (hasOverride) {
        status = 'HAS_OVERRIDE';
        hasOverrideCount++;
      } else {
        status = 'READY';
        readyCount++;
      }

      previewItems.push({
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
        departmentName: emp.department?.name || 'Unassigned',
        designationName: emp.designation?.name || 'Unassigned',
        confirmationStatus,
        policyId: policy.id,
        policyName: policy.name,
        status,
        leaveTypeEntitlements,
      });
    }

    return {
      leaveYear: data.leaveYear,
      totalEmployees: previewItems.length,
      readyCount,
      alreadyAllocatedCount,
      needsRecalculationCount,
      hasOverrideCount,
      items: previewItems,
    };
  }

  /**
   * Executes bulk annual entitlement allocation and records ledger transactions with strict continuity
   */
  static async bulkAllocateEntitlements(
    tenantId: string,
    data: BulkAllocateEntitlementDto,
    userId?: string
  ): Promise<{ allocatedEmployeesCount: number; transactionsCount: number; message: string }> {
    const preview = await this.previewAnnualAllocation(tenantId, data);

    if (preview.items.length === 0) {
      throw new ValidationError('No eligible employees found for allocation.');
    }

    let allocatedEmployeesCount = 0;
    let transactionsCount = 0;
    const effectiveDate = new Date(`${data.leaveYear}-01-01T00:00:00.000Z`);

    await prisma.$transaction(async (tx) => {
      for (const item of preview.items) {
        if (item.status === 'ALREADY_ALLOCATED' && !data.overwriteExisting) {
          continue; // Skip already allocated without overwrite flag
        }

        let empAllocated = false;

        for (const lt of item.leaveTypeEntitlements) {
          const existing = await tx.employeeLeaveEntitlement.findFirst({
            where: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: lt.leaveTypeId,
              leaveYear: data.leaveYear,
            },
          });

          // Fetch the latest transaction for continuous balance chaining
          const lastTxn = await tx.leaveLedgerTransaction.findFirst({
            where: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: lt.leaveTypeId,
              leaveYear: data.leaveYear,
            },
            orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
          });

          if (existing) {
            const currentAllocated = Number(existing.allocatedDays);
            const diff = lt.entitlement - currentAllocated;

            if (diff !== 0 || data.overwriteExisting || currentAllocated === 0) {
              const currentBalance = lastTxn ? Number(lastTxn.balanceAfter) : Number(existing.availableBalance);
              const newAvailable = currentBalance + diff;

              await tx.employeeLeaveEntitlement.update({
                where: { id: existing.id },
                data: {
                  allocatedDays: lt.entitlement,
                  availableBalance: newAvailable,
                  leavePolicyId: item.policyId,
                  allocationMethod: lt.allocationMethod,
                  lastCalculatedAt: new Date(),
                },
              });

              await tx.leaveLedgerTransaction.create({
                data: {
                  tenantId,
                  employeeId: item.employeeId,
                  leaveTypeId: lt.leaveTypeId,
                  leavePolicyId: item.policyId,
                  entitlementId: existing.id,
                  leaveYear: data.leaveYear,
                  transactionType: 'ANNUAL_ALLOCATION',
                  amount: diff,
                  balanceBefore: currentBalance,
                  balanceAfter: newAvailable,
                  effectiveDate,
                  reason: currentAllocated === 0
                    ? `Annual entitlement allocation for ${data.leaveYear}`
                    : `Annual entitlement recalculation for ${data.leaveYear}`,
                  referenceType: 'ANNUAL_BATCH',
                  createdByUserId: userId || null,
                },
              });
              transactionsCount++;
              empAllocated = true;
            }
          } else {
            // New entitlement record
            const ent = await tx.employeeLeaveEntitlement.create({
              data: {
                tenantId,
                employeeId: item.employeeId,
                leaveTypeId: lt.leaveTypeId,
                leavePolicyId: item.policyId,
                leaveYear: data.leaveYear,
                allocationMethod: lt.allocationMethod,
                openingBalance: 0,
                allocatedDays: lt.entitlement,
                carriedForwardDays: 0,
                adjustedDays: 0,
                usedDays: 0,
                encashedDays: 0,
                expiredDays: 0,
                availableBalance: lt.entitlement,
                hasOverride: item.status === 'HAS_OVERRIDE',
                status: 'ACTIVE',
              },
            });

            await tx.leaveLedgerTransaction.create({
              data: {
                tenantId,
                employeeId: item.employeeId,
                leaveTypeId: lt.leaveTypeId,
                leavePolicyId: item.policyId,
                entitlementId: ent.id,
                leaveYear: data.leaveYear,
                transactionType: 'ANNUAL_ALLOCATION',
                amount: lt.entitlement,
                balanceBefore: 0,
                balanceAfter: lt.entitlement,
                effectiveDate,
                reason: `Annual entitlement allocation for ${data.leaveYear}`,
                referenceType: 'ANNUAL_BATCH',
                createdByUserId: userId || null,
              },
            });
            transactionsCount++;
            empAllocated = true;
          }
        }

        if (empAllocated) {
          allocatedEmployeesCount++;
        }
      }

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_ENTITLEMENT',
          entityId: `BATCH_${data.leaveYear}`,
          action: 'ALLOCATED',
          newState: {
            leaveYear: data.leaveYear,
            allocatedEmployeesCount,
            transactionsCount,
          },
          reason: `Annual bulk entitlement allocation for ${data.leaveYear}`,
          userId: userId || null,
        },
      });
    });

    return {
      allocatedEmployeesCount,
      transactionsCount,
      message: `Successfully processed leave entitlements for ${allocatedEmployeesCount} employees in Leave Year ${data.leaveYear}.`,
    };
  }

  /**
   * Executes a manual balance adjustment with mandatory justification, negative balance policy enforcement, and ledger continuity
   */
  static async manualAdjustment(
    tenantId: string,
    data: ManualLeaveAdjustmentDto,
    userId?: string
  ): Promise<LeaveLedgerTransactionDto> {
    if (!data.reason || !data.reason.trim()) {
      throw new ValidationError('A mandatory justification reason is required for manual leave adjustments.');
    }
    if (data.quantity <= 0) {
      throw new ValidationError('Adjustment quantity must be greater than zero.');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundError(`Employee with ID [${data.employeeId}] not found.`);
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { id: data.leaveTypeId, tenantId },
    });
    if (!leaveType) {
      throw new NotFoundError(`Leave type with ID [${data.leaveTypeId}] not found.`);
    }

    const effectiveDate = new Date(`${data.effectiveDate.split('T')[0]}T00:00:00.000Z`);

    // Resolve employee's active policy to enforce policy rules (like negative balance restrictions)
    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      data.employeeId,
      effectiveDate
    );

    const policyRule = resolved?.policy.rules.find((r) => r.leaveTypeId === data.leaveTypeId);

    // Find or initialize entitlement record for the year
    let entitlement = await prisma.employeeLeaveEntitlement.findFirst({
      where: {
        tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        leaveYear: data.leaveYear,
      },
    });

    if (!entitlement) {
      if (!resolved || !resolved.policy) {
        throw new ValidationError('Cannot adjust leave balance: No active Leave Policy resolved for this employee.');
      }

      entitlement = await prisma.employeeLeaveEntitlement.create({
        data: {
          tenantId,
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          leavePolicyId: resolved.policy.id,
          leaveYear: data.leaveYear,
          openingBalance: 0,
          allocatedDays: 0,
          carriedForwardDays: 0,
          adjustedDays: 0,
          usedDays: 0,
          encashedDays: 0,
          expiredDays: 0,
          availableBalance: 0,
          status: 'ACTIVE',
        },
      });
    }

    // Determine continuous balanceBefore from latest ledger transaction (or current entitlement balance)
    const lastTxn = await prisma.leaveLedgerTransaction.findFirst({
      where: {
        tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        leaveYear: data.leaveYear,
      },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });

    const balanceBefore = lastTxn ? Number(lastTxn.balanceAfter) : Number(entitlement.availableBalance);
    const delta = data.adjustmentType === 'ADD' ? data.quantity : -data.quantity;
    const balanceAfter = balanceBefore + delta;

    // Strict Negative Balance Guard based on resolved Leave Policy Rule
    if (balanceAfter < 0) {
      if (policyRule && !policyRule.allowNegativeBalance) {
        throw new ValidationError(
          `Negative leave balance is not permitted for ${leaveType.name} under policy [${resolved?.policy.name}]. Current available balance is ${balanceBefore}d; requested adjustment of ${delta}d would result in ${balanceAfter}d.`
        );
      } else if (policyRule && policyRule.allowNegativeBalance && Math.abs(balanceAfter) > Number(policyRule.maxNegativeBalance)) {
        throw new ValidationError(
          `Negative balance (${balanceAfter}d) exceeds maximum allowed negative balance limit of -${policyRule.maxNegativeBalance}d under policy [${resolved?.policy.name}].`
        );
      } else if (!policyRule && !leaveType.isUnlimited) {
        throw new ValidationError(
          `Negative leave balance is not permitted. Current available balance is ${balanceBefore}d; requested adjustment of ${delta}d would result in ${balanceAfter}d.`
        );
      }
    }

    const transactionType =
      data.adjustmentType === 'ADD' ? 'MANUAL_ADJUSTMENT_ADD' : 'MANUAL_ADJUSTMENT_SUBTRACT';

    const result = await prisma.$transaction(async (tx) => {
      // Update entitlement summary
      await tx.employeeLeaveEntitlement.update({
        where: { id: entitlement.id },
        data: {
          adjustedDays: { increment: delta },
          availableBalance: balanceAfter,
          lastCalculatedAt: new Date(),
        },
      });

      // Insert ledger transaction ensuring continuous balance chain
      const txn = await tx.leaveLedgerTransaction.create({
        data: {
          tenantId,
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          leavePolicyId: entitlement.leavePolicyId,
          entitlementId: entitlement.id,
          leaveYear: data.leaveYear,
          transactionType,
          amount: delta,
          balanceBefore,
          balanceAfter,
          effectiveDate,
          reason: data.reason.trim(),
          referenceType: 'MANUAL_ADJUSTMENT',
          createdByUserId: userId || null,
        },
      });

      // Audit Log
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'LEAVE_LEDGER',
          entityId: txn.id,
          action: 'ADJUSTED',
          previousState: { availableBalance: balanceBefore },
          newState: { availableBalance: balanceAfter, adjustment: delta, reason: data.reason.trim() },
          reason: data.reason.trim(),
          userId: userId || null,
        },
      });

      return txn;
    });

    return {
      id: result.id,
      tenantId: result.tenantId,
      employeeId: result.employeeId,
      leaveTypeId: result.leaveTypeId,
      leavePolicyId: result.leavePolicyId,
      entitlementId: result.entitlementId,
      leaveYear: result.leaveYear,
      transactionType: result.transactionType as any,
      amount: Number(result.amount),
      balanceBefore: Number(result.balanceBefore),
      balanceAfter: Number(result.balanceAfter),
      effectiveDate: result.effectiveDate.toISOString().split('T')[0],
      reason: result.reason,
      referenceType: result.referenceType,
      referenceId: result.referenceId,
      shiftId: result.shiftId,
      createdByUserId: result.createdByUserId,
      createdAt: result.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves complete Employee Leave Summary ensuring all active policy leave types are shown with continuous balances
   */
  static async getEmployeeLeaveSummary(
    tenantId: string,
    employeeId: string,
    leaveYear: number = new Date().getFullYear()
  ): Promise<EmployeeLeaveSummaryDto> {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: true,
        designation: true,
        employmentType: true,
        leaveEntitlements: {
          where: { leaveYear },
          include: { leaveType: true },
        },
        leaveLedgerTransactions: {
          where: { leaveYear },
          include: { leaveType: true },
          orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
          take: 50,
        },
      },
    });

    if (!employee) {
      throw new NotFoundError(`Employee with ID [${employeeId}] not found.`);
    }

    const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
      tenantId,
      employeeId,
      new Date(`${leaveYear}-01-01T00:00:00.000Z`)
    );

    // Fetch all active leave types for this tenant
    const allLeaveTypes = await prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // Build complete balances array for all relevant leave types
    const balancesMap = new Map<string, any>();

    // 1. Initialize from resolved policy rules first
    if (resolved && resolved.policy.rules) {
      for (const r of resolved.policy.rules) {
        balancesMap.set(r.leaveTypeId, {
          leaveTypeId: r.leaveTypeId,
          leaveTypeName: r.leaveTypeName || 'Unknown',
          leaveTypeCode: r.leaveTypeCode || 'UNKNOWN',
          isPaid: r.isPaid,
          isUnlimited: r.isUnlimited,
          openingBalance: 0,
          allocatedDays: 0,
          carriedForwardDays: 0,
          adjustedDays: 0,
          usedDays: 0,
          pendingDays: 0,
          availableBalance: 0,
        });
      }
    }

    // 2. Merge existing recorded entitlements
    for (const e of employee.leaveEntitlements) {
      balancesMap.set(e.leaveTypeId, {
        leaveTypeId: e.leaveTypeId,
        leaveTypeName: e.leaveType.name,
        leaveTypeCode: e.leaveType.code,
        isPaid: e.leaveType.isPaid,
        isUnlimited: e.leaveType.isUnlimited,
        openingBalance: Number(e.openingBalance),
        allocatedDays: Number(e.allocatedDays),
        carriedForwardDays: Number(e.carriedForwardDays),
        adjustedDays: Number(e.adjustedDays),
        usedDays: Number(e.usedDays),
        pendingDays: 0,
        availableBalance: Number(e.availableBalance),
      });
    }

    // If no policy resolved and no entitlements, include all active leave types as zero-balance placeholders
    if (balancesMap.size === 0) {
      for (const lt of allLeaveTypes) {
        balancesMap.set(lt.id, {
          leaveTypeId: lt.id,
          leaveTypeName: lt.name,
          leaveTypeCode: lt.code,
          isPaid: lt.isPaid,
          isUnlimited: lt.isUnlimited,
          openingBalance: 0,
          allocatedDays: 0,
          carriedForwardDays: 0,
          adjustedDays: 0,
          usedDays: 0,
          pendingDays: 0,
          availableBalance: 0,
        });
      }
    }

    const balances = Array.from(balancesMap.values());

    const recentTransactions: LeaveLedgerTransactionDto[] = employee.leaveLedgerTransactions.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      employeeId: t.employeeId,
      leaveTypeId: t.leaveTypeId,
      leaveTypeName: t.leaveType.name,
      leaveTypeCode: t.leaveType.code,
      leavePolicyId: t.leavePolicyId,
      entitlementId: t.entitlementId,
      leaveYear: t.leaveYear,
      transactionType: t.transactionType as any,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      effectiveDate: t.effectiveDate.toISOString().split('T')[0],
      reason: t.reason,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      shiftId: t.shiftId,
      createdByUserId: t.createdByUserId,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      employee: {
        id: employee.id,
        employeeNo: employee.employeeNo,
        firstNameEn: employee.firstNameEn,
        lastNameEn: employee.lastNameEn,
        departmentName: employee.department?.name || 'Unassigned',
        designationName: employee.designation?.name || 'Unassigned',
        employmentTypeName: employee.employmentType?.name || 'Unassigned',
        confirmationStatus: (employee.confirmationStatus as any) || 'CONFIRMED',
        joiningDate: employee.joiningDate.toISOString().split('T')[0],
        probationEndDate: employee.probationEndDate ? employee.probationEndDate.toISOString().split('T')[0] : null,
        confirmationDate: employee.confirmationDate ? employee.confirmationDate.toISOString().split('T')[0] : null,
      },
      currentPolicy: resolved
        ? {
            id: resolved.policy.id,
            name: resolved.policy.name,
            code: resolved.policy.code,
            source: resolved.source,
          }
        : null,
      leaveYear,
      balances,
      recentTransactions,
    };
  }


  /**
   * Atomically posts an approved leave request quantity to the Employee Leave Entitlement Ledger
   * within an existing database transaction (idempotent, prevents double deduction).
   */
  static async recordLeaveUsageInTx(
    tx: any,
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ): Promise<any> {
    // 1. Check idempotency: if transaction already exists for this application, skip
    const existingTxn = await tx.leaveLedgerTransaction.findFirst({
      where: {
        tenantId,
        referenceId: applicationId,
        referenceType: 'LEAVE_APPLICATION',
        transactionType: 'LEAVE_USAGE',
      },
    });

    if (existingTxn) {
      return existingTxn;
    }

    // 2. Fetch Leave Application
    const application = await tx.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        leaveType: true,
        leavePolicy: true,
        employee: true,
        shifts: true,
      },
    });

    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundError(`Leave Application with ID [${applicationId}] not found.`);
    }

    const leaveYear = application.startDate.getUTCFullYear();
    const quantity = Number(application.requestedDays);

    // 3. Find or Create Entitlement record for the year
    let entitlement = await tx.employeeLeaveEntitlement.findFirst({
      where: {
        tenantId,
        employeeId: application.employeeId,
        leaveTypeId: application.leaveTypeId,
        leaveYear,
      },
    });

    if (!entitlement) {
      // Create entitlement record if not already created
      const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
        tenantId,
        application.employeeId,
        application.startDate
      );

      const policyRule = resolved?.policy.rules.find((r) => r.leaveTypeId === application.leaveTypeId);
      const allocatedDays = policyRule ? Number(policyRule.annualEntitlement || 0) : 0;

      entitlement = await tx.employeeLeaveEntitlement.create({
        data: {
          tenantId,
          employeeId: application.employeeId,
          leaveTypeId: application.leaveTypeId,
          leavePolicyId: application.leavePolicyId || resolved?.policy.id || '',
          leaveYear,
          allocationMethod: 'ANNUAL_UPFRONT',
          openingBalance: 0,
          allocatedDays,
          carriedForwardDays: 0,
          adjustedDays: 0,
          usedDays: 0,
          encashedDays: 0,
          expiredDays: 0,
          availableBalance: allocatedDays,
          status: 'ACTIVE',
        },
      });
    }

    // 4. Determine Continuous Balance
    const lastTxn = await tx.leaveLedgerTransaction.findFirst({
      where: {
        tenantId,
        employeeId: application.employeeId,
        leaveTypeId: application.leaveTypeId,
        leaveYear,
      },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });

    const balanceBefore = lastTxn ? Number(lastTxn.balanceAfter) : Number(entitlement.availableBalance);
    const balanceAfter = balanceBefore - quantity;
    const usedDaysAfter = Number(entitlement.usedDays) + quantity;

    // 5. Update Entitlement Summary
    await tx.employeeLeaveEntitlement.update({
      where: { id: entitlement.id },
      data: {
        usedDays: { increment: quantity },
        availableBalance: balanceAfter,
        lastCalculatedAt: new Date(),
      },
    });

    // 6. Create Immutable Ledger Transaction
    const firstShiftId = application.shifts && application.shifts.length > 0 ? application.shifts[0].shiftId : null;
    const validShiftId = firstShiftId && firstShiftId !== 'unknown' ? firstShiftId : null;

    let validUserId: string | null = null;
    if (actorUserId) {
      const u = await tx.user.findUnique({ where: { id: actorUserId } });
      if (u) validUserId = u.id;
    }

    const ledgerTxn = await tx.leaveLedgerTransaction.create({
      data: {
        tenantId,
        employeeId: application.employeeId,
        leaveTypeId: application.leaveTypeId,
        leavePolicyId: entitlement.leavePolicyId || application.leavePolicyId,
        entitlementId: entitlement.id,
        leaveYear,
        transactionType: 'LEAVE_USAGE',
        amount: -quantity,
        balanceBefore,
        balanceAfter,
        effectiveDate: application.startDate,
        reason: `Approved Leave Request ${application.applicationNumber} (${quantity}d ${application.leaveType.name})`,
        referenceType: 'LEAVE_APPLICATION',
        referenceId: application.id,
        shiftId: validShiftId,
        createdByUserId: validUserId,
      },
    });

    // 7. Audit Log
    await tx.leaveAuditLog.create({
      data: {
        tenantId,
        entityType: 'LEAVE_LEDGER',
        entityId: ledgerTxn.id,
        action: 'ADJUSTED',
        previousState: {
          availableBalance: balanceBefore,
          usedDays: Number(entitlement.usedDays),
        },
        newState: {
          availableBalance: balanceAfter,
          usedDays: usedDaysAfter,
          leaveUsage: -quantity,
          applicationNumber: application.applicationNumber,
        },
        reason: `Leave entitlement deduction of ${quantity}d for approved application ${application.applicationNumber}`,
        userId: validUserId,
      },
    });

    return ledgerTxn;
  }

  /**
   * Standalone helper to record leave usage
   */
  static async recordLeaveUsage(
    tenantId: string,
    applicationId: string,
    actorUserId?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      return this.recordLeaveUsageInTx(tx, tenantId, applicationId, actorUserId);
    });
  }

  /**
   * Retrieves Audit Logs for Leave Management
   */
  static async getAuditLogs(
    tenantId: string,
    options: { entityType?: string; entityId?: string; limit?: number } = {}
  ) {
    const where: any = { tenantId };
    if (options.entityType) where.entityType = options.entityType;
    if (options.entityId) where.entityId = options.entityId;

    return prisma.leaveAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
    });
  }
}
