import { prisma } from '../db/prisma';
import { AttendanceService } from './attendance-service';
import { EmployeeAttendanceService } from './employee-attendance-service';
import { LeaveApprovalService } from './leave-approval-service';

export interface DashboardOverviewDTO {
  school: {
    nameEn: string;
    nameUr: string;
    code: string;
    logoUrl: string | null;
    tagline: string | null;
    timezone: string;
    currencySymbol: string;
    currencyCode: string;
    activeSessionName: string;
    activeSessionId: string | null;
  };
  kpis: {
    totalStudents: number;
    activeStudents: number;
    maleStudents: number;
    femaleStudents: number;
    todayAttendancePct: number;
    todayPresentStudents: number;
    todayAbsentStudents: number;
    isTodayHoliday: boolean;
    todayHolidayName: string | null;
    feeCollectedThisMonth: number;
    feeGeneratedThisMonth: number;
    feeCollectionGrowthPct: number | null;
    outstandingReceivables: number;
    newAdmissionsThisMonth: number;
    admissionsGrowthDiff: number | null;
    pendingApprovalsCount: number;
    activeStaffCount: number;
  };
  financialOverview: {
    period: string;
    feeGenerated: number;
    feeCollected: number;
    collectionPercentage: number;
    outstandingReceivables: number;
    discountsConcessions: number;
    monthlyTrend: Array<{
      month: string;
      generated: number;
      collected: number;
      outstanding: number;
    }>;
  };
  receivablesAging: {
    totalReceivables: number;
    buckets: {
      current: { amount: number; percentage: number; count: number };
      days1To30: { amount: number; percentage: number; count: number };
      days31To60: { amount: number; percentage: number; count: number };
      days61To90: { amount: number; percentage: number; count: number };
      days90Plus: { amount: number; percentage: number; count: number };
    };
  };
  admissionsGrowth: {
    totalAdmittedYear: number;
    totalWithdrawnYear: number;
    netGrowth: number;
    monthlyTrend: Array<{
      month: string;
      admissions: number;
      withdrawals: number;
    }>;
  };
  attendanceTrend: {
    summaryPct: number;
    workingDaysCount: number;
    holidaysCount: number;
    dailyTrend: Array<{
      date: string;
      dayName: string;
      percentage: number;
      isHoliday: boolean;
      present: number;
      total: number;
    }>;
  };
  pendingApprovals: Array<{
    id: string;
    type: string;
    title: string;
    requesterName: string;
    department: string | null;
    details: string;
    date: string;
    urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
    actionUrl: string;
  }>;
  recentActivity: Array<{
    id: string;
    module: string;
    action: string;
    description: string;
    user: string;
    timestamp: string;
    relativeTime: string;
  }>;
}

export class DashboardService {
  /**
   * Generates a complete executive dashboard overview in parallel without N+1 queries.
   */
  public static async getExecutiveOverview(tenantId: string): Promise<DashboardOverviewDTO> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Parallel Database Queries
    const [
      schoolProfile,
      activeSession,
      studentsSummary,
      admissionsThisMonthCount,
      admissionsLastMonthCount,
      withdrawalsCount,
      allStudentsWithDates,
      activeStaffCount,
      todayAttendance,
      attendance30DaysRecords,
      holidays30Days,
      invoices,
      pendingLeaveApprovals,
      auditLogs,
    ] = await Promise.all([
      // 1. School Profile
      prisma.schoolProfile.findFirst({
        where: { tenantId },
      }),

      // 2. Active Session
      prisma.academicSession.findFirst({
        where: {
          tenantId,
          OR: [{ isCurrent: true }, { status: 'ACTIVE' }],
        },
      }),

      // 3. Student Counts
      prisma.student.groupBy({
        by: ['currentStatus', 'gender'],
        where: { tenantId },
        _count: { _all: true },
      }),

      // 4. New admissions this month
      prisma.student.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),

      // 5. Admissions last month for historical comparison
      prisma.student.count({
        where: {
          tenantId,
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
      }),

      // 6. Withdrawals count
      prisma.student.count({
        where: {
          tenantId,
          currentStatus: { in: ['WITHDRAWN', 'LEFT'] },
        },
      }),

      // 7. Student monthly creation dates for admissions trend
      prisma.student.findMany({
        where: {
          tenantId,
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
        },
        select: {
          id: true,
          createdAt: true,
          currentStatus: true,
        },
      }),

      // 8. Staff count
      prisma.employee.count({
        where: { tenantId, currentStatus: 'ACTIVE' },
      }),

      // 9. Today's Student Attendance
      AttendanceService.getTodayAttendanceDashboard(tenantId, todayStr).catch(() => null),

      // 10. 30 Days Student Attendance Records
      prisma.studentAttendanceRecord.findMany({
        where: {
          tenantId,
          attendanceDate: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          attendanceDate: true,
          status: true,
        },
      }),

      // 11. 30 Days Holidays
      prisma.schoolHoliday.findMany({
        where: {
          tenantId,
          startDate: { lte: now },
          endDate: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: 'ACTIVE',
        },
      }),

      // 12. Invoices & Billing
      prisma.providerInvoice.findMany({
        where: { tenantId },
        orderBy: { issueDate: 'desc' },
      }),

      // 13. Pending Leave Approvals
      LeaveApprovalService.getPendingApprovals(tenantId, { limit: 5 }).catch(() => ({
        total: 0,
        items: [],
      })),

      // 14. Recent Audit Logs
      prisma.auditLog.findMany({
        where: { tenantId },
        take: 8,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // Compute Student Stats
    let totalStudents = 0;
    let activeStudents = 0;
    let maleStudents = 0;
    let femaleStudents = 0;

    for (const group of studentsSummary) {
      const count = group._count._all;
      totalStudents += count;
      if (group.currentStatus === 'ACTIVE') {
        activeStudents += count;
      }
      if (group.gender === 'MALE') maleStudents += count;
      if (group.gender === 'FEMALE') femaleStudents += count;
    }

    // Historical diffs
    const admissionsGrowthDiff =
      admissionsLastMonthCount > 0
        ? admissionsThisMonthCount - admissionsLastMonthCount
        : null;

    // Financial calculations
    let feeGenerated = 0;
    let feeCollected = 0;
    let outstandingReceivables = 0;
    let discountsConcessions = 0;
    let feeCollectedThisMonth = 0;
    let feeGeneratedThisMonth = 0;

    const monthlyFinancialMap: Record<
      string,
      { generated: number; collected: number; outstanding: number }
    > = {};

    // Initialize last 6 months in trend map
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthlyFinancialMap[mKey] = { generated: 0, collected: 0, outstanding: 0 };
    }

    // Aging Buckets
    const agingBuckets = {
      current: { amount: 0, percentage: 0, count: 0 },
      days1To30: { amount: 0, percentage: 0, count: 0 },
      days31To60: { amount: 0, percentage: 0, count: 0 },
      days61To90: { amount: 0, percentage: 0, count: 0 },
      days90Plus: { amount: 0, percentage: 0, count: 0 },
    };

    for (const inv of invoices) {
      const total = Number(inv.totalPayable) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const discount = Number(inv.discountAmount) || 0;
      const remaining = Math.max(0, total - paid);

      feeGenerated += total;
      feeCollected += paid;
      outstandingReceivables += remaining;
      discountsConcessions += discount;

      const issueMonthKey = new Date(inv.issueDate).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      if (monthlyFinancialMap[issueMonthKey]) {
        monthlyFinancialMap[issueMonthKey].generated += total;
        monthlyFinancialMap[issueMonthKey].collected += paid;
        monthlyFinancialMap[issueMonthKey].outstanding += remaining;
      }

      if (
        inv.issueDate >= startOfMonth &&
        inv.issueDate < startOfNextMonth
      ) {
        feeGeneratedThisMonth += total;
        feeCollectedThisMonth += paid;
      }

      // Calculate Aging for Unpaid / Partially Paid
      if (remaining > 0 && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'WAIVED') {
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          agingBuckets.current.amount += remaining;
          agingBuckets.current.count += 1;
        } else if (diffDays <= 30) {
          agingBuckets.days1To30.amount += remaining;
          agingBuckets.days1To30.count += 1;
        } else if (diffDays <= 60) {
          agingBuckets.days31To60.amount += remaining;
          agingBuckets.days31To60.count += 1;
        } else if (diffDays <= 90) {
          agingBuckets.days61To90.amount += remaining;
          agingBuckets.days61To90.count += 1;
        } else {
          agingBuckets.days90Plus.amount += remaining;
          agingBuckets.days90Plus.count += 1;
        }
      }
    }

    if (outstandingReceivables > 0) {
      agingBuckets.current.percentage = Math.round(
        (agingBuckets.current.amount / outstandingReceivables) * 100
      );
      agingBuckets.days1To30.percentage = Math.round(
        (agingBuckets.days1To30.amount / outstandingReceivables) * 100
      );
      agingBuckets.days31To60.percentage = Math.round(
        (agingBuckets.days31To60.amount / outstandingReceivables) * 100
      );
      agingBuckets.days61To90.percentage = Math.round(
        (agingBuckets.days61To90.amount / outstandingReceivables) * 100
      );
      agingBuckets.days90Plus.percentage = Math.round(
        (agingBuckets.days90Plus.amount / outstandingReceivables) * 100
      );
    }

    const collectionPercentage =
      feeGenerated > 0 ? Math.round((feeCollected / feeGenerated) * 100) : 0;

    const monthlyTrend = Object.entries(monthlyFinancialMap).map(
      ([month, data]) => ({
        month,
        generated: data.generated,
        collected: data.collected,
        outstanding: data.outstanding,
      })
    );

    // Admissions monthly growth trend
    const admissionsMonthMap: Record<string, { admissions: number; withdrawals: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = d.toLocaleString('en-US', { month: 'short' });
      admissionsMonthMap[mKey] = { admissions: 0, withdrawals: 0 };
    }

    for (const st of allStudentsWithDates) {
      const mKey = new Date(st.createdAt).toLocaleString('en-US', { month: 'short' });
      if (admissionsMonthMap[mKey]) {
        admissionsMonthMap[mKey].admissions += 1;
        if (st.currentStatus === 'WITHDRAWN' || st.currentStatus === 'LEFT') {
          admissionsMonthMap[mKey].withdrawals += 1;
        }
      }
    }

    const admissionsMonthlyTrend = Object.entries(admissionsMonthMap).map(
      ([month, data]) => ({
        month,
        admissions: data.admissions,
        withdrawals: data.withdrawals,
      })
    );

    // Attendance 30-day daily trend
    const dailyAttendanceMap: Record<
      string,
      { present: number; total: number; isHoliday: boolean }
    > = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const isSun = d.getDay() === 0;

      const isHoliday =
        isSun ||
        holidays30Days.some(
          (h) =>
            new Date(h.startDate) <= d && new Date(h.endDate) >= d
        );

      dailyAttendanceMap[dateKey] = {
        present: 0,
        total: activeStudents || totalStudents,
        isHoliday,
      };
    }

    for (const rec of attendance30DaysRecords) {
      const dateKey = new Date(rec.attendanceDate).toISOString().split('T')[0];
      if (dailyAttendanceMap[dateKey]) {
        if (rec.status === 'PRESENT' || rec.status === 'LATE') {
          dailyAttendanceMap[dateKey].present += 1;
        }
      }
    }

    const dailyTrend = Object.entries(dailyAttendanceMap).map(
      ([date, data]) => {
        const d = new Date(date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const percentage =
          !data.isHoliday && data.total > 0
            ? Math.round((data.present / data.total) * 100)
            : 0;

        return {
          date,
          dayName,
          percentage,
          isHoliday: data.isHoliday,
          present: data.present,
          total: data.total,
        };
      }
    );

    const workingDaysList = dailyTrend.filter((d) => !d.isHoliday);
    const avgAttendancePct =
      workingDaysList.length > 0
        ? Math.round(
            workingDaysList.reduce((sum, d) => sum + d.percentage, 0) /
              workingDaysList.length
          )
        : todayAttendance?.attendancePercentage || 0;

    // Pending Approvals Queue
    const approvalItems = (pendingLeaveApprovals.items || []).map((item: any) => ({
      id: item.id,
      type: 'LEAVE',
      title: `${item.leaveType?.name || 'Leave'} Application`,
      requesterName: item.employee?.name || item.employeeName || 'Staff Member',
      department: item.employee?.department?.name || null,
      details: `${item.totalDays || 1} day(s) (${new Date(
        item.startDate
      ).toLocaleDateString('en-GB')} - ${new Date(item.endDate).toLocaleDateString('en-GB')})`,
      date: new Date(item.createdAt || now).toLocaleDateString('en-GB'),
      urgency: item.totalDays > 3 ? ('HIGH' as const) : ('NORMAL' as const),
      actionUrl: '/admin/hr/leaves/approvals',
    }));

    // Recent Activity from Audit Logs
    const recentActivityItems = auditLogs.map((log) => {
      const timeDiff = Math.floor(
        (now.getTime() - new Date(log.timestamp).getTime()) / (1000 * 60)
      );
      let relativeTime = `${timeDiff}m ago`;
      if (timeDiff >= 60 && timeDiff < 1440) {
        relativeTime = `${Math.floor(timeDiff / 60)}h ago`;
      } else if (timeDiff >= 1440) {
        relativeTime = `${Math.floor(timeDiff / 1440)}d ago`;
      }

      return {
        id: log.id,
        module: log.module,
        action: log.action,
        description:
          log.changeSummary ||
          `${log.action} performed on ${log.entityType}`,
        user: log.userRole || 'Admin User',
        timestamp: log.timestamp.toISOString(),
        relativeTime,
      };
    });

    return {
      school: {
        nameEn: schoolProfile?.nameEn || 'Al-Falah School',
        nameUr: schoolProfile?.nameUr || 'الفلاح اسکول',
        code: schoolProfile?.code || 'SCH-001',
        logoUrl: schoolProfile?.logoUrl || null,
        tagline: 'Complete School Management at Your Fingertips',
        timezone: schoolProfile?.timezone || 'Asia/Karachi',
        currencySymbol: schoolProfile?.currencySymbol || 'Rs.',
        currencyCode: schoolProfile?.currencyCode || 'PKR',
        activeSessionName: activeSession?.name || '2026-2027',
        activeSessionId: activeSession?.id || null,
      },
      kpis: {
        totalStudents,
        activeStudents,
        maleStudents,
        femaleStudents,
        todayAttendancePct: todayAttendance?.attendancePercentage || 0,
        todayPresentStudents: todayAttendance?.presentCount || 0,
        todayAbsentStudents: todayAttendance?.absentCount || 0,
        isTodayHoliday: todayAttendance?.isTodayHoliday || false,
        todayHolidayName: todayAttendance?.todayHolidayTitle || null,
        feeCollectedThisMonth,
        feeGeneratedThisMonth,
        feeCollectionGrowthPct: null,
        outstandingReceivables,
        newAdmissionsThisMonth: admissionsThisMonthCount,
        admissionsGrowthDiff,
        pendingApprovalsCount: pendingLeaveApprovals.total || 0,
        activeStaffCount,
      },
      financialOverview: {
        period: 'This Academic Year',
        feeGenerated,
        feeCollected,
        collectionPercentage,
        outstandingReceivables,
        discountsConcessions,
        monthlyTrend,
      },
      receivablesAging: {
        totalReceivables: outstandingReceivables,
        buckets: agingBuckets,
      },
      admissionsGrowth: {
        totalAdmittedYear: admissionsThisMonthCount,
        totalWithdrawnYear: withdrawalsCount,
        netGrowth: activeStudents,
        monthlyTrend: admissionsMonthlyTrend,
      },
      attendanceTrend: {
        summaryPct: avgAttendancePct,
        workingDaysCount: workingDaysList.length,
        holidaysCount: dailyTrend.length - workingDaysList.length,
        dailyTrend,
      },
      pendingApprovals: approvalItems,
      recentActivity: recentActivityItems,
    };
  }
}
