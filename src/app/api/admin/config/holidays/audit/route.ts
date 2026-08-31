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
    const holidayId = searchParams.get('holidayId') || undefined;

    const logs = await HolidayService.getHolidayAuditLogs(auth.tenantId, holidayId);
    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to fetch holiday audit logs' } }, { status: 500 });
  }
}
