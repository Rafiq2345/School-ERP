import { NextRequest, NextResponse } from 'next/server';
import { FormAnalyzerService } from '@/lib/services/form-analyzer-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const { fields } = body;

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { success: false, error: { message: 'fields array is required for approval' } },
        { status: 400 }
      );
    }

    const result = await FormAnalyzerService.approveCustomFields(
      auth.tenantId,
      fields,
      auth.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to approve custom fields' } },
      { status: 400 }
    );
  }
}
