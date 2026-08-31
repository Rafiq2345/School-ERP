import { NextRequest, NextResponse } from 'next/server';
import { CustomFieldService } from '@/lib/services/custom-field-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const fields = await CustomFieldService.getCustomFieldsForEntity(auth.tenantId, 'STUDENT');
    return NextResponse.json({ success: true, data: fields });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch custom fields' } },
      { status: 500 }
    );
  }
}
