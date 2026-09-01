import { NextRequest, NextResponse } from 'next/server';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || startDate;

    const data = await LeaveApplicationService.getEmployeeScheduleShifts(tenantId, id, startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to resolve scheduled shifts' } },
      { status: 500 }
    );
  }
}
