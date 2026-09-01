import { NextRequest, NextResponse } from 'next/server';
import { LeaveTypeService } from '@/lib/services/leave-type-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;

    const data = await LeaveTypeService.getLeaveTypes(tenantId, { search, isActive });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch leave types' } },
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

    const result = await LeaveTypeService.createLeaveType(tenantId, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create leave type' } },
      { status: 400 }
    );
  }
}
