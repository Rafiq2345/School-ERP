'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Plus,
  Edit2,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
  Briefcase,
  History,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function WorkShiftManagementView() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [earlyExitGraceMinutes, setEarlyExitGraceMinutes] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [minHoursFullDay, setMinHoursFullDay] = useState(6.0);
  const [minHoursHalfDay, setMinHoursHalfDay] = useState(3.5);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [isDefault, setIsDefault] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [description, setDescription] = useState('');

  // Variable Timings (e.g. Friday)
  const [hasFridayTiming, setHasFridayTiming] = useState(false);
  const [fridayStart, setFridayStart] = useState('08:00');
  const [fridayEnd, setFridayEnd] = useState('12:30');

  const { success, error } = useToast();

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/attendance/employees/shifts');
      const json = await res.json();
      if (json.success) {
        setShifts(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load shifts');
      }
    } catch {
      error('Network Error', 'Could not load shift configurations.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const openCreateModal = () => {
    setEditingShift(null);
    setName('');
    setCode('');
    setStartTime('08:00');
    setEndTime('16:00');
    setGraceMinutes(15);
    setEarlyExitGraceMinutes(0);
    setBreakMinutes(0);
    setMinHoursFullDay(6.0);
    setMinHoursHalfDay(3.5);
    setWorkingDays([1, 2, 3, 4, 5, 6]);
    setIsDefault(false);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setEffectiveTo('');
    setDescription('');
    setHasFridayTiming(false);
    setFridayStart('08:00');
    setFridayEnd('12:30');
    setIsModalOpen(true);
  };

  const openEditModal = (shift: any) => {
    setEditingShift(shift);
    setName(shift.name);
    setCode(shift.code);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setGraceMinutes(shift.graceMinutes);
    setEarlyExitGraceMinutes(shift.earlyExitGraceMinutes || 0);
    setBreakMinutes(shift.breakMinutes || 0);
    setMinHoursFullDay(Number(shift.minHoursFullDay || 6.0));
    setMinHoursHalfDay(Number(shift.minHoursHalfDay || 3.5));
    setWorkingDays(shift.workingDays || [1, 2, 3, 4, 5, 6]);
    setIsDefault(shift.isDefault);
    setEffectiveFrom(shift.effectiveFrom ? shift.effectiveFrom.split('T')[0] : '');
    setEffectiveTo(shift.effectiveTo ? shift.effectiveTo.split('T')[0] : '');
    setDescription(shift.description || '');

    if (shift.daySpecificTimings && shift.daySpecificTimings['5']) {
      setHasFridayTiming(true);
      setFridayStart(shift.daySpecificTimings['5'].startTime || '08:00');
      setFridayEnd(shift.daySpecificTimings['5'].endTime || '12:30');
    } else {
      setHasFridayTiming(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !startTime || !endTime) {
      error('Validation Error', 'Name, code, start time and end time are required.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      startTime,
      endTime,
      graceMinutes: Number(graceMinutes),
      earlyExitGraceMinutes: Number(earlyExitGraceMinutes),
      breakMinutes: Number(breakMinutes),
      minHoursFullDay: Number(minHoursFullDay),
      minHoursHalfDay: Number(minHoursHalfDay),
      workingDays,
      isDefault,
      effectiveFrom,
      effectiveTo: effectiveTo ? effectiveTo : null,
      description: description.trim() || null,
      daySpecificTimings: hasFridayTiming ? { '5': { startTime: fridayStart, endTime: fridayEnd } } : null,
    };

    try {
      const url = editingShift
        ? `/api/admin/attendance/employees/shifts/${editingShift.id}`
        : '/api/admin/attendance/employees/shifts';
      const method = editingShift ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(editingShift ? 'Shift Updated' : 'Shift Created', `Successfully saved "${name}".`);
        setIsModalOpen(false);
        fetchShifts();
      } else {
        error('Save Failed', json.error?.message || 'Could not save shift.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with server.');
    }
  };

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const weekDayLabels: Record<number, string> = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    0: 'Sun',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Work Shift &amp; Schedule Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define reusable work shifts, variable daily hours, break policies, and bulk employee schedules
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/attendance/employees/shifts/assignments"
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            Bulk Shift Assignments
          </Link>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Work Shift
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
        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
          Shift Management
        </span>
        <Link href="/admin/attendance/employees/schedules" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Work Schedules
        </Link>
        <Link href="/admin/attendance/employees/schedules/assignments" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Schedule Assignments
        </Link>
        <Link href="/admin/attendance/employees/corrections" className="px-3 py-1.5 hover:bg-slate-100 rounded-lg">
          Audit &amp; Corrections
        </Link>
      </div>

      {/* Shifts Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading work shifts...
          </div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No work shifts configured. Click &quot;Create Work Shift&quot; to begin.
          </div>
        ) : (
          shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{shift.name}</h3>
                      {shift.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-3xs text-slate-400 uppercase font-semibold">{shift.code}</span>
                  </div>

                  <button
                    onClick={() => openEditModal(shift)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    title="Edit Shift"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Timing Badge */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{shift.startTime} &rarr; {shift.endTime}</span>
                  </div>
                  <span className="text-3xs font-normal text-slate-500 font-sans">
                    Grace: +{shift.graceMinutes}m
                  </span>
                </div>

                {/* Details Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-3xs text-slate-600">
                  <div className="p-2 bg-slate-50/60 rounded-lg">
                    <span className="text-slate-400 block font-semibold">Full Day Min:</span>
                    <span className="font-bold text-slate-800">{Number(shift.minHoursFullDay || 6.0)} hrs</span>
                  </div>
                  <div className="p-2 bg-slate-50/60 rounded-lg">
                    <span className="text-slate-400 block font-semibold">Half Day Min:</span>
                    <span className="font-bold text-slate-800">{Number(shift.minHoursHalfDay || 3.5)} hrs</span>
                  </div>
                </div>

                {/* Working Days */}
                <div className="mt-3">
                  <span className="text-3xs font-semibold text-slate-400 block mb-1">Working Days:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const isWorking = Array.isArray(shift.workingDays) && shift.workingDays.includes(d);
                      return (
                        <span
                          key={d}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isWorking ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {weekDayLabels[d]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Variable Timings */}
                {shift.daySpecificTimings && shift.daySpecificTimings['5'] && (
                  <div className="mt-2 text-3xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="font-bold">Friday Timing:</span> {shift.daySpecificTimings['5'].startTime} &rarr; {shift.daySpecificTimings['5'].endTime}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-3xs text-slate-400">
                  {shift._count?.employees || 0} staff assigned
                </span>
                <Link
                  href={`/admin/attendance/employees/shifts/assignments?shiftId=${shift.id}`}
                  className="text-blue-600 hover:text-blue-700 font-bold text-3xs flex items-center gap-1"
                >
                  Bulk Assign &rarr;
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT SHIFT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingShift ? 'Edit Work Shift' : 'Create New Work Shift'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Shift Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Day Standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Shift Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SHIFT-FULL"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono uppercase focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Start and End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Grace & Break */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Late Grace (mins)</label>
                  <input
                    type="number"
                    min={0}
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Early Exit Grace</label>
                  <input
                    type="number"
                    min={0}
                    value={earlyExitGraceMinutes}
                    onChange={(e) => setEarlyExitGraceMinutes(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Break Duration (m)</label>
                  <input
                    type="number"
                    min={0}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Minimum Hours Full/Half Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Hours for Full Day</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    value={minHoursFullDay}
                    onChange={(e) => setMinHoursFullDay(parseFloat(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Hours for Half Day</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    value={minHoursHalfDay}
                    onChange={(e) => setMinHoursHalfDay(parseFloat(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Working Days Checkboxes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Configured Working Days</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        workingDays.includes(d)
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {weekDayLabels[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Friday / Custom Variable Timing Override */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFridayTiming}
                    onChange={(e) => setHasFridayTiming(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold text-slate-800">Enable Special Friday Timing Override</span>
                </label>

                {hasFridayTiming && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-3xs text-slate-500 block mb-1">Friday Start Time</span>
                      <input
                        type="time"
                        value={fridayStart}
                        onChange={(e) => setFridayStart(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-3xs text-slate-500 block mb-1">Friday End Time</span>
                      <input
                        type="time"
                        value={fridayEnd}
                        onChange={(e) => setFridayEnd(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Default Shift Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-800">Set as Institutional Default Shift</span>
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
                  {editingShift ? 'Save Changes' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
