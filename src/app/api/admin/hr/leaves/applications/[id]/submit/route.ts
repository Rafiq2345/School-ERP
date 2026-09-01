import { NextRequest, NextResponse } from 'next/server';
import { LeaveApplicationService } from '@/lib/services/leave-application-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = auth?.userId || request.headers.get('x-user-id') || undefined;
    const { id } = await params;

    const data = await LeaveApplicationService.submitApplication(tenantId, id, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to submit leave application' } },
      { status: 400 }
    );
  }
}
