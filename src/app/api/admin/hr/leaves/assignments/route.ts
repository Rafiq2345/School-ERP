import { NextRequest, NextResponse } from 'next/server';
import { LeaveAssignmentService } from '@/lib/services/leave-assignment-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const leavePolicyId = searchParams.get('leavePolicyId') || undefined;

    const data = await LeaveAssignmentService.getAssignments(tenantId, { policyId: leavePolicyId });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch assignments' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const body = await request.json();

    const result = await LeaveAssignmentService.bulkAssignPolicy(tenantId, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to assign policy' } },
      { status: 400 }
    );
  }
}
