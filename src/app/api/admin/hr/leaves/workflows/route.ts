import { NextRequest, NextResponse } from 'next/server';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;

    const data = await LeaveWorkflowService.getWorkflows(tenantId, { isActive, search });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch approval workflows' } },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const data = await LeaveWorkflowService.createWorkflow(tenantId, body, auth?.userId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create approval workflow' } },
      { status: error.status || 400 }
    );
  }
}
