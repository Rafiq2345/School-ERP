import { NextRequest, NextResponse } from 'next/server';
import { ZoneService } from '@/lib/services/zone-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityOrPrefix = searchParams.get('city') || searchParams.get('prefix') || undefined;

  try {
    const code = await ZoneService.generateZoneCode(auth.tenantId, cityOrPrefix);
    return NextResponse.json({ success: true, data: { code } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate Zone code.' } },
      { status: 500 }
    );
  }
}
