'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  ArrowLeft,
  Calendar,
  AlertCircle,
  RefreshCw,
  User,
  Shield,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function AttendanceAuditView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { error } = useToast();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/attendance/audit');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      } else {
        error('Error', json.error?.message || 'Failed to load audit logs.');
      }
    } catch {
      error('Network Error', 'Could not load attendance audit trail.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.student.firstNameEn.toLowerCase().includes(term) ||
      (log.student.lastNameEn && log.student.lastNameEn.toLowerCase().includes(term)) ||
      log.student.admissionNo.toLowerCase().includes(term) ||
      log.correctionReason.toLowerCase().includes(term)
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
            <h1 className="text-xl font-bold text-slate-900">Attendance Corrections &amp; Audit Trail</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent immutable record of all attendance modifications and justifications
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Audit Records ({filteredLogs.length})
          </h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Timestamp &amp; Date</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4 text-center">Status Transition</th>
                <th className="py-3 px-4">Correction Justification</th>
                <th className="py-3 px-4 text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No attendance corrections recorded. All records are currently in their original state.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-3xs text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()} &bull; Date: {log.attendanceDate.split('T')[0]}
                      </div>
                    </td>

                    {/* Student */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {log.student.firstNameEn} {log.student.lastNameEn || ''}
                      </div>
                      <div className="text-3xs text-slate-400 font-mono">
                        Adm #: {log.student.admissionNo}
                      </div>
                    </td>

                    {/* Status Transition */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-3xs font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {log.previousStatus}
                        </span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.newStatus}
                        </span>
                      </div>
                    </td>

                    {/* Justification */}
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-800">{log.correctionReason}</p>
                      {log.newRemarks && (
                        <p className="text-3xs text-slate-500 mt-0.5">Note: {log.newRemarks}</p>
                      )}
                    </td>

                    {/* Authorized By */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {log.correctedBy?.username || 'Administrator'}
                      </span>
                      <div className="text-3xs text-slate-400">
                        {log.correctedBy?.userType || 'ADMIN'}
                      </div>
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
