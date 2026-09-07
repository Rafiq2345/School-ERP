import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const logs = await BranchService.getBranchAuditLogs(auth.tenantId, id);
    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to retrieve Branch audit logs.' } },
      { status: 500 }
    );
  }
}
