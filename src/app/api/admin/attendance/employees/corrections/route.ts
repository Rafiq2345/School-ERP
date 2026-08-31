import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const date = searchParams.get('date') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const data = await EmployeeAttendanceService.getEmployeeAttendanceCorrections(tenantId, {
      employeeId,
      date,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch corrections' } },
      { status: 500 }
    );
  }
}
