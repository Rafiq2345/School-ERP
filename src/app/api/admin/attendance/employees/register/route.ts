import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const departmentId = searchParams.get('departmentId') || undefined;
    const designationId = searchParams.get('designationId') || undefined;

    const data = await EmployeeAttendanceService.getEmployeeMonthlyRegister(tenantId, year, month, {
      departmentId,
      designationId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch monthly register' } },
      { status: 500 }
    );
  }
}
