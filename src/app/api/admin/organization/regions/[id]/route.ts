import { NextRequest, NextResponse } from 'next/server';
import { RegionService } from '@/lib/services/region-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const region = await RegionService.getRegionById(auth.tenantId, id);
    return NextResponse.json({ success: true, data: region });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Region not found.' } },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await RegionService.updateRegion(
      auth.tenantId,
      id,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update Region.' } },
      { status: 400 }
    );
  }
}
