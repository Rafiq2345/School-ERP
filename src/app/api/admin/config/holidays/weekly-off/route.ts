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

    const setting = await HolidayService.getWeeklyOffSetting(auth.tenantId, sessionId);
    return NextResponse.json({ success: true, data: setting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to get weekly offs' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await req.json();
    const updated = await HolidayService.updateWeeklyOffSetting(auth.tenantId, body, auth.userId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to update weekly offs' } }, { status: 400 });
  }
}
