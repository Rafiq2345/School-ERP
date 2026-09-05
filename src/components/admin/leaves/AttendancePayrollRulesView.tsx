'use client';

import React, { useEffect, useState } from 'react';
import { LeaveManagementNav } from './LeaveManagementNav';
import {
  Scale,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  FileCheck2,
  Trash2,
  Sliders,
} from 'lucide-react';
import type { PayrollDeductionPolicyDto, PayrollDeductionPolicyAssignmentDto } from '@/lib/types/payroll-deduction';

export function AttendancePayrollRulesView() {
  const [policies, setPolicies] = useState<PayrollDeductionPolicyDto[]>([]);
  const [assignments, setAssignments] = useState<PayrollDeductionPolicyAssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    policyCode: '',
    policyName: '',
    scope: 'LATE_ARRIVALS',
    calculationBasis: 'CALENDAR_DAYS',
    lateTriggerCount: 3,
    lateGraceMinutes: 15,
    lateDeductionUnit: 1.0,
    absenceDeductionUnit: 1.0,
    halfDayDeductionUnit: 0.5,
    isDefault: false,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/admin/hr/leaves/payroll-rules'),
        fetch('/api/admin/hr/leaves/payroll-rules/assignments'),
      ]);
      const pData = await pRes.json();
      const aData = await aRes.json();
      if (pData.success) setPolicies(pData.data || []);
      if (aData.success) setAssignments(aData.data || []);
    } catch (e) {
      console.error('Error loading payroll rules', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/hr/leaves/payroll-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        loadData();
      } else {
        alert(data.error?.message || 'Failed to create policy');
      }
    } catch (e: any) {
      alert(e.message || 'Network error');
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
              <Scale className="w-7 h-7 text-blue-600" />
              Attendance-to-Payroll Rules Engine
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure institutional & departmental rules for late arrivals accumulation, unexcused absences, and multi-shift deduction fractions.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Deduction Rule
          </button>
        </div>

        {/* Hierarchy Precedence Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <Layers className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-blue-900">6-Level Precedence Resolution Engine</h3>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Rules resolve dynamically in hierarchical order: <span className="font-semibold text-blue-950">1. Individual Override (P1000)</span> → <span className="font-semibold text-blue-950">2. Direct Employee (P500)</span> → <span className="font-semibold text-blue-950">3. Department (P300)</span> → <span className="font-semibold text-blue-950">4. Designation (P200)</span> → <span className="font-semibold text-blue-950">5. Employment Type / Category (P100)</span> → <span className="font-semibold text-blue-950">6. Institutional Default (P0)</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Active Payroll Deduction Rules ({policies.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading payroll deduction rules...</div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No deduction rules found. Create the first default rule above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Policy Code & Name</th>
                    <th className="px-6 py-3">Scope</th>
                    <th className="px-6 py-3">Late Trigger / Grace</th>
                    <th className="px-6 py-3">Absence Unit</th>
                    <th className="px-6 py-3">Calculation Basis</th>
                    <th className="px-6 py-3">Default</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{p.policyName}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">{p.policyCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {p.scope}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {p.scope === 'LATE_ARRIVALS' ? (
                          <div>
                            <span className="font-bold text-slate-800">{p.lateTriggerCount} lates</span> = {p.lateDeductionUnit}d
                            <div className="text-slate-400">Grace: {p.lateGraceMinutes}m</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">
                        {p.absenceDeductionUnit ?? 1.0}d / abs
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-mono text-slate-600">{p.calculationBasis}</span>
                      </td>
                      <td className="px-6 py-4">
                        {p.isDefault ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Institutional Default
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Targeted</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assignments Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Targeted Assignments & Overrides ({assignments.length})</h2>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No targeted assignments. All staff evaluate under Institutional Defaults.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Assignment Type</th>
                    <th className="px-6 py-3">Target Entity</th>
                    <th className="px-6 py-3">Assigned Policy</th>
                    <th className="px-6 py-3">Override Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">P{a.priority}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                          {a.assignmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {a.employeeName ?? a.departmentName ?? a.designationName ?? a.employmentTypeName ?? 'Institutional'}
                        {a.employeeNo && <span className="text-xs text-slate-400 font-mono ml-2">({a.employeeNo})</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {a.policyName ?? a.policyCode}
                      </td>
                      <td className="px-6 py-4">
                        {a.isOverride ? (
                          <span className="inline-flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            Yes (Override)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Standard</span>
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Create Attendance Deduction Rule</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">Policy Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RULE_LATE_DEFAULT"
                  value={formData.policyCode}
                  onChange={(e) => setFormData({ ...formData, policyCode: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 Late Arrivals = 1 Day Deduction"
                  value={formData.policyName}
                  onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="LATE_ARRIVALS">Late Arrivals</option>
                    <option value="UNPAID_LEAVE">Unexcused Absence</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="EARLY_DEPARTURE">Early Departure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">Calculation Basis</label>
                  <select
                    value={formData.calculationBasis}
                    onChange={(e) => setFormData({ ...formData, calculationBasis: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="CALENDAR_DAYS">Calendar Days</option>
                    <option value="FIXED_30">Fixed 30 Days</option>
                    <option value="WORKING_DAYS">Working Days</option>
                  </select>
                </div>
              </div>

              {formData.scope === 'LATE_ARRIVALS' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Trigger Count</label>
                    <input
                      type="number"
                      value={formData.lateTriggerCount}
                      onChange={(e) => setFormData({ ...formData, lateTriggerCount: parseInt(e.target.value, 10) })}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Grace (Mins)</label>
                    <input
                      type="number"
                      value={formData.lateGraceMinutes}
                      onChange={(e) => setFormData({ ...formData, lateGraceMinutes: parseInt(e.target.value, 10) })}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Deduction (d)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={formData.lateDeductionUnit}
                      onChange={(e) => setFormData({ ...formData, lateDeductionUnit: parseFloat(e.target.value) })}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700">
                  Set as Institutional Default Policy
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
