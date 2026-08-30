import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigService } from '@/lib/services/admin-config-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await AdminConfigService.updateAcademicSession(
      auth.tenantId,
      id,
      {
        name: body.name,
        code: body.code,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isCurrent: body.isCurrent !== undefined ? Boolean(body.isCurrent) : undefined,
        status: body.status,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update session' } },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await AdminConfigService.updateAcademicSession(
      auth.tenantId,
      id,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update session status' } },
      { status: 400 }
    );
  }
}
