import { NextRequest, NextResponse } from 'next/server';
import { PromotionService } from '@/lib/services/promotion-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const result = await PromotionService.rollbackPromotionBatch(
      auth.tenantId,
      id,
      body.reason || 'Administrative rollback',
      auth.userId
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to rollback promotion batch' } }, { status: 400 });
  }
}
