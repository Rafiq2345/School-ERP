import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import { HolidayService } from '@/lib/services/holiday-service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const updated = await HolidayService.updateHoliday(auth.tenantId, id, body, auth.userId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to update holiday' } }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.cancellationReason || 'Cancelled by administrator';

    const cancelled = await HolidayService.cancelHoliday(auth.tenantId, id, reason, auth.userId);

    return NextResponse.json({ success: true, data: cancelled });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to cancel holiday' } }, { status: 400 });
  }
}
