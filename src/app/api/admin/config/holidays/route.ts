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
    const sessionId = searchParams.get('sessionId') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const classId = searchParams.get('classId') || undefined;

    const holidays = await HolidayService.getHolidays(auth.tenantId, {
      sessionId,
      status,
      startDate,
      endDate,
      classId,
    });

    return NextResponse.json({ success: true, data: holidays });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to fetch holidays' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json();
    const result = await HolidayService.createHoliday(auth.tenantId, body, auth.userId);

    if (result.conflictResult && result.conflictResult.hasConflict) {
      return NextResponse.json(
        {
          success: false,
          hasConflict: true,
          conflictDetails: result.conflictResult,
          error: { message: 'Existing attendance records conflict with this proposed holiday.' },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: result.holiday });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to create holiday' } }, { status: 400 });
  }
}
