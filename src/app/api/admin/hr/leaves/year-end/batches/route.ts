import { NextRequest, NextResponse } from 'next/server';
import { LeaveYearEndService } from '@/lib/services/leave-year-end-service';
import { AppError } from '@/lib/errors/app-error';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'tenant-sch-001';
    const batches = await LeaveYearEndService.listBatches(tenantId);
    return NextResponse.json(batches);
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
