'use client';

import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';
import { CreateLeaveTypeDto, LeaveTypeDto } from '@/lib/types/leave';

export function LeaveTypesView() {
  const [types, setTypes] = useState<LeaveTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeDto | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateLeaveTypeDto>({
    name: '',
    code: '',
    description: '',
    isPaid: true,
    isUnlimited: false,
    annualLimit: 12,
    defaultAllocationMethod: 'ANNUAL_UPFRONT',
    minLeaveUnit: 0.5,
    allowFullDay: true,
    allowHalfDay: true,
    allowShiftWise: true,
    allowHourly: false,
    attachmentRequired: false,
    attachmentThresholdDays: 0,
    isActive: true,
  });

  const loadTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/hr/leaves/types?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setTypes(json.data);
      }
    } catch (e) {
      console.error('Error fetching leave types', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, [search]);

  const handleOpenModal = (typeToEdit?: LeaveTypeDto) => {
    if (typeToEdit) {
      setEditingType(typeToEdit);
      setFormData({
        name: typeToEdit.name,
        code: typeToEdit.code,
        description: typeToEdit.description || '',
        isPaid: typeToEdit.isPaid,
        isUnlimited: typeToEdit.isUnlimited,
        annualLimit: typeToEdit.annualLimit,
        defaultAllocationMethod: typeToEdit.defaultAllocationMethod,
        minLeaveUnit: typeToEdit.minLeaveUnit,
        allowFullDay: typeToEdit.allowFullDay,
        allowHalfDay: typeToEdit.allowHalfDay,
        allowShiftWise: typeToEdit.allowShiftWise,
        allowHourly: typeToEdit.allowHourly,
        attachmentRequired: typeToEdit.attachmentRequired,
        attachmentThresholdDays: typeToEdit.attachmentThresholdDays,
        isActive: typeToEdit.isActive,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        isPaid: true,
        isUnlimited: false,
        annualLimit: 12,
        defaultAllocationMethod: 'ANNUAL_UPFRONT',
        minLeaveUnit: 0.5,
        allowFullDay: true,
        allowHalfDay: true,
        allowShiftWise: true,
        allowHourly: false,
        attachmentRequired: false,
        attachmentThresholdDays: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingType
        ? `/api/admin/hr/leaves/types/${editingType.id}`
        : '/api/admin/hr/leaves/types';
      const method = editingType ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        loadTypes();
      } else {
        alert(json.error?.message || 'Failed to save leave type');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving leave type');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate or remove Leave Type [${name}]?`)) return;
    try {
      const res = await fetch(`/api/admin/hr/leaves/types/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        loadTypes();
      } else {
        alert(json.error?.message || 'Failed to delete leave type');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting leave type');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <LeaveManagementNav />
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <ListOrdered className="w-7 h-7 text-blue-600" />
              Leave Types Master
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure institutional leave categories, payment status, full/half/shift unit permissions, and attachment rules.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Leave Type
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leave types by name, code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Leave Types Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Leave Type</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5">Allocation Method</th>
                  <th className="px-6 py-3.5">Allowed Units</th>
                  <th className="px-6 py-3.5">Documentation</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      Loading leave types...
                    </td>
                  </tr>
                ) : types.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No leave types found. Click &quot;Create Leave Type&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {type.name}
                        {type.description && (
                          <p className="text-xs text-slate-400 font-normal mt-0.5 truncate max-w-xs">
                            {type.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
                          {type.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {type.isPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid Leave
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Unpaid Leave
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {type.defaultAllocationMethod.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 text-xs">
                          {type.allowFullDay && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">
                              Full
                            </span>
                          )}
                          {type.allowHalfDay && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium">
                              Half
                            </span>
                          )}
                          {type.allowShiftWise && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium">
                              Shift
                            </span>
                          )}
                          {type.allowHourly && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-medium">
                              Hourly
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {type.attachmentRequired ? (
                          <span className="text-amber-700 font-medium">
                            Mandatory {type.attachmentThresholdDays > 0 ? `> ${type.attachmentThresholdDays}d` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">Optional</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {type.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(type)}
                          className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit Leave Type"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id, type.name)}
                          className="p-1 text-slate-500 hover:text-rose-600 transition-colors"
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Builder */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingType ? 'Edit Leave Type' : 'Create Leave Type'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Leave Type Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Casual Leave"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Leave Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CASUAL"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide additional details or guidelines for this leave category..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Payment Status
                    </label>
                    <select
                      value={formData.isPaid ? 'PAID' : 'UNPAID'}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.value === 'PAID' })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PAID">Paid Leave</option>
                      <option value="UNPAID">Unpaid Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Allocation Method
                    </label>
                    <select
                      value={formData.defaultAllocationMethod}
                      onChange={(e) => setFormData({ ...formData, defaultAllocationMethod: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ANNUAL_UPFRONT">Annual Upfront</option>
                      <option value="MONTHLY_ACCRUAL">Monthly Accrual</option>
                      <option value="JOINING_DATE_BASED">Joining-Date Based</option>
                      <option value="CONFIRMATION_BASED">Confirmation-Based</option>
                      <option value="PRORATED">Prorated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Min Unit Granularity
                    </label>
                    <select
                      value={formData.minLeaveUnit}
                      onChange={(e) => setFormData({ ...formData, minLeaveUnit: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1.0}>1.0 Day (Full Day Only)</option>
                      <option value={0.5}>0.5 Day (Half Day)</option>
                      <option value={0.25}>0.25 Day (Quarter Day)</option>
                      <option value={0.125}>0.125 Day (1 Hour)</option>
                    </select>
                  </div>
                </div>

                {/* Usage / Unit Permissions */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Allowed Leave Units
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowFullDay}
                        onChange={(e) => setFormData({ ...formData, allowFullDay: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">Full Day</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowHalfDay}
                        onChange={(e) => setFormData({ ...formData, allowHalfDay: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">Half Day</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowShiftWise}
                        onChange={(e) => setFormData({ ...formData, allowShiftWise: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">Shift-Wise</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowHourly}
                        onChange={(e) => setFormData({ ...formData, allowHourly: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">Hourly / Short</span>
                    </label>
                  </div>
                </div>

                {/* Attachment & Documentation Rules */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Mandatory Supporting Documentation</p>
                      <p className="text-xs text-slate-500">Require medical certificate or justification file</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.attachmentRequired}
                      onChange={(e) => setFormData({ ...formData, attachmentRequired: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                  </div>

                  {formData.attachmentRequired && (
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        Require attachment when leave is greater than:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.attachmentThresholdDays}
                        onChange={(e) => setFormData({ ...formData, attachmentThresholdDays: parseInt(e.target.value, 10) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-center"
                      />
                      <span className="text-xs text-slate-500">consecutive days (0 = always required)</span>
                    </div>
                  )}
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
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs"
                  >
                    {editingType ? 'Update Leave Type' : 'Save Leave Type'}
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
