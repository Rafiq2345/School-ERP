import { NextRequest, NextResponse } from 'next/server';
import { ModuleSettingsService } from '@/lib/services/module-settings-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const modules = await ModuleSettingsService.getTenantModuleSettings(auth.tenantId);
    return NextResponse.json({ success: true, data: modules });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list modules' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { moduleCode, isEnabled } = body;

    if (!moduleCode || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'moduleCode and isEnabled boolean are required' } },
        { status: 400 }
      );
    }

    const updated = await ModuleSettingsService.toggleModule(
      auth.tenantId,
      moduleCode,
      isEnabled,
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update module status' } },
      { status: 400 }
    );
  }
}
