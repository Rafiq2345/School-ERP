import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/auth/server-auth';
import { PasswordRecoveryService } from '@/lib/services/password-recovery-service';

export async function GET(req: NextRequest) {
  try {
    const authContext = await resolveAuthContext(req);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const requests = await PasswordRecoveryService.listAdminRecoveryRequests(
      authContext.tenantId,
      { status, search }
    );

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
