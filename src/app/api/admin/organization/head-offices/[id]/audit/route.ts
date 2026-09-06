import { NextRequest, NextResponse } from 'next/server';
import { HeadOfficeService } from '@/lib/services/head-office-service';
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
    const logs = await HeadOfficeService.getHeadOfficeAuditLogs(auth.tenantId, id);
    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch audit logs.' } },
      { status: 500 }
    );
  }
}

