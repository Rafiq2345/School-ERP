import { NextRequest, NextResponse } from 'next/server';
import { LeaveTypeService } from '@/lib/services/leave-type-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const data = await LeaveTypeService.getLeaveTypeById(tenantId, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Leave type not found' } },
      { status: error.name === 'NotFoundError' ? 404 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const body = await request.json();

    const data = await LeaveTypeService.updateLeaveType(tenantId, id, body, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update leave type' } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;

    const result = await LeaveTypeService.deleteLeaveType(tenantId, id, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to deactivate leave type' } },
      { status: 400 }
    );
  }
}
