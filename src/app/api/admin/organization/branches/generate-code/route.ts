import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get('prefix') || searchParams.get('city') || undefined;

  try {
    const code = await BranchService.generateBranchCode(auth.tenantId, prefix);
    return NextResponse.json({ success: true, data: { code } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate Branch code.' } },
      { status: 500 }
    );
  }
}
