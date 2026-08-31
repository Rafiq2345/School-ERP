import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/services/shift-service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const result = await ShiftService.previewShiftAssignment(tenantId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to preview shift assignment' } },
      { status: 400 }
    );
  }
}
