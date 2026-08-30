import { NextRequest, NextResponse } from 'next/server';
import { RolePermissionService } from '@/lib/services/role-permission-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  try {
    const role = await RolePermissionService.getRoleById(auth.tenantId, id);
    return NextResponse.json({ success: true, data: role });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch role' } },
      { status: 404 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await RolePermissionService.updateRole(auth.tenantId, id, body, auth.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update role' } },
      { status: 400 }
    );
  }
}
