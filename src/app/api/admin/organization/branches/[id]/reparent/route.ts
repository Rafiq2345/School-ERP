import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(
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
    const updated = await BranchService.reparentBranch(
      auth.tenantId,
      id,
      {
        headOfficeId: body.headOfficeId,
        regionId: body.regionId,
        zoneId: body.zoneId,
        reason: body.reason,
      },
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to reparent Branch.' } },
      { status: 400 }
    );
  }
}
