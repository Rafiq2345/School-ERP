import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigService } from '@/lib/services/admin-config-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const profile = await AdminConfigService.getSchoolProfile(auth.tenantId);
    return NextResponse.json({ success: true, data: profile });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await AdminConfigService.updateSchoolProfile(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update profile' } },
      { status: 400 }
    );
  }
}
