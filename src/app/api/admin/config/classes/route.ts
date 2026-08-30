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
  const classCategoryId = searchParams.get('classCategoryId') || undefined;
  const isActive = searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined;

  try {
    const classes = await AdminConfigService.getSchoolClasses(auth.tenantId, {
      search,
      classCategoryId,
      isActive,
    });
    return NextResponse.json({ success: true, data: classes });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list classes' } },
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
    const created = await AdminConfigService.createSchoolClass(
      auth.tenantId,
      {
        name: body.name,
        code: body.code,
        classCategoryId: body.classCategoryId || null,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        description: body.description,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create class' } },
      { status: 400 }
    );
  }
}
