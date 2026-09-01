import { NextRequest, NextResponse } from 'next/server';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;

    const data = await LeaveApprovalService.getApprovalInstanceForApplication(tenantId, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch approval timeline' } },
      { status: error.status || 404 }
    );
  }
}
