import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  try {
    const guardians = await StudentService.searchGuardians(auth.tenantId, q);
    return NextResponse.json({ success: true, data: guardians });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to search guardians' } }, { status: 500 });
  }
}
