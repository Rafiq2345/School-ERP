import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const data = await AttendanceService.getAttendanceAuditLogs(auth.tenantId, {
      studentId,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to fetch attendance audit logs' } }, { status: 400 });
  }
}
