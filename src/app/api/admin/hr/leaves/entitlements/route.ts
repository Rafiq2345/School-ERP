import { NextRequest, NextResponse } from 'next/server';
import { LeaveEntitlementService } from '@/lib/services/leave-entitlement-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const body = await request.json();

    const result = await LeaveEntitlementService.bulkAllocateEntitlements(tenantId, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to allocate entitlements' } },
      { status: 400 }
    );
  }
}
