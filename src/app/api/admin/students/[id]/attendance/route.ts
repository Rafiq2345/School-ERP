import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || undefined;

    const data = await AttendanceService.getStudentAttendanceSummary(auth.tenantId, id, sessionId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to load student attendance summary' } }, { status: 400 });
  }
}
