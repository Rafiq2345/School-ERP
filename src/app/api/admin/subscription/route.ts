import { NextRequest, NextResponse } from 'next/server';
import { PlatformBillingService } from '@/lib/services/platform-billing-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const overview = await PlatformBillingService.getSubscriptionOverview(auth.tenantId);
    return NextResponse.json({ success: true, data: overview });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to load subscription overview' } },
      { status: 500 }
    );
  }
}
