'use client';

import React, { useEffect, useState } from 'react';
import { LeaveManagementNav } from './LeaveManagementNav';
import {
  Calculator,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { PayrollDeductionInputDto, PeriodReconciliationSummary } from '@/lib/types/payroll-deduction';

export function PayrollDeductionsFeedView() {
  const [inputs, setInputs] = useState<PayrollDeductionInputDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<PeriodReconciliationSummary | null>(null);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<string>('2026-09-01');

  async function loadInputs() {
    setLoading(true);
    try {
      const url = filterSource === 'ALL'
        ? `/api/admin/hr/leaves/payroll-deductions?payrollPeriodStart=${filterPeriod}`
        : `/api/admin/hr/leaves/payroll-deductions?payrollPeriodStart=${filterPeriod}&sourceType=${filterSource}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setInputs(data.data || []);
    } catch (e) {
      console.error('Error loading deduction inputs', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInputs();
  }, [filterPeriod, filterSource]);

  async function handlePreview() {
    setReconciling(true);
    try {
      const res = await fetch('/api/admin/hr/leaves/payroll-deductions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: filterPeriod,
          periodEnd: '2026-09-30',
        }),
      });
      const data = await res.json();
      if (data.success) setPreviewSummary(data.data);
    } catch (e) {
      console.error('Preview error', e);
    } finally {
      setReconciling(false);
    }
  }

  async function handleExecuteReconcile() {
    if (!confirm('Run attendance reconciliation for this period? This creates pending deduction inputs and reverses obsolete exceptions.')) return;
    setReconciling(true);
    try {
      const res = await fetch('/api/admin/hr/leaves/payroll-deductions/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: filterPeriod,
          periodEnd: '2026-09-30',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Reconciliation complete! Generated: ${data.data.totalGenerated}, Kept: ${data.data.totalExistingKept}, Reversed: ${data.data.totalReversed}`);
        setPreviewSummary(null);
        loadInputs();
      }
    } catch (e) {
      console.error('Reconciliation execution error', e);
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Calculator className="w-7 h-7 text-blue-600" />
              Payroll Deduction Inputs & Reconciliation Feed
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Deterministic, contract-first evidence feed for approved unpaid leaves and attendance exceptions ready for the Payroll module.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={reconciling}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              Preview Reconciliation
            </button>
            <button
              onClick={handleExecuteReconcile}
              disabled={reconciling}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
              Run Period Reconciliation
            </button>
          </div>
        </div>

        {/* Reference Invariant Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 space-y-1 leading-relaxed">
            <div className="font-bold text-emerald-950 text-sm">Paid Leave Safety & Multi-Shift Isolation Invariants Active</div>
            <p>
              • <span className="font-semibold">Paid Leave Exemption</span>: Approved paid leaves (e.g. Fatima Zahra <span className="font-mono font-bold">EMP-102</span> Casual Leave <span className="font-mono">LR-2026-000148</span>) produce strictly <span className="font-bold">0</span> deduction inputs.
            </p>
            <p>
              • <span className="font-semibold">Segment Isolation</span>: Multi-shift staff are evaluated shift-by-shift with fractional weights ($1/N$).
            </p>
            <p>
              • <span className="font-semibold">Contract-First Invariant</span>: <span className="font-mono">deductionAmount</span> is strictly null until populated by final payroll processing.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-xs">Period:</span>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="2026-09-01">September 2026</option>
              <option value="2026-10-01">October 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-xs">Source Type:</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="ALL">All Sources</option>
              <option value="LEAVE_APPLICATION">Leave Application</option>
              <option value="ATTENDANCE_ABSENCE">Attendance Absence</option>
              <option value="ATTENDANCE_LATE_ACCUMULATION">Late Accumulation</option>
              <option value="ATTENDANCE_HALF_DAY">Half Day</option>
            </select>
          </div>
        </div>

        {/* Reconciliation Preview Drawer / Panel */}
        {previewSummary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-indigo-950">
                Reconciliation Preview — {previewSummary.periodLabel}
              </h3>
              <button
                onClick={() => setPreviewSummary(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Close Preview
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <div className="text-xs font-semibold text-slate-400">Employees Scanned</div>
                <div className="text-lg font-bold text-slate-900">{previewSummary.totalEmployeesEvaluated}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <div className="text-xs font-semibold text-slate-400">Exceptions Identified</div>
                <div className="text-lg font-bold text-indigo-600">{previewSummary.items.length}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <div className="text-xs font-semibold text-slate-400">Paid Leaves Skipped</div>
                <div className="text-lg font-bold text-emerald-600">{previewSummary.totalSkippedPaidLeave}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <div className="text-xs font-semibold text-slate-400">Unpaid Leaves Deduplicated</div>
                <div className="text-lg font-bold text-blue-600">{previewSummary.totalSkippedUnpaidLeaveLink}</div>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {previewSummary.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{item.employeeName}</span>
                    <span className="text-slate-400 font-mono ml-2">({item.employeeNo})</span>
                    <div className="text-slate-600 mt-0.5">{item.reason}</div>
                  </div>
                  <div className="text-right font-bold">
                    <span className="text-indigo-600">{item.calculatedDays}d</span>
                    <div className="text-slate-400 font-normal">{item.actionRequired}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deductions Feed Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Deduction Input Records ({inputs.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading deduction inputs...</div>
          ) : inputs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No deduction input records found for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Source Type & Ref</th>
                    <th className="px-6 py-3">Date / Period</th>
                    <th className="px-6 py-3">Policy Applied</th>
                    <th className="px-6 py-3">Deduction Days</th>
                    <th className="px-6 py-3">Amount (PKR)</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {inputs.map((inp) => (
                    <tr key={inp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{inp.employeeName}</div>
                        <div className="text-xs font-mono text-slate-400">{inp.employeeNo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {inp.sourceType}
                        </span>
                        <div className="text-xs font-mono text-slate-400 mt-1">
                          {inp.applicationNumber ?? inp.deductionSourceKey}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {inp.attendanceDate ? (
                          <div>
                            <span className="font-semibold text-slate-800">{inp.attendanceDate}</span>
                            {inp.shiftName && <div className="text-slate-400">Shift: {inp.shiftName}</div>}
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800">{inp.payrollPeriodLabel}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-800">{inp.policyName}</div>
                        <div className="text-slate-400 font-mono">{inp.policyCode}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                        {inp.deductionDays}d
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {inp.deductionAmount !== null ? (
                          <span className="font-bold text-slate-900">{inp.deductionAmount}</span>
                        ) : (
                          <span className="text-slate-400 italic">Deferred to Payroll</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            inp.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : inp.status === 'PROCESSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inp.status}
                        </span>
                        {inp.reversalReason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 max-w-xs truncate" title={inp.reversalReason}>
                            {inp.reversalReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
