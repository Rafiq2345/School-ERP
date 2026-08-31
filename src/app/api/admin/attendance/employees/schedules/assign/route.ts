import { NextRequest, NextResponse } from 'next/server';
import { WorkScheduleService } from '@/lib/services/work-schedule-service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = request.headers.get('x-user-id') || undefined;
    const body = await request.json();

    const result = await WorkScheduleService.assignScheduleBulk(tenantId, {
      ...body,
      userId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to assign work schedule' } },
      { status: 400 }
    );
  }
}
