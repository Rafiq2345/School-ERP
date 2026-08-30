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
  const classId = searchParams.get('classId') || undefined;
  const isActive = searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined;

  try {
    const sections = await AdminConfigService.getSections(auth.tenantId, {
      search,
      classId,
      isActive,
    });
    return NextResponse.json({ success: true, data: sections });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list sections' } },
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
    const created = await AdminConfigService.createSection(
      auth.tenantId,
      {
        classId: body.classId,
        name: body.name,
        code: body.code,
        capacity: body.capacity !== undefined && body.capacity !== null ? Number(body.capacity) : null,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create section' } },
      { status: 400 }
    );
  }
}
