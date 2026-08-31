import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/services/attendance-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const date = searchParams.get('date') || new Date();
    const sessionId = searchParams.get('sessionId') || undefined;

    if (!classId || !sectionId) {
      return NextResponse.json({ success: false, error: { message: 'classId and sectionId are required' } }, { status: 400 });
    }

    const data = await AttendanceService.getClassRosterForAttendance(auth.tenantId, {
      classId,
      sectionId,
      date,
      sessionId,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to load class roster' } }, { status: 400 });
  }
}
