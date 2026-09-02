import { NextRequest, NextResponse } from 'next/server';
import { PayrollDeductionInputService } from '@/lib/services/payroll-deduction-input-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'tenant-sch-001';
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const sourceType = (searchParams.get('sourceType') as any) || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const payrollPeriodStart = searchParams.get('payrollPeriodStart') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const result = await PayrollDeductionInputService.queryInputs({
      tenantId,
      employeeId,
      sourceType,
      status,
      payrollPeriodStart,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to query deduction inputs' } },
      { status: 500 }
    );
  }
}
