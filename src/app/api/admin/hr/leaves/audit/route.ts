import { NextRequest, NextResponse } from 'next/server';
import { LeaveAuditService } from '@/lib/services/leave-audit-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get('entityType') || undefined;
    const action = searchParams.get('action') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const data = await LeaveAuditService.getEnrichedAuditLogs(tenantId, {
      entityType,
      action,
      search,
      startDate,
      endDate,
      userId,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch leave audit logs' } },
      { status: 500 }
    );
  }
}
