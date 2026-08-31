import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const res = await AttendanceService.saveDailyAttendance(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to save attendance' } }, { status: 400 });
  }
}
