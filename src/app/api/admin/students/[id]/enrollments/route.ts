import { NextRequest, NextResponse } from 'next/server';
import { StudentEnrollmentService } from '@/lib/services/student-enrollment-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const enrollment = await StudentEnrollmentService.promoteStudent(
      auth.tenantId,
      id,
      body,
      auth.userId
    );
    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to promote student' } }, { status: 400 });
  }
}
