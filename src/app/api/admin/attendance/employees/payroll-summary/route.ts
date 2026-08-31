import { NextRequest, NextResponse } from 'next/server';
import { EmployeeAttendanceService } from '@/lib/services/employee-attendance-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const periodStart = searchParams.get('periodStart') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = searchParams.get('periodEnd') || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const data = await EmployeeAttendanceService.getPayrollAttendanceSummary(tenantId, periodStart, periodEnd);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch payroll summary' } },
      { status: 500 }
    );
  }
}
