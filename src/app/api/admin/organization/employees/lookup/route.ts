import { NextRequest, NextResponse } from 'next/server';
import { HeadOfficeService } from '@/lib/services/head-office-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || undefined;

  try {
    const employees = await HeadOfficeService.getActiveEmployeesForLookup(auth.tenantId, search);
    return NextResponse.json({ success: true, data: employees });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to search employees.' } },
      { status: 500 }
    );
  }
}

