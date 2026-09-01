import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeaveAuditService } from '@/lib/services/leave-audit-service';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';

const prisma = new PrismaClient();

describe('Leave Management Phase 1: Governance & Audit Trail Suite', () => {
  const tenantId = 'tenant-sch-001';
  let emp101: any;
  let casualLt: any;
  let testUserId: string;

  beforeAll(async () => {
    emp101 = await prisma.employee.findFirst({ where: { tenantId, employeeNo: 'EMP-101' } });
    casualLt = await prisma.leaveType.findFirst({ where: { tenantId, code: 'CASUAL' } });

    // Check or find test user
    const user = await prisma.user.findFirst({ where: { tenantId } });
    testUserId = user?.id || '00000000-0000-0000-0000-000000000001';
  });

  it('1. Captures actor attribution (User ID) on manual adjustments and formats human-readable diff', async () => {
    const txn = await LeaveEntitlementService.manualAdjustment(
      tenantId,
      {
        employeeId: emp101.id,
        leaveTypeId: casualLt.id,
        leaveYear: 2026,
        adjustmentType: 'ADD',
        quantity: 1.5,
        reason: 'Principal approved extra compensatory day for science fair',
        effectiveDate: '2026-07-01',
      },
      testUserId
    );

    const logs = await LeaveAuditService.getEnrichedAuditLogs(tenantId, {
      entityType: 'LEAVE_LEDGER',
      limit: 5,
    });

    expect(logs.length).toBeGreaterThan(0);
    const targetLog = logs.find((l) => l.entityId === txn.id);
    expect(targetLog).toBeDefined();

    // Verify Actor Attribution
    expect(targetLog?.performedBy).toBeDefined();
    expect(targetLog?.performedBy.isSystem).toBe(false);

    // Verify Human-Readable Summary & Diffs
    expect(targetLog?.changeSummary).toContain('Casual Leave');
    expect(targetLog?.changeSummary).toContain('+1.5d');
    expect(targetLog?.reason).toBe('Principal approved extra compensatory day for science fair');
    expect(targetLog?.relatedRecord.title).toContain('Muhammad Tariq');
  });

  it('2. Correctly flags System Engine on automated batch allocations without fabricating fake actors', async () => {
    // Audit log for a batch allocation
    const batchLogs = await LeaveAuditService.getEnrichedAuditLogs(tenantId, {
      entityType: 'LEAVE_ENTITLEMENT',
      action: 'ALLOCATED',
      limit: 5,
    });

    if (batchLogs.length > 0) {
      const batchLog = batchLogs[0];
      expect(batchLog.performedBy.isSystem).toBe(true);
      expect(batchLog.performedBy.name).toBe('System Engine');
    }
  });

  it('3. Supports comprehensive text search filtering across Reason, Employee, and Actor', async () => {
    const searchResults = await LeaveAuditService.getEnrichedAuditLogs(tenantId, {
      search: 'science fair',
    });

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].reason).toContain('science fair');
  });

  it('4. Preserves technical raw JSON payloads for regulatory compliance and audit reconstruction', async () => {
    const logs = await LeaveAuditService.getEnrichedAuditLogs(tenantId, { limit: 1 });
    expect(logs.length).toBeGreaterThan(0);
    const log = logs[0];
    expect(log.newState).toBeDefined();
  });
});
