import { NextRequest, NextResponse } from 'next/server';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const leaveTypeId = searchParams.get('leaveTypeId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const data = await LeaveApplicationService.getApplications(tenantId, {
      employeeId,
      leaveTypeId,
      departmentId,
      status,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch leave applications' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = auth?.userId || request.headers.get('x-user-id') || undefined;
    const body = await request.json();

    const data = await LeaveApplicationService.createApplication(tenantId, body, userId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create leave application' } },
      { status: 400 }
    );
  }
}
