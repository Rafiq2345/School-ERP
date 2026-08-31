import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const userId = request.headers.get('x-user-id') || undefined;
    const body = await request.json();

    const result = await EmployeeAttendanceService.saveDailyEmployeeAttendance(tenantId, {
      ...body,
      recordedByUserId: userId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to save employee attendance' } },
      { status: 400 }
    );
  }
}
