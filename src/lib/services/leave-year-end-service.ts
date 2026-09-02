/**
 * LeaveYearEndService
 *
 * Phase 3 Step 3: Year-End Leave Processing Engine
 * Handles Carry-Forward, Encashment Input Generation, Expiry / Reset, Batch Execution, and Reversals.
 *
 * Strict Financial & Ledger Invariants:
 * - Double-entry ledger continuity (transactions are never hard-deleted)
 * - Encashment generates auditable payroll input contracts (deductionAmount is strictly NULL / Deferred to Payroll)
 * - Target-year existing allocations are preserved (carry-forward adds to carriedForwardDays)
 * - Strict Idempotency is enforced:
 *   - COMPLETED batch blocks duplicate execution across UI and API/Service levels.
 *   - Preview clearly flags already-processed status.
 *   - REVERSED batch allows controlled re-run.
 * - Compensating reversal transactions preserve historical audit trails
 */

import { prisma } from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { LeaveAssignmentService } from './leave-assignment-service';
import type {
  YearEndAction,
  YearEndDispositionItemDto,
  YearEndPreviewSummaryDto,
  ExecuteYearEndBatchDto,
  LeaveYearEndBatchDto,
  LeaveYearEndBatchItemDto,
} from '@/lib/types/leave';

export class LeaveYearEndService {
  // ---------------------------------------------------------
  // 1. PREVIEW YEAR-END PROCESSING
  // ---------------------------------------------------------

  public static async previewYearEndBatch(
    tenantId: string,
    options: ExecuteYearEndBatchDto
  ): Promise<YearEndPreviewSummaryDto> {
    const sourceYear = options.sourceLeaveYear;
    const targetYear = options.targetLeaveYear || sourceYear + 1;

    if (!sourceYear || !targetYear) {
      throw new ValidationError('Source leave year and target leave year are required.');
    }
    if (targetYear <= sourceYear) {
      throw new ValidationError('Target leave year must be strictly greater than source leave year.');
    }

    // Check if an active COMPLETED batch already exists for this tenant & year pair
    const existingActiveBatch = await prisma.leaveYearEndBatch.findFirst({
      where: {
        tenantId,
        sourceLeaveYear: sourceYear,
        targetLeaveYear: targetYear,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const employeeWhere: any = {
      tenantId,
      currentStatus: { in: ['ACTIVE', 'PROBATION'] },
    };

    if (options.departmentId) {
      employeeWhere.departmentId = options.departmentId;
    }
    if (options.employeeIds && options.employeeIds.length > 0) {
      employeeWhere.id = { in: options.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        designation: true,
        leaveEntitlements: {
          where: { leaveYear: sourceYear },
          include: { leaveType: true, leavePolicy: { include: { rules: true } } },
        },
      },
      orderBy: [{ employeeNo: 'asc' }],
    });

    const previewDate = new Date(`${sourceYear}-12-31T23:59:59.999Z`);
    const items: YearEndDispositionItemDto[] = [];

    let totalCarriedForwardDays = 0;
    let totalEncashedDays = 0;
    let totalExpiredDays = 0;
    let totalEligibleRecords = 0;

    for (const emp of employees) {
      const resolved = await LeaveAssignmentService.resolvePolicyForEmployee(
        tenantId,
        emp.id,
        previewDate
      );

      const activePolicy = resolved?.policy || null;

      for (const ent of emp.leaveEntitlements) {
        const availableBalance = Number(ent.availableBalance);
        const leaveType = ent.leaveType;

        // Match rule from resolved active policy, or fallback to policy attached to entitlement
        const rule =
          activePolicy?.rules?.find((r: any) => r.leaveTypeId === ent.leaveTypeId) ||
          ent.leavePolicy?.rules?.find((r: any) => r.leaveTypeId === ent.leaveTypeId) ||
          null;

        const yearEndAction: YearEndAction = (rule?.yearEndAction as YearEndAction) || 'EXPIRE';

        let carriedForwardDays = 0;
        let encashedDays = 0;
        let expiredDays = 0;
        let skipReason: string | undefined = undefined;
        let status: 'READY' | 'SKIPPED' = 'READY';

        if (availableBalance <= 0) {
          status = 'SKIPPED';
          skipReason = availableBalance === 0 ? 'Zero unused balance' : 'Negative balance (no year-end disposition)';
        } else {
          totalEligibleRecords++;

          switch (yearEndAction) {
            case 'EXPIRE': {
              expiredDays = availableBalance;
              break;
            }

            case 'CARRY_FORWARD': {
              const maxCF =
                rule?.maxCarryForwardDays !== null && rule?.maxCarryForwardDays !== undefined
                  ? Number(rule.maxCarryForwardDays)
                  : availableBalance;

              carriedForwardDays = Math.min(availableBalance, maxCF);
              expiredDays = Number((availableBalance - carriedForwardDays).toFixed(2));
              break;
            }

            case 'ENCASH': {
              const minBal =
                rule?.minBalanceForEncashment !== null && rule?.minBalanceForEncashment !== undefined
                  ? Number(rule.minBalanceForEncashment)
                  : 0;

              if (availableBalance < minBal) {
                expiredDays = availableBalance;
                skipReason = `Balance (${availableBalance}d) is below min encashment threshold (${minBal}d)`;
              } else {
                const maxEnc =
                  rule?.maxEncashableDays !== null && rule?.maxEncashableDays !== undefined
                    ? Number(rule.maxEncashableDays)
                    : availableBalance;

                encashedDays = Math.min(availableBalance, maxEnc);
                expiredDays = Number((availableBalance - encashedDays).toFixed(2));
              }
              break;
            }

            case 'MIXED': {
              const maxCF =
                rule?.maxCarryForwardDays !== null && rule?.maxCarryForwardDays !== undefined
                  ? Number(rule.maxCarryForwardDays)
                  : availableBalance;

              carriedForwardDays = Math.min(availableBalance, maxCF);
              const remaining = Number((availableBalance - carriedForwardDays).toFixed(2));

              const minBal =
                rule?.minBalanceForEncashment !== null && rule?.minBalanceForEncashment !== undefined
                  ? Number(rule.minBalanceForEncashment)
                  : 0;

              if (remaining > 0 && remaining >= minBal) {
                const maxEnc =
                  rule?.maxEncashableDays !== null && rule?.maxEncashableDays !== undefined
                    ? Number(rule.maxEncashableDays)
                    : remaining;

                encashedDays = Math.min(remaining, maxEnc);
              }

              expiredDays = Number((remaining - encashedDays).toFixed(2));
              break;
            }
          }

          totalCarriedForwardDays += carriedForwardDays;
          totalEncashedDays += encashedDays;
          totalExpiredDays += expiredDays;
        }

        items.push({
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          employeeName: `${emp.firstNameEn} ${emp.lastNameEn || ''}`.trim(),
          departmentName: emp.department?.name,
          designationName: emp.designation?.name,
          leaveTypeId: ent.leaveTypeId,
          leaveTypeName: leaveType.name,
          leaveTypeCode: leaveType.code,
          policyId: activePolicy?.id || ent.leavePolicyId,
          policyCode: activePolicy?.code || ent.leavePolicy?.code,
          policyName: activePolicy?.name || ent.leavePolicy?.name,
          yearEndAction,
          availableBalance,
          carriedForwardDays: Number(carriedForwardDays.toFixed(2)),
          encashedDays: Number(encashedDays.toFixed(2)),
          expiredDays: Number(expiredDays.toFixed(2)),
          finalBalance: 0,
          status,
          skipReason,
        });
      }
    }

    return {
      sourceLeaveYear: sourceYear,
      targetLeaveYear: targetYear,
      totalEmployees: employees.length,
      totalEligibleRecords,
      totalCarriedForwardDays: Number(totalCarriedForwardDays.toFixed(2)),
      totalEncashedDays: Number(totalEncashedDays.toFixed(2)),
      totalExpiredDays: Number(totalExpiredDays.toFixed(2)),
      items,
      alreadyProcessed: !!existingActiveBatch,
      existingBatchNumber: existingActiveBatch?.batchNumber ?? null,
      existingBatchId: existingActiveBatch?.id ?? null,
      existingBatchExecutedAt: existingActiveBatch?.executedAt ? existingActiveBatch.executedAt.toISOString() : null,
    };
  }

  // ---------------------------------------------------------
  // 2. EXECUTE YEAR-END PROCESSING
  // ---------------------------------------------------------

  public static async executeYearEndBatch(
    tenantId: string,
    options: ExecuteYearEndBatchDto,
    actorUserId?: string | null
  ): Promise<LeaveYearEndBatchDto> {
    const preview = await this.previewYearEndBatch(tenantId, options);

    // Guard: Prevent duplicate execution for the same source leave year & target year
    const existingActiveBatch = await prisma.leaveYearEndBatch.findFirst({
      where: {
        tenantId,
        sourceLeaveYear: options.sourceLeaveYear,
        targetLeaveYear: preview.targetLeaveYear,
        status: 'COMPLETED',
      },
    });

    if (existingActiveBatch) {
      throw new ValidationError(
        `Year-End ${options.sourceLeaveYear} -> ${preview.targetLeaveYear} was already completed in batch ${existingActiveBatch.batchNumber}. You must reverse batch ${existingActiveBatch.batchNumber} before re-executing.`
      );
    }

    const batchCount = await prisma.leaveYearEndBatch.count({ where: { tenantId } });
    const batchNumber = `YEB-${options.sourceLeaveYear}-${String(batchCount + 1).padStart(4, '0')}`;

    const sourceYearCloseDate = new Date(`${options.sourceLeaveYear}-12-31T23:59:59.999Z`);
    const targetYearOpenDate = new Date(`${preview.targetLeaveYear}-01-01T00:00:00.000Z`);
    const periodStart = new Date(`${options.sourceLeaveYear}-12-01T00:00:00.000Z`);
    const periodEnd = new Date(`${options.sourceLeaveYear}-12-31T23:59:59.999Z`);
    const periodLabel = `December ${options.sourceLeaveYear}`;

    const createdBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.leaveYearEndBatch.create({
        data: {
          tenantId,
          batchNumber,
          sourceLeaveYear: options.sourceLeaveYear,
          targetLeaveYear: preview.targetLeaveYear,
          status: 'COMPLETED',
          totalEmployeesScanned: preview.totalEmployees,
          totalCarriedForwardDays: preview.totalCarriedForwardDays,
          totalEncashedDays: preview.totalEncashedDays,
          totalExpiredDays: preview.totalExpiredDays,
          notes: options.notes ?? null,
          executedByUserId: actorUserId ?? null,
          executedAt: new Date(),
        },
      });

      for (const item of preview.items) {
        const initialBalance = item.availableBalance;

        // Skip non-actionable items from ledger changes, but record batch item
        if (item.status === 'SKIPPED' || initialBalance <= 0) {
          await tx.leaveYearEndBatchItem.create({
            data: {
              tenantId,
              batchId: batch.id,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.policyId ?? null,
              initialBalance,
              carriedForwardDays: 0,
              encashedDays: 0,
              expiredDays: 0,
              finalBalance: initialBalance,
              ruleSnapshot: {
                yearEndAction: item.yearEndAction,
                policyCode: item.policyCode,
              },
              status: 'SKIPPED',
              skipReason: item.skipReason ?? 'Zero balance or not eligible',
            },
          });
          continue;
        }

        // Fetch source year entitlement
        const sourceEntitlement = await tx.employeeLeaveEntitlement.findFirst({
          where: {
            tenantId,
            employeeId: item.employeeId,
            leaveTypeId: item.leaveTypeId,
            leaveYear: options.sourceLeaveYear,
          },
        });

        if (!sourceEntitlement) continue;

        let currentRunningBalance = Number(sourceEntitlement.availableBalance);

        // A. Process ENCASHMENT
        if (item.encashedDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance - item.encashedDays).toFixed(2));

          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              encashedDays: { increment: item.encashedDays },
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.policyId ?? null,
              entitlementId: sourceEntitlement.id,
              leaveYear: options.sourceLeaveYear,
              transactionType: 'ENCASHMENT',
              amount: -item.encashedDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: sourceYearCloseDate,
              reason: `Year-End Encashment for ${options.sourceLeaveYear} (${batch.batchNumber})`,
              referenceType: 'YEAR_END_BATCH',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });

          // Create downstream Payroll Encashment Input Contract (Contract-First: deductionAmount = null)
          const deductionSourceKey = `ENCASH:${batch.id}:${item.employeeId}:${item.leaveTypeId}:${options.sourceLeaveYear}`;

          // Find or fallback policy for encashment evidence
          const defaultDeductionPolicy = await tx.payrollDeductionPolicy.findFirst({
            where: { tenantId, isActive: true },
            orderBy: { createdAt: 'asc' },
          });

          if (defaultDeductionPolicy) {
            const evidence = {
              sourceType: 'LEAVE_ENCASHMENT',
              sourceLeaveYear: options.sourceLeaveYear,
              targetLeaveYear: preview.targetLeaveYear,
              batchNumber: batch.batchNumber,
              batchId: batch.id,
              leaveTypeId: item.leaveTypeId,
              leaveTypeName: item.leaveTypeName,
              eligibleUnusedBalance: initialBalance,
              encashedDays: item.encashedDays,
              payrollPeriodStart: periodStart.toISOString().split('T')[0],
              payrollPeriodEnd: periodEnd.toISOString().split('T')[0],
              payrollPeriodLabel: periodLabel,
              calendarDaysInPeriod: 31,
              calculationBasis: defaultDeductionPolicy.calculationBasis,
              fixedDivisorApplied: defaultDeductionPolicy.fixedDivisor ? Number(defaultDeductionPolicy.fixedDivisor) : null,
              policyCodeUsed: defaultDeductionPolicy.policyCode,
              policyIdUsed: defaultDeductionPolicy.id,
              policyNameUsed: defaultDeductionPolicy.policyName,
              isPaid: true,
              deductionDays: item.encashedDays,
              deductionAmountNote: 'Encashment quantity recorded. Monetary amount deferred to Payroll calculation.',
              generatedAt: new Date().toISOString(),
              generatedByActor: actorUserId || 'System Year-End Batch Engine',
            };

            const createdInput = await tx.payrollDeductionInput.create({
              data: {
                tenantId,
                policyId: defaultDeductionPolicy.id,
                sourceType: 'LEAVE_ENCASHMENT',
                employeeId: item.employeeId,
                leaveTypeId: item.leaveTypeId,
                payrollPeriodStart: periodStart,
                payrollPeriodEnd: periodEnd,
                payrollPeriodLabel: periodLabel,
                deductionScope: 'CUSTOM',
                calculationBasis: defaultDeductionPolicy.calculationBasis,
                deductionDays: item.encashedDays,
                fixedDivisorUsed: defaultDeductionPolicy.fixedDivisor,
                deductionAmount: null, // Strictly null in Phase 3
                currencyCode: 'PKR',
                status: 'PENDING',
                systemActorNote: `Year-End Encashment: ${item.encashedDays}d from ${options.sourceLeaveYear} (${batch.batchNumber})`,
                calculationEvidence: evidence,
                deductionSourceKey,
                createdByUserId: actorUserId ?? null,
              },
            });

            await tx.payrollDeductionAuditLog.create({
              data: {
                tenantId,
                deductionInputId: createdInput.id,
                action: 'GENERATED',
                actorUserId: actorUserId ?? null,
                actorName: 'Year-End Batch Engine',
                previousStatus: 'N/A',
                newStatus: 'PENDING',
                reason: `Year-End Encashment generated from ${batch.batchNumber}`,
                evidence,
              },
            });
          }
        }

        // B. Process CARRY-FORWARD
        if (item.carriedForwardDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance - item.carriedForwardDays).toFixed(2));

          // Source year deduction
          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.policyId ?? null,
              entitlementId: sourceEntitlement.id,
              leaveYear: options.sourceLeaveYear,
              transactionType: 'CARRY_FORWARD',
              amount: -item.carriedForwardDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: sourceYearCloseDate,
              reason: `Year-End Carry-Forward out to ${preview.targetLeaveYear} (${batch.batchNumber})`,
              referenceType: 'YEAR_END_BATCH',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });

          // Target year allocation (preserve existing allocations, add to carriedForwardDays)
          const targetEntitlement = await tx.employeeLeaveEntitlement.findFirst({
            where: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leaveYear: preview.targetLeaveYear,
            },
          });

          let targetEntId = targetEntitlement?.id;
          let targetPrevBal = targetEntitlement ? Number(targetEntitlement.availableBalance) : 0;
          let targetNewBal = Number((targetPrevBal + item.carriedForwardDays).toFixed(2));

          if (targetEntitlement) {
            await tx.employeeLeaveEntitlement.update({
              where: { id: targetEntitlement.id },
              data: {
                carriedForwardDays: { increment: item.carriedForwardDays },
                availableBalance: targetNewBal,
                lastCalculatedAt: new Date(),
              },
            });
          } else {
            const createdTargetEnt = await tx.employeeLeaveEntitlement.create({
              data: {
                tenantId,
                employeeId: item.employeeId,
                leaveTypeId: item.leaveTypeId,
                leavePolicyId: item.policyId || sourceEntitlement.leavePolicyId,
                leaveYear: preview.targetLeaveYear,
                allocationMethod: sourceEntitlement.allocationMethod,
                openingBalance: 0,
                allocatedDays: 0,
                carriedForwardDays: item.carriedForwardDays,
                availableBalance: targetNewBal,
                status: 'ACTIVE',
                lastCalculatedAt: new Date(),
              },
            });
            targetEntId = createdTargetEnt.id;
          }

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.policyId ?? null,
              entitlementId: targetEntId,
              leaveYear: preview.targetLeaveYear,
              transactionType: 'CARRY_FORWARD',
              amount: item.carriedForwardDays,
              balanceBefore: targetPrevBal,
              balanceAfter: targetNewBal,
              effectiveDate: targetYearOpenDate,
              reason: `Carry-Forward received from ${options.sourceLeaveYear} (${batch.batchNumber})`,
              referenceType: 'YEAR_END_BATCH',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });
        }

        // C. Process EXPIRY
        if (item.expiredDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance - item.expiredDays).toFixed(2));

          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              expiredDays: { increment: item.expiredDays },
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.policyId ?? null,
              entitlementId: sourceEntitlement.id,
              leaveYear: options.sourceLeaveYear,
              transactionType: 'EXPIRY',
              amount: -item.expiredDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: sourceYearCloseDate,
              reason: `Year-End Expiry for ${options.sourceLeaveYear} (${batch.batchNumber})`,
              referenceType: 'YEAR_END_BATCH',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });
        }

        // Close source entitlement
        await tx.employeeLeaveEntitlement.update({
          where: { id: sourceEntitlement.id },
          data: { status: 'CLOSED' },
        });

        // Record Batch Item
        await tx.leaveYearEndBatchItem.create({
          data: {
            tenantId,
            batchId: batch.id,
            employeeId: item.employeeId,
            leaveTypeId: item.leaveTypeId,
            leavePolicyId: item.policyId ?? null,
            initialBalance,
            carriedForwardDays: item.carriedForwardDays,
            encashedDays: item.encashedDays,
            expiredDays: item.expiredDays,
            finalBalance: 0,
            ruleSnapshot: {
              yearEndAction: item.yearEndAction,
              policyCode: item.policyCode,
            },
            status: 'PROCESSED',
          },
        });
      }

      // Log in LeaveAuditLog
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'YEAR_END_BATCH',
          entityId: batch.id,
          action: 'EXECUTED',
          userId: actorUserId ?? null,
          reason: `Executed Year-End Batch ${batch.batchNumber} for ${options.sourceLeaveYear} -> ${preview.targetLeaveYear}`,
          newState: {
            batchNumber: batch.batchNumber,
            totalEmployeesScanned: preview.totalEmployees,
            totalCarriedForwardDays: preview.totalCarriedForwardDays,
            totalEncashedDays: preview.totalEncashedDays,
            totalExpiredDays: preview.totalExpiredDays,
          },
        },
      });

      return batch;
    });

    return this.getBatchById(tenantId, createdBatch.id);
  }

  // ---------------------------------------------------------
  // 3. REVERSE YEAR-END BATCH (COMPENSATING TRANSACTIONS)
  // ---------------------------------------------------------

    public static async reverseBatch(
    tenantId: string,
    batchId: string,
    actorUserId?: string | null,
    reason?: string
  ): Promise<LeaveYearEndBatchDto> {
    const batch = await prisma.leaveYearEndBatch.findFirst({
      where: { id: batchId, tenantId },
      include: { items: true },
    });

    if (!batch) {
      throw new NotFoundError(`LeaveYearEndBatch [${batchId}] not found.`);
    }

    if (batch.status === 'REVERSED') {
      throw new ValidationError(`Year-End Batch [${batch.batchNumber}] has already been reversed.`);
    }

    const reversalReasonText = reason || 'Year-End Batch reversed by Administrator';
    const reversalDate = new Date();

    await prisma.$transaction(async (tx) => {
      for (const item of batch.items) {
        if (item.status !== 'PROCESSED') continue;

        // Fetch source year entitlement
        const sourceEntitlement = await tx.employeeLeaveEntitlement.findFirst({
          where: {
            tenantId,
            employeeId: item.employeeId,
            leaveTypeId: item.leaveTypeId,
            leaveYear: batch.sourceLeaveYear,
          },
        });

        if (!sourceEntitlement) continue;

        const initialBal = Number(item.initialBalance);
        const expDays = Number(item.expiredDays);
        const encDays = Number(item.encashedDays);
        const cfDays = Number(item.carriedForwardDays);

        // Chaining balances starting from post-batch state (0 if closed by batch)
        let currentRunningBalance = sourceEntitlement.status === 'CLOSED'
          ? 0
          : Number(sourceEntitlement.availableBalance);

        // A. Revert Expired Days
        if (expDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance + expDays).toFixed(2));

          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              expiredDays: { decrement: expDays },
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.leavePolicyId,
              entitlementId: sourceEntitlement.id,
              leaveYear: batch.sourceLeaveYear,
              transactionType: 'MANUAL_ADJUSTMENT_ADD',
              amount: expDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: reversalDate,
              reason: `Reversal of Expiry from Year-End Batch ${batch.batchNumber}: ${reversalReasonText}`,
              referenceType: 'YEAR_END_REVERSAL',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });
        }

        // B. Revert Encashed Days
        if (encDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance + encDays).toFixed(2));

          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              encashedDays: { decrement: encDays },
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.leavePolicyId,
              entitlementId: sourceEntitlement.id,
              leaveYear: batch.sourceLeaveYear,
              transactionType: 'MANUAL_ADJUSTMENT_ADD',
              amount: encDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: reversalDate,
              reason: `Reversal of Encashment from Year-End Batch ${batch.batchNumber}: ${reversalReasonText}`,
              referenceType: 'YEAR_END_REVERSAL',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });

          // Reverse downstream Payroll Encashment Input
          const deductionSourceKey = `ENCASH:${batch.id}:${item.employeeId}:${item.leaveTypeId}:${batch.sourceLeaveYear}`;

          const existingInput = await tx.payrollDeductionInput.findFirst({
            where: { tenantId, deductionSourceKey, status: 'PENDING' },
          });

          if (existingInput) {
            await tx.payrollDeductionInput.update({
              where: { id: existingInput.id },
              data: {
                status: 'REVERSED',
                reversalReason: reversalReasonText,
                reversedAt: reversalDate,
                reversedByUserId: actorUserId ?? null,
              },
            });

            await tx.payrollDeductionAuditLog.create({
              data: {
                tenantId,
                deductionInputId: existingInput.id,
                action: 'REVERSED',
                actorUserId: actorUserId ?? null,
                actorName: 'Year-End Batch Engine',
                previousStatus: 'PENDING',
                newStatus: 'REVERSED',
                reason: reversalReasonText,
                evidence: { reversedFromBatch: batch.batchNumber },
              },
            });
          }
        }

        // C. Revert Carry-Forward
        if (cfDays > 0) {
          const balBefore = currentRunningBalance;
          currentRunningBalance = Number((currentRunningBalance + cfDays).toFixed(2));

          // Restore to source year
          await tx.employeeLeaveEntitlement.update({
            where: { id: sourceEntitlement.id },
            data: {
              availableBalance: currentRunningBalance,
              lastCalculatedAt: new Date(),
            },
          });

          await tx.leaveLedgerTransaction.create({
            data: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leavePolicyId: item.leavePolicyId,
              entitlementId: sourceEntitlement.id,
              leaveYear: batch.sourceLeaveYear,
              transactionType: 'MANUAL_ADJUSTMENT_ADD',
              amount: cfDays,
              balanceBefore: balBefore,
              balanceAfter: currentRunningBalance,
              effectiveDate: reversalDate,
              reason: `Reversal of Carry-Forward out from Year-End Batch ${batch.batchNumber}: ${reversalReasonText}`,
              referenceType: 'YEAR_END_REVERSAL',
              referenceId: batch.id,
              createdByUserId: actorUserId ?? null,
            },
          });

          // Subtract from target year
          const targetEntitlement = await tx.employeeLeaveEntitlement.findFirst({
            where: {
              tenantId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              leaveYear: batch.targetLeaveYear,
            },
          });

          if (targetEntitlement) {
            const targetPrevBal = Number(targetEntitlement.availableBalance);
            const targetNewBal = Number((targetPrevBal - cfDays).toFixed(2));

            await tx.employeeLeaveEntitlement.update({
              where: { id: targetEntitlement.id },
              data: {
                carriedForwardDays: { decrement: cfDays },
                availableBalance: targetNewBal,
                lastCalculatedAt: new Date(),
              },
            });

            await tx.leaveLedgerTransaction.create({
              data: {
                tenantId,
                employeeId: item.employeeId,
                leaveTypeId: item.leaveTypeId,
                leavePolicyId: item.leavePolicyId,
                entitlementId: targetEntitlement.id,
                leaveYear: batch.targetLeaveYear,
                transactionType: 'MANUAL_ADJUSTMENT_SUBTRACT',
                amount: -cfDays,
                balanceBefore: targetPrevBal,
                balanceAfter: targetNewBal,
                effectiveDate: reversalDate,
                reason: `Reversal of Received Carry-Forward from ${batch.batchNumber}: ${reversalReasonText}`,
                referenceType: 'YEAR_END_REVERSAL',
                referenceId: batch.id,
                createdByUserId: actorUserId ?? null,
              },
            });
          }
        }

        // Reopen source entitlement and restore exact pre-batch balance
        await tx.employeeLeaveEntitlement.update({
          where: { id: sourceEntitlement.id },
          data: {
            status: 'ACTIVE',
            availableBalance: sourceEntitlement.status === 'CLOSED' ? initialBal : currentRunningBalance,
          },
        });

        // Mark item reversed
        await tx.leaveYearEndBatchItem.update({
          where: { id: item.id },
          data: { status: 'REVERSED' },
        });
      }

      // Mark batch reversed
      await tx.leaveYearEndBatch.update({
        where: { id: batch.id },
        data: {
          status: 'REVERSED',
          reversedAt: reversalDate,
          reversedByUserId: actorUserId ?? null,
          reversalReason: reversalReasonText,
        },
      });

      // Log in LeaveAuditLog
      await tx.leaveAuditLog.create({
        data: {
          tenantId,
          entityType: 'YEAR_END_BATCH',
          entityId: batch.id,
          action: 'REVERSED',
          userId: actorUserId ?? null,
          reason: `Reversed Year-End Batch ${batch.batchNumber}: ${reversalReasonText}`,
        },
      });
    });

    return this.getBatchById(tenantId, batchId);
  }

  // ---------------------------------------------------------
  // 4. BATCH QUERIES & FORMATTERS
  // ---------------------------------------------------------

  public static async listBatches(tenantId: string): Promise<LeaveYearEndBatchDto[]> {
    const batches = await prisma.leaveYearEndBatch.findMany({
      where: { tenantId },
      include: {
        executedBy: { select: { username: true } },
        reversedBy: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return batches.map(this.formatBatchDto);
  }

  public static async getBatchById(tenantId: string, id: string): Promise<LeaveYearEndBatchDto> {
    const batch = await prisma.leaveYearEndBatch.findFirst({
      where: { id, tenantId },
      include: {
        executedBy: { select: { username: true } },
        reversedBy: { select: { username: true } },
        items: {
          include: {
            employee: { select: { employeeNo: true, firstNameEn: true, lastNameEn: true } },
            leaveType: { select: { name: true } },
          },
          orderBy: [{ employee: { employeeNo: 'asc' } }, { leaveTypeId: 'asc' }],
        },
      },
    });

    if (!batch) {
      throw new NotFoundError(`LeaveYearEndBatch [${id}] not found.`);
    }

    return this.formatBatchDto(batch);
  }

  private static formatBatchDto(b: any): LeaveYearEndBatchDto {
    return {
      id: b.id,
      tenantId: b.tenantId,
      batchNumber: b.batchNumber,
      sourceLeaveYear: b.sourceLeaveYear,
      targetLeaveYear: b.targetLeaveYear,
      status: b.status as 'COMPLETED' | 'REVERSED',
      totalEmployeesScanned: b.totalEmployeesScanned,
      totalCarriedForwardDays: Number(b.totalCarriedForwardDays),
      totalEncashedDays: Number(b.totalEncashedDays),
      totalExpiredDays: Number(b.totalExpiredDays),
      notes: b.notes ?? null,
      executedByUserId: b.executedByUserId ?? null,
      executedByName: b.executedBy?.username ?? null,
      executedAt: b.executedAt ? b.executedAt.toISOString() : new Date().toISOString(),
      reversedByUserId: b.reversedByUserId ?? null,
      reversedByName: b.reversedBy?.username ?? null,
      reversedAt: b.reversedAt ? b.reversedAt.toISOString() : null,
      reversalReason: b.reversalReason ?? null,
      items: b.items?.map((it: any) => ({
        id: it.id,
        batchId: it.batchId,
        employeeId: it.employeeId,
        employeeNo: it.employee?.employeeNo,
        employeeName: it.employee
          ? `${it.employee.firstNameEn} ${it.employee.lastNameEn || ''}`.trim()
          : undefined,
        leaveTypeId: it.leaveTypeId,
        leaveTypeName: it.leaveType?.name,
        leavePolicyId: it.leavePolicyId,
        initialBalance: Number(it.initialBalance),
        carriedForwardDays: Number(it.carriedForwardDays),
        encashedDays: Number(it.encashedDays),
        expiredDays: Number(it.expiredDays),
        finalBalance: Number(it.finalBalance),
        ruleSnapshot: it.ruleSnapshot || {},
        status: it.status,
        skipReason: it.skipReason ?? null,
        createdAt: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
      })),
      createdAt: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: b.updatedAt ? b.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
