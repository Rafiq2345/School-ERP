import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;

    const stats = await AttendanceService.getTodayAttendanceDashboard(auth.tenantId, date, sessionId);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to load attendance dashboard stats' } }, { status: 400 });
  }
}
