import { NextRequest, NextResponse } from 'next/server';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { ruleId } = await params;

    await LeaveWorkflowService.deleteWorkflowRule(tenantId, ruleId, auth?.userId);
    return NextResponse.json({ success: true, message: 'Workflow rule removed successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete workflow rule' } },
      { status: error.status || 400 }
    );
  }
}
