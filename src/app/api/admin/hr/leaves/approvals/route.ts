import { NextRequest, NextResponse } from 'next/server';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);

    const filterScope = searchParams.get('scope'); // 'me' or 'all'
    const employeeId = searchParams.get('employeeId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const leaveTypeId = searchParams.get('leaveTypeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const data = await LeaveApprovalService.getPendingApprovals(tenantId, {
      onlyActionable: filterScope === 'me',
      approverUserId: auth?.userId || undefined,
      approverRoles: auth?.roles && auth.roles.length > 0 ? auth.roles : ['SUPER_ADMIN'],
      employeeId,
      departmentId,
      leaveTypeId,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch approval inbox' } },
      { status: error.status || 500 }
    );
  }
}
