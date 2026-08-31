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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sessionId = searchParams.get('sessionId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;

    if (!classId || !sectionId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { message: 'classId, sectionId, startDate, and endDate are required' } },
        { status: 400 }
      );
    }

    const data = await AttendanceService.getAttendanceRegister(auth.tenantId, {
      classId,
      sectionId,
      startDate,
      endDate,
      sessionId,
      studentId,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to generate attendance register' } }, { status: 400 });
  }
}
