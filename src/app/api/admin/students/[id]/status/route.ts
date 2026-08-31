import { NextRequest, NextResponse } from 'next/server';
import { StudentLifecycleService } from '@/lib/services/student-lifecycle-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const result = await StudentLifecycleService.changeStudentStatus(
      auth.tenantId,
      id,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to update student status' } }, { status: 400 });
  }
}
