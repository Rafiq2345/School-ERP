import { NextRequest, NextResponse } from 'next/server';
import { GlobalReferenceService } from '@/lib/services/global-reference-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const currencies = await GlobalReferenceService.getCurrencies();
    return NextResponse.json({ success: true, data: currencies });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to load currencies.' } },
      { status: 500 }
    );
  }
}

