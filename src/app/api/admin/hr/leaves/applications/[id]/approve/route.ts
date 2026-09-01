import { NextRequest, NextResponse } from 'next/server';
import { LeaveApprovalService } from '@/lib/services/leave-approval-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;
    const body = await request.json();

    const data = await LeaveApprovalService.processApproverAction(tenantId, {
      applicationId: id,
      actionInput: body,
      actorUserId: auth?.userId,
      actorRoles: auth?.roles || ['SUPER_ADMIN'],
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to process approval action' } },
      { status: error.status || 400 }
    );
  }
}
