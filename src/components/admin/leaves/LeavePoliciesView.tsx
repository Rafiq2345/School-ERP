'use client';

import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';
import { CreateLeavePolicyDto, LeavePolicyDto, LeaveTypeDto } from '@/lib/types/leave';

export function LeavePoliciesView() {
  const [policies, setPolicies] = useState<LeavePolicyDto[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicyDto | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateLeavePolicyDto>({
    name: '',
    code: '',
    description: '',
    isDefault: false,
    status: 'ACTIVE',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: null,
    rules: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [policiesRes, typesRes] = await Promise.all([
        fetch('/api/admin/hr/leaves/policies'),
        fetch('/api/admin/hr/leaves/types?isActive=true'),
      ]);
      const policiesJson = await policiesRes.json();
      const typesJson = await typesRes.json();

      if (policiesJson.success) setPolicies(policiesJson.data);
      if (typesJson.success) setLeaveTypes(typesJson.data);
    } catch (e) {
      console.error('Error loading policies and types', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (policyToEdit?: LeavePolicyDto) => {
    if (policyToEdit) {
      setEditingPolicy(policyToEdit);
      setFormData({
        name: policyToEdit.name,
        code: policyToEdit.code,
        description: policyToEdit.description || '',
        isDefault: policyToEdit.isDefault,
        status: policyToEdit.status,
        effectiveFrom: policyToEdit.effectiveFrom,
        effectiveTo: policyToEdit.effectiveTo,
        rules: policyToEdit.rules.map((r) => ({ ...r })),
      });
    } else {
      setEditingPolicy(null);
      // Initialize default rules from active leave types
      const initialRules = leaveTypes.map((lt) => ({
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        annualEntitlement: lt.annualLimit || 10,
        isPaid: lt.isPaid,
        isUnlimited: lt.isUnlimited,
        allocationMethod: lt.defaultAllocationMethod,
        minLeaveUnit: lt.minLeaveUnit,
        allowHalfDay: lt.allowHalfDay,
        allowShiftWise: lt.allowShiftWise,
        allowHourly: lt.allowHourly,
        allowNegativeBalance: false,
        maxNegativeBalance: 0,
        maxConsecutiveDays: null,
        probationTreatment: 'ALLOWED' as any,
        probationEntitlement: null,
        entitlementRelease: 'ON_JOINING' as any,
        yearEndAction: 'EXPIRE' as any,
        maxCarryForwardDays: null,
        carryForwardExpiryMonths: null,
        maxEncashableDays: null,
        minBalanceForEncashment: null,
      }));

      setFormData({
        name: '',
        code: '',
        description: '',
        isDefault: false,
        status: 'ACTIVE',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: null,
        rules: initialRules,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPolicy
        ? `/api/admin/hr/leaves/policies/${editingPolicy.id}`
        : '/api/admin/hr/leaves/policies';
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        loadData();
      } else {
        alert(json.error?.message || 'Failed to save policy');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving leave policy');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete/deactivate Leave Policy [${name}]?`)) return;
    try {
      const res = await fetch(`/api/admin/hr/leaves/policies/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        loadData();
      } else {
        alert(json.error?.message || 'Failed to delete policy');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting policy');
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
              <FileCheck2 className="w-7 h-7 text-indigo-600" />
              Leave Policies & Probation Rules
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create effective-dated annual leave policies, probation entitlements, and year-end carry-forward readiness.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Leave Policy
          </button>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-slate-400">
              Loading leave policies...
            </div>
          ) : policies.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              No leave policies found. Click &quot;Create Leave Policy&quot; to create your first policy.
            </div>
          ) : (
            policies.map((policy) => (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{policy.name}</h3>
                        {policy.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">{policy.code}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        policy.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {policy.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      From: {policy.effectiveFrom}
                    </span>
                    {policy.effectiveTo && (
                      <span className="flex items-center gap-1">
                        To: {policy.effectiveTo}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto font-medium text-slate-700">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {policy.activeAssignmentsCount || 0} active assignments
                    </span>
                  </div>

                  {policy.description && (
                    <p className="text-xs text-slate-600 italic">{policy.description}</p>
                  )}

                  {/* Rules Breakdown */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Included Leave Types ({policy.rules.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {policy.rules.map((rule) => (
                        <div
                          key={rule.leaveTypeId}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <span className="font-semibold text-slate-800 truncate mr-2">
                            {rule.leaveTypeName}
                          </span>
                          <span className="font-mono font-bold text-indigo-600">
                            {rule.isUnlimited ? '∞' : `${rule.annualEntitlement}d`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(policy)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Policy & Rules
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(policy.id, policy.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Policy & Probation Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingPolicy ? 'Edit Leave Policy & Rules' : 'Create Leave Policy'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
                  >
                    ✕
                  </button>
                </div>

                {/* Header Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Policy Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Teaching Faculty Policy 2026"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Policy Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LP-FACULTY-2026"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Effective From *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Set as Default School Policy (Fallback Level 6)
                    </span>
                  </label>
                </div>

                {/* Rules & Probation Grid */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Leave Type Rules & Probation Entitlements
                  </h4>

                  <div className="space-y-4">
                    {formData.rules.map((rule, idx) => (
                      <div
                        key={rule.leaveTypeId}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">
                            {rule.leaveTypeName} ({rule.leaveTypeCode})
                          </span>
                          <span className="text-xs text-slate-500">Rule #{idx + 1}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                              Annual Entitlement (Days)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={rule.annualEntitlement}
                              onChange={(e) => {
                                const newRules = [...formData.rules];
                                newRules[idx].annualEntitlement = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, rules: newRules });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                              Probation Treatment
                            </label>
                            <select
                              value={rule.probationTreatment}
                              onChange={(e) => {
                                const newRules = [...formData.rules];
                                newRules[idx].probationTreatment = e.target.value as any;
                                setFormData({ ...formData, rules: newRules });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                            >
                              <option value="ALLOWED">Allowed (Full)</option>
                              <option value="LIMITED_ENTITLEMENT">Limited Days</option>
                              <option value="UNPAID_ONLY">Unpaid Only</option>
                              <option value="NOT_ALLOWED">Not Allowed</option>
                            </select>
                          </div>

                          {rule.probationTreatment === 'LIMITED_ENTITLEMENT' && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Probation Days
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={rule.probationEntitlement || 0}
                                onChange={(e) => {
                                  const newRules = [...formData.rules];
                                  newRules[idx].probationEntitlement = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, rules: newRules });
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                              Entitlement Release
                            </label>
                            <select
                              value={rule.entitlementRelease}
                              onChange={(e) => {
                                const newRules = [...formData.rules];
                                newRules[idx].entitlementRelease = e.target.value as any;
                                setFormData({ ...formData, rules: newRules });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
                            >
                              <option value="ON_JOINING">On Joining</option>
                              <option value="MONTHLY_DURING_PROBATION">Monthly Accrual</option>
                              <option value="ON_CONFIRMATION">On Confirmation</option>
                              <option value="PRORATED_AFTER_CONFIRMATION">Prorated After Confirmation</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-xs"
                  >
                    {editingPolicy ? 'Update Policy' : 'Save Policy'}
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
