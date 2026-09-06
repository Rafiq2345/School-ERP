import { NextRequest, NextResponse } from 'next/server';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const countryId = searchParams.get('countryId');

  if (!countryId) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const states = await GlobalReferenceService.getStatesByCountry(countryId);
    return NextResponse.json({ success: true, data: states });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to load states/provinces.' } },
      { status: 500 }
    );
  }
}

