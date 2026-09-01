'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Save,
  Send,
  User,
  ShieldCheck,
  Coins,
  Building,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  LeaveScope,
  HalfDayPeriod,
  LeaveCalculationPreviewResultDto,
  ShiftSelectionItem,
} from '@/lib/types/leave';

interface PolicyLeaveTypeItem {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  isPaid: boolean;
  isUnlimited: boolean;
  availableBalance: number;
  allocatedDays: number;
  usedDays: number;
  adjustedDays: number;
}

interface ResolvedPolicyInfo {
  id: string;
  name: string;
  code: string;
  source: string;
}

export function CreateLeaveApplicationView() {
  const router = useRouter();

  // Master Data
  const [employees, setEmployees] = useState<Array<any>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveScope, setLeaveScope] = useState<LeaveScope>('FULL_DAY');
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('FIRST_HALF');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [selectedShifts, setSelectedShifts] = useState<ShiftSelectionItem[]>([]);
  const [scheduledShiftsByDate, setScheduledShiftsByDate] = useState<Array<any>>([]);
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Resolved Policy & Employee Summary State
  const [resolvedPolicy, setResolvedPolicy] = useState<ResolvedPolicyInfo | null>(null);
  const [policyLeaveTypes, setPolicyLeaveTypes] = useState<PolicyLeaveTypeItem[]>([]);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Live Calculation Preview State
  const [preview, setPreview] = useState<LeaveCalculationPreviewResultDto | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Load Active Employees Roster
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch('/api/admin/attendance/employees/roster');
        const json = await res.json();
        if (res.ok && json.success) {
          let list: any[] = [];
          if (json.data?.roster && Array.isArray(json.data.roster)) {
            list = json.data.roster.map((r: any) => r.employee).filter(Boolean);
          } else if (json.data?.employees && Array.isArray(json.data.employees)) {
            list = json.data.employees;
          } else if (Array.isArray(json.data)) {
            list = json.data;
          }
          setEmployees(list);
          if (list.length > 0) {
            setSelectedEmployeeId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load employee roster for leave application:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // 2. Load Employee Resolved Policy & Eligible Leave Types when selected employee or year changes
  useEffect(() => {
    if (!selectedEmployeeId) {
      setResolvedPolicy(null);
      setPolicyLeaveTypes([]);
      return;
    }

    const fetchEmployeePolicy = async () => {
      setLoadingPolicy(true);
      setPolicyError(null);
      try {
        const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
        const res = await fetch(`/api/admin/hr/leaves/employees/${selectedEmployeeId}?year=${year}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to resolve leave policy for employee');
        }

        const data = json.data;
        if (data.currentPolicy) {
          setResolvedPolicy(data.currentPolicy);
        } else {
          setResolvedPolicy(null);
        }

        const balances: PolicyLeaveTypeItem[] = data.balances || [];
        setPolicyLeaveTypes(balances);

        // Auto-select first leave type if currently selected is empty or not in policy
        if (balances.length > 0) {
          const match = balances.find((b) => b.leaveTypeId === selectedLeaveTypeId);
          if (!match) {
            setSelectedLeaveTypeId(balances[0].leaveTypeId);
          }
        } else {
          setSelectedLeaveTypeId('');
        }
      } catch (err: any) {
        setPolicyError(err.message || 'Error resolving policy');
        setResolvedPolicy(null);
        setPolicyLeaveTypes([]);
      } finally {
        setLoadingPolicy(false);
      }
    };

    fetchEmployeePolicy();
  }, [selectedEmployeeId, startDate]);

  // 3. Load Employee Scheduled Shifts for Multi-Shift selector
  useEffect(() => {
    if (!selectedEmployeeId || !startDate || !endDate) return;
    if (leaveScope === 'SPECIFIC_SHIFT' || leaveScope === 'MULTIPLE_SHIFTS') {
      const fetchShifts = async () => {
        try {
          const res = await fetch(
            `/api/admin/hr/leaves/employees/${selectedEmployeeId}/schedule-shifts?startDate=${startDate}&endDate=${endDate}`
          );
          const json = await res.json();
          if (res.ok && json.success) {
            setScheduledShiftsByDate(json.data || []);
          }
        } catch {
          // ignore
        }
      };
      fetchShifts();
    }
  }, [selectedEmployeeId, startDate, endDate, leaveScope]);

  // 4. Run live calculation preview
  useEffect(() => {
    if (!selectedEmployeeId || !selectedLeaveTypeId || !startDate || !endDate) {
      setPreview(null);
      return;
    }

    const runCalculation = async () => {
      setCalculating(true);
      setCalcError(null);
      try {
        const res = await fetch('/api/admin/hr/leaves/applications/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: selectedEmployeeId,
            leaveTypeId: selectedLeaveTypeId,
            startDate,
            endDate,
            leaveScope,
            halfDayPeriod: leaveScope === 'HALF_DAY' ? halfDayPeriod : null,
            selectedShifts,
            startTime: leaveScope === 'HOURLY' ? startTime : null,
            endTime: leaveScope === 'HOURLY' ? endTime : null,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setCalcError(json.error?.message || 'Calculation error');
          setPreview(null);
        } else {
          setPreview(json.data);
        }
      } catch (err: any) {
        setCalcError(err.message || 'Failed to calculate preview');
        setPreview(null);
      } finally {
        setCalculating(false);
      }
    };

    const timer = setTimeout(runCalculation, 300);
    return () => clearTimeout(timer);
  }, [
    selectedEmployeeId,
    selectedLeaveTypeId,
    startDate,
    endDate,
    leaveScope,
    halfDayPeriod,
    selectedShifts,
    startTime,
    endTime,
  ]);

  // Selected Employee object
  const currentEmp = employees.find((e) => e.id === selectedEmployeeId);

  // Helper to format source badge
  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'OVERRIDE':
        return 'Custom Employee Override';
      case 'DIRECT':
        return 'Direct Employee Assignment';
      case 'DEPARTMENT':
        return 'Department Assignment';
      case 'DESIGNATION':
        return 'Designation Assignment';
      case 'EMPLOYMENT_TYPE':
        return 'Employment Type Assignment';
      case 'DEFAULT':
        return 'Institutional Default Policy';
      default:
        return source || 'Active Policy';
    }
  };

  // Toggle shift selection
  const handleToggleShift = (date: string, shift: any) => {
    setSelectedShifts((prev) => {
      const exists = prev.some((s) => s.date === date && s.shiftId === shift.shiftId);
      if (exists) {
        return prev.filter((s) => !(s.date === date && s.shiftId === shift.shiftId));
      } else {
        return [
          ...prev,
          {
            date,
            shiftId: shift.shiftId,
            shiftCode: shift.shiftCode,
            shiftName: shift.shiftName,
            startTime: shift.startTime,
            endTime: shift.endTime,
          },
        ];
      }
    });
  };

  const handleSave = async (saveAsDraft: boolean) => {
    setSubmitError(null);
    if (!reason || reason.trim().length === 0) {
      setSubmitError('A meaningful reason is mandatory for leave applications.');
      return;
    }

    if (!saveAsDraft && preview && preview.errors.length > 0) {
      setSubmitError('Please resolve all validation errors before submitting.');
      return;
    }

    if (!saveAsDraft && preview && preview.requiresAttachment && !attachmentUrl) {
      setSubmitError(
        `Supporting document attachment is mandatory for this request (${preview.calendarSummary.totalRequestedDays} days exceeds threshold).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/hr/leaves/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          leaveTypeId: selectedLeaveTypeId,
          startDate,
          endDate,
          leaveScope,
          halfDayPeriod: leaveScope === 'HALF_DAY' ? halfDayPeriod : null,
          selectedShifts,
          startTime: leaveScope === 'HOURLY' ? startTime : null,
          endTime: leaveScope === 'HOURLY' ? endTime : null,
          reason: reason.trim(),
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          saveAsDraft,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create application');
      }

      router.push(`/admin/hr/leaves/applications/${json.data.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save application');
    } finally {
      setSubmitting(false);
    }
  };

  // Safe attribute getters for employee placement
  const empDept = currentEmp?.department?.name || currentEmp?.departmentName || 'Unassigned';
  const empDesig = currentEmp?.designation?.name || currentEmp?.designationName || 'Unassigned';
  const empType = currentEmp?.employmentType?.name || currentEmp?.employmentTypeName || 'Regular';
  const empStatus = currentEmp?.confirmationStatus || 'CONFIRMED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/hr/leaves/applications"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-blue-600" />
              New Leave Application
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Submit or draft an employee leave request with multi-shift scheduling and live balance validation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Save as Draft
          </button>

          <button
            type="button"
            disabled={submitting || (preview ? preview.errors.length > 0 : false)}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Employee Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              1. Employee & Placement
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Employee *</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              >
                {loadingEmployees ? (
                  <option value="">Loading staff roster...</option>
                ) : employees.length === 0 ? (
                  <option value="">No active employees found</option>
                ) : (
                  employees.map((emp) => {
                    const dept = emp.department?.name || emp.departmentName || '';
                    const desig = emp.designation?.name || emp.designationName || '';
                    const meta = [dept, desig].filter(Boolean).join(' • ');
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstNameEn} {emp.lastNameEn} — {emp.employeeNo} {meta ? `(${meta})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {currentEmp && (
              <div className="space-y-3">
                {/* Employee Placement Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Department</span>
                    <span className="font-semibold text-slate-800">{empDept}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Designation</span>
                    <span className="font-semibold text-slate-800">{empDesig}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Employment</span>
                    <span className="font-semibold text-slate-800">{empType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">HR Status</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase inline-block ${
                        empStatus === 'PROBATION'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {empStatus}
                    </span>
                  </div>
                </div>

                {/* Resolved Policy Banner */}
                {loadingPolicy ? (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Resolving active leave policy...
                  </div>
                ) : resolvedPolicy ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-slate-500 font-medium">Resolved Policy: </span>
                        <span className="font-bold text-slate-900">{resolvedPolicy.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 ml-1.5">({resolvedPolicy.code})</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shrink-0">
                      {getSourceLabel(resolvedPolicy.source)}
                    </span>
                  </div>
                ) : policyError ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{policyError}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No active leave policy resolved for this employee.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Leave Type & Dates */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-600" />
              2. Leave Type & Date Range
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Leave Type *</label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                >
                  <option value="">-- Choose Leave Type --</option>
                  {loadingPolicy ? (
                    <option disabled>Resolving policy leave types...</option>
                  ) : policyLeaveTypes.length === 0 ? (
                    <option disabled>No leave types configured under active policy</option>
                  ) : (
                    policyLeaveTypes.map((lt) => (
                      <option key={lt.leaveTypeId} value={lt.leaveTypeId}>
                        {lt.leaveTypeName} ({lt.leaveTypeCode}) — {lt.isPaid ? 'Paid' : 'Unpaid'} • {lt.isUnlimited ? 'Unlimited' : `${lt.availableBalance}d available`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">From Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">To Date *</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Leave Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Leave Scope / Unit *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'FULL_DAY', label: 'Full Day (1.0d)' },
                  { id: 'HALF_DAY', label: 'Half Day (0.5d)' },
                  { id: 'SPECIFIC_SHIFT', label: 'Specific Shift' },
                  { id: 'HOURLY', label: 'Hourly / Short' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLeaveScope(s.id as LeaveScope)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      leaveScope === s.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Half Day Period Selector */}
            {leaveScope === 'HALF_DAY' && (
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3 flex items-center gap-6">
                <span className="text-xs font-bold text-indigo-900">Half Day Session:</span>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="FIRST_HALF"
                    checked={halfDayPeriod === 'FIRST_HALF'}
                    onChange={() => setHalfDayPeriod('FIRST_HALF')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  First Half (Morning)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="halfDayPeriod"
                    value="SECOND_HALF"
                    checked={halfDayPeriod === 'SECOND_HALF'}
                    onChange={() => setHalfDayPeriod('SECOND_HALF')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Second Half (Afternoon)
                </label>
              </div>
            )}

            {/* Hourly Time Pickers */}
            {leaveScope === 'HOURLY' && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">End Time (HH:MM) *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Multi-Shift Selection Table */}
            {(leaveScope === 'SPECIFIC_SHIFT' || leaveScope === 'MULTIPLE_SHIFTS') && (
              <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Select Applicable Duty Shifts:
                  </span>
                  <span className="text-xs text-purple-700">
                    {selectedShifts.length} shift segment{selectedShifts.length !== 1 ? 's' : ''} selected
                  </span>
                </div>

                {scheduledShiftsByDate.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">Loading scheduled duty shifts for date range...</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {scheduledShiftsByDate.map((item) => (
                      <div key={item.date} className="bg-white border border-slate-200 rounded-lg p-2.5">
                        <div className="text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>{item.date}</span>
                          <span className="text-[11px] text-slate-400">
                            {item.shifts.length} shift{item.shifts.length !== 1 ? 's' : ''} scheduled
                          </span>
                        </div>
                        {item.shifts.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No scheduled duty shift on this date.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {item.shifts.map((s: any) => {
                              const isChecked = selectedShifts.some(
                                (sel) => sel.date === item.date && sel.shiftId === s.shiftId
                              );
                              return (
                                <button
                                  key={s.shiftId}
                                  type="button"
                                  onClick={() => handleToggleShift(item.date, s)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                    isChecked
                                      ? 'bg-purple-600 text-white border-purple-600'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <span>{s.shiftName}</span>
                                  <span className="opacity-75 text-[10px]">({s.startTime}-{s.endTime})</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Reason & Supporting Document */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              3. Justification Reason & Attachment
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Leave Reason / Justification *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the reason for this leave application..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                Supporting Document / Medical Certificate
                {preview?.requiresAttachment && (
                  <span className="text-rose-600 font-bold text-[11px]">(Mandatory for this request)</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attachmentUrl}
                  onChange={(e) => {
                    setAttachmentUrl(e.target.value);
                    if (e.target.value && !attachmentName) setAttachmentName('medical_certificate.pdf');
                  }}
                  placeholder="Paste secure document URL or file path..."
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Preview & Validation */}
        <div className="space-y-6">
          {/* Balance & Calculation Preview Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Live Validation & Impact
              </h3>
              {calculating && <span className="text-xs text-blue-600 font-semibold animate-pulse">Calculating...</span>}
            </div>

            {calcError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {calcError}
              </div>
            ) : !preview ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Select an employee and leave type to preview balance and validation.
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Policy & Rule Header */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{preview.policy.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{preview.policy.code}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1 flex items-center gap-2">
                    <span>{preview.leaveType.name}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700">
                      {preview.policy.rule.isUnlimited ? 'Unlimited' : `${preview.policy.rule.annualEntitlement}d / year`}
                    </span>
                  </div>
                </div>

                {/* Calendar Breakdown */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Calendar Days:</span>
                    <span className="font-semibold text-slate-900">{preview.calendarSummary.totalCalendarDays}d</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Working Days:</span>
                    <span className="font-semibold text-emerald-700">{preview.calendarSummary.workingDaysCount}d</span>
                  </div>
                  {preview.calendarSummary.holidaysCount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Calendar Holidays (Excluded):</span>
                      <span className="font-semibold text-amber-700">-{preview.calendarSummary.holidaysCount}d</span>
                    </div>
                  )}
                  {preview.calendarSummary.weeklyOffCount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Weekly Offs (Excluded):</span>
                      <span className="font-semibold text-slate-500">-{preview.calendarSummary.weeklyOffCount}d</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-blue-700 border-t border-slate-100 pt-1.5">
                    <span>Total Requested:</span>
                    <span>{preview.calendarSummary.totalRequestedDays}d</span>
                  </div>
                </div>

                {/* Balance Impact */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-1.5">
                  <span className="font-bold text-blue-950 uppercase tracking-wider text-[10px] block mb-1">
                    Balance Snapshot
                  </span>
                  <div className="flex justify-between text-slate-600">
                    <span>Available Balance:</span>
                    <span className="font-bold text-slate-900">{preview.balanceSnapshot.availableBalance}d</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pending Requests:</span>
                    <span className="font-semibold text-amber-700">-{preview.balanceSnapshot.pendingRequestedDays}d</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Effective Requestable:</span>
                    <span className="font-bold text-slate-900">{preview.balanceSnapshot.effectiveRemainingBalance}d</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-900 border-t border-blue-200/60 pt-1.5">
                    <span>Projected After Approval:</span>
                    <span
                      className={
                        preview.balanceSnapshot.projectedBalanceAfterApproval < 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }
                    >
                      {preview.balanceSnapshot.projectedBalanceAfterApproval}d
                    </span>
                  </div>
                </div>

                {/* Validation Warnings & Errors */}
                {preview.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                    <span className="font-bold text-rose-800 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Blocking Errors:
                    </span>
                    {preview.errors.map((e, idx) => (
                      <p key={idx} className="text-[11px] text-rose-700">
                        • {e.message}
                      </p>
                    ))}
                  </div>
                )}

                {preview.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Notice:
                    </span>
                    {preview.warnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] text-amber-700">
                        • {w.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
