import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const student = await StudentService.getStudentById(auth.tenantId, id);
    return NextResponse.json({ success: true, data: student });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Student not found' } }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await StudentService.updateStudent(auth.tenantId, id, body, auth.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to update student' } }, { status: 400 });
  }
}
