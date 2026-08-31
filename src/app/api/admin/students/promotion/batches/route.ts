import { NextRequest, NextResponse } from 'next/server';
import { PromotionService } from '@/lib/services/promotion-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const batches = await PromotionService.getPromotionBatches(auth.tenantId);
    return NextResponse.json({ success: true, data: batches });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to list promotion batches' } }, { status: 400 });
  }
}
