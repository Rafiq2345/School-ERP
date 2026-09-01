import { NextRequest, NextResponse } from 'next/server';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
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

    const data = await LeaveWorkflowService.addWorkflowRule(tenantId, id, body, auth?.userId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to add workflow rule' } },
      { status: error.status || 400 }
    );
  }
}
