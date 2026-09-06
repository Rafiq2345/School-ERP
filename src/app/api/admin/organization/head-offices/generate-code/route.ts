import { NextRequest, NextResponse } from 'next/server';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityCodeOrName = searchParams.get('city') || undefined;

  try {
    const code = await HeadOfficeService.generateHeadOfficeCode(auth.tenantId, cityCodeOrName);
    return NextResponse.json({ success: true, data: { code } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate code.' } },
      { status: 500 }
    );
  }
}

