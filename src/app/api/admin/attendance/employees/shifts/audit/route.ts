import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/services/shift-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId') || undefined;

    const data = await ShiftService.getShiftAuditLogs(tenantId, { shiftId });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch shift audit logs' } },
      { status: 500 }
    );
  }
}
