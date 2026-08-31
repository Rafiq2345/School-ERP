import { NextRequest, NextResponse } from 'next/server';
import { StudentEnrollmentService } from '@/lib/services/student-enrollment-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json();
    const { action, studentIds, targetId, status, reason } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, error: { message: 'studentIds array is required' } }, { status: 400 });
    }

    if (action === 'ASSIGN_SECTION') {
      const res = await StudentEnrollmentService.bulkAssignSection(auth.tenantId, studentIds, targetId, auth.userId);
      return NextResponse.json({ success: true, data: res });
    }

    if (action === 'UPDATE_CATEGORY') {
      const res = await StudentEnrollmentService.bulkUpdateCategory(auth.tenantId, studentIds, targetId, auth.userId);
      return NextResponse.json({ success: true, data: res });
    }

    if (action === 'UPDATE_HOUSE') {
      const res = await StudentEnrollmentService.bulkUpdateHouse(auth.tenantId, studentIds, targetId, auth.userId);
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, error: { message: 'Invalid bulk action type' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Bulk operation failed' } }, { status: 400 });
  }
}
