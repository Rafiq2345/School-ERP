'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarOff,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  Info,
  Shield,
  ArrowLeft,
  X,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  HolidayType,
  HolidayScope,
  SchoolHolidayDTO,
  WeeklyOffSettingDTO,
  ExistingAttendanceConflictDetail,
  HOLIDAY_TYPES,
} from '@/lib/types/holiday';
import { useToast } from '@/components/ui/Toast';

export function SchoolHolidaysView() {
  const [activeTab, setActiveTab] = useState<'holidays' | 'weekly-off' | 'audit'>('holidays');

  // Master Data
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Holidays State
  const [holidays, setHolidays] = useState<SchoolHolidayDTO[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');

  // Weekly Off State
  const [weeklyOffSetting, setWeeklyOffSetting] = useState<WeeklyOffSettingDTO>({
    daysOfWeek: [0],
    isActive: true,
    description: 'Standard Sunday Weekly Off',
  });
  const [isSavingWeeklyOff, setIsSavingWeeklyOff] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<SchoolHolidayDTO | null>(null);
  const [cancellingHoliday, setCancellingHoliday] = useState<SchoolHolidayDTO | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Form State for Add / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<HolidayType>('PUBLIC_HOLIDAY');
  const [formIsRange, setFormIsRange] = useState(false);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formScope, setFormScope] = useState<HolidayScope>('WHOLE_SCHOOL');
  const [formSelectedClasses, setFormSelectedClasses] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState('');
  const [formEditReason, setFormEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conflict Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    totalRecords: number;
    conflicts: ExistingAttendanceConflictDetail[];
  } | null>(null);

  // Exactly ONE useToast declaration
  const { success, error } = useToast();

  // Load Sessions and Classes
  useEffect(() => {
    async function loadMasters() {
      try {
        const [sessRes, clsRes] = await Promise.all([
          fetch('/api/admin/config/sessions').then((r) => r.json()),
          fetch('/api/admin/config/classes').then((r) => r.json()),
        ]);

        if (sessRes.success && Array.isArray(sessRes.data)) {
          setSessions(sessRes.data);
          const current = sessRes.data.find((s: any) => s.isCurrent) || sessRes.data[0];
          if (current) setSelectedSession(current.id);
        }
        if (clsRes.success && Array.isArray(clsRes.data)) {
          setClasses(clsRes.data);
        }
      } catch {
        error('Error', 'Failed to load master configuration.');
      }
    }
    loadMasters();
  }, [error]);

  // Load Holidays List
  const fetchHolidays = useCallback(async () => {
    setIsLoadingHolidays(true);
    try {
      const url = `/api/admin/config/holidays?${
        selectedSession ? `sessionId=${selectedSession}&` : ''
      }${statusFilter !== 'ALL' ? `status=${statusFilter}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHolidays(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to fetch holidays.');
      }
    } catch {
      error('Network Error', 'Could not load holidays.');
    } finally {
      setIsLoadingHolidays(false);
    }
  }, [selectedSession, statusFilter, error]);

  // Load Weekly Off Setting
  const fetchWeeklyOff = useCallback(async () => {
    try {
      const url = `/api/admin/config/holidays/weekly-off${
        selectedSession ? `?sessionId=${selectedSession}` : ''
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setWeeklyOffSetting(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, [selectedSession]);

  // Load Audit Trail
  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/config/holidays/audit');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAuditLogs(json.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'holidays') fetchHolidays();
    else if (activeTab === 'weekly-off') fetchWeeklyOff();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchHolidays, fetchWeeklyOff, fetchAuditLogs]);

  // Reset Add/Edit Form
  const openAddModal = () => {
    setEditingHoliday(null);
    setFormTitle('');
    setFormType('PUBLIC_HOLIDAY');
    setFormIsRange(false);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date().toISOString().split('T')[0]);
    setFormScope('WHOLE_SCHOOL');
    setFormSelectedClasses([]);
    setFormDescription('');
    setFormEditReason('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (h: SchoolHolidayDTO) => {
    setEditingHoliday(h);
    setFormTitle(h.title);
    setFormType(h.holidayType);
    setFormIsRange(h.startDate !== h.endDate);
    setFormStartDate(h.startDate);
    setFormEndDate(h.endDate);
    setFormScope(h.scope);
    setFormSelectedClasses(h.targetClassIds || []);
    setFormDescription(h.description || '');
    setFormEditReason('');
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit Holiday
  const handleSaveHoliday = async (allowConflictOverride = false) => {
    if (!formTitle.trim()) {
      error('Validation Error', 'Holiday Title / Reason is mandatory.');
      return;
    }

    const effectiveEndDate = formIsRange ? formEndDate : formStartDate;
    if (new Date(effectiveEndDate) < new Date(formStartDate)) {
      error('Validation Error', 'End Date cannot be earlier than Start Date.');
      return;
    }

    if (editingHoliday && !formEditReason.trim()) {
      error('Validation Error', 'Edit Reason / Justification is mandatory.');
      return;
    }

    if (formScope === 'CLASS_SPECIFIC' && formSelectedClasses.length === 0) {
      error('Validation Error', 'Please select at least one class for Class-Specific scope.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingHoliday) {
        // Update Holiday
        const res = await fetch(`/api/admin/config/holidays/${editingHoliday.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            holidayType: formType,
            startDate: formStartDate,
            endDate: effectiveEndDate,
            scope: formScope,
            academicSessionId: formScope === 'ACADEMIC_SESSION' ? selectedSession : undefined,
            targetClassIds: formScope === 'CLASS_SPECIFIC' ? formSelectedClasses : [],
            description: formDescription.trim() || undefined,
            editReason: formEditReason.trim(),
          }),
        });
        const json = await res.json();
        if (json.success) {
          success('Holiday Updated', `Successfully updated "${formTitle}".`);
          setIsAddModalOpen(false);
          fetchHolidays();
        } else {
          error('Update Failed', json.error?.message || 'Failed to update holiday.');
        }
      } else {
        // Create Holiday
        const res = await fetch('/api/admin/config/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            holidayType: formType,
            startDate: formStartDate,
            endDate: effectiveEndDate,
            scope: formScope,
            academicSessionId: formScope === 'ACADEMIC_SESSION' ? selectedSession : undefined,
            targetClassIds: formScope === 'CLASS_SPECIFIC' ? formSelectedClasses : [],
            description: formDescription.trim() || undefined,
            allowConflictOverride,
          }),
        });

        const json = await res.json();
        if (res.status === 409 && json.hasConflict) {
          // Attendance Conflict detected!
          setConflictDetails({
            totalRecords: json.conflictDetails.totalRecordsFound,
            conflicts: json.conflictDetails.conflictsByDate,
          });
          setConflictModalOpen(true);
          return;
        }

        if (json.success) {
          success(
            allowConflictOverride ? 'Holiday Created (Override Logged)' : 'Holiday Created',
            `Successfully scheduled "${formTitle}" from ${formStartDate} to ${effectiveEndDate}.`
          );
          setIsAddModalOpen(false);
          setConflictModalOpen(false);
          fetchHolidays();
        } else {
          error('Save Failed', json.error?.message || 'Failed to create holiday.');
        }
      }
    } catch {
      error('Network Error', 'Could not save holiday configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Holiday Cancellation
  const handleCancelHoliday = async () => {
    if (!cancellingHoliday) return;
    if (!cancellationReason.trim()) {
      error('Validation Error', 'Cancellation Reason is mandatory.');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/config/holidays/${cancellingHoliday.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: cancellationReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        success('Holiday Cancelled', `Holiday "${cancellingHoliday.title}" has been cancelled.`);
        setCancellingHoliday(null);
        setCancellationReason('');
        fetchHolidays();
      } else {
        error('Cancellation Failed', json.error?.message || 'Could not cancel holiday.');
      }
    } catch {
      error('Network Error', 'Failed to cancel holiday.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Submit Weekly Off Update
  const handleSaveWeeklyOff = async () => {
    if (weeklyOffSetting.daysOfWeek.length === 0) {
      error('Validation Error', 'At least one day must be selected as weekly off.');
      return;
    }

    setIsSavingWeeklyOff(true);
    try {
      const res = await fetch('/api/admin/config/holidays/weekly-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysOfWeek: weeklyOffSetting.daysOfWeek,
          academicSessionId: selectedSession || undefined,
          description: weeklyOffSetting.description || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success('Weekly Off Updated', 'Weekly non-working days configuration saved successfully.');
        fetchWeeklyOff();
      } else {
        error('Save Failed', json.error?.message || 'Failed to save weekly offs.');
      }
    } catch {
      error('Network Error', 'Could not update weekly off schedule.');
    } finally {
      setIsSavingWeeklyOff(false);
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    const term = searchTerm.toLowerCase();
    return (
      h.title.toLowerCase().includes(term) ||
      (h.description && h.description.toLowerCase().includes(term)) ||
      h.holidayType.toLowerCase().includes(term)
    );
  });

  const dayOptions = [
    { value: 0, name: 'Sunday', short: 'Sun' },
    { value: 1, name: 'Monday', short: 'Mon' },
    { value: 2, name: 'Tuesday', short: 'Tue' },
    { value: 3, name: 'Wednesday', short: 'Wed' },
    { value: 4, name: 'Thursday', short: 'Thu' },
    { value: 5, name: 'Friday', short: 'Fri' },
    { value: 6, name: 'Saturday', short: 'Sat' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title="Back to Settings Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">School Calendar &amp; Holiday Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-9">
            Configure central recurring weekly offs, public holidays, and date-range vacations across the ERP
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Holiday
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'holidays'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Holidays &amp; Vacations ({holidays.length})
        </button>

        <button
          onClick={() => setActiveTab('weekly-off')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'weekly-off'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Recurring Weekly Offs
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Calendar Audit Trail
        </button>
      </div>

      {/* TAB 1: HOLIDAYS & VACATIONS */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-3xs font-bold rounded-lg transition-all ${
                      statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Selector */}
            <div className="flex items-center gap-2">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Session:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Holidays Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Holiday Title &amp; Reason</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date / Period</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingHolidays ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading holidays &amp; vacations...
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No holiday records found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h) => {
                    const typeConfig = HOLIDAY_TYPES[h.holidayType] || HOLIDAY_TYPES.PUBLIC_HOLIDAY;
                    const isCancelled = h.status === 'CANCELLED';

                    return (
                      <tr
                        key={h.id}
                        className={`hover:bg-slate-50/60 transition-colors group ${
                          isCancelled ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Title & Description */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{h.title}</span>
                            {h.scope === 'WHOLE_SCHOOL' && (
                              <span className="text-3xs font-medium bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full">
                                School-wide
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <p className="text-3xs text-slate-500 mt-0.5 max-w-sm truncate">{h.description}</p>
                          )}
                          {isCancelled && h.cancellationReason && (
                            <p className="text-3xs text-rose-600 mt-0.5 italic">
                              Cancelled: &quot;{h.cancellationReason}&quot; by {h.cancelledBy || 'admin'}
                            </p>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-3xs font-bold px-2.5 py-0.5 rounded-full border ${typeConfig.badgeClass}`}
                          >
                            {typeConfig.labelEn}
                          </span>
                        </td>

                        {/* Date Range */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {h.startDate === h.endDate ? (
                            <span>{h.startDate}</span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span>{h.startDate}</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span>{h.endDate}</span>
                            </div>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {h.durationDays} {h.durationDays === 1 ? 'day' : 'days'}
                        </td>

                        {/* Scope */}
                        <td className="py-3 px-4">
                          {h.scope === 'WHOLE_SCHOOL' && (
                            <span className="text-3xs text-slate-600 font-semibold">Whole Institution</span>
                          )}
                          {h.scope === 'ACADEMIC_SESSION' && (
                            <span className="text-3xs text-indigo-700 font-semibold">
                              Session: {h.academicSessionName || 'Current'}
                            </span>
                          )}
                          {h.scope === 'CLASS_SPECIFIC' && (
                            <div className="text-3xs text-amber-800 font-semibold">
                              <span>Classes: </span>
                              <span className="text-slate-600">
                                {h.targetClassNames?.join(', ') || `${h.targetClassIds.length} classes`}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {h.status === 'ACTIVE' ? (
                            <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="text-3xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isCancelled && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(h)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                  title="Edit Holiday"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingHoliday(h);
                                    setCancellationReason('');
                                  }}
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                  title="Cancel Holiday"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECURRING WEEKLY OFF */}
      {activeTab === 'weekly-off' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Institutional Weekly Off Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify the recurring days of the week when the institution is closed. Downstream modules (Attendance, Timetable, Exams) automatically exclude these days from working day tallies.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
              Active Weekly Off Days
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {dayOptions.map((day) => {
                const isSelected = weeklyOffSetting.daysOfWeek.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const exists = weeklyOffSetting.daysOfWeek.includes(day.value);
                      const next = exists
                        ? weeklyOffSetting.daysOfWeek.filter((d) => d !== day.value)
                        : [...weeklyOffSetting.daysOfWeek, day.value].sort();
                      setWeeklyOffSetting({ ...weeklyOffSetting, daysOfWeek: next });
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{day.name}</div>
                      <div className="text-3xs text-slate-400 font-mono">Day {day.value}</div>
                    </div>
                    {isSelected && (
                      <span className="p-1 bg-indigo-600 text-white rounded-md">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Callout */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>
                {weeklyOffSetting.daysOfWeek.length} Non-Working Days / {7 - weeklyOffSetting.daysOfWeek.length} Working Days per standard week
              </span>
            </div>
            <p className="text-slate-500 text-3xs">
              Selected Weekly Offs: <strong>{weeklyOffSetting.daysOfWeek.map((d) => dayOptions.find((opt) => opt.value === d)?.name).join(', ') || 'None'}</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveWeeklyOff}
              disabled={isSavingWeeklyOff || weeklyOffSetting.daysOfWeek.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSavingWeeklyOff ? 'Saving Schedule...' : 'Save Weekly Off Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CALENDAR AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Calendar &amp; Holiday Audit Trail
              </h2>
              <p className="text-3xs text-slate-400">
                Immutable history of all holiday creations, updates, cancellations, and attendance overrides
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Refresh Audit"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Holiday / Event</th>
                <th className="py-3 px-4">Reason / Justification</th>
                <th className="py-3 px-4">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoadingAudit ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No holiday audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  let actionBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (log.action === 'CREATED') actionBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  else if (log.action === 'UPDATED') actionBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  else if (log.action === 'CANCELLED') actionBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                  else if (log.action === 'ATTENDANCE_OVERRIDE') actionBadge = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-3xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-3xs font-bold px-2 py-0.5 rounded-md border ${actionBadge}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.holiday?.title || 'Weekly Off Schedule'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">{log.reason}</td>
                      <td className="py-3 px-4 font-mono text-3xs text-slate-500">
                        {log.user?.username || 'system'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOLIDAY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingHoliday ? 'Edit School Holiday' : 'Schedule New Holiday / Vacation'}
                  </h3>
                  <p className="text-xs text-slate-500">All modules will automatically apply this non-working period</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Title / Reason */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Holiday Title / Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eid-ul-Fitr, Pakistan Day, Summer Vacation..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Holiday Type & Range Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Holiday Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as HolidayType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {Object.values(HOLIDAY_TYPES).map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.labelEn} ({t.labelUr})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration Type</label>
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormIsRange(false)}
                      className={`flex-1 py-1.5 text-3xs font-bold rounded-lg transition-all ${
                        !formIsRange ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsRange(true)}
                      className={`flex-1 py-1.5 text-3xs font-bold rounded-lg transition-all ${
                        formIsRange ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {formIsRange ? 'Start Date' : 'Date'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {formIsRange && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Scope Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Applicable Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'WHOLE_SCHOOL', label: 'Whole School' },
                    { code: 'ACADEMIC_SESSION', label: 'Academic Session' },
                    { code: 'CLASS_SPECIFIC', label: 'Selected Classes' },
                  ].map((sc) => (
                    <button
                      key={sc.code}
                      type="button"
                      onClick={() => setFormScope(sc.code as HolidayScope)}
                      className={`p-2.5 text-3xs font-bold rounded-xl border text-center transition-all ${
                        formScope === sc.code
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Checklist if CLASS_SPECIFIC */}
              {formScope === 'CLASS_SPECIFIC' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="font-bold text-slate-700 text-3xs uppercase tracking-wider block">
                    Select Target Classes
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {classes.map((c) => {
                      const isChecked = formSelectedClasses.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setFormSelectedClasses([...formSelectedClasses, c.id]);
                              else setFormSelectedClasses(formSelectedClasses.filter((id) => id !== c.id));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or circular reference..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Edit Reason (if editing) */}
              {editingHoliday && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Edit Justification / Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Reason for modifying this holiday record..."
                    value={formEditReason}
                    onChange={(e) => setFormEditReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveHoliday(false)}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Save Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ATTENDANCE CONFLICT WARNING & OVERRIDE */}
      {conflictModalOpen && conflictDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Existing Attendance Conflict Detected</h3>
                <p className="text-xs text-slate-500">Attendance records already exist for this date period</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700">
                Found <strong>{conflictDetails.totalRecords} attendance record(s)</strong> already marked on dates within your proposed holiday range:
              </p>

              <div className="max-h-36 overflow-y-auto space-y-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                {conflictDetails.conflicts.map((c) => (
                  <div key={c.date} className="flex items-center justify-between text-3xs text-amber-900">
                    <span className="font-mono font-bold">{c.date}</span>
                    <span>
                      {c.attendanceCount} records ({c.classesAffected.map((cls) => cls.className).join(', ')})
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 text-3xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Audit Trail &amp; Safety Compliance</span>
                </div>
                <p className="text-3xs text-slate-500">
                  Existing attendance records will <strong>NOT</strong> be deleted. Confirming will schedule the holiday and record an authorized administrative override event in the permanent audit trail.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveHoliday(true)}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors"
              >
                {isSubmitting ? 'Overriding...' : 'Confirm & Schedule with Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL HOLIDAY */}
      {cancellingHoliday && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                <CalendarOff className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cancel School Holiday</h3>
                <p className="text-xs text-slate-500">Revert this holiday and restore working days calculations</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700">
                Are you sure you want to cancel <strong>&quot;{cancellingHoliday.title}&quot;</strong> scheduled from{' '}
                <span className="font-mono">{cancellingHoliday.startDate}</span> to{' '}
                <span className="font-mono">{cancellingHoliday.endDate}</span>?
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Cancellation Reason / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Government notification reversed; exam schedule adjusted..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-3xs text-slate-400 mt-1">
                  This reason will be logged permanently in the calendar audit trail.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingHoliday(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelHoliday}
                disabled={!cancellationReason.trim() || isCancelling}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
