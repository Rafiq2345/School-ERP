import { NextRequest, NextResponse } from 'next/server';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stateId = searchParams.get('stateId');

  if (!stateId) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const cities = await GlobalReferenceService.getCitiesByState(stateId);
    return NextResponse.json({ success: true, data: cities });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to load cities.' } },
      { status: 500 }
    );
  }
}

