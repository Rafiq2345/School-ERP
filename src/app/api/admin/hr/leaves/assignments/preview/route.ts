import { NextRequest, NextResponse } from 'next/server';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const result = await LeaveAssignmentService.previewAssignment(tenantId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to generate assignment preview' } },
      { status: 400 }
    );
  }
}
