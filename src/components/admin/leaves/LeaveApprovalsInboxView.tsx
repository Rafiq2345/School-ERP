'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  HelpCircle,
  Clock,
  ChevronRight,
  Filter,
  Eye,
  Layers,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ApproverActionType } from '@/lib/types/leave';

export function LeaveApprovalsInboxView() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [scope, setScope] = useState<'all' | 'me'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');

  // Reference Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  // Action Modal State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [actionType, setActionType] = useState<ApproverActionType>('APPROVE');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scope === 'me') params.set('scope', 'me');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (departmentId) params.set('departmentId', departmentId);
      if (leaveTypeId) params.set('leaveTypeId', leaveTypeId);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/hr/leaves/approvals?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items || []);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load approval inbox', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [deptRes, ltRes] = await Promise.all([
        fetch('/api/admin/departments').catch(() => null),
        fetch('/api/admin/hr/leaves/types').catch(() => null),
      ]);
      if (deptRes && deptRes.ok) {
        const j = await deptRes.json();
        setDepartments(j.data || []);
      }
      if (ltRes && ltRes.ok) {
        const j = await ltRes.json();
        setLeaveTypes(j.data || []);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadInbox();
  }, [scope, statusFilter, departmentId, leaveTypeId, search]);

  const openActionModal = (app: any, type: ApproverActionType) => {
    setSelectedApp(app);
    setActionType(type);
    setRemarks('');
    setActionError(null);
    setActionSuccess(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if ((actionType === 'REJECT' || actionType === 'SEND_BACK' || actionType === 'REQUEST_CLARIFICATION') && !remarks.trim()) {
      setActionError('Remarks/Comments are required for this action.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/hr/leaves/applications/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          remarks: remarks.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to process approval action');
      }

      setActionSuccess(json.data.message || 'Action executed successfully');
      setTimeout(() => {
        setSelectedApp(null);
        loadInbox();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || 'Error occurred while executing action');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Leave Approval Inbox</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, approve, reject, or request clarification on pending staff leave applications
              </p>
            </div>
          </div>
        </div>

        {/* Scope Toggle Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
          <button
            onClick={() => setScope('all')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              scope === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Pending {scope === 'all' ? `(${total})` : ''}
          </button>
          <button
            onClick={() => setScope('me')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              scope === 'me'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Actionable by Me {scope === 'me' ? `(${total})` : ''}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search LR #, staff name, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Leave Types</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Active Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="CLARIFICATION_REQUIRED">Clarification Required</option>
            <option value="SENT_BACK">Sent Back</option>
          </select>
        </div>
      </div>

      {/* Inbox List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading Approval Inbox...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {scope === 'me' ? 'No Actionable Approvals' : 'Inbox Zero — All Caught Up!'}
          </h3>
          <p className="text-xs text-slate-500">
            {scope === 'me'
              ? 'There are currently no leave applications awaiting your approval action.'
              : 'No pending leave applications currently match the active filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              {/* Employee & Leave Summary */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {app.employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/hr/leaves/applications/${app.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600 font-mono text-sm flex items-center gap-1"
                    >
                      <span>{app.applicationNumber}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-800 text-sm">{app.employeeName}</span>
                    <span className="font-mono text-xs text-slate-500">({app.employeeNo})</span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>{app.departmentName}</span>
                    <span>•</span>
                    <span>{app.designationName}</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {app.leaveTypeName}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-900">
                      {app.requestedDays}d ({app.leaveScope})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 italic line-clamp-1 pt-0.5">
                    &ldquo;{app.reason}&rdquo;
                  </p>
                </div>
              </div>

              {/* Approval Progress & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                {/* Workflow Step Badge */}
                <div className="space-y-1 text-left sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>
                      Step {app.currentStepNumber} of {app.totalSteps}: {app.currentStepName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Approver: {app.pendingApproverRole || 'Designated Role'} • {app.startDate} to {app.endDate}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => openActionModal(app, 'APPROVE')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => openActionModal(app, 'REJECT')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => openActionModal(app, 'REQUEST_CLARIFICATION')}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Request Clarification"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  </button>

                  <button
                    onClick={() => openActionModal(app, 'SEND_BACK')}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Send Back for Revision"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  </button>

                  <Link
                    href={`/admin/hr/leaves/applications/${app.id}`}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View Request & Timeline"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5 mb-3">
              {actionType === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {actionType === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
              {actionType === 'SEND_BACK' && <RotateCcw className="w-5 h-5 text-amber-600" />}
              {actionType === 'REQUEST_CLARIFICATION' && <HelpCircle className="w-5 h-5 text-purple-600" />}

              <h3 className="text-base font-bold text-slate-900">
                {actionType === 'APPROVE' && 'Approve Leave Request'}
                {actionType === 'REJECT' && 'Reject Leave Request'}
                {actionType === 'SEND_BACK' && 'Send Back Request'}
                {actionType === 'REQUEST_CLARIFICATION' && 'Request Clarification from Staff'}
              </h3>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Request #:</span>
                <span className="font-bold font-mono text-slate-900">{selectedApp.applicationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-900">{selectedApp.employeeName} ({selectedApp.employeeNo})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Duration:</span>
                <span className="font-semibold text-slate-900">{selectedApp.requestedDays}d • {selectedApp.startDate} to {selectedApp.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-semibold text-indigo-700">Step {selectedApp.currentStepNumber}: {selectedApp.currentStepName}</span>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {actionType === 'APPROVE' && 'Approval Remarks (Optional)'}
                  {actionType === 'REJECT' && 'Reason for Rejection *'}
                  {actionType === 'SEND_BACK' && 'Revision Instructions *'}
                  {actionType === 'REQUEST_CLARIFICATION' && 'Clarification Question / Inquiry *'}
                </label>
                <textarea
                  rows={3}
                  required={actionType !== 'APPROVE'}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'e.g. Approved as per academic calendar coverage'
                      : actionType === 'REJECT'
                      ? 'e.g. Critical examination period; absence cannot be approved'
                      : actionType === 'SEND_BACK'
                      ? 'e.g. Please update selected shift or attach medical certificate'
                      : 'e.g. Please clarify who will cover your afternoon Grade 10 lecture'
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionType === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionType === 'SEND_BACK'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${actionType.replace('_', ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
