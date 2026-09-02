'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Coins,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';
import {
  BulkAllocateEntitlementDto,
  EntitlementAllocationPreviewItem,
} from '@/lib/types/leave';

export function LeaveEntitlementsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlYear = searchParams.get('year');
  const initialYear = urlYear ? parseInt(urlYear, 10) : new Date().getFullYear();
  const [leaveYear, setLeaveYear] = useState<number>(!isNaN(initialYear) ? initialYear : new Date().getFullYear());
  const [previewItems, setPreviewItems] = useState<EntitlementAllocationPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    const paramYear = searchParams.get('year');
    if (paramYear) {
      const parsed = parseInt(paramYear, 10);
      if (!isNaN(parsed) && parsed !== leaveYear) {
        setLeaveYear(parsed);
      }
    }
  }, [searchParams, leaveYear]);

  const handleYearChange = (newYear: number) => {
    setLeaveYear(newYear);
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', newYear.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const payload: BulkAllocateEntitlementDto = {
        leaveYear,
        overwriteExisting,
      };

      const res = await fetch('/api/admin/hr/leaves/entitlements/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setPreviewItems(json.data.items);
      } else {
        alert(json.error?.message || 'Failed to generate preview');
      }
    } catch (e: any) {
      alert(e.message || 'Error generating allocation preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePreview();
  }, [leaveYear]);

  const handleAllocate = async () => {
    if (previewItems.length === 0) return;

    try {
      setAllocating(true);
      const payload: BulkAllocateEntitlementDto = {
        leaveYear,
        overwriteExisting,
      };

      const res = await fetch('/api/admin/hr/leaves/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.data.message);
        handlePreview();
      } else {
        alert(json.error?.message || 'Failed to allocate entitlements');
      }
    } catch (e: any) {
      alert(e.message || 'Error allocating entitlements');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Coins className="w-7 h-7 text-amber-600" />
              Annual Entitlement Allocation Wizard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Bulk calculate and post annual leave entitlements and initial balance ledgers for all employees.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Leave Year:</span>
              <select
                value={leaveYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
              </select>
            </div>

            <button
              onClick={handleAllocate}
              disabled={allocating || previewItems.length === 0}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              {allocating ? 'Allocating...' : 'Post Annual Allocation'}
            </button>
          </div>
        </div>

        {/* Options & Overwrite Toggle */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span className="text-xs font-bold text-slate-800">
              Overwrite / Recalculate already allocated staff for {leaveYear}
            </span>
          </label>

          <span className="text-xs text-slate-500">
            {previewItems.length} Eligible staff resolved for {leaveYear}
          </span>
        </div>

        {/* Allocation Preview Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Probation / Status</th>
                  <th className="px-6 py-3.5">Active Policy</th>
                  <th className="px-6 py-3.5">Calculated Entitlements</th>
                  <th className="px-6 py-3.5">Allocation Status</th>
                  <th className="px-6 py-3.5 text-right">Ledger View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Analyzing employee policies and entitlements...
                    </td>
                  </tr>
                ) : previewItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      No employees eligible for allocation in {leaveYear}.
                    </td>
                  </tr>
                ) : (
                  previewItems.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.employeeNo} - {item.employeeName}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {item.departmentName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            item.confirmationStatus === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.confirmationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {item.policyName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {item.leaveTypeEntitlements.map((lt) => (
                            <span
                              key={lt.leaveTypeId}
                              className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]"
                            >
                              {lt.leaveTypeCode}: {lt.isUnlimited ? '∞' : `${lt.entitlement}d`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'READY' && (
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Ready to Post
                          </span>
                        )}
                        {item.status === 'ALREADY_ALLOCATED' && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Already Allocated
                          </span>
                        )}
                        {item.status === 'HAS_OVERRIDE' && (
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            Has Override
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/hr/leaves/employees/${item.employeeId}?year=${leaveYear}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <User className="w-3.5 h-3.5" />
                          View Ledger
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
    </div>
  );
}
