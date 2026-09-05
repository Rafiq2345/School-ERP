'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function AttendanceRegisterView() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Default to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const [registerData, setRegisterData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { error } = useToast();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');

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
          if (current) setSelectedSession(current.id);
        }

        if (classRes.success && Array.isArray(classRes.data)) {
          setClasses(classRes.data);
          if (classRes.data.length > 0) setSelectedClass(classRes.data[0].id);
        }
      } catch {
        error('Error', 'Failed to load classes.');
      }
    }
    loadMasterData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          if (json.data.length > 0) setSelectedSection(json.data[0].id);
          else setSelectedSection('');
        }
      } catch {
        // Fallback
      }
    }
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [selectedClass]);

  const fetchRegister = useCallback(async () => {
    if (!selectedClass || !selectedSection || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      const url = `/api/admin/attendance/register?classId=${selectedClass}&sectionId=${selectedSection}&startDate=${startDate}&endDate=${endDate}&sessionId=${selectedSession}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setRegisterData(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to fetch attendance register.');
      }
    } catch {
      error('Network Error', 'Could not load attendance register matrix.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedSection, startDate, endDate, selectedSession, error]);

  useEffect(() => {
    const isSectionValid = sections.some((s) => s.id === selectedSection);
    if (selectedClass && selectedSection && isSectionValid) {
      fetchRegister();
    }
  }, [fetchRegister, selectedClass, selectedSection, sections]);

  const filteredMatrix = (registerData?.matrix || []).filter((s: any) => {
    const term = searchTerm.toLowerCase();
    return (
      s.nameEn.toLowerCase().includes(term) ||
      s.admissionNo.toLowerCase().includes(term) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/attendance"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance Register Matrix</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive student &times; date attendance matrix with summary statistics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Register
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {/* Session */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Session</label>
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

          {/* Class */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                const newClass = e.target.value;
                setSelectedClass(newClass);
                setSelectedSection('');
                setRegisterData(null);
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
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Section</label>
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

          {/* Start Date */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Register Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-900">
              Students ({filteredMatrix.length}) &bull; Date Range: {startDate} to {endDate}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-2xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-3xs font-bold uppercase text-slate-600">
                <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-10 w-12 text-center border-r border-slate-200">
                  Roll
                </th>
                <th className="py-2.5 px-3 sticky left-12 bg-slate-50 z-10 min-w-[140px] border-r border-slate-200">
                  Student Name
                </th>

                {/* Dates Columns */}
                {(registerData?.dates || []).map((d: string) => {
                  const dayNum = d.split('-')[2];
                  return (
                    <th key={d} className="py-2 px-1 text-center min-w-[28px] border-r border-slate-100 font-mono">
                      {dayNum}
                    </th>
                  );
                })}

                {/* Summary Columns */}
                <th className="py-2.5 px-2 text-center bg-emerald-50/60 text-emerald-800 border-l border-slate-200">
                  P
                </th>
                <th className="py-2.5 px-2 text-center bg-rose-50/60 text-rose-800">
                  A
                </th>
                <th className="py-2.5 px-2 text-center bg-amber-50/60 text-amber-800">
                  L
                </th>
                <th className="py-2.5 px-2 text-center bg-blue-50/60 text-blue-800">
                  LV
                </th>
                <th className="py-2.5 px-3 text-center bg-indigo-50/60 text-indigo-900 font-bold">
                  Rate %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={(registerData?.dates?.length || 0) + 7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Generating attendance matrix...
                  </td>
                </tr>
              ) : filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={(registerData?.dates?.length || 0) + 7} className="py-12 text-center text-slate-400">
                    No student attendance records for this period.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((item: any) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 sticky left-0 bg-white hover:bg-slate-50 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                      {item.rollNumber || '—'}
                    </td>
                    <td className="py-2 px-3 sticky left-12 bg-white hover:bg-slate-50 font-bold text-slate-900 border-r border-slate-200 truncate max-w-[160px]">
                      {item.nameEn}
                    </td>

                    {/* Daily Status Chips */}
                    {(registerData?.dates || []).map((d: string) => {
                      const st = item.dailyStatus[d] || '-';
                      let chipClass = 'text-slate-300';
                      let label = '-';

                      if (st === 'PRESENT') {
                        chipClass = 'bg-emerald-100 text-emerald-800 font-bold';
                        label = 'P';
                      } else if (st === 'ABSENT') {
                        chipClass = 'bg-rose-100 text-rose-800 font-bold';
                        label = 'A';
                      } else if (st === 'LATE') {
                        chipClass = 'bg-amber-100 text-amber-800 font-bold';
                        label = 'L';
                      } else if (st === 'LEAVE' || st === 'HALF_DAY' || st === 'EXCUSED') {
                        chipClass = 'bg-blue-100 text-blue-800 font-bold';
                        label = 'LV';
                      }

                      return (
                        <td key={d} className="py-1 px-1 text-center border-r border-slate-100">
                          <span className={`inline-block w-5 h-5 leading-5 rounded text-3xs ${chipClass}`}>
                            {label}
                          </span>
                        </td>
                      );
                    })}

                    {/* Summaries */}
                    <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">
                      {item.summary.present}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/30">
                      {item.summary.absent}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/30">
                      {item.summary.late}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/30">
                      {item.summary.leave}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">
                      {item.summary.attendanceRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
