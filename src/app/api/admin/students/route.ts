import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId') || undefined;
  const classId = searchParams.get('classId') || undefined;
  const sectionId = searchParams.get('sectionId') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const houseId = searchParams.get('houseId') || undefined;
  const status = searchParams.get('status') || undefined;
  const gender = searchParams.get('gender') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const pageSize = searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 15;

  try {
    const res = await StudentService.getStudents(auth.tenantId, {
      sessionId,
      classId,
      sectionId,
      categoryId,
      houseId,
      status,
      gender,
      search,
      page,
      pageSize,
    });
    return NextResponse.json({ success: true, data: res.data, pagination: res.pagination });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to list students' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const created = await StudentService.createStudent(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Failed to create student' } }, { status: 400 });
  }
}
