import { NextRequest, NextResponse } from 'next/server';
import { RolePermissionService } from '@/lib/services/role-permission-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: { message: 'permissionIds must be an array of IDs' } },
        { status: 400 }
      );
    }

    const result = await RolePermissionService.assignRolePermissions(
      auth.tenantId,
      id,
      permissionIds,
      auth.userId
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update role permissions' } },
      { status: 400 }
    );
  }
}
