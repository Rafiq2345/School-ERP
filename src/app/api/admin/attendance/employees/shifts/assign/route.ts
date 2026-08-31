import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/services/shift-service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = request.headers.get('x-user-id') || undefined;
    const body = await request.json();

    const result = await ShiftService.assignShiftBulk(tenantId, {
      ...body,
      userId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to assign shift' } },
      { status: 400 }
    );
  }
}
