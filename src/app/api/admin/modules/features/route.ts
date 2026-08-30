import { NextRequest, NextResponse } from 'next/server';
import { ModuleSettingsService } from '@/lib/services/module-settings-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function PUT(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { moduleCode, featureKey, isEnabled } = body;

    if (!moduleCode || !featureKey || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'moduleCode, featureKey, and isEnabled boolean are required' } },
        { status: 400 }
      );
    }

    const updated = await ModuleSettingsService.toggleFeature(
      auth.tenantId,
      moduleCode,
      featureKey,
      isEnabled,
      auth.userId
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to update feature status' } },
      { status: 400 }
    );
  }
}
