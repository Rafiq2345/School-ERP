import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const stats = await StudentService.getStudentSummaryStats(auth.tenantId);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to get stats' } }, { status: 500 });
  }
}
