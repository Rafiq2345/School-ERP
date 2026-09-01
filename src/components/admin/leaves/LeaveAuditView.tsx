'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  User,
  Bot,
  Filter,
  Eye,
  X,
  FileText,
  RotateCcw,
  Layers,
  Coins,
  Settings,
  UserCheck,
  Copy,
  Check,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';
import { EnrichedLeaveAuditLogDto } from '@/lib/types/leave';

export function LeaveAuditView() {
  const [logs, setLogs] = useState<EnrichedLeaveAuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Details Drawer / Modal
  const [selectedLog, setSelectedLog] = useState<EnrichedLeaveAuditLogDto | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityFilter && entityFilter !== 'ALL') params.append('entityType', entityFilter);
      if (actionFilter && actionFilter !== 'ALL') params.append('action', actionFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/hr/leaves/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (e) {
      console.error('Error loading leave audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const handleResetFilters = () => {
    setEntityFilter('');
    setActionFilter('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const handleCopyJson = (data: any, section: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Metrics computation
  const totalLogs = logs.length;
  const adjustmentsCount = logs.filter((l) => l.entityType === 'LEAVE_LEDGER').length;
  const policyRevisionsCount = logs.filter((l) => l.entityType === 'LEAVE_POLICY' || l.entityType === 'LEAVE_TYPE').length;
  const allocationBatchesCount = logs.filter((l) => l.entityType === 'LEAVE_ENTITLEMENT' || l.entityType === 'POLICY_ASSIGNMENT').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-rose-600" />
              Leave Management Audit Trail
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Immutable governance record tracking actor attribution, policy revisions, employee overrides, and manual balance adjustments.
            </p>
          </div>
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Audit
          </button>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Total Audit Events</span>
              <span className="text-xl font-extrabold text-slate-900">{totalLogs}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Balance Adjustments</span>
              <span className="text-xl font-extrabold text-slate-900">{adjustmentsCount}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Policy & Type Changes</span>
              <span className="text-xl font-extrabold text-slate-900">{policyRevisionsCount}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Allocations & Assignments</span>
              <span className="text-xl font-extrabold text-slate-900">{allocationBatchesCount}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Reason, Employee, Policy, Actor, or Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-800"
              />
            </div>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
            >
              <option value="">All Entities</option>
              <option value="LEAVE_LEDGER">Balance Adjustments (Ledger)</option>
              <option value="LEAVE_POLICY">Leave Policies</option>
              <option value="LEAVE_TYPE">Leave Types</option>
              <option value="POLICY_ASSIGNMENT">Policy Assignments</option>
              <option value="LEAVE_ENTITLEMENT">Annual Entitlements</option>
            </select>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
            >
              <option value="">All Actions</option>
              <option value="ADJUSTED">ADJUSTED</option>
              <option value="ALLOCATED">ALLOCATED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="CREATED">CREATED</option>
              <option value="UPDATED">UPDATED</option>
              <option value="DEACTIVATED">DEACTIVATED</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              />
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Search
            </button>

            {(entityFilter || actionFilter || searchQuery || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Performed By</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Entity & Action</th>
                  <th className="px-5 py-3.5">Related Record</th>
                  <th className="px-5 py-3.5">Change Summary</th>
                  <th className="px-5 py-3.5">Reason / Justification</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Loading enriched audit trail...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No leave audit events match your filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const dateObj = new Date(log.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-900">{formattedDate}</div>
                          <div className="text-[11px] font-mono text-slate-500">{formattedTime}</div>
                        </td>

                        {/* Performed By */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {log.performedBy.isSystem ? (
                              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-xs text-slate-900 block">
                                {log.performedBy.name}
                              </span>
                              {log.performedBy.role ? (
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  {log.performedBy.role}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic block">
                                  {log.performedBy.isSystem ? 'Automated' : 'Legacy / Uncaptured'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Entity & Action */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700 block w-fit">
                              {log.entityType}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded block w-fit ${
                                log.action === 'ADJUSTED'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : log.action === 'ALLOCATED'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : log.action === 'CREATED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : log.action === 'ASSIGNED'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : log.action === 'DEACTIVATED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {log.action}
                            </span>
                          </div>
                        </td>

                        {/* Related Record */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-xs text-slate-900">
                            {log.relatedRecord.title}
                          </div>
                          {log.relatedRecord.subtitle && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {log.relatedRecord.subtitle}
                            </div>
                          )}
                        </td>

                        {/* Change Summary */}
                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-800 max-w-xs">
                            {log.changeSummary}
                          </div>
                          {log.diffItems.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.diffItems.slice(0, 2).map((d, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded"
                                >
                                  {d.label}: {d.oldValue ?? 'None'} → {d.newValue ?? 'None'}
                                </span>
                              ))}
                              {log.diffItems.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  +{log.diffItems.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Reason / Justification */}
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-600 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-200 max-w-xs line-clamp-2">
                            {log.reason || 'Standard system action'}
                          </div>
                        </td>

                        {/* Action: View Details */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Details Modal / Drawer */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Audit Event Details
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {selectedLog.action}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      Event ID: {selectedLog.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Timestamp</span>
                    <span className="text-xs font-bold text-slate-800">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Performed By</span>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {selectedLog.performedBy.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedLog.performedBy.role || (selectedLog.performedBy.isSystem ? 'Automated' : 'Legacy')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Entity Type</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {selectedLog.entityType}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Entity ID</span>
                    <span className="text-xs font-mono text-slate-700 truncate block">
                      {selectedLog.entityId}
                    </span>
                  </div>
                </div>

                {/* Related Record Box */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold uppercase text-blue-600">
                    Target Record ({selectedLog.relatedRecord.type})
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedLog.relatedRecord.title}
                  </div>
                  {selectedLog.relatedRecord.subtitle && (
                    <div className="text-xs text-slate-600">
                      {selectedLog.relatedRecord.subtitle}
                    </div>
                  )}
                </div>

                {/* Justification Reason Box */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Mandatory Justification Reason
                  </span>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 italic">
                    {selectedLog.reason || 'No justification reason recorded.'}
                  </div>
                </div>

                {/* Human-Readable Field Diffs */}
                {selectedLog.diffItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Tracked Value Changes
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Field / Metric</th>
                            <th className="px-4 py-2.5">Previous Value</th>
                            <th className="px-4 py-2.5">New Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedLog.diffItems.map((diff, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2.5 font-bold text-slate-700">{diff.label}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-500">
                                {diff.oldValue !== null && diff.oldValue !== undefined
                                  ? String(diff.oldValue)
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                {diff.newValue !== null && diff.newValue !== undefined
                                  ? String(diff.newValue)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Technical Raw JSON Payloads (Collapsible for Compliance/Audit) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Technical Audit Payload (Raw JSON)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Previous State */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Previous State</span>
                        {selectedLog.previousState && (
                          <button
                            onClick={() => handleCopyJson(selectedLog.previousState, 'prev')}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900"
                          >
                            {copiedSection === 'prev' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        )}
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                        {selectedLog.previousState
                          ? JSON.stringify(selectedLog.previousState, null, 2)
                          : 'null'}
                      </pre>
                    </div>

                    {/* New State */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">New State</span>
                        {selectedLog.newState && (
                          <button
                            onClick={() => handleCopyJson(selectedLog.newState, 'next')}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900"
                          >
                            {copiedSection === 'next' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        )}
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                        {selectedLog.newState
                          ? JSON.stringify(selectedLog.newState, null, 2)
                          : 'null'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
