import { PrismaClient } from '@prisma/client';
import {
  EnrichedLeaveAuditLogDto,
  LeaveAuditDiffItem,
  LeaveAuditQueryOptions,
} from '@/lib/types/leave';

const prisma = new PrismaClient();

export class LeaveAuditService {
  /**
   * Retrieves enriched, human-readable Leave Audit Logs with actor attribution and diffs
   */
  static async getEnrichedAuditLogs(
    tenantId: string,
    options: LeaveAuditQueryOptions = {}
  ): Promise<EnrichedLeaveAuditLogDto[]> {
    const where: any = { tenantId };

    if (options.entityType && options.entityType.trim() && options.entityType !== 'ALL') {
      where.entityType = options.entityType.trim();
    }
    if (options.action && options.action.trim() && options.action !== 'ALL') {
      where.action = options.action.trim();
    }
    if (options.userId && options.userId.trim()) {
      where.userId = options.userId.trim();
    }
    if (options.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(`${options.startDate}T00:00:00.000Z`) };
    }
    if (options.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(`${options.endDate}T23:59:59.999Z`) };
    }

    const rawLogs = await prisma.leaveAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 150,
    });

    if (rawLogs.length === 0) {
      return [];
    }

    // 1. Batch load Users for actor resolution
    const userIds = Array.from(
      new Set(rawLogs.map((l) => l.userId).filter((id): id is string => Boolean(id) && id !== 'SYSTEM'))
    );
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          include: {
            userRoles: {
              include: { role: true },
            },
          },
        })
      : [];
    const usersMap = new Map(users.map((u) => [u.id, u]));

    // 2. Batch load Transactions for LEAVE_LEDGER
    const txnIds = rawLogs
      .filter((l) => l.entityType === 'LEAVE_LEDGER')
      .map((l) => l.entityId);
    const txns = txnIds.length > 0
      ? await prisma.leaveLedgerTransaction.findMany({
          where: { id: { in: txnIds } },
          include: {
            leaveType: true,
            employee: {
              include: { department: true, designation: true },
            },
          },
        })
      : [];
    const txnsMap = new Map(txns.map((t) => [t.id, t]));

    // 3. Batch load Leave Types
    const typeIds = rawLogs
      .filter((l) => l.entityType === 'LEAVE_TYPE')
      .map((l) => l.entityId);
    const leaveTypes = typeIds.length > 0
      ? await prisma.leaveType.findMany({ where: { id: { in: typeIds } } })
      : [];
    const leaveTypesMap = new Map(leaveTypes.map((t) => [t.id, t]));

    // 4. Batch load Leave Policies
    const policyIds = rawLogs
      .filter((l) => l.entityType === 'LEAVE_POLICY')
      .map((l) => l.entityId);
    const policies = policyIds.length > 0
      ? await prisma.leavePolicy.findMany({ where: { id: { in: policyIds } } })
      : [];
    const policiesMap = new Map(policies.map((p) => [p.id, p]));

    // 5. Batch load Leave Applications
    const appIds = rawLogs
      .filter((l) => l.entityType === 'LEAVE_APPLICATION')
      .map((l) => l.entityId);
    const apps = appIds.length > 0
      ? await prisma.leaveApplication.findMany({
          where: { id: { in: appIds } },
          include: {
            employee: { include: { department: true, designation: true } },
            leaveType: true,
          },
        })
      : [];
    const appsMap = new Map(apps.map((a) => [a.id, a]));

    // Enrich logs
    const enrichedList: EnrichedLeaveAuditLogDto[] = [];

    for (const log of rawLogs) {
      const prev = log.previousState as any;
      const next = log.newState as any;

      // A. Resolve Actor / Performed By
      let performedByName = 'Unknown / Legacy';
      let performedByRole: string | null = null;
      let isSystem = false;

      if (log.userId === 'SYSTEM') {
        performedByName = 'System Engine';
        performedByRole = 'Automated Process';
        isSystem = true;
      } else if (log.userId && usersMap.has(log.userId)) {
        const u = usersMap.get(log.userId)!;
        performedByName = u.username || u.email || 'Admin User';
        performedByRole = u.userRoles.map((ur) => ur.role.name).join(', ') || 'Administrator';
        isSystem = false;
      } else if (log.userId) {
        performedByName = `User (${log.userId.slice(0, 8)})`;
        performedByRole = 'Staff';
      } else if (log.entityType === 'LEAVE_ENTITLEMENT' && log.action === 'ALLOCATED') {
        performedByName = 'System Engine';
        performedByRole = 'Annual Allocation Batch';
        isSystem = true;
      }

      // B. Resolve Related Record & Change Summary
      let relatedRecord: import('@/lib/types/leave').LeaveAuditRelatedRecordDto = {
        type: log.entityType,
        title: log.entityId,
        subtitle: undefined,
        employeeNo: undefined,
        department: undefined,
        leaveTypeCode: undefined,
      };

      let changeSummary = 'Audit event recorded';
      const diffItems: LeaveAuditDiffItem[] = [];

      switch (log.entityType) {
        case 'LEAVE_LEDGER': {
          const tx = txnsMap.get(log.entityId);
          if (tx) {
            const empName = `${tx.employee.firstNameEn} ${tx.employee.lastNameEn || ''}`.trim();
            relatedRecord = {
              type: 'Employee Balance',
              title: empName,
              subtitle: `${tx.employee.employeeNo} • ${tx.employee.department?.name || 'Staff'}`,
              employeeNo: tx.employee.employeeNo,
              department: tx.employee.department?.name,
              leaveTypeCode: tx.leaveType.code,
            };

            const delta = Number(tx.amount);
            const deltaStr = delta > 0 ? `+${delta}d` : `${delta}d`;
            changeSummary = `${tx.leaveType.name} Balance: ${tx.balanceBefore}d → ${tx.balanceAfter}d (${deltaStr})`;

            diffItems.push({
              field: 'availableBalance',
              label: `${tx.leaveType.name} Available Balance`,
              oldValue: `${tx.balanceBefore}d`,
              newValue: `${tx.balanceAfter}d`,
              displayDiff: `${tx.balanceBefore}d → ${tx.balanceAfter}d (${deltaStr})`,
            });
            diffItems.push({
              field: 'reason',
              label: 'Justification Reason',
              oldValue: null,
              newValue: tx.reason,
              displayDiff: tx.reason || 'N/A',
            });
          } else {
            const before = prev?.availableBalance;
            const after = next?.availableBalance;
            const adj = next?.adjustment;
            const adjStr = adj ? (adj > 0 ? `+${adj}d` : `${adj}d`) : '';
            changeSummary = `Leave Balance: ${before ?? '?'}d → ${after ?? '?'}d ${adjStr ? `(${adjStr})` : ''}`;
            if (before !== undefined && after !== undefined) {
              diffItems.push({
                field: 'availableBalance',
                label: 'Available Balance',
                oldValue: `${before}d`,
                newValue: `${after}d`,
                displayDiff: `${before}d → ${after}d (${adjStr})`,
              });
            }
          }
          break;
        }

        case 'LEAVE_TYPE': {
          const lt = leaveTypesMap.get(log.entityId);
          const typeName = lt ? `${lt.name} (${lt.code})` : (next?.name ? `${next.name} (${next.code})` : log.entityId);
          relatedRecord = {
            type: 'Leave Type',
            title: typeName,
            subtitle: lt?.isPaid ? 'Paid Leave' : 'Unpaid Leave',
            leaveTypeCode: lt?.code || next?.code,
          };

          if (log.action === 'CREATED') {
            changeSummary = `Created Leave Type [${next?.name || typeName}] with limit of ${next?.isUnlimited ? 'Unlimited' : `${next?.annualLimit ?? 0} days`}`;
          } else if (log.action === 'DEACTIVATED') {
            changeSummary = `Deactivated Leave Type [${typeName}]`;
          } else {
            // Field diff
            if (prev && next) {
              if (prev.name !== next.name) diffItems.push({ field: 'name', label: 'Name', oldValue: prev.name, newValue: next.name, displayDiff: `${prev.name} → ${next.name}` });
              if (prev.annualLimit !== next.annualLimit) diffItems.push({ field: 'annualLimit', label: 'Annual Limit', oldValue: prev.annualLimit, newValue: next.annualLimit, displayDiff: `${prev.annualLimit ?? 'None'} → ${next.annualLimit ?? 'None'} days` });
              if (prev.isPaid !== next.isPaid) diffItems.push({ field: 'isPaid', label: 'Paid Status', oldValue: prev.isPaid ? 'Paid' : 'Unpaid', newValue: next.isPaid ? 'Paid' : 'Unpaid', displayDiff: `${prev.isPaid ? 'Paid' : 'Unpaid'} → ${next.isPaid ? 'Paid' : 'Unpaid'}` });
              if (prev.isActive !== next.isActive) diffItems.push({ field: 'isActive', label: 'Status', oldValue: prev.isActive ? 'Active' : 'Inactive', newValue: next.isActive ? 'Active' : 'Inactive', displayDiff: `${prev.isActive ? 'Active' : 'Inactive'} → ${next.isActive ? 'Active' : 'Inactive'}` });
            }
            changeSummary = diffItems.length > 0
              ? diffItems.map((d) => `${d.label}: ${d.displayDiff}`).join('; ')
              : `Updated Leave Type [${typeName}]`;
          }
          break;
        }

        case 'LEAVE_POLICY': {
          const lp = policiesMap.get(log.entityId);
          const polName = lp ? `${lp.name} (${lp.code})` : (next?.name ? `${next.name} (${next.code})` : log.entityId);
          relatedRecord = {
            type: 'Leave Policy',
            title: polName,
            subtitle: lp?.isDefault ? 'Institutional Default' : 'Custom Policy',
          };

          if (log.action === 'CREATED') {
            changeSummary = `Created Leave Policy [${next?.name || polName}] with ${next?.rulesCount ?? 0} rules`;
          } else {
            if (prev && next) {
              if (prev.name !== next.name) diffItems.push({ field: 'name', label: 'Policy Name', oldValue: prev.name, newValue: next.name, displayDiff: `${prev.name} → ${next.name}` });
              if (prev.status !== next.status) diffItems.push({ field: 'status', label: 'Status', oldValue: prev.status, newValue: next.status, displayDiff: `${prev.status} → ${next.status}` });
              if (prev.rulesCount !== next.rulesCount) diffItems.push({ field: 'rulesCount', label: 'Rules Configured', oldValue: prev.rulesCount, newValue: next.rulesCount, displayDiff: `${prev.rulesCount} → ${next.rulesCount} rules` });
            }
            changeSummary = diffItems.length > 0
              ? diffItems.map((d) => `${d.label}: ${d.displayDiff}`).join('; ')
              : `Updated Leave Policy [${polName}]`;
          }
          break;
        }

        case 'POLICY_ASSIGNMENT': {
          const target = next?.targetName || next?.departmentName || next?.designationName || next?.employmentTypeName || 'Employees';
          const polName = next?.policyName || 'Policy';
          relatedRecord = {
            type: 'Policy Assignment',
            title: `Assignment: ${polName}`,
            subtitle: `Scope: ${next?.assignmentType || 'Group'}`,
          };
          changeSummary = `Assigned [${polName}] to ${next?.assignmentType || 'Group'} [${target}] (${next?.assignedCount ?? 1} staff affected)`;
          break;
        }

        case 'LEAVE_ENTITLEMENT': {
          const year = next?.leaveYear || log.entityId.replace('BATCH_', '');
          relatedRecord = {
            type: 'Annual Allocation',
            title: `Entitlement Batch ${year}`,
            subtitle: 'Annual Allocation Wizard',
          };
          changeSummary = `Annual bulk entitlement allocated for Year ${year} (${next?.allocatedEmployeesCount ?? 0} employees, ${next?.transactionsCount ?? 0} transactions)`;
          break;
        }

        case 'LEAVE_APPLICATION': {
          const app = appsMap.get(log.entityId);
          const empName = app
            ? `${app.employee.firstNameEn} ${app.employee.lastNameEn}`
            : next?.employeeName || 'Employee';
          const appNo = app ? app.applicationNumber : next?.applicationNumber || log.entityId;
          const ltName = app ? app.leaveType.name : next?.leaveTypeCode || 'Leave';
          const qty = app ? Number(app.requestedDays) : next?.requestedDays || 0;

          relatedRecord = {
            type: 'Leave Application',
            title: `${appNo} - ${empName}`,
            subtitle: `${qty}d ${ltName} (${app ? app.status : next?.status || 'Pending'})`,
            employeeNo: app?.employee?.employeeNo,
            department: app?.employee?.department?.name,
            leaveTypeCode: app?.leaveType?.code || next?.leaveTypeCode,
          };

          if (log.action === 'DRAFT_CREATED') {
            changeSummary = `Created draft leave request ${appNo} (${qty}d ${ltName}) for ${empName}`;
          } else if (log.action === 'APPLICATION_SUBMITTED') {
            changeSummary = `Submitted leave application ${appNo} (${qty}d ${ltName}) for ${empName}`;
          } else if (log.action === 'DRAFT_UPDATED') {
            changeSummary = `Updated draft application ${appNo} (${qty}d ${ltName}) for ${empName}`;
          } else if (log.action === 'APPLICATION_CANCELLED') {
            changeSummary = `Cancelled leave application ${appNo} for ${empName}`;
          } else {
            changeSummary = log.reason || `${log.action} on application ${appNo}`;
          }
          break;
        }

        default: {
          changeSummary = log.reason || `${log.action} performed on ${log.entityType}`;
          break;
        }
      }

      // Perform text search filtering if search keyword provided
      if (options.search && options.search.trim()) {
        const q = options.search.toLowerCase().trim();
        const matches =
          performedByName.toLowerCase().includes(q) ||
          (performedByRole && performedByRole.toLowerCase().includes(q)) ||
          log.entityType.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          (log.reason && log.reason.toLowerCase().includes(q)) ||
          relatedRecord.title.toLowerCase().includes(q) ||
          (relatedRecord.subtitle && relatedRecord.subtitle.toLowerCase().includes(q)) ||
          (relatedRecord.employeeNo && relatedRecord.employeeNo.toLowerCase().includes(q)) ||
          changeSummary.toLowerCase().includes(q);

        if (!matches) {
          continue;
        }
      }

      enrichedList.push({
        id: log.id,
        tenantId: log.tenantId,
        entityType: log.entityType as any,
        entityId: log.entityId,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
        performedBy: {
          id: log.userId,
          name: performedByName,
          role: performedByRole,
          isSystem,
        },
        relatedRecord,
        changeSummary,
        diffItems,
        previousState: log.previousState,
        newState: log.newState,
      });
    }

    return enrichedList;
  }
}
