import { NextRequest, NextResponse } from 'next/server';
import { RegionService } from '@/lib/services/region-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityOrPrefix = searchParams.get('city') || searchParams.get('prefix') || undefined;

  try {
    const code = await RegionService.generateRegionCode(auth.tenantId, cityOrPrefix);
    return NextResponse.json({ success: true, data: { code } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate Region code.' } },
      { status: 500 }
    );
  }
}
