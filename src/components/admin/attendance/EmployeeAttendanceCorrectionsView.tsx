'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { EmployeeAttendanceCorrectionAuditDTO } from '@/lib/types/employee-attendance';
import { useToast } from '@/components/ui/Toast';

export function EmployeeAttendanceCorrectionsView() {
  const [logs, setLogs] = useState<EmployeeAttendanceCorrectionAuditDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { error } = useToast();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      });

      const res = await fetch(`/api/admin/attendance/employees/corrections?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      } else {
        error('Error', json.error?.message || 'Failed to load correction history');
      }
    } catch {
      error('Network Error', 'Could not fetch audit history.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, error]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/attendance/employees"
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Employee Attendance Audit &amp; Corrections</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/attendance/employees"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Employee Attendance
          </Link>
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
            href="/admin/attendance/employees/shifts/assignments"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Shift Assignments
          </Link>
          <p className="text-xs text-slate-500 mt-1 ml-9">
            Immutable log of all employee attendance modifications, check-in/out adjustments, and justifications
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-3xs font-bold text-slate-500 uppercase">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Attendance Date</th>
              <th className="py-3 px-4 text-center">Status Change</th>
              <th className="py-3 px-4 text-center">Time Change</th>
              <th className="py-3 px-4">Correction Reason</th>
              <th className="py-3 px-4">Changed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No employee attendance corrections recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono text-3xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.employeeName}</div>
                    <div className="text-3xs text-slate-400 font-mono">{log.employeeNo} ({log.departmentName || 'Staff'})</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {log.attendanceDate}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-3xs font-bold text-slate-500 line-through mr-1.5">{log.previousStatus}</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-3xs font-bold text-blue-700 ml-1.5">{log.newStatus}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-3xs text-slate-600">
                    {log.previousCheckIn || '—'} &rarr; {log.newCheckIn || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium max-w-xs">
                    {log.correctionReason}
                  </td>
                  <td className="py-3 px-4 font-mono text-3xs text-slate-500">
                    {log.correctedByName || 'system'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
