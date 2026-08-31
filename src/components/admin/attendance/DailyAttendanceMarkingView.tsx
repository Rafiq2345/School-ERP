'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  UserCheck,
  UserX,
  Clock,
  Calendar,
  CalendarOff,
  AlertCircle,
  Save,
  ArrowLeft,
  Search,
  Users,
  Edit3,
  Info,
} from 'lucide-react';
import {
  AttendanceStatus,
  StudentRosterForAttendance,
  ATTENDANCE_STATUSES,
} from '@/lib/types/attendance';
import { useToast } from '@/components/ui/Toast';

export interface StudentAttendanceState {
  studentId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  remarks: string;
  originalStatus: AttendanceStatus | null;
  originalRemarks: string | null;
}

export function DailyAttendanceMarkingView() {
  const searchParams = useSearchParams();

  // Master Data Dropdowns
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [selectedClass, setSelectedClass] = useState<string>(searchParams.get('classId') || '');
  const [selectedSection, setSelectedSection] = useState<string>(searchParams.get('sectionId') || '');

  // Roster & Attendance Form
  const [roster, setRoster] = useState<StudentRosterForAttendance[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, StudentAttendanceState>>({});
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [holidayData, setHolidayData] = useState<{
    isHoliday: boolean;
    isWeeklyOff: boolean;
    holidayInfo?: { id?: string; title: string; holidayType: string; scope: string; description?: string | null } | null;
  } | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  const { success, error } = useToast();

  // 1. Load initial master data (Sessions, Classes) from Administration Configuration
  useEffect(() => {
    let isMounted = true;
    async function loadMasterData() {
      try {
        const [sessRes, classRes] = await Promise.all([
          fetch('/api/admin/config/sessions').then((r) => r.json()),
          fetch('/api/admin/config/classes').then((r) => r.json()),
        ]);

        if (!isMounted) return;

        if (sessRes.success && Array.isArray(sessRes.data)) {
          setSessions(sessRes.data);
          const current = sessRes.data.find((s: any) => s.isCurrent) || sessRes.data[0];
          if (current && !selectedSession) {
            setSelectedSession(current.id);
          }
        }

        if (classRes.success && Array.isArray(classRes.data)) {
          setClasses(classRes.data);
          const initialClassId = searchParams.get('classId') || (classRes.data.length > 0 ? classRes.data[0].id : '');
          if (initialClassId) {
            setSelectedClass(initialClassId);
          }
        }
      } catch {
        error('Error', 'Failed to load configuration masters.');
      }
    }
    loadMasterData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Load sections whenever class changes
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    let isMounted = true;
    async function loadSections() {
      try {
        const res = await fetch(`/api/admin/config/sections?classId=${selectedClass}`);
        const json = await res.json();
        if (!isMounted) return;

        if (json.success && Array.isArray(json.data)) {
          setSections(json.data);
          const paramSecId = searchParams.get('sectionId');
          if (paramSecId && json.data.some((s: any) => s.id === paramSecId)) {
            setSelectedSection(paramSecId);
          } else if (json.data.length > 0) {
            setSelectedSection(json.data[0].id);
          } else {
            setSelectedSection('');
          }
        }
      } catch {
        // Non-blocking fallback
      }
    }
    loadSections();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  // 3. Load Student Roster
  const fetchRoster = useCallback(async () => {
    if (!selectedClass || !selectedSection || !selectedDate) return;

    setIsLoadingRoster(true);
    try {
      const url = `/api/admin/attendance/roster?classId=${selectedClass}&sectionId=${selectedSection}&date=${selectedDate}&sessionId=${selectedSession}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        const rosterData: StudentRosterForAttendance[] = json.data.roster || [];
        setRoster(rosterData);
        setIsAlreadyMarked(json.data.isAlreadyMarked);
        setHolidayData({
          isHoliday: !!json.data.isHoliday,
          isWeeklyOff: !!json.data.isWeeklyOff,
          holidayInfo: json.data.holidayInfo || null,
        });

        // Build state map
        const stateMap: Record<string, StudentAttendanceState> = {};
        for (const s of rosterData) {
          stateMap[s.studentId] = {
            studentId: s.studentId,
            enrollmentId: s.enrollmentId,
            status: s.existingAttendance ? s.existingAttendance.status : 'PRESENT',
            remarks: s.existingAttendance?.remarks || '',
            originalStatus: s.existingAttendance?.status || null,
            originalRemarks: s.existingAttendance?.remarks || null,
          };
        }
        setAttendanceMap(stateMap);
      } else {
        error('Failed', json.error?.message || 'Failed to fetch student roster.');
      }
    } catch {
      error('Network Error', 'Could not load student roster.');
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedClass, selectedSection, selectedDate, selectedSession, error]);

  useEffect(() => {
    const isSectionValid = sections.some((s) => s.id === selectedSection);
    if (selectedClass && selectedSection && isSectionValid) {
      fetchRoster();
    }
  }, [fetchRoster, selectedClass, selectedSection, sections]);

  // Handle single student status change
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Handle single student remarks change
  const setStudentRemarks = (studentId: string, remarks: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // Bulk Actions
  const markAllAs = (status: AttendanceStatus) => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      for (const id in next) {
        next[id] = { ...next[id], status };
      }
      return next;
    });
  };

  // Live Summary Tallies
  const tallies = Object.values(attendanceMap).reduce(
    (acc, curr) => {
      if (curr.status === 'PRESENT') acc.present++;
      else if (curr.status === 'ABSENT') acc.absent++;
      else if (curr.status === 'LATE') acc.late++;
      else if (curr.status === 'LEAVE' || curr.status === 'HALF_DAY' || curr.status === 'EXCUSED') acc.leave++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  // Submit Handler
  const handleSaveAttendance = async () => {
    // Exact rule: If attendance was previously saved for this session/date/class/section,
    // show mandatory Correction Reason popup on update.
    if (isAlreadyMarked && !correctionReason) {
      setIsCorrectionModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const records = Object.values(attendanceMap).map((item) => ({
        studentId: item.studentId,
        enrollmentId: item.enrollmentId,
        status: item.status,
        remarks: item.remarks || undefined,
      }));

      const payload = {
        sessionId: selectedSession,
        classId: selectedClass,
        sectionId: selectedSection,
        date: selectedDate,
        records,
        correctionReason: correctionReason || undefined,
      };

      const res = await fetch('/api/admin/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          isAlreadyMarked ? 'Attendance Updated' : 'Attendance Saved',
          isAlreadyMarked
            ? `Successfully updated attendance correction for ${records.length} students.`
            : `Successfully recorded daily attendance for ${records.length} students.`
        );
        setIsCorrectionModalOpen(false);
        setCorrectionReason('');
        fetchRoster();
      } else {
        error('Save Failed', json.error?.message || 'Failed to submit attendance.');
      }
    } catch {
      error('Network Error', 'Could not save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRoster = roster.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.nameEn.toLowerCase().includes(term) ||
      s.admissionNo.toLowerCase().includes(term) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance"
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Daily Student Roll Call</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-9">
            Record, review, and correct classroom student attendance by section
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/attendance/register"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            View Register
          </Link>
          <button
            onClick={handleSaveAttendance}
            disabled={isSaving || roster.length === 0 || holidayData?.isHoliday}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : holidayData?.isHoliday ? 'Holiday (Disabled)' : isAlreadyMarked ? 'Update Attendance' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Selection Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Session */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Academic Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                const newClass = e.target.value;
                setSelectedClass(newClass);
                setSelectedSection('');
                setRoster([]);
                setAttendanceMap({});
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Holiday / Non-Working Day Banner */}
        {holidayData?.isHoliday && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-900 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                <CalendarOff className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>Non-Working Day / School Holiday</span>
                  <span className="text-3xs font-semibold px-2 py-0.5 bg-rose-200/80 rounded-full text-rose-800 uppercase">
                    {holidayData.holidayInfo?.holidayType?.replace(/_/g, ' ') || 'HOLIDAY'}
                  </span>
                </div>
                <p className="text-3xs text-rose-700 mt-0.5">
                  <strong>{holidayData.holidayInfo?.title || 'Institution Holiday'}</strong>: Daily student attendance marking is disabled for this date.
                </p>
              </div>
            </div>
            <Link
              href="/admin/settings/holidays"
              className="text-3xs font-bold text-rose-800 hover:underline px-3 py-1.5 bg-rose-100/70 hover:bg-rose-200 rounded-xl transition-colors"
            >
              School Calendar &rarr;
            </Link>
          </div>
        )}

        {/* State Banner */}
        {isAlreadyMarked && !holidayData?.isHoliday && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Attendance for this section on <strong>{selectedDate}</strong> has already been marked. Any changes will be logged in the immutable audit trail.
              </span>
            </div>
            <Link
              href="/admin/attendance/corrections"
              className="text-3xs font-bold text-amber-800 hover:underline shrink-0"
            >
              View Audit Log &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Bulk Operations & Live Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Quick Bulk Marking */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 mr-1">Quick Mark:</span>
          <button
            type="button"
            disabled={holidayData?.isHoliday}
            onClick={() => markAllAs('PRESENT')}
            className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Mark All Present
          </button>
          <button
            type="button"
            disabled={holidayData?.isHoliday}
            onClick={() => markAllAs('ABSENT')}
            className="inline-flex items-center gap-1 text-3xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <UserX className="w-3.5 h-3.5" />
            Mark All Absent
          </button>
          <button
            type="button"
            disabled={holidayData?.isHoliday}
            onClick={() => markAllAs('LEAVE')}
            className="inline-flex items-center gap-1 text-3xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 border border-blue-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            Mark All Leave
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Present:</span>
            <span className="font-bold text-emerald-700">{tallies.present}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-500">Absent:</span>
            <span className="font-bold text-rose-700">{tallies.absent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-500">Late:</span>
            <span className="font-bold text-amber-700">{tallies.late}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-500">Leave:</span>
            <span className="font-bold text-blue-700">{tallies.leave}</span>
          </div>
          <div className="pl-2 border-l border-slate-200 font-bold text-slate-700">
            Total: {roster.length}
          </div>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Attendance Roster ({filteredRoster.length})
            </h2>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll, admission #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Roll #</th>
                <th className="py-3 px-4 w-28">Admission #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center w-72">Attendance Status</th>
                <th className="py-3 px-4">Remarks / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingRoster ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
                    <p>Loading student roster...</p>
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    {roster.length === 0
                      ? 'No active students enrolled in this section.'
                      : 'No students matching search filter.'}
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const state = attendanceMap[student.studentId] || {
                    status: 'PRESENT',
                    remarks: '',
                  };

                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Roll Number */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {student.rollNumber || '—'}
                      </td>

                      {/* Admission Number */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500 text-3xs">
                        {student.admissionNo}
                      </td>

                      {/* Student Name & Urdu */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{student.nameEn}</span>
                          {student.gender === 'FEMALE' && (
                            <span className="text-3xs font-semibold text-pink-700 bg-pink-50 px-1.5 py-0.2 rounded">
                              F
                            </span>
                          )}
                        </div>
                        {student.fullNameUr && (
                          <div className="text-3xs text-slate-400 font-urdu">{student.fullNameUr}</div>
                        )}
                      </td>

                      {/* Status Segmented Control */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                          {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as AttendanceStatus[]).map((st) => {
                            const meta = ATTENDANCE_STATUSES[st];
                            const isSelected = state.status === st;

                            let activeBg = 'bg-white text-slate-800 shadow-2xs font-bold';
                            if (isSelected) {
                              if (st === 'PRESENT') activeBg = 'bg-emerald-600 text-white font-bold shadow-xs';
                              else if (st === 'ABSENT') activeBg = 'bg-rose-600 text-white font-bold shadow-xs';
                              else if (st === 'LATE') activeBg = 'bg-amber-500 text-white font-bold shadow-xs';
                              else if (st === 'LEAVE') activeBg = 'bg-blue-600 text-white font-bold shadow-xs';
                            }

                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={holidayData?.isHoliday}
                                onClick={() => setStudentStatus(student.studentId, st)}
                                className={`px-3 py-1 text-3xs rounded-lg transition-all disabled:opacity-50 ${
                                  isSelected ? activeBg : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title={meta?.labelEn || st}
                              >
                                {meta?.shortCode || st}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Remarks Input */}
                      <td className="py-3 px-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Optional note / reason..."
                            value={state.remarks}
                            onChange={(e) => setStudentRemarks(student.studentId, e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
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

      {/* Save Button Floating Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>Attendance is saved atomically with tenant isolation.</span>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={isSaving || roster.length === 0 || holidayData?.isHoliday}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : holidayData?.isHoliday ? 'Holiday (Marking Disabled)' : isAlreadyMarked ? 'Update Attendance' : 'Save Attendance'}
        </button>
      </div>

      {/* Correction Reason Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <Edit3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Correction Required</h3>
                <p className="text-xs text-slate-500">Provide an administrative reason for this correction</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">
                Correction Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Student arrived late with parent note; medical certificate verified..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-3xs text-slate-400">
                This explanation will be logged permanently in the Attendance Audit Log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={!correctionReason.trim() || isSaving}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
              >
                {isSaving ? 'Submitting...' : 'Confirm & Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
