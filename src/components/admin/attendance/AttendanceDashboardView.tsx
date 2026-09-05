'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  BookOpen,
  History,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AttendanceDashboardStats, ClassSectionAttendanceSummary } from '@/lib/types/attendance';
import { useToast } from '@/components/ui/Toast';

export function AttendanceDashboardView() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [stats, setStats] = useState<AttendanceDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MARKED' | 'PENDING'>('ALL');

  const { error } = useToast();

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance/stats?date=${selectedDate}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load attendance statistics.');
      }
    } catch {
      error('Network Error', 'Could not connect to attendance service.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, error]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const filteredClasses = (stats?.classBreakdown || []).filter((item) => {
    const matchesSearch =
      item.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sectionName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'MARKED') return item.isMarked;
    if (filterStatus === 'PENDING') return !item.isMarked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Attendance Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time school-wide student attendance tracking and section status
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
            />
          </div>

          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/attendance/mark"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            Mark Today&apos;s Attendance
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Enrolled */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Total Enrolled</span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900">{stats?.totalEnrolled ?? 0}</span>
            <span className="text-3xs text-slate-400 ml-1.5">Students</span>
          </div>
          <span className="text-3xs text-slate-500">Active enrollments</span>
        </div>

        {/* Present */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Present
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-emerald-900">{stats?.presentCount ?? 0}</span>
            <span className="text-3xs text-emerald-700 font-bold ml-1.5">
              {stats?.totalEnrolled ? Math.round(((stats.presentCount) / stats.totalEnrolled) * 100) : 0}%
            </span>
          </div>
          <span className="text-3xs text-emerald-600">On time attendance</span>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" /> Absent
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-rose-900">{stats?.absentCount ?? 0}</span>
            <span className="text-3xs text-rose-700 font-bold ml-1.5">
              {stats?.totalEnrolled ? Math.round(((stats.absentCount) / stats.totalEnrolled) * 100) : 0}%
            </span>
          </div>
          <span className="text-3xs text-rose-600">Unexcused absence</span>
        </div>

        {/* Late Arrival */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Late Arrival
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-amber-900">{stats?.lateCount ?? 0}</span>
            <span className="text-3xs text-amber-700 font-bold ml-1.5">
              {stats?.totalEnrolled ? Math.round(((stats.lateCount) / stats.totalEnrolled) * 100) : 0}%
            </span>
          </div>
          <span className="text-3xs text-amber-600">Tardy arrivals</span>
        </div>

        {/* Leave */}
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Approved Leave
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-blue-900">{stats?.leaveCount ?? 0}</span>
            <span className="text-3xs text-blue-700 font-bold ml-1.5">
              {stats?.totalEnrolled ? Math.round(((stats.leaveCount) / stats.totalEnrolled) * 100) : 0}%
            </span>
          </div>
          <span className="text-3xs text-blue-600">Authorized leave</span>
        </div>

        {/* Attendance Rate */}
        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Overall Rate
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-indigo-950">{stats?.attendancePercentage ?? 0}%</span>
          </div>
          <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all"
              style={{ width: `${stats?.attendancePercentage ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/attendance/mark"
          className="group p-4 bg-white hover:bg-indigo-50/30 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Daily Roll Call</h3>
              <p className="text-3xs text-slate-500">Mark classroom session attendance</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/attendance/register"
          className="group p-4 bg-white hover:bg-indigo-50/30 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Attendance Register</h3>
              <p className="text-3xs text-slate-500">Monthly student &times; date matrix</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/attendance/corrections"
          className="group p-4 bg-white hover:bg-indigo-50/30 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Corrections &amp; Audit</h3>
              <p className="text-3xs text-slate-500">Immutable correction audit trail</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Class/Section Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Section-by-Section Daily Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status for selected date: <strong>{selectedDate}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search class/section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-3xs font-bold">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('MARKED')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'MARKED' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Marked
              </button>
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'PENDING' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Class &amp; Section</th>
                <th className="py-3 px-4 text-center">Enrolled</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Late</th>
                <th className="py-3 px-4 text-center">Leave</th>
                <th className="py-3 px-4 text-center">Attendance %</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading attendance breakdown...
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No classes or sections matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((item) => (
                  <tr key={`${item.classId}-${item.sectionId}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.className}</div>
                      <div className="text-3xs text-slate-500">{item.sectionName}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {item.totalEnrolled}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.presentCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {item.absentCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {item.lateCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {item.leaveCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{item.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isMarked ? (
                        <span className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Marked
                        </span>
                      ) : item.markedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-3xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Partial ({item.markedCount}/{item.totalEnrolled})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-3xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/attendance/mark?classId=${item.classId}&sectionId=${item.sectionId}&date=${selectedDate}`}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition-colors ${
                          item.isMarked
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {item.isMarked ? 'Edit / Correct' : 'Mark Now'}
                      </Link>
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
