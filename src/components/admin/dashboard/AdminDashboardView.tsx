'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  UserPlus,
  Receipt,
  FileCheck,
  Sliders,
  BookOpen,
  Calendar,
  Library,
  Package,
  Send,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  School,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  PieChart as PieIcon,
  CreditCard,
  Building2,
  Sparkles,
  Sun,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DashboardData {
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

export function AdminDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [financialPeriod, setFinancialPeriod] = useState<'MONTH' | 'SESSION' | 'YEAR'>('SESSION');

  // Live Pakistan Standard Time Clock & Date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Karachi',
        }) + ' PKT'
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Karachi',
        })
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard Overview from live API
  const loadOverview = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/admin/dashboard/overview');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load executive dashboard overview', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const d = data;
  const currSymbol = d?.school?.currencySymbol || 'Rs.';

  return (
    <div className="w-full space-y-3 sm:space-y-3.5 pb-6">
      {/* 1. Dashboard Hero / School Identity Row (ONE Clean Row, Perfectly Aligned) */}
      <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Section: Campus/School Image + Center-Left Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* School / Campus Visual Thumbnail (Aligned at the exact same left grid line as KPI cards) */}
          <div className="w-32 h-18 sm:w-36 sm:h-20 rounded-lg overflow-hidden border border-slate-200/80 shadow-2xs relative shrink-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center text-white p-2">
            {d?.school?.logoUrl ? (
              <img
                src={d.school.logoUrl}
                alt={d.school.nameEn || 'School Campus'}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <School className="w-5 h-5 text-blue-200 mb-0.5" />
                <span className="text-[10px] font-black uppercase text-blue-100 truncate max-w-[120px]">
                  {d?.school?.nameEn || 'Al-Falah Campus'}
                </span>
                <span className="text-[8px] text-blue-300/80 font-medium">Main Academic Wing</span>
              </div>
            )}
          </div>

          {/* Center-Left: Academic Session, Title, Name, Tagline */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Academic Session: {d?.school?.activeSessionName || '2026-2027'}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-3xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Code: {d?.school?.code || 'SCH-001'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <LayoutDashboard className="w-4 h-4 text-blue-600 shrink-0" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                School Dashboard
              </h1>
              <span className="text-slate-300 font-light hidden sm:inline">|</span>
              <span className="text-blue-700 font-extrabold text-base sm:text-lg">{d?.school?.nameEn || 'Al-Falah School'}</span>
              {d?.school?.nameUr && (
                <span className="text-xs text-slate-400 font-urdu font-normal">({d.school.nameUr})</span>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium truncate max-w-xl">
              {d?.school?.tagline || 'Complete School Management at Your Fingertips'}
            </p>
          </div>
        </div>

        {/* Center-Right: School Mission / Motto */}
        <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-100/80 max-w-xs shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-3xs text-slate-600 italic leading-tight">
            &ldquo;Empowering Minds, Inspiring Excellence & Character Building.&rdquo;
          </p>
        </div>

        {/* Right Section: Live Date, Time, Weather & Action Controls */}
        <div className="flex items-center gap-3 shrink-0 bg-slate-50/90 p-2 sm:p-2.5 rounded-xl border border-slate-200/80">
          <div className="text-start sm:text-end space-y-0.5">
            <p className="text-xs font-bold text-slate-900">{currentDate || 'Saturday, 05 Sep 2026'}</p>
            <div className="flex items-center sm:justify-end gap-2 text-3xs text-slate-600">
              <span className="font-bold text-blue-700">{currentTime || '07:30 PM PKT'}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-700">
                <Sun className="w-3 h-3 text-amber-500" />
                Lahore 31°C
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ms-1">
            <button
              type="button"
              onClick={loadOverview}
              disabled={isRefreshing}
              title="Refresh Dashboard Data"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <Link href="/admin/students/new">
              <Button variant="primary" size="sm" className="h-7 text-3xs font-bold px-2.5">
                <UserPlus className="w-3 h-3 me-1" />
                Admit
              </Button>
            </Link>
            <Link href="/admin/attendance/mark">
              <Button variant="outline" size="sm" className="h-7 text-3xs font-bold px-2.5">
                <CalendarCheck className="w-3 h-3 me-1 text-emerald-600" />
                Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Executive 6-Card KPI Row (One Clean Row on Wide Desktop) */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* KPI 1: Active Students */}
        <Link
          href="/admin/students"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
              Active Students
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-12 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : (
                d?.kpis?.activeStudents.toLocaleString() || 0
              )}
            </p>
            <p className="text-3xs text-slate-500 mt-0.5 truncate">
              {d?.kpis?.totalStudents || 0} Total ({d?.kpis?.maleStudents || 0}B / {d?.kpis?.femaleStudents || 0}G)
            </p>
          </div>
        </Link>

        {/* KPI 2: Today's Attendance */}
        <Link
          href="/admin/attendance"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
              Today Attendance
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-12 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : d?.kpis?.isTodayHoliday ? (
                <span className="text-amber-600 text-base font-bold">Holiday / Off</span>
              ) : (
                `${d?.kpis?.todayAttendancePct || 0}%`
              )}
            </p>
            <p className="text-3xs text-slate-500 mt-0.5 truncate">
              {d?.kpis?.todayPresentStudents || 0} Present • {d?.kpis?.todayAbsentStudents || 0} Absent
            </p>
          </div>
        </Link>

        {/* KPI 3: Fee Collected (This Month) */}
        <Link
          href="/admin/billing"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
              Fee Collected
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-14 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : (
                `${currSymbol} ${(d?.kpis?.feeCollectedThisMonth || 0).toLocaleString()}`
              )}
            </p>
            <p className="text-3xs text-emerald-600 font-bold mt-0.5 truncate">
              This Month&apos;s Realized
            </p>
          </div>
        </Link>

        {/* KPI 4: Outstanding Receivables */}
        <Link
          href="/admin/billing"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-rose-600 transition-colors">
              Receivables
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-14 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : (
                `${currSymbol} ${(d?.kpis?.outstandingReceivables || 0).toLocaleString()}`
              )}
            </p>
            <p className="text-3xs text-rose-600 font-bold mt-0.5 truncate">
              Outstanding Unpaid
            </p>
          </div>
        </Link>

        {/* KPI 5: New Admissions */}
        <Link
          href="/admin/admissions"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-600 transition-colors">
              New Admissions
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-sky-700 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-10 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : (
                d?.kpis?.newAdmissionsThisMonth.toLocaleString() || 0
              )}
            </p>
            <p className="text-3xs text-slate-500 mt-0.5 truncate">
              {d?.kpis?.admissionsGrowthDiff !== null && d?.kpis?.admissionsGrowthDiff !== undefined ? (
                <span className={d.kpis.admissionsGrowthDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                  {d.kpis.admissionsGrowthDiff >= 0 ? `+${d.kpis.admissionsGrowthDiff}` : d.kpis.admissionsGrowthDiff} vs last mo
                </span>
              ) : (
                'Current Month Intake'
              )}
            </p>
          </div>
        </Link>

        {/* KPI 6: Pending Approvals */}
        <Link
          href="/admin/hr/leaves/approvals"
          className="group bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-600 transition-colors">
              Pending Approvals
            </span>
            <div className={`w-7 h-7 rounded-lg border border-purple-100 flex items-center justify-center transition-colors ${
              (d?.kpis?.pendingApprovalsCount || 0) > 0
                ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-600 group-hover:text-white'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
              {isLoading ? (
                <span className="inline-block w-10 h-6 bg-slate-100 rounded animate-pulse"></span>
              ) : (
                d?.kpis?.pendingApprovalsCount || 0
              )}
            </p>
            <p className="text-3xs mt-0.5 truncate font-bold">
              {(d?.kpis?.pendingApprovalsCount || 0) > 0 ? (
                <span className="text-amber-600">Action Required</span>
              ) : (
                <span className="text-emerald-600">All caught up</span>
              )}
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Analytics Grid — ROW 1 (3 Clean Panels: Fee Collection, Aging, Admissions Growth) */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        {/* Panel 1: Fee Collection Overview (5 of 12 cols on desktop) */}
        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Coins className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Fee Collection Overview</h2>
                <p className="text-3xs text-slate-500">Realized institutional billing vs receivables</p>
              </div>
            </div>

            {/* Period Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-3xs font-semibold">
              <button
                type="button"
                onClick={() => setFinancialPeriod('MONTH')}
                className={`px-2 py-0.5 rounded transition-all ${
                  financialPeriod === 'MONTH' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFinancialPeriod('SESSION')}
                className={`px-2 py-0.5 rounded transition-all ${
                  financialPeriod === 'SESSION' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Session
              </button>
              <button
                type="button"
                onClick={() => setFinancialPeriod('YEAR')}
                className={`px-2 py-0.5 rounded transition-all ${
                  financialPeriod === 'YEAR' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2026
              </button>
            </div>
          </div>

          {/* Financial Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-3xs text-slate-400 font-bold uppercase">Generated</span>
              <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                {currSymbol} {(d?.financialOverview?.feeGenerated || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
              <span className="text-3xs text-emerald-600 font-bold uppercase">Collected</span>
              <p className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5">
                {currSymbol} {(d?.financialOverview?.feeCollected || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-100">
              <span className="text-3xs text-blue-600 font-bold uppercase">Collection %</span>
              <p className="text-xs sm:text-sm font-black text-blue-700 mt-0.5">
                {d?.financialOverview?.collectionPercentage || 0}%
              </p>
            </div>
            <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
              <span className="text-3xs text-rose-600 font-bold uppercase">Outstanding</span>
              <p className="text-xs sm:text-sm font-black text-rose-700 mt-0.5">
                {currSymbol} {(d?.financialOverview?.outstandingReceivables || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Monthly Financial Trend Chart (SVG) */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-3xs font-semibold text-slate-500">
              <span>Monthly Billing & Collections Trajectory</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-blue-500"></span> Generated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500"></span> Collected
                </span>
              </div>
            </div>

            <div className="h-28 w-full bg-slate-50/70 rounded-lg p-2 border border-slate-100 relative flex items-end justify-between gap-2">
              {d?.financialOverview?.monthlyTrend && d.financialOverview.monthlyTrend.length > 0 ? (
                d.financialOverview.monthlyTrend.map((m, idx) => {
                  const maxVal = Math.max(
                    ...d.financialOverview.monthlyTrend.map((t) => Math.max(t.generated, t.collected, 100))
                  );
                  const genHeight = Math.max(6, Math.round((m.generated / maxVal) * 70));
                  const colHeight = Math.max(4, Math.round((m.collected / maxVal) * 70));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-20">
                        <div
                          style={{ height: `${genHeight}px` }}
                          className="w-2 sm:w-3 bg-blue-500/90 rounded-t group-hover:bg-blue-600 transition-all shadow-2xs"
                          title={`Generated: ${currSymbol} ${m.generated.toLocaleString()}`}
                        ></div>
                        <div
                          style={{ height: `${colHeight}px` }}
                          className="w-2 sm:w-3 bg-emerald-500/90 rounded-t group-hover:bg-emerald-600 transition-all shadow-2xs"
                          title={`Collected: ${currSymbol} ${m.collected.toLocaleString()}`}
                        ></div>
                      </div>
                      <span className="text-3xs font-bold text-slate-400 group-hover:text-slate-800 transition-colors">
                        {m.month.split(' ')[0]}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xs text-slate-400">
                  No billing history recorded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Receivables Aging Donut & Breakdown (4 of 12 cols on desktop) */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                <PieIcon className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Receivables Aging</h2>
                <p className="text-3xs text-slate-500">Overdue breakdown by maturity bucket</p>
              </div>
            </div>
            <Link
              href="/admin/billing"
              className="text-3xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>View Details</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
          </div>

          {/* Aging Donut + Bucket List */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            {/* SVG Donut */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" className="stroke-slate-100" strokeWidth="4" />
                {/* Donut Segment: Current (Emerald) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-emerald-500"
                  strokeWidth="4"
                  strokeDasharray={`${d?.receivablesAging?.buckets?.current?.percentage || 30}, 100`}
                  strokeDashoffset="0"
                />
                {/* Donut Segment: 1-30 Days (Sky) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-sky-500"
                  strokeWidth="4"
                  strokeDasharray={`${d?.receivablesAging?.buckets?.days1To30?.percentage || 25}, 100`}
                  strokeDashoffset={`-${d?.receivablesAging?.buckets?.current?.percentage || 30}`}
                />
                {/* Donut Segment: 31-60 Days (Amber) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-amber-500"
                  strokeWidth="4"
                  strokeDasharray={`${d?.receivablesAging?.buckets?.days31To60?.percentage || 20}, 100`}
                  strokeDashoffset={`-${
                    (d?.receivablesAging?.buckets?.current?.percentage || 30) +
                    (d?.receivablesAging?.buckets?.days1To30?.percentage || 25)
                  }`}
                />
                {/* Donut Segment: 61-90 Days & 90+ (Rose) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-rose-500"
                  strokeWidth="4"
                  strokeDasharray={`${
                    (d?.receivablesAging?.buckets?.days61To90?.percentage || 15) +
                    (d?.receivablesAging?.buckets?.days90Plus?.percentage || 10)
                  }, 100`}
                  strokeDashoffset={`-${
                    (d?.receivablesAging?.buckets?.current?.percentage || 30) +
                    (d?.receivablesAging?.buckets?.days1To30?.percentage || 25) +
                    (d?.receivablesAging?.buckets?.days31To60?.percentage || 20)
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xs text-slate-400 font-bold uppercase">Total</span>
                <span className="text-xs font-black text-slate-900">
                  {currSymbol} {Math.round((d?.receivablesAging?.totalReceivables || 0) / 1000)}k
                </span>
              </div>
            </div>

            {/* Aging Buckets Legend List */}
            <div className="flex-1 w-full space-y-1 text-2xs">
              <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium text-3xs">Current (Not Due)</span>
                </div>
                <span className="font-bold text-slate-900 text-3xs">
                  {currSymbol} {(d?.receivablesAging?.buckets?.current?.amount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span className="text-slate-600 font-medium text-3xs">1–30 Days</span>
                </div>
                <span className="font-bold text-slate-900 text-3xs">
                  {currSymbol} {(d?.receivablesAging?.buckets?.days1To30?.amount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600 font-medium text-3xs">31–60 Days</span>
                </div>
                <span className="font-bold text-slate-900 text-3xs">
                  {currSymbol} {(d?.receivablesAging?.buckets?.days31To60?.amount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600 font-medium text-3xs">60+ Days Overdue</span>
                </div>
                <span className="font-bold text-rose-700 text-3xs">
                  {currSymbol}{' '}
                  {(
                    (d?.receivablesAging?.buckets?.days61To90?.amount || 0) +
                    (d?.receivablesAging?.buckets?.days90Plus?.amount || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Admissions & Student Growth (3 of 12 cols on desktop) */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Admissions Growth</h2>
                <p className="text-3xs text-slate-500">Monthly student intake</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              +{d?.admissionsGrowth?.netGrowth || 0} Net
            </span>
          </div>

          {/* Admissions Monthly Trajectory Bar Chart (SVG) */}
          <div className="h-28 w-full bg-slate-50/70 rounded-lg p-2 border border-slate-100 flex items-end justify-between gap-1.5">
            {d?.admissionsGrowth?.monthlyTrend && d.admissionsGrowth.monthlyTrend.length > 0 ? (
              d.admissionsGrowth.monthlyTrend.map((m, idx) => {
                const maxAdm = Math.max(...d.admissionsGrowth.monthlyTrend.map((t) => t.admissions), 5);
                const h = Math.max(6, Math.round((m.admissions / maxAdm) * 65));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div
                      style={{ height: `${h}px` }}
                      className="w-full max-w-[24px] bg-blue-500/90 rounded-t group-hover:bg-blue-600 transition-all shadow-2xs"
                      title={`${m.month}: ${m.admissions} Admissions`}
                    ></div>
                    <span className="text-3xs font-bold text-slate-400 group-hover:text-slate-800">
                      {m.month}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xs text-slate-400">
                No admissions recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Analytics Grid — ROW 2 (3 Clean Panels: Attendance Trend, Quick Actions, Approvals & Activity) */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        {/* Panel 1: Attendance Trend (5 of 12 cols on desktop) */}
        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Attendance Trend (30 Days)</h2>
                <p className="text-3xs text-slate-500">Turnout rate across working calendar</p>
              </div>
            </div>
            <span className="text-3xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Avg: {d?.attendanceTrend?.summaryPct || 0}%
            </span>
          </div>

          {/* Daily 30-Day Bar Visualizer (SVG) */}
          <div className="h-28 w-full bg-slate-50/70 rounded-lg p-2 border border-slate-100 flex items-end justify-between gap-1 overflow-x-auto">
            {d?.attendanceTrend?.dailyTrend && d.attendanceTrend.dailyTrend.length > 0 ? (
              d.attendanceTrend.dailyTrend.slice(-20).map((day, idx) => {
                const h = day.isHoliday ? 8 : Math.max(6, Math.round((day.percentage / 100) * 65));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div
                      style={{ height: `${h}px` }}
                      className={`w-full rounded-t transition-all ${
                        day.isHoliday
                          ? 'bg-slate-200'
                          : day.percentage >= 90
                          ? 'bg-emerald-500/90 group-hover:bg-emerald-600'
                          : day.percentage >= 75
                          ? 'bg-blue-500/90 group-hover:bg-blue-600'
                          : 'bg-amber-500/90 group-hover:bg-amber-600'
                      }`}
                      title={`${day.date} (${day.dayName}): ${day.isHoliday ? 'Holiday / Off' : day.percentage + '%'}`}
                    ></div>
                    <span className="text-3xs font-medium text-slate-400 truncate max-w-[20px]">
                      {day.date.split('-')[2]}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xs text-slate-400">
                No attendance logs for current month
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Quick Actions (4 of 12 cols on desktop) */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h3>
            <span className="text-3xs text-slate-400">Direct Navigation</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/admin/students/new"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-blue-700 truncate text-3xs">Admit Student</span>
            </Link>

            <Link
              href="/admin/attendance/mark"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-emerald-700 truncate text-3xs">Mark Attendance</span>
            </Link>

            <Link
              href="/admin/billing"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-indigo-700 truncate text-3xs">Fee Billing</span>
            </Link>

            <Link
              href="/admin/hr/leaves/approvals"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-purple-700 truncate text-3xs">Approvals</span>
            </Link>

            <Link
              href="/admin/settings/holidays"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/40 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-rose-700 truncate text-3xs">Holidays</span>
            </Link>

            <Link
              href="/admin/settings"
              className="p-2 rounded-lg border border-slate-200/80 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-2 group shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover:text-slate-900 truncate text-3xs">Config Masters</span>
            </Link>
          </div>
        </div>

        {/* Panel 3: Actionable Approvals & Recent Activity (3 of 12 cols on desktop) */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Approvals & Activity</h3>
            </div>
            {(d?.pendingApprovals?.length || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-3xs font-bold bg-purple-100 text-purple-800">
                {d?.pendingApprovals?.length} Actionable
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1.5 text-2xs">
            {isLoading ? (
              <div className="py-4 text-center text-3xs text-slate-400 animate-pulse">Loading approvals...</div>
            ) : !d?.pendingApprovals || d.pendingApprovals.length === 0 ? (
              <div className="py-2.5 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="font-bold text-slate-800 text-xs">All caught up</p>
                <p className="text-3xs text-slate-400">No pending leave or operational requests.</p>
              </div>
            ) : (
              d.pendingApprovals.slice(0, 1).map((app) => (
                <div
                  key={app.id}
                  className="p-2 rounded-lg bg-purple-50/50 border border-purple-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate text-3xs">{app.requesterName}</p>
                    <p className="text-3xs text-slate-500 truncate">{app.title} • {app.details}</p>
                  </div>
                  <Link href={app.actionUrl}>
                    <Button variant="outline" size="sm" className="h-5 px-2 text-3xs font-bold bg-white">
                      Review
                    </Button>
                  </Link>
                </div>
              ))
            )}

            {/* Recent Audit Item Preview */}
            {d?.recentActivity && d.recentActivity.length > 0 && (
              <div className="pt-1 border-t border-slate-100 text-3xs text-slate-600 flex items-center justify-between">
                <span className="truncate">{d.recentActivity[0].description}</span>
                <span className="text-slate-400 shrink-0 ms-1">{d.recentActivity[0].relativeTime}</span>
              </div>
            )}
          </div>

          <Link
            href="/admin/hr/leaves/approvals"
            className="text-center py-1 text-3xs font-bold text-purple-700 bg-purple-50/60 hover:bg-purple-100/80 rounded transition-colors flex items-center justify-center gap-1"
          >
            <span>Open Approvals Inbox</span>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
