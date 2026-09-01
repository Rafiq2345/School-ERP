'use client';

import React, { useEffect, useState } from 'react';
import {
  Coins,
  ShieldAlert,
  ArrowLeft,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { LeaveManagementNav } from './LeaveManagementNav';
import { EmployeeLeaveSummaryDto } from '@/lib/types/leave';

export function EmployeeLeaveDetailView({ employeeId }: { employeeId: string }) {
  const [summary, setSummary] = useState<EmployeeLeaveSummaryDto | null>(null);
  const [leaveYear, setLeaveYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [adjType, setAdjType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjQuantity, setAdjQuantity] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/hr/leaves/employees/${employeeId}?year=${leaveYear}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
        if (json.data.balances?.length > 0) {
          setSelectedLeaveTypeId((prev) => prev || json.data.balances[0].leaveTypeId);
        }
      }
    } catch (e) {
      console.error('Error loading employee summary', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, leaveYear]);

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      alert('Mandatory justification reason is required.');
      return;
    }

    try {
      setIsAdjusting(true);
      const res = await fetch('/api/admin/hr/leaves/entitlements/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          leaveTypeId: selectedLeaveTypeId,
          leaveYear,
          adjustmentType: adjType,
          quantity: adjQuantity,
          reason: adjReason,
          effectiveDate: new Date().toISOString().split('T')[0],
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Leave balance adjusted successfully.');
        setIsAdjModalOpen(false);
        setAdjReason('');
        loadSummary();
      } else {
        alert(json.error?.message || 'Failed to adjust balance');
      }
    } catch (e: any) {
      alert(e.message || 'Error adjusting balance');
    } finally {
      setIsAdjusting(false);
    }
  };

  const selectedBalance = summary?.balances.find((b) => b.leaveTypeId === selectedLeaveTypeId);
  const currentAvailable = selectedBalance ? selectedBalance.availableBalance : 0;
  const projectedBalance =
    adjType === 'ADD' ? currentAvailable + adjQuantity : currentAvailable - adjQuantity;

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top bar back link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/hr/leaves/entitlements"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Entitlements Wizard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Year:</span>
            <select
              value={leaveYear}
              onChange={(e) => setLeaveYear(parseInt(e.target.value, 10))}
              className="px-3 py-1 border border-slate-200 rounded-lg text-sm font-bold bg-white"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
              <option value={2029}>2029</option>
            </select>
          </div>
        </div>

        {loading || !summary ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            Loading employee leave record...
          </div>
        ) : (
          <>
            {/* Employee Profile Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                  {summary.employee.firstNameEn[0]}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {summary.employee.firstNameEn} {summary.employee.lastNameEn || ''}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {summary.employee.employeeNo} • {summary.employee.departmentName} • {summary.employee.designationName}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">HR Status</span>
                  <span className="font-bold text-slate-800">{summary.employee.confirmationStatus}</span>
                </div>
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Policy</span>
                  <span className="font-bold text-indigo-700">
                    {summary.currentPolicy?.name || 'None Assigned'}
                  </span>
                </div>
                <button
                  onClick={() => setIsAdjModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Manual Balance Adjustment
                </button>
              </div>
            </div>

            {/* Leave Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summary.balances.map((b) => (
                <div
                  key={b.leaveTypeId}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{b.leaveTypeName}</h3>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                      {b.leaveTypeCode}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-3xl font-extrabold ${
                        b.availableBalance < 0
                          ? 'text-rose-600'
                          : b.availableBalance === 0
                          ? 'text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {b.isUnlimited ? '∞' : `${b.availableBalance}d`}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">Available</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-slate-500">
                    <div>
                      <span className="block text-slate-400">Allocated</span>
                      <span className="font-semibold text-slate-700">{b.allocatedDays}d</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Adjusted</span>
                      <span
                        className={`font-semibold ${
                          b.adjustedDays > 0
                            ? 'text-emerald-600'
                            : b.adjustedDays < 0
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {b.adjustedDays > 0 ? `+${b.adjustedDays}` : b.adjustedDays}d
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Used (P2)</span>
                      <span className="font-semibold text-slate-400">{b.usedDays}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Transaction Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  Leave Entitlement Ledger (Transaction History)
                </h3>
                <span className="text-xs text-slate-500">
                  {summary.recentTransactions.length} transaction(s) recorded for {leaveYear}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Leave Type</th>
                      <th className="px-6 py-3.5">Transaction Type</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Before</th>
                      <th className="px-6 py-3.5">After</th>
                      <th className="px-6 py-3.5">Reason / Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {summary.recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          No ledger transactions recorded for {leaveYear}.
                        </td>
                      </tr>
                    ) : (
                      summary.recentTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {tx.effectiveDate}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {tx.leaveTypeName}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                                tx.transactionType === 'ANNUAL_ALLOCATION'
                                  ? 'bg-blue-50 text-blue-700'
                                  : tx.transactionType === 'MANUAL_ADJUSTMENT_ADD'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : tx.transactionType === 'MANUAL_ADJUSTMENT_SUBTRACT'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-xs ${
                                tx.amount > 0
                                  ? 'text-emerald-600'
                                  : tx.amount < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}d
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {tx.balanceBefore}d
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                            {tx.balanceAfter}d
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 max-w-sm">
                            {tx.reason || 'Standard system transaction'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Manual Adjustment Modal */}
        {isAdjModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full">
              <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Manual Leave Adjustment</h3>
                  <button
                    type="button"
                    onClick={() => setIsAdjModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Leave Type *
                  </label>
                  <select
                    value={selectedLeaveTypeId}
                    onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {summary?.balances.map((b) => (
                      <option key={b.leaveTypeId} value={b.leaveTypeId}>
                        {b.leaveTypeName} ({b.leaveTypeCode}) — Current Available: {b.availableBalance}d
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Action *
                    </label>
                    <select
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="ADD">Add Days (+)</option>
                      <option value="SUBTRACT">Subtract Days (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Quantity (Days) *
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      required
                      value={adjQuantity}
                      onChange={(e) => setAdjQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                </div>

                {/* Live Projected Balance Calculation Box */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    projectedBalance < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {projectedBalance < 0 ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>
                      Current: <strong>{currentAvailable}d</strong> → Projected:{' '}
                      <strong>{projectedBalance}d</strong>
                    </span>
                  </div>
                  {projectedBalance < 0 && (
                    <span className="font-bold text-[10px] uppercase bg-rose-200 px-1.5 py-0.5 rounded text-rose-900">
                      Negative Warning
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mandatory Justification Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Compensatory leave approved by Principal for Sunday academic duty..."
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdjModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-xs"
                  >
                    {isAdjusting ? 'Saving...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
