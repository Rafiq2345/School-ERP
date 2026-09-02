'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Play,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  RotateCcw,
  Eye,
  Layers,
  Lock,
} from 'lucide-react';
import type {
  YearEndPreviewSummaryDto,
  YearEndDispositionItemDto,
  LeaveYearEndBatchDto,
  LeaveYearEndBatchItemDto,
} from '@/lib/types/leave';

export function YearEndProcessingView() {
  const [activeTab, setActiveTab] = useState<'EXECUTE' | 'HISTORY'>('EXECUTE');
  const [sourceYear, setSourceYear] = useState<number>(2026);
  const [targetYear, setTargetYear] = useState<number>(2027);
  const [notes, setNotes] = useState<string>('');

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<YearEndPreviewSummaryDto | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [batches, setBatches] = useState<LeaveYearEndBatchDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<LeaveYearEndBatchDto | null>(null);

  const [reverseLoading, setReverseLoading] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [batchToReverse, setBatchToReverse] = useState<LeaveYearEndBatchDto | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadBatches();
    }
  }, [activeTab]);

  const loadBatches = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/hr/leaves/year-end/batches', {
        headers: { 'x-tenant-id': 'tenant-sch-001' },
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (e) {
      console.error('Failed to load batches', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRunPreview = async () => {
    setPreviewLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/hr/leaves/year-end/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-sch-001' },
        body: JSON.stringify({ sourceLeaveYear: sourceYear, targetLeaveYear: targetYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview');
      setPreviewData(data);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteBatch = async () => {
    if (previewData?.alreadyProcessed) {
      setMessage({
        text: `Year-End ${sourceYear} -> ${targetYear} was already completed in batch ${previewData.existingBatchNumber}. Re-execution is blocked.`,
        type: 'error',
      });
      setShowConfirmModal(false);
      return;
    }

    setExecuteLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/hr/leaves/year-end/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-sch-001' },
        body: JSON.stringify({ sourceLeaveYear: sourceYear, targetLeaveYear: targetYear, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setShowConfirmModal(false);
      setMessage({
        text: `Year-End Batch [${data.batchNumber}] executed successfully! All ledger transactions and encashment payroll inputs generated.`,
        type: 'success',
      });
      setPreviewData(null);
      setActiveTab('HISTORY');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setExecuteLoading(false);
    }
  };

  const handleReverseBatch = async () => {
    if (!batchToReverse) return;
    setReverseLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/hr/leaves/year-end/batches/${batchToReverse.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-sch-001' },
        body: JSON.stringify({ reason: reversalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reversal failed');
      setShowReverseModal(false);
      setBatchToReverse(null);
      setReversalReason('');
      setMessage({
        text: `Year-End Batch [${data.batchNumber}] has been reversed with compensating ledger transactions.`,
        type: 'success',
      });
      loadBatches();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setReverseLoading(false);
    }
  };

  const viewBatchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/hr/leaves/year-end/batches/${id}`, {
        headers: { 'x-tenant-id': 'tenant-sch-001' },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBatch(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <RefreshCw className="w-3 h-3" /> Phase 3 Step 3: Year-End Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Year-End Leave Processing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Execute annual leave balance rollover, carry-forward caps, encashment contracts, and expiry with full double-entry ledger auditability.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('EXECUTE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'EXECUTE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Run Year-End
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Batch History
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : message.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: RUN YEAR-END */}
      {activeTab === 'EXECUTE' && (
        <div className="space-y-6">
          {/* Configuration Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Select Processing Years
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Source Leave Year (Closing)</label>
                <input
                  type="number"
                  value={sourceYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setSourceYear(y);
                    setTargetYear(y + 1);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Target Leave Year (Receiving)</label>
                <input
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Closing 2026"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleRunPreview}
                disabled={previewLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
              >
                {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {previewLoading ? 'Scanning Balances...' : 'Preview Year-End Rollover'}
              </button>
            </div>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* Idempotency Alert Banner */}
              {previewData.alreadyProcessed && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm space-y-1">
                    <div className="font-bold text-amber-900">
                      Year-End {previewData.sourceLeaveYear} → {previewData.targetLeaveYear} was already completed in batch{' '}
                      <span className="font-mono underline">{previewData.existingBatchNumber}</span>.
                    </div>
                    <div className="text-amber-700 text-xs">
                      Executed at: {new Date(previewData.existingBatchExecutedAt!).toLocaleString()}. Duplicate execution is blocked by the system.
                      If you need to re-run processing, please go to <strong>Batch History</strong> and reverse batch{' '}
                      <strong>{previewData.existingBatchNumber}</strong> first.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Preview Summary: {previewData.sourceLeaveYear} <ArrowRight className="w-4 h-4 inline text-slate-400" /> {previewData.targetLeaveYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scanned {previewData.totalEmployees} employees ({previewData.totalEligibleRecords} eligible entitlement records)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {previewData.alreadyProcessed ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs cursor-not-allowed">
                      <Lock className="w-4 h-4 text-slate-400" /> Batch Already Completed
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm & Execute Batch
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Employees Scanned</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{previewData.totalEmployees}</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-xs font-bold text-blue-700 uppercase">Carry-Forward Total</span>
                  <div className="text-2xl font-black text-blue-800 mt-1">{previewData.totalCarriedForwardDays} <span className="text-sm font-semibold">days</span></div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Encashment Total</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{previewData.totalEncashedDays} <span className="text-sm font-semibold">days</span></div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-700 uppercase">Expiry Total</span>
                  <div className="text-2xl font-black text-amber-800 mt-1">{previewData.totalExpiredDays} <span className="text-sm font-semibold">days</span></div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold">Employee</th>
                      <th className="py-3 px-4 font-bold">Leave Type</th>
                      <th className="py-3 px-4 font-bold">Policy Rule</th>
                      <th className="py-3 px-4 font-bold text-right">Unused Balance</th>
                      <th className="py-3 px-4 font-bold text-right text-blue-700">Carry Fwd</th>
                      <th className="py-3 px-4 font-bold text-right text-emerald-700">Encash</th>
                      <th className="py-3 px-4 font-bold text-right text-amber-700">Expire</th>
                      <th className="py-3 px-4 font-bold">Status / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.items.map((it: YearEndDispositionItemDto, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {it.employeeName} <span className="text-slate-400">({it.employeeNo})</span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">
                          {it.leaveTypeName} <span className="text-xs text-slate-400">({it.leaveTypeCode})</span>
                        </td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className="inline-block px-2 py-0.5 rounded text-2xs bg-slate-100 text-slate-700 border border-slate-200">
                            {it.yearEndAction}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-800">{it.availableBalance}d</td>
                        <td className="py-2.5 px-4 text-right font-black text-blue-700">
                          {it.carriedForwardDays > 0 ? `+${it.carriedForwardDays}d` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                          {it.encashedDays > 0 ? `${it.encashedDays}d` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-amber-700">
                          {it.expiredDays > 0 ? `-${it.expiredDays}d` : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          {previewData.alreadyProcessed ? (
                            <span className="text-slate-400 italic text-2xs">Already Processed</span>
                          ) : it.status === 'READY' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-2xs">{it.skipReason || 'Skipped'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BATCH HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Year-End Processing History</h2>
            <button
              onClick={loadBatches}
              disabled={historyLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-medium border border-dashed border-slate-200 rounded-xl">
              No year-end batches have been executed yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">Batch Number</th>
                    <th className="py-3 px-4 font-bold">Years</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right text-blue-700">Carry Fwd</th>
                    <th className="py-3 px-4 font-bold text-right text-emerald-700">Encash</th>
                    <th className="py-3 px-4 font-bold text-right text-amber-700">Expire</th>
                    <th className="py-3 px-4 font-bold">Executed At</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {b.sourceLeaveYear} <ArrowRight className="w-3.5 h-3.5 inline text-slate-400" /> {b.targetLeaveYear}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-2xs font-bold ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-blue-700">{b.totalCarriedForwardDays}d</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">{b.totalEncashedDays}d</td>
                      <td className="py-3 px-4 text-right font-black text-amber-700">{b.totalExpiredDays}d</td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {new Date(b.executedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => viewBatchDetails(b.id)}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                        >
                          Details
                        </button>
                        {b.status === 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setBatchToReverse(b);
                              setShowReverseModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100"
                          >
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM EXECUTE MODAL */}
      {showConfirmModal && previewData && !previewData.alreadyProcessed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Execute Year-End Batch?</h3>
            </div>
            <p className="text-sm text-slate-600">
              This will finalize Leave Year <strong>{previewData.sourceLeaveYear}</strong> and roll forward eligible balances into{' '}
              <strong>{previewData.targetLeaveYear}</strong>.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-700">
              <div>• <strong>{previewData.totalCarriedForwardDays} days</strong> will be credited to {previewData.targetLeaveYear}.</div>
              <div>• <strong>{previewData.totalEncashedDays} days</strong> will generate payroll encashment contracts.</div>
              <div>• <strong>{previewData.totalExpiredDays} days</strong> will expire with immutable ledger logs.</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={executeLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBatch}
                disabled={executeLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                {executeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {executeLoading ? 'Executing Batch...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVERSE MODAL */}
      {showReverseModal && batchToReverse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Reverse Batch {batchToReverse.batchNumber}?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Reversing will post compensating double-entry ledger transactions, subtract carried-forward balances from target year{' '}
              <strong>{batchToReverse.targetLeaveYear}</strong>, and reverse any encashment payroll inputs.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reversal Reason</label>
              <input
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Incorrect policy assignment during year-end"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReverseModal(false)}
                disabled={reverseLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseBatch}
                disabled={reverseLoading || !reversalReason.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs disabled:opacity-50"
              >
                {reverseLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {reverseLoading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DETAILS MODAL */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Batch Breakdown: {selectedBatch.batchNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBatch.sourceLeaveYear} <ArrowRight className="w-3 h-3 inline" /> {selectedBatch.targetLeaveYear} • Executed on{' '}
                  {new Date(selectedBatch.executedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold">Employee</th>
                    <th className="py-2.5 px-3 font-bold">Leave Type</th>
                    <th className="py-2.5 px-3 font-bold text-right">Initial Bal</th>
                    <th className="py-2.5 px-3 font-bold text-right text-blue-700">Carry Fwd</th>
                    <th className="py-2.5 px-3 font-bold text-right text-emerald-700">Encash</th>
                    <th className="py-2.5 px-3 font-bold text-right text-amber-700">Expire</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBatch.items?.map((it: LeaveYearEndBatchItemDto) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {it.employeeName} <span className="text-slate-400">({it.employeeNo})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{it.leaveTypeName}</td>
                      <td className="py-2 px-3 text-right font-black">{it.initialBalance}d</td>
                      <td className="py-2 px-3 text-right font-black text-blue-700">{it.carriedForwardDays}d</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-700">{it.encashedDays}d</td>
                      <td className="py-2 px-3 text-right font-black text-amber-700">{it.expiredDays}d</td>
                      <td className="py-2 px-3 font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-2xs ${
                            it.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : it.status === 'REVERSED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {it.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
