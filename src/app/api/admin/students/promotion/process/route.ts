import { NextRequest, NextResponse } from 'next/server';
import { PromotionService } from '@/lib/services/promotion-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const batch = await PromotionService.processBulkPromotion(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to execute bulk promotion' } }, { status: 400 });
  }
}
