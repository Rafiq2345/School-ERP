import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/lib/services/dashboard-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    const tenantId = auth?.tenantId || 'tenant-sch-001';

    const data = await DashboardService.getExecutiveOverview(tenantId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[DashboardOverviewAPI] Error fetching executive overview:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch executive dashboard overview' } },
      { status: 500 }
    );
  }
}
