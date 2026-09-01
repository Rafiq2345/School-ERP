'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  Eye,
  Calendar,
  Layers,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { LeaveApplicationDto } from '@/lib/types/leave';

export function LeaveApplicationsListView() {
  const [applications, setApplications] = useState<LeaveApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (leaveTypeId) params.set('leaveTypeId', leaveTypeId);

      const res = await fetch(`/api/admin/hr/leaves/applications?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch leave applications');
      }
      setApplications(json.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const res = await fetch('/api/admin/hr/leaves/types?isActive=true');
      const json = await res.json();
      if (res.ok && json.success) {
        setLeaveTypes(json.data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTypes();
    loadApplications();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
  };

  // Metrics
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'SUBMITTED').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const draftCount = applications.filter((a) => a.status === 'DRAFT').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <FileEdit className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getScopeBadge = (app: LeaveApplicationDto) => {
    switch (app.leaveScope) {
      case 'FULL_DAY':
        return <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Full Day</span>;
      case 'HALF_DAY':
        return (
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
            Half Day ({app.halfDayPeriod || '0.5d'})
          </span>
        );
      case 'SPECIFIC_SHIFT':
        return (
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
            Shift ({app.shifts.length} shift{app.shifts.length > 1 ? 's' : ''})
          </span>
        );
      case 'MULTIPLE_SHIFTS':
        return (
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
            Multi-Shift ({app.shifts.length})
          </span>
        );
      case 'HOURLY':
        return (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Hourly ({app.startTime} - {app.endTime})
          </span>
        );
      default:
        return <span className="text-xs font-semibold text-slate-600">{app.leaveScope}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600" />
            Employee Leave Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit, track, and manage employee leave requests across full-day, half-day, multi-shift, and hourly scopes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadApplications}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/admin/hr/leaves/applications/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Leave Application
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Applications</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <span className="text-xs text-slate-400 font-medium">Recorded in system</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Approval</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingCount}</p>
          <span className="text-xs text-amber-600 font-medium">Awaiting approval engine</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{approvedCount}</p>
          <span className="text-xs text-emerald-600 font-medium">Final approved requests</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Draft Requests</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{draftCount}</p>
          <span className="text-xs text-slate-500 font-medium">Unsubmitted drafts</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Employee, Request #, Reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.code})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Request #</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Scope & Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading leave applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No leave applications found matching current criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Request # */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {app.applicationNumber}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {app.employee.firstNameEn} {app.employee.lastNameEn}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="font-mono">{app.employee.employeeNo}</span>
                        <span>•</span>
                        <span>{app.employee.departmentName}</span>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{app.leaveType.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            app.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {app.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({app.leaveType.code})</span>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {app.startDate}
                        {app.startDate !== app.endDate && ` → ${app.endDate}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {app.workingDaysCount} working day{app.workingDaysCount !== 1 ? 's' : ''}
                        {app.holidaysCount > 0 && ` (${app.holidaysCount} holiday)`}
                      </div>
                    </td>

                    {/* Scope & Duration */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getScopeBadge(app)}
                        <span className="font-bold text-slate-900 text-sm">{app.requestedDays}d</span>
                      </div>
                      {app.reason && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5 italic">
                          &ldquo;{app.reason}&rdquo;
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(app.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/hr/leaves/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
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
