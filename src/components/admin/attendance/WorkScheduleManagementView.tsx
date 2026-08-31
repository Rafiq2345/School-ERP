'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Users,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shield,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function WorkScheduleManagementView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');

  // 7 Days Definition (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun)
  const [dayConfigs, setDayConfigs] = useState<
    Array<{ dayOfWeek: number; isWorkingDay: boolean; shiftIds: string[] }>
  >([
    { dayOfWeek: 1, isWorkingDay: true, shiftIds: [] },
    { dayOfWeek: 2, isWorkingDay: true, shiftIds: [] },
    { dayOfWeek: 3, isWorkingDay: true, shiftIds: [] },
    { dayOfWeek: 4, isWorkingDay: true, shiftIds: [] },
    { dayOfWeek: 5, isWorkingDay: true, shiftIds: [] },
    { dayOfWeek: 6, isWorkingDay: false, shiftIds: [] },
    { dayOfWeek: 0, isWorkingDay: false, shiftIds: [] },
  ]);

  const { success, error } = useToast();

  const weekDayLabels: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    0: 'Sunday',
  };

  const fetchSchedulesAndShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schedRes, shiftRes] = await Promise.all([
        fetch('/api/admin/attendance/employees/schedules').then((r) => r.json()),
        fetch('/api/admin/attendance/employees/shifts').then((r) => r.json()),
      ]);

      if (schedRes.success) setSchedules(schedRes.data);
      if (shiftRes.success) setShifts(shiftRes.data);
    } catch {
      error('Network Error', 'Failed to load work schedules.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSchedulesAndShifts();
  }, [fetchSchedulesAndShifts]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setName('');
    setCode('');
    setDescription('');
    setIsDefault(false);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setEffectiveTo('');

    const defaultShiftId = shifts[0]?.id ? [shifts[0].id] : [];
    setDayConfigs([
      { dayOfWeek: 1, isWorkingDay: true, shiftIds: defaultShiftId },
      { dayOfWeek: 2, isWorkingDay: true, shiftIds: defaultShiftId },
      { dayOfWeek: 3, isWorkingDay: true, shiftIds: defaultShiftId },
      { dayOfWeek: 4, isWorkingDay: true, shiftIds: defaultShiftId },
      { dayOfWeek: 5, isWorkingDay: true, shiftIds: defaultShiftId },
      { dayOfWeek: 6, isWorkingDay: false, shiftIds: [] },
      { dayOfWeek: 0, isWorkingDay: false, shiftIds: [] },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (sched: any) => {
    setEditingSchedule(sched);
    setName(sched.name);
    setCode(sched.code);
    setDescription(sched.description || '');
    setIsDefault(sched.isDefault);
    setEffectiveFrom(sched.effectiveFrom ? sched.effectiveFrom.split('T')[0] : '');
    setEffectiveTo(sched.effectiveTo ? sched.effectiveTo.split('T')[0] : '');

    const daysMap = new Map<number, any>();
    sched.days.forEach((d: any) => daysMap.set(d.dayOfWeek, d));

    const updatedDays = [1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
      const existing = daysMap.get(dayNum);
      return {
        dayOfWeek: dayNum,
        isWorkingDay: existing ? existing.isWorkingDay : dayNum !== 0 && dayNum !== 6,
        shiftIds: existing && Array.isArray(existing.shiftIds) ? existing.shiftIds : [],
      };
    });

    setDayConfigs(updatedDays);
    setIsModalOpen(true);
  };

  const toggleDayWorking = (dayIndex: number) => {
    const updated = [...dayConfigs];
    updated[dayIndex].isWorkingDay = !updated[dayIndex].isWorkingDay;
    if (!updated[dayIndex].isWorkingDay) {
      updated[dayIndex].shiftIds = [];
    } else if (updated[dayIndex].shiftIds.length === 0 && shifts.length > 0) {
      updated[dayIndex].shiftIds = [shifts[0].id];
    }
    setDayConfigs(updated);
  };

  const toggleDayShift = (dayIndex: number, shiftId: string) => {
    const updated = [...dayConfigs];
    const currentShiftIds = updated[dayIndex].shiftIds;
    if (currentShiftIds.includes(shiftId)) {
      updated[dayIndex].shiftIds = currentShiftIds.filter((id) => id !== shiftId);
    } else {
      updated[dayIndex].shiftIds = [...currentShiftIds, shiftId];
    }
    setDayConfigs(updated);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      error('Validation Error', 'Schedule Name and Code are required.');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      isDefault,
      effectiveFrom,
      effectiveTo: effectiveTo ? effectiveTo : null,
      days: dayConfigs,
    };

    try {
      const url = editingSchedule
        ? `/api/admin/attendance/employees/schedules/${editingSchedule.id}`
        : '/api/admin/attendance/employees/schedules';
      const method = editingSchedule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          editingSchedule ? 'Schedule Updated' : 'Schedule Created',
          `Successfully saved schedule "${name}".`
        );
        setIsModalOpen(false);
        fetchSchedulesAndShifts();
      } else {
        error('Save Failed', json.error?.message || 'Could not save schedule.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with server.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Work Schedules &amp; Duty Patterns</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define reusable weekly duty schedules (Single, Double, or Multi-Shift) for staff groups and departments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/attendance/employees/schedules/assignments"
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            Bulk Schedule Assignments
          </Link>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Work Schedule
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 border-b border-slate-200 pb-2 flex-wrap">
        <Link href="/admin/attendance/employees" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Employee Attendance
        </Link>
        <Link href="/admin/attendance/employees/register" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Monthly Register
        </Link>
        <Link href="/admin/attendance/employees/shifts" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Shift Management
        </Link>
        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
          Work Schedules
        </span>
        <Link href="/admin/attendance/employees/schedules/assignments" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Shift/Schedule Assignments
        </Link>
        <Link href="/admin/attendance/employees/corrections" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Audit &amp; Corrections
        </Link>
      </div>

      {/* Schedules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading work schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No work schedules configured. Click &quot;Create Work Schedule&quot; to begin.
          </div>
        ) : (
          schedules.map((sched) => (
            <div
              key={sched.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{sched.name}</h3>
                      {sched.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-3xs text-slate-400 uppercase font-semibold">{sched.code}</span>
                  </div>

                  <button
                    onClick={() => openEditModal(sched)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    title="Edit Schedule"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {sched.description && (
                  <p className="text-3xs text-slate-500 mt-2 line-clamp-2">{sched.description}</p>
                )}

                {/* Day-by-Day Summary Badges */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-3xs font-semibold text-slate-400 block">Weekly Duty Pattern:</span>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {[1, 2, 3, 4, 5, 6, 0].map((dNum) => {
                      const dayDef = sched.days?.find((d: any) => d.dayOfWeek === dNum);
                      const isWork = dayDef ? dayDef.isWorkingDay : false;
                      const shiftCount = dayDef && Array.isArray(dayDef.shiftIds) ? dayDef.shiftIds.length : 0;

                      return (
                        <div
                          key={dNum}
                          className={`p-1 rounded-lg border text-3xs ${
                            isWork
                              ? 'bg-blue-50/80 border-blue-200 text-blue-800'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="font-bold block">{weekDayLabels[dNum].slice(0, 3)}</span>
                          <span className="text-[10px] block mt-0.5">
                            {isWork ? `${shiftCount}s` : 'Off'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-3xs text-slate-400">
                  {sched._count?.assignments || 0} active assignments
                </span>
                <Link
                  href={`/admin/attendance/employees/schedules/assignments?scheduleId=${sched.id}`}
                  className="text-blue-600 hover:text-blue-700 font-bold text-3xs flex items-center gap-1"
                >
                  Assign Schedule &rarr;
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT WORK SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingSchedule ? 'Edit Work Schedule' : 'Create New Work Schedule'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Schedule Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full-Time Teaching Schedule"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Schedule Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WS-FT-TEACH"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Standard 5-day academic faculty duty schedule"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Day-Wise Duty Matrix */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 block">Day-Wise Duty Pattern &amp; Shifts</label>
                  <span className="text-3xs text-slate-400">Configure 0, 1, 2, or multiple shifts per day</span>
                </div>

                <div className="space-y-2">
                  {dayConfigs.map((d, dIdx) => (
                    <div
                      key={d.dayOfWeek}
                      className={`p-3 rounded-xl border transition-all ${
                        d.isWorkingDay ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleDayWorking(dIdx)}
                            className={`px-2.5 py-1 rounded-lg text-3xs font-bold transition-all ${
                              d.isWorkingDay
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {d.isWorkingDay ? 'Working Day' : 'Off Day'}
                          </button>
                          <span className="font-bold text-slate-800 text-xs">{weekDayLabels[d.dayOfWeek]}</span>
                        </div>

                        <span className="text-3xs text-slate-400 font-mono">
                          {d.shiftIds.length} shift(s) selected
                        </span>
                      </div>

                      {/* Shift Checkboxes for this day */}
                      {d.isWorkingDay && (
                        <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-slate-200/60">
                          {shifts.map((s) => {
                            const isSelected = d.shiftIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleDayShift(dIdx, s.id)}
                                className={`px-2 py-1 rounded-lg border text-3xs font-semibold transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <span>{s.name} ({s.startTime}-{s.endTime})</span>
                                {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-800">Set as Institutional Default Work Schedule</span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
                >
                  {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
