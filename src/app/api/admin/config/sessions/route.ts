import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigService } from '@/lib/services/admin-config-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;

  try {
    const sessions = await AdminConfigService.getAcademicSessions(auth.tenantId, { search, status });
    return NextResponse.json({ success: true, data: sessions });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list sessions' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const created = await AdminConfigService.createAcademicSession(
      auth.tenantId,
      {
        name: body.name,
        code: body.code,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isCurrent: Boolean(body.isCurrent),
        status: body.status,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create session' } },
      { status: 400 }
    );
  }
}
