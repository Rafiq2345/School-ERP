import { NextRequest, NextResponse } from 'next/server';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
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
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const data = await LeaveEntitlementService.getEmployeeLeaveSummary(tenantId, id, year);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch employee leave summary' } },
      { status: 404 }
    );
  }
}
