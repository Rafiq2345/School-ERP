import { NextRequest, NextResponse } from 'next/server';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;

    const data = await WorkScheduleService.getWorkScheduleById(tenantId, id);
    if (!data) {
      return NextResponse.json({ success: false, error: { message: 'Work schedule not found' } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch work schedule details' } },
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

    const result = await WorkScheduleService.updateWorkSchedule(tenantId, id, body, userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update work schedule' } },
      { status: 400 }
    );
  }
}
