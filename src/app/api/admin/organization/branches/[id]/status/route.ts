import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function PATCH(
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
    const { status, reason } = body;

    if (!status || !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid status. Must be ACTIVE, INACTIVE, or ARCHIVED.' } },
        { status: 400 }
      );
    }

    const updated = await BranchService.toggleBranchStatus(
      auth.tenantId,
      id,
      status,
      reason,
      auth.userId
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to change Branch status.' } },
      { status: 400 }
    );
  }
}
