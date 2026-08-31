import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const departmentId = searchParams.get('departmentId') || undefined;
    const designationId = searchParams.get('designationId') || undefined;
    const shiftId = searchParams.get('shiftId') || undefined;
    const search = searchParams.get('search') || undefined;

    const data = await EmployeeAttendanceService.getDailyEmployeeRoster(tenantId, date, {
      departmentId,
      designationId,
      shiftId,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch roster' } },
      { status: 500 }
    );
  }
}
