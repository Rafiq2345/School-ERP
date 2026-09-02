import { NextRequest, NextResponse } from 'next/server';
import { PayrollDeductionInputService } from '@/lib/services/payroll-deduction-input-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const auth = await resolveAuthContext(request).catch(() => null);
    const userId = request.headers.get('x-user-id') || auth?.userId || undefined;
    const { id } = await params;
    const body = await request.json();

    const data = await PayrollDeductionInputService.reverseDeductionInput(
      tenantId,
      id,
      body.reason || 'Manual administrative reversal',
      userId
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to reverse deduction input' } },
      { status: 400 }
    );
  }
}
