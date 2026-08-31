import { NextRequest, NextResponse } from 'next/server';
import { ShiftService } from '@/lib/services/shift-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;

    const data = await ShiftService.getShiftById(tenantId, id);
    if (!data) {
      return NextResponse.json({ success: false, error: { message: 'Shift not found' } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch shift details' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = request.headers.get('x-user-id') || undefined;
    const { id } = await params;
    const body = await request.json();

    const result = await ShiftService.updateShift(tenantId, id, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update shift' } },
      { status: 400 }
    );
  }
}
