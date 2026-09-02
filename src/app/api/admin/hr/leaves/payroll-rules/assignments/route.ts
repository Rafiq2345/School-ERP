import { NextRequest, NextResponse } from 'next/server';
import { AttendancePayrollRuleService } from '@/lib/services/attendance-payroll-rule-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('policyId') || undefined;

    const data = await AttendancePayrollRuleService.listAssignments(tenantId, policyId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch assignments' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const body = await request.json();

    const data = await AttendancePayrollRuleService.createAssignment(tenantId, body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create assignment' } },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('Assignment ID is required');

    await AttendancePayrollRuleService.deleteAssignment(tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete assignment' } },
      { status: 400 }
    );
  }
}
