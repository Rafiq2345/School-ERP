'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  EMPLOYEE_ATTENDANCE_STATUSES,
  EmployeeAttendanceStatus,
  DailyEmployeeRosterItem,
  ShiftSegmentAttendanceDTO,
  EmployeeAttendanceDashboardMetrics,
} from '@/lib/types/employee-attendance';
import { useToast } from '@/components/ui/Toast';

export function EmployeeAttendanceDashboardView() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [dashboardMetrics, setDashboardMetrics] = useState<EmployeeAttendanceDashboardMetrics | null>(null);
  const [roster, setRoster] = useState<DailyEmployeeRosterItem[]>([]);
  const [isAlreadyMarked, setIsAlreadyMarked] = useState<boolean>(false);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [isWeeklyOff, setIsWeeklyOff] = useState<boolean>(false);
  const [holidayTitle, setHolidayTitle] = useState<string | undefined>();
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Expanded rows state (track employee IDs whose shifts are expanded)
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const { success, error } = useToast();

  const fetchRoster = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const [rosterRes, statsRes] = await Promise.all([
        fetch(`/api/admin/attendance/employees/roster?${params.toString()}`),
        fetch(`/api/admin/attendance/employees/stats?date=${selectedDate}`),
      ]);

      const rosterJson = await rosterRes.json();
      const statsJson = await statsRes.json();

      if (rosterJson.success && rosterJson.data) {
        setRoster(rosterJson.data.roster);
        setIsAlreadyMarked(rosterJson.data.isAlreadyMarked);
        setIsHoliday(rosterJson.data.isHoliday);
        setIsWeeklyOff(rosterJson.data.isWeeklyOff);
        setHolidayTitle(rosterJson.data.holidayTitle);

        // Auto-expand all employees initially
        const initialExpand: Record<string, boolean> = {};
        rosterJson.data.roster.forEach((r: DailyEmployeeRosterItem) => {
          initialExpand[r.employee.id] = true;
        });
        setExpandedEmployees(initialExpand);
      }

      if (statsJson.success && statsJson.data) {
        setDashboardMetrics(statsJson.data);
      }
    } catch {
      error('Network Error', 'Failed to load employee attendance roster.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, departmentFilter, searchTerm, error]);

  useEffect(() => {
    fetch('/api/admin/config/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setDepartments(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const toggleExpand = (empId: string) => {
    setExpandedEmployees((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  /**
   * Updates an individual shift segment within an employee's roster entry.
   */
  const updateShiftSegment = (
    empIndex: number,
    segIndex: number,
    field: keyof ShiftSegmentAttendanceDTO,
    value: any
  ) => {
    const updated = [...roster];
    const empItem = { ...updated[empIndex] };
    const segments = [...empItem.shiftSegments];
    const seg = { ...segments[segIndex], [field]: value };

    // Dynamic Segment Time & Worked Hours Calculation
    if (seg.status === 'PRESENT' || seg.status === 'LATE' || seg.status === 'HALF_DAY' || seg.status === 'EARLY_DEPARTURE') {
      const parseMin = (t?: string | null): number | null => {
        if (!t || !t.includes(':')) return null;
        const [h, m] = t.split(':').map((v) => parseInt(v, 10));
        return isNaN(h) || isNaN(m) ? null : h * 60 + m;
      };

      const inTotal = parseMin(seg.checkInTime);
      const outTotal = parseMin(seg.checkOutTime);
      const schTotal = parseMin(seg.scheduledStartTime);
      const schEndTotal = parseMin(seg.scheduledEndTime);

      if (inTotal !== null && outTotal !== null) {
        let workedM = 0;
        if (outTotal >= inTotal) {
          workedM = outTotal - inTotal;
        } else {
          workedM = (1440 - inTotal) + outTotal; // Overnight
        }

        if (seg.breakMinutes > 0 && workedM >= 240) {
          workedM = Math.max(0, workedM - seg.breakMinutes);
        }

        seg.workedMinutes = workedM;
        seg.workedHours = Math.round((workedM / 60) * 100) / 100;

        // Late check
        if (schTotal !== null) {
          const diff = inTotal - schTotal;
          if (diff > seg.graceMinutes) {
            seg.lateMinutes = diff;
            if (seg.status === 'PRESENT') seg.status = 'LATE';
          } else {
            seg.lateMinutes = 0;
          }
        }

        // Early Exit check
        if (schEndTotal !== null) {
          const exitDiff = schEndTotal - outTotal;
          seg.earlyExitMinutes = exitDiff > seg.earlyExitGraceMinutes ? exitDiff : 0;
        }
      } else {
        seg.workedMinutes = 0;
        seg.workedHours = 0;
        seg.lateMinutes = 0;
        seg.earlyExitMinutes = 0;
      }
    } else {
      seg.workedMinutes = 0;
      seg.workedHours = 0;
      seg.lateMinutes = 0;
      seg.earlyExitMinutes = 0;
    }

    segments[segIndex] = seg;
    empItem.shiftSegments = segments;

    // Recalculate Employee Daily Totals
    empItem.totalScheduledHours = Math.round(segments.reduce((acc, s) => acc + s.scheduledDurationHours, 0) * 100) / 100;
    empItem.totalWorkedHours = Math.round(segments.reduce((acc, s) => acc + s.workedHours, 0) * 100) / 100;
    empItem.totalLateMinutes = segments.reduce((acc, s) => acc + s.lateMinutes, 0);
    empItem.totalEarlyExitMinutes = segments.reduce((acc, s) => acc + s.earlyExitMinutes, 0);

    const hasPresent = segments.some((s) => s.status === 'PRESENT' || s.status === 'LATE');
    const allAbsent = segments.every((s) => s.status === 'ABSENT');
    if (allAbsent) empItem.dailyStatus = 'ABSENT';
    else if (hasPresent) {
      empItem.dailyStatus = empItem.totalLateMinutes > 0 ? 'LATE' : 'PRESENT';
    }

    updated[empIndex] = empItem;
    setRoster(updated);
  };

  /**
   * Bulk Mark All Present
   */
  const handleMarkAll = (targetStatus: EmployeeAttendanceStatus) => {
    const updated = roster.map((item) => {
      const segments = item.shiftSegments.map((seg) => {
        const checkIn = targetStatus === 'PRESENT' ? seg.scheduledStartTime : null;
        const checkOut = targetStatus === 'PRESENT' ? seg.scheduledEndTime : null;

        let workedHours = 0;
        let workedMinutes = 0;
        if (targetStatus === 'PRESENT') {
          const [sH, sM] = seg.scheduledStartTime.split(':').map((v) => parseInt(v, 10));
          const [eH, eM] = seg.scheduledEndTime.split(':').map((v) => parseInt(v, 10));
          const sTot = !isNaN(sH) ? sH * 60 + sM : 480;
          const eTot = !isNaN(eH) ? eH * 60 + eM : 960;
          let rawM = eTot >= sTot ? eTot - sTot : (1440 - sTot) + eTot;
          if (seg.breakMinutes > 0 && rawM >= 240) rawM = Math.max(0, rawM - seg.breakMinutes);
          workedMinutes = rawM;
          workedHours = Math.round((rawM / 60) * 100) / 100;
        }

        return {
          ...seg,
          status: targetStatus,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          lateMinutes: 0,
          earlyExitMinutes: 0,
          workedMinutes,
          workedHours,
        };
      });

      const totalWorkedHours = Math.round(segments.reduce((acc, s) => acc + s.workedHours, 0) * 100) / 100;

      return {
        ...item,
        dailyStatus: targetStatus,
        totalWorkedHours,
        totalLateMinutes: 0,
        totalEarlyExitMinutes: 0,
        shiftSegments: segments,
      };
    });

    setRoster(updated);
  };

  /**
   * Save / Submit Daily Attendance
   */
  const handleSaveAttendance = async () => {
    if (isAlreadyMarked && (!correctionReason || !correctionReason.trim())) {
      setIsCorrectionModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave: any[] = [];
      roster.forEach((item) => {
        item.shiftSegments.forEach((seg) => {
          recordsToSave.push({
            employeeId: item.employee.id,
            shiftId: seg.shiftId,
            scheduledStartTime: seg.scheduledStartTime,
            scheduledEndTime: seg.scheduledEndTime,
            checkInTime: seg.checkInTime,
            checkOutTime: seg.checkOutTime,
            status: seg.status,
            remarks: seg.remarks,
          });
        });
      });

      const payload = {
        date: selectedDate,
        records: recordsToSave,
        correctionReason: isAlreadyMarked ? correctionReason.trim() : undefined,
      };

      const res = await fetch('/api/admin/attendance/employees/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          isAlreadyMarked ? 'Attendance Corrected' : 'Attendance Saved',
          `Successfully recorded attendance for ${json.data.totalRecords} shift segments.`
        );
        setIsCorrectionModalOpen(false);
        setCorrectionReason('');
        fetchRoster();
      } else {
        error('Save Failed', json.error?.message || 'Could not save attendance.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Daily Employee Attendance</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff roll call with multi-shift scheduling, check-in/out tracking, dynamic hours, and immutable audit logs
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/attendance/employees/register"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Monthly Register
          </Link>
          <Link
            href="/admin/attendance/employees/shifts"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Shift Management
          </Link>
          <Link
            href="/admin/attendance/employees/schedules"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Work Schedules
          </Link>
          <Link
            href="/admin/attendance/employees/schedules/assignments"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Schedule Assignments
          </Link>
          <Link
            href="/admin/attendance/employees/corrections"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Audit &amp; Corrections
          </Link>
        </div>
      </div>

      {/* Holiday / Non-Working Day Banner */}
      {isHoliday && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3 text-purple-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">
              {holidayTitle || (isWeeklyOff ? 'Institutional Weekly Off' : 'Public Holiday')}
            </h4>
            <p className="text-xs text-purple-700 mt-0.5">
              The selected date is designated as a non-working day. Active shifts are defaulted accordingly.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Bar */}
      {dashboardMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block">Staff Active</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{dashboardMetrics.totalActiveEmployees}</span>
            <span className="text-3xs text-slate-400 font-mono mt-0.5 block">{dashboardMetrics.totalScheduledShiftsCount} shifts</span>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-xs">
            <span className="text-3xs font-semibold text-emerald-600 uppercase tracking-wider block">Present</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">{dashboardMetrics.presentCount}</span>
            <span className="text-3xs text-emerald-600 font-mono mt-0.5 block">{dashboardMetrics.attendancePercentage}% Rate</span>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-xs">
            <span className="text-3xs font-semibold text-amber-600 uppercase tracking-wider block">Late Arrival</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">{dashboardMetrics.lateCount}</span>
            <span className="text-3xs text-amber-600 mt-0.5 block">Staff delayed</span>
          </div>
          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 shadow-xs">
            <span className="text-3xs font-semibold text-orange-600 uppercase tracking-wider block">Half Day</span>
            <span className="text-xl font-bold text-orange-700 mt-1 block">{dashboardMetrics.halfDayCount}</span>
            <span className="text-3xs text-orange-600 mt-0.5 block">Partial hours</span>
          </div>
          <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 shadow-xs">
            <span className="text-3xs font-semibold text-sky-600 uppercase tracking-wider block">On Leave</span>
            <span className="text-xl font-bold text-sky-700 mt-1 block">{dashboardMetrics.leaveCount}</span>
            <span className="text-3xs text-sky-600 mt-0.5 block">Approved leave</span>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 shadow-xs">
            <span className="text-3xs font-semibold text-rose-600 uppercase tracking-wider block">Absent</span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">{dashboardMetrics.absentCount}</span>
            <span className="text-3xs text-rose-600 mt-0.5 block">Unexcused</span>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-xs">
            <span className="text-3xs font-semibold text-indigo-600 uppercase tracking-wider block">Total Worked</span>
            <span className="text-xl font-bold text-indigo-700 mt-1 block">{dashboardMetrics.totalWorkedHours}</span>
            <span className="text-3xs text-indigo-600 font-mono mt-0.5 block">Hours logged</span>
          </div>
        </div>
      )}

      {/* Date & Filter Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Term */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-60">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff name / ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden w-full"
            />
          </div>
        </div>

        {/* Quick Bulk Marking Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkAll('PRESENT')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
          >
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('ABSENT')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
          >
            Mark All Absent
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : isAlreadyMarked ? 'Update Attendance' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Multi-Shift Employee Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading employee shifts and attendance...
          </div>
        ) : roster.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No active employees found matching the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {roster.map((item, empIndex) => {
              const isExpanded = expandedEmployees[item.employee.id] !== false;
              const statusCfg = EMPLOYEE_ATTENDANCE_STATUSES[item.dailyStatus] || EMPLOYEE_ATTENDANCE_STATUSES.PRESENT;

              return (
                <div key={item.employee.id} className="p-4 space-y-3 hover:bg-slate-50/40 transition-colors">
                  {/* Master Employee Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.employee.id)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {item.employee.firstNameEn} {item.employee.lastNameEn || ''}
                          </span>
                          <span className="font-mono text-3xs text-slate-400 font-semibold">
                            ({item.employee.employeeNo})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-3xs font-bold">
                            {item.scheduledShiftsCount} {item.scheduledShiftsCount === 1 ? 'Shift' : 'Shifts'}
                          </span>
                        </div>
                        <p className="text-3xs text-slate-500 mt-0.5">
                          {item.employee.departmentName || 'General'} &bull; {item.employee.designationName || 'Staff'}
                        </p>
                      </div>
                    </div>

                    {/* Daily Summary Metrics */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-3xs text-slate-400 block font-semibold">Daily Worked / Sched</span>
                        <span className="font-mono font-bold text-slate-900">
                          {item.totalWorkedHours} / {item.totalScheduledHours} hrs
                        </span>
                      </div>

                      {item.totalLateMinutes > 0 && (
                        <div className="text-right">
                          <span className="text-3xs text-amber-600 block font-semibold">Total Delay</span>
                          <span className="font-mono font-bold text-amber-700">+{item.totalLateMinutes}m</span>
                        </div>
                      )}

                      <span className={`px-2.5 py-1 rounded-xl text-3xs font-bold border ${statusCfg.badgeClass}`}>
                        {statusCfg.labelEn}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Shift Segments Table */}
                  {isExpanded && (
                    <div className="ml-7 bg-slate-50/80 rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-3xs font-bold text-slate-500 uppercase">
                            <th className="py-2.5 px-3">Work Shift Segment</th>
                            <th className="py-2.5 px-3">Scheduled</th>
                            <th className="py-2.5 px-3">Check-In</th>
                            <th className="py-2.5 px-3">Check-Out</th>
                            <th className="py-2.5 px-3">Worked Hours</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                          {item.shiftSegments.map((seg, segIndex) => {
                            const segStatusCfg = EMPLOYEE_ATTENDANCE_STATUSES[seg.status] || EMPLOYEE_ATTENDANCE_STATUSES.PRESENT;

                            return (
                              <tr key={seg.shiftId} className="hover:bg-white transition-colors">
                                {/* Shift Name & Badge */}
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="font-bold text-slate-800">{seg.shiftName}</span>
                                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                                      ({seg.shiftCode})
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Source: {seg.precedenceSource}
                                  </span>
                                </td>

                                {/* Scheduled Timing */}
                                <td className="py-2 px-3 font-mono font-semibold text-slate-600">
                                  {seg.scheduledStartTime} &rarr; {seg.scheduledEndTime}
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    ({seg.scheduledDurationHours}h sched)
                                  </span>
                                </td>

                                {/* Check-In Input */}
                                <td className="py-2 px-3">
                                  <input
                                    type="time"
                                    value={seg.checkInTime || ''}
                                    onChange={(e) =>
                                      updateShiftSegment(empIndex, segIndex, 'checkInTime', e.target.value || null)
                                    }
                                    className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold w-24 focus:ring-1 focus:ring-blue-500"
                                  />
                                  {seg.lateMinutes > 0 && (
                                    <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                                      +{seg.lateMinutes}m Late
                                    </span>
                                  )}
                                </td>

                                {/* Check-Out Input */}
                                <td className="py-2 px-3">
                                  <input
                                    type="time"
                                    value={seg.checkOutTime || ''}
                                    onChange={(e) =>
                                      updateShiftSegment(empIndex, segIndex, 'checkOutTime', e.target.value || null)
                                    }
                                    className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold w-24 focus:ring-1 focus:ring-blue-500"
                                  />
                                  {seg.earlyExitMinutes > 0 && (
                                    <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                                      -{seg.earlyExitMinutes}m Early
                                    </span>
                                  )}
                                </td>

                                {/* Segment Worked Hours */}
                                <td className="py-2 px-3">
                                  <span className="font-mono font-bold text-slate-900">
                                    {seg.workedHours} hrs
                                  </span>
                                  {seg.breakMinutes > 0 && seg.workedMinutes >= 240 && (
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      (-{seg.breakMinutes}m brk)
                                    </span>
                                  )}
                                </td>

                                {/* Status Dropdown */}
                                <td className="py-2 px-3">
                                  <select
                                    value={seg.status}
                                    onChange={(e) =>
                                      updateShiftSegment(
                                        empIndex,
                                        segIndex,
                                        'status',
                                        e.target.value as EmployeeAttendanceStatus
                                      )
                                    }
                                    className={`p-1 rounded-lg text-xs font-bold border ${segStatusCfg.badgeClass} focus:outline-hidden`}
                                  >
                                    <option value="PRESENT">Present</option>
                                    <option value="LATE">Late</option>
                                    <option value="HALF_DAY">Half Day</option>
                                    <option value="EARLY_DEPARTURE">Early Exit</option>
                                    <option value="ON_LEAVE">Leave</option>
                                    <option value="ABSENT">Absent</option>
                                    <option value="HOLIDAY">Holiday</option>
                                    <option value="OFF_DAY">Off Day</option>
                                  </select>
                                </td>

                                {/* Remarks Input */}
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    placeholder="Optional remark..."
                                    value={seg.remarks || ''}
                                    onChange={(e) =>
                                      updateShiftSegment(empIndex, segIndex, 'remarks', e.target.value || null)
                                    }
                                    className="p-1 bg-white border border-slate-200 rounded-lg text-xs w-32 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CORRECTION MANDATORY REASON MODAL */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Attendance Correction Reason</h3>
                <p className="text-xs text-slate-500">
                  Attendance was previously marked on {selectedDate}. An immutable audit log will be created.
                </p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1">
                Correction Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Adjusted Afternoon shift check-out per biometric log discrepancy"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !correctionReason.trim()}
                onClick={handleSaveAttendance}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
              >
                {isSaving ? 'Updating...' : 'Confirm & Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
