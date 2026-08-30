import { NextRequest, NextResponse } from 'next/server';
import { PlatformBillingService } from '@/lib/services/platform-billing-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { proofId, approved, rejectionReason } = body;

    if (!proofId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'proofId and approved boolean are required' } },
        { status: 400 }
      );
    }

    const result = await PlatformBillingService.verifyPayment(
      auth.tenantId,
      proofId,
      auth.userId,
      approved,
      rejectionReason
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to verify payment' } },
      { status: 400 }
    );
  }
}
