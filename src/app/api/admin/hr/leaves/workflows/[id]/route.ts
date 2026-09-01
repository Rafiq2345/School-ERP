import { NextRequest, NextResponse } from 'next/server';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;

    const data = await LeaveWorkflowService.getWorkflowById(tenantId, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch workflow' } },
      { status: error.status || 404 }
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
    const { id } = await params;
    const body = await request.json();

    const data = await LeaveWorkflowService.updateWorkflow(tenantId, id, body, auth?.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update workflow' } },
      { status: error.status || 400 }
    );
  }
}
