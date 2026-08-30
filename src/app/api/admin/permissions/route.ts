import { NextRequest, NextResponse } from 'next/server';
import { RolePermissionService } from '@/lib/services/role-permission-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const permissions = await RolePermissionService.getAvailablePermissions(auth.tenantId);
    return NextResponse.json({ success: true, data: permissions });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list permissions' } },
      { status: 500 }
    );
  }
}
