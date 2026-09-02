import { NextRequest, NextResponse } from 'next/server';
import { AttendancePayrollReconciliationService } from '@/lib/services/attendance-payroll-reconciliation-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const body = await request.json();
    const { periodStart, periodEnd, employeeId } = body;

    const startDate = periodStart ? new Date(periodStart) : new Date();
    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const summary = await AttendancePayrollReconciliationService.evaluatePeriodAttendance(
      tenantId,
      startDate,
      endDate,
      { employeeId, executeCommit: true, actorUserId: userId }
    );

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to execute reconciliation' } },
      { status: 400 }
    );
  }
}
