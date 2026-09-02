import { NextRequest, NextResponse } from 'next/server';
import { PayrollDeductionPolicyService } from '@/lib/services/payroll-deduction-policy-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { id } = await params;
    const data = await PayrollDeductionPolicyService.getPolicyById(tenantId, id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch payroll rule' } },
      { status: 404 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const { id } = await params;
    const body = await request.json();

    const data = await PayrollDeductionPolicyService.updatePolicy(tenantId, id, body, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update payroll rule' } },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const { id } = await params;

    const data = await PayrollDeductionPolicyService.deactivatePolicy(tenantId, id, userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to deactivate payroll rule' } },
      { status: 400 }
    );
  }
}
