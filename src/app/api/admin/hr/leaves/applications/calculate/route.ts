import { NextRequest, NextResponse } from 'next/server';
import { LeaveCalculationService } from '@/lib/services/leave-calculation-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request).catch(() => null);
    const tenantId = auth?.tenantId || request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const result = await LeaveCalculationService.calculateLeavePreview(tenantId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to calculate leave preview' } },
      { status: error.name === 'NotFoundError' ? 404 : 400 }
    );
  }
}
