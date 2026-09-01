import { NextRequest, NextResponse } from 'next/server';
import { LeaveWorkflowService } from '@/lib/services/leave-workflow-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const data = await LeaveWorkflowService.resolveWorkflowForApplication(tenantId, body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to resolve workflow' } },
      { status: error.status || 400 }
    );
  }
}
