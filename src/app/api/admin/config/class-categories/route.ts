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
  const isActive = searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined;

  try {
    const categories = await AdminConfigService.getClassCategories(auth.tenantId, { search, isActive });
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list categories' } },
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
    const created = await AdminConfigService.createClassCategory(
      auth.tenantId,
      {
        name: body.name,
        code: body.code,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        description: body.description,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create category' } },
      { status: 400 }
    );
  }
}
