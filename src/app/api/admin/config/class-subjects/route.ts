import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigService } from '@/lib/services/admin-config-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const academicSessionId = searchParams.get('academicSessionId') || undefined;
  const classId = searchParams.get('classId') || undefined;
  const isActive = searchParams.get('isActive') !== null ? searchParams.get('isActive') === 'true' : undefined;

  try {
    const mappings = await AdminConfigService.getClassSubjects(auth.tenantId, {
      academicSessionId,
      classId,
      isActive,
    });
    return NextResponse.json({ success: true, data: mappings });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to list class subjects' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academicSessionId, classId, assignments } = body;

    if (!academicSessionId || !classId || !Array.isArray(assignments)) {
      return NextResponse.json(
        { success: false, error: { message: 'academicSessionId, classId, and assignments array are required' } },
        { status: 400 }
      );
    }

    const created = await AdminConfigService.assignClassSubjects(
      auth.tenantId,
      academicSessionId,
      classId,
      assignments,
      auth.userId
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to assign class subjects' } },
      { status: 400 }
    );
  }
}
