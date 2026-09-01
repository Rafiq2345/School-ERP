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

    const data = await LeaveApplicationService.getApplicationById(tenantId, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Leave application not found' } },
      { status: error.name === 'NotFoundError' ? 404 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = auth?.userId || request.headers.get('x-user-id') || undefined;
    const { id } = await params;
    const body = await request.json();

    const data = await LeaveApplicationService.updateApplication(tenantId, id, body, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update leave application' } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = auth?.userId || request.headers.get('x-user-id') || undefined;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Application cancelled by user';

    const data = await LeaveApplicationService.cancelApplication(tenantId, id, reason, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to cancel leave application' } },
      { status: 400 }
    );
  }
}
