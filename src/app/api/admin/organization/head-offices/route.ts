import { NextRequest, NextResponse } from 'next/server';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const city = searchParams.get('city') || undefined;

  try {
    const result = await HeadOfficeService.getHeadOffices(auth.tenantId, { search, status, city });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list Head Offices.' } },
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
    const created = await HeadOfficeService.createHeadOffice(
      auth.tenantId,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create Head Office.' } },
      { status: 400 }
    );
  }
}

