import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const status = await BranchService.getHierarchyMode(auth.tenantId);
    return NextResponse.json({ success: true, data: status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to check hierarchy mode' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const upgraded = await BranchService.upgradeToMultiBranch(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: upgraded });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to upgrade to multi-branch' } }, { status: 400 });
  }
}
