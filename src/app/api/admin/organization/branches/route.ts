import { NextRequest, NextResponse } from 'next/server';
import { BranchService } from '@/lib/services/branch-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const structureMode = (searchParams.get('structureMode') as any) || undefined;
  const headOfficeId = searchParams.get('headOfficeId') || undefined;
  const regionId = searchParams.get('regionId') || undefined;
  const zoneId = searchParams.get('zoneId') || undefined;
  const schoolType = searchParams.get('schoolType') || undefined;
  const city = searchParams.get('city') || undefined;

  try {
    const result = await BranchService.getBranches(auth.tenantId, {
      search,
      status,
      structureMode,
      headOfficeId,
      regionId,
      zoneId,
      schoolType,
      city,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list Branches.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const created = await BranchService.createBranch(
      auth.tenantId,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to create Branch.' } },
      { status: 400 }
    );
  }
}
