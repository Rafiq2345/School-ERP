import { NextRequest, NextResponse } from 'next/server';
import { PromotionService } from '@/lib/services/promotion-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceSessionId = searchParams.get('sourceSessionId');
  const sourceClassId = searchParams.get('sourceClassId');
  const sourceSectionId = searchParams.get('sourceSectionId') || undefined;
  const targetClassId = searchParams.get('targetClassId') || undefined;

  if (!sourceSessionId || !sourceClassId) {
    return NextResponse.json(
      { success: false, error: { message: 'Source session and source class are required.' } },
      { status: 400 }
    );
  }

  try {
    const data = await PromotionService.getPromotionPreview(auth.tenantId, {
      sourceSessionId,
      sourceClassId,
      sourceSectionId,
      targetClassId,
    });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to fetch promotion preview' } }, { status: 400 });
  }
}
