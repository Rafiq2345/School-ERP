import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import { HolidayService } from '@/lib/services/holiday-service';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const classId = searchParams.get('classId') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;
    const includeBreakdown = searchParams.get('breakdown') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: { message: 'startDate and endDate are required' } }, { status: 400 });
    }

    const result = await HolidayService.getWorkingDaysCount(auth.tenantId, startDate, endDate, {
      classId,
      sessionId,
      includeBreakdown,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to calculate working days' } }, { status: 500 });
  }
}
