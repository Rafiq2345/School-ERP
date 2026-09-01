import { NextRequest, NextResponse } from 'next/server';
import { LeavePolicyService } from '@/lib/services/leave-policy-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const data = await LeavePolicyService.getLeavePolicies(tenantId, { status });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch leave policies' } },
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

    const result = await LeavePolicyService.createLeavePolicy(tenantId, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create leave policy' } },
      { status: 400 }
    );
  }
}
