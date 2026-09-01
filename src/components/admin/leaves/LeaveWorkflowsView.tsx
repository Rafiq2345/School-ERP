'use client';

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  ChevronRight,
  ShieldCheck,
  Users,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  LeaveApprovalWorkflowDto,
  CreateLeaveApprovalWorkflowDto,
  CreateLeaveApprovalWorkflowStepDto,
  CreateLeaveApprovalWorkflowRuleDto,
} from '@/lib/types/leave';

export function LeaveWorkflowsView() {
  const [workflows, setWorkflows] = useState<LeaveApprovalWorkflowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<LeaveApprovalWorkflowDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');

  // Steps Builder
  const [steps, setSteps] = useState<CreateLeaveApprovalWorkflowStepDto[]>([
    { stepNumber: 1, stepName: 'Department Incharge', approverType: 'ROLE', approverRole: 'DEPARTMENT_HEAD', isRequired: true, isActive: true },
    { stepNumber: 2, stepName: 'Principal Approval', approverType: 'ROLE', approverRole: 'PRINCIPAL', isRequired: true, isActive: true },
    { stepNumber: 3, stepName: 'HR Final Approval', approverType: 'ROLE', approverRole: 'HR_MANAGER', isRequired: true, isActive: true },
  ]);

  // Selected Workflow for Drawer / Rules view
  const [selectedWorkflow, setSelectedWorkflow] = useState<LeaveApprovalWorkflowDto | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleAssignmentType, setRuleAssignmentType] = useState<string>('DEPARTMENT');
  const [ruleTargetId, setRuleTargetId] = useState<string>('');
  const [ruleIsOverride, setRuleIsOverride] = useState(false);

  // Reference Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hr/leaves/workflows');
      const json = await res.json();
      if (json.success) {
        setWorkflows(json.data);
      }
    } catch (err) {
      console.error('Failed to load workflows', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [deptRes, desigRes, ltRes] = await Promise.all([
        fetch('/api/admin/departments').catch(() => null),
        fetch('/api/admin/designations').catch(() => null),
        fetch('/api/admin/hr/leaves/types').catch(() => null),
      ]);
      if (deptRes && deptRes.ok) {
        const j = await deptRes.json();
        setDepartments(j.data || []);
      }
      if (desigRes && desigRes.ok) {
        const j = await desigRes.json();
        setDesignations(j.data || []);
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
    loadWorkflows();
    loadReferenceData();
  }, []);

  const openCreateModal = () => {
    setEditingWorkflow(null);
    setName('');
    setCode('');
    setDescription('');
    setIsDefault(workflows.length === 0);
    setIsActive(true);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setEffectiveTo('');
    setSteps([
      { stepNumber: 1, stepName: 'Department Incharge', approverType: 'ROLE', approverRole: 'DEPARTMENT_HEAD', isRequired: true, isActive: true },
      { stepNumber: 2, stepName: 'Principal Approval', approverType: 'ROLE', approverRole: 'PRINCIPAL', isRequired: true, isActive: true },
      { stepNumber: 3, stepName: 'HR Final Approval', approverType: 'ROLE', approverRole: 'HR_MANAGER', isRequired: true, isActive: true },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (wf: LeaveApprovalWorkflowDto) => {
    setEditingWorkflow(wf);
    setName(wf.name);
    setCode(wf.code);
    setDescription(wf.description || '');
    setIsDefault(wf.isDefault);
    setIsActive(wf.isActive);
    setEffectiveFrom(wf.effectiveFrom);
    setEffectiveTo(wf.effectiveTo || '');
    setSteps(
      wf.steps.map((s) => ({
        stepNumber: s.stepNumber,
        stepName: s.stepName,
        approverType: s.approverType,
        approverUserId: s.approverUserId,
        approverRole: s.approverRole,
        approverDesignationId: s.approverDesignationId,
        isRequired: s.isRequired,
        autoApproveAfterDays: s.autoApproveAfterDays,
        isActive: s.isActive,
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddStep = () => {
    const nextNumber = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNumber)) + 1 : 1;
    setSteps([
      ...steps,
      {
        stepNumber: nextNumber,
        stepName: `Level ${nextNumber} Review`,
        approverType: 'ROLE',
        approverRole: 'SUPER_ADMIN',
        isRequired: true,
        isActive: true,
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) {
      alert('A workflow must contain at least 1 step.');
      return;
    }
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  };

  const handleStepChange = (index: number, field: keyof CreateLeaveApprovalWorkflowStepDto, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload: CreateLeaveApprovalWorkflowDto = {
        name,
        code,
        description,
        isDefault,
        isActive,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        steps,
      };

      const url = editingWorkflow
        ? `/api/admin/hr/leaves/workflows/${editingWorkflow.id}`
        : '/api/admin/hr/leaves/workflows';
      const method = editingWorkflow ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save workflow');
      }

      setIsModalOpen(false);
      await loadWorkflows();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;
    try {
      const payload: CreateLeaveApprovalWorkflowRuleDto = {
        assignmentType: ruleAssignmentType as any,
        departmentId: ruleAssignmentType === 'DEPARTMENT' ? ruleTargetId : null,
        designationId: ruleAssignmentType === 'DESIGNATION' ? ruleTargetId : null,
        leaveTypeId: ruleAssignmentType === 'LEAVE_TYPE' ? ruleTargetId : null,
        isOverride: ruleIsOverride,
      };

      const res = await fetch(`/api/admin/hr/leaves/workflows/${selectedWorkflow.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to add rule');

      setIsRuleModalOpen(false);
      setRuleTargetId('');
      await loadWorkflows();
      // Reload selected workflow
      const updatedWf = await (await fetch(`/api/admin/hr/leaves/workflows/${selectedWorkflow.id}`)).json();
      if (updatedWf.success) setSelectedWorkflow(updatedWf.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedWorkflow) return;
    if (!confirm('Are you sure you want to remove this applicability rule?')) return;
    try {
      const res = await fetch(`/api/admin/hr/leaves/workflows/${selectedWorkflow.id}/rules/${ruleId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete rule');

      await loadWorkflows();
      const updatedWf = await (await fetch(`/api/admin/hr/leaves/workflows/${selectedWorkflow.id}`)).json();
      if (updatedWf.success) setSelectedWorkflow(updatedWf.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (filterActive === 'ACTIVE' && !w.isActive) return false;
    if (filterActive === 'INACTIVE' && w.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Leave Approval Workflows</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure dynamic multi-level approval chains with rule-based resolution & role assignments
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Approval Workflow</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search workflow name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Workflows Grid / List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading Approval Workflows...</p>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <GitBranch className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Approval Workflows Found</h3>
          <p className="text-xs text-slate-500 mb-4">Create your first multi-level leave approval workflow.</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorkflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-slate-900">{wf.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold rounded-md">
                        {wf.code}
                      </span>
                      {wf.isDefault && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    {wf.description && <p className="text-xs text-slate-500 line-clamp-2">{wf.description}</p>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        wf.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {wf.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Steps Chain Preview */}
                <div className="my-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Approval Chain ({wf.steps.length} Steps)</span>
                    <span className="text-slate-400 font-mono">v{wf.version}</span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {wf.steps.map((step, idx) => (
                      <React.Fragment key={step.id || idx}>
                        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs whitespace-nowrap">
                          <span className="w-4 h-4 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-full flex items-center justify-center">
                            {step.stepNumber}
                          </span>
                          <span className="font-semibold text-slate-800">{step.stepName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({step.approverRole || step.approverType})
                          </span>
                        </div>
                        {idx < wf.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Applicability summary */}
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Applicability Rules: <strong className="text-slate-900">{wf.rules.length} configured</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Effective: {wf.effectiveFrom} {wf.effectiveTo ? `to ${wf.effectiveTo}` : '(Ongoing)'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                <button
                  onClick={() => setSelectedWorkflow(wf)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Manage Applicability ({wf.rules.length})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(wf)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingWorkflow ? `Edit Workflow: ${editingWorkflow.name}` : 'New Leave Approval Workflow'}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Define the multi-level approver chain and execution rules for leave requests.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWorkflow} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Workflow Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Academic Staff Leave Workflow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Workflow Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WF-TEACHING"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding who this workflow is intended for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-xs font-semibold text-slate-800">Set as Institutional Default Workflow</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="text-xs font-semibold text-slate-800">Active</span>
                </label>
              </div>

              {/* Steps Builder */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ordered Approval Steps</h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-1 flex items-center justify-center font-bold font-mono text-xs text-indigo-600">
                        #{step.stepNumber}
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Step Name (e.g. Principal)"
                          value={step.stepName}
                          onChange={(e) => handleStepChange(index, 'stepName', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={step.approverType}
                          onChange={(e) => handleStepChange(index, 'approverType', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="ROLE">By Role</option>
                          <option value="DEPARTMENT_HEAD">Department Head</option>
                          <option value="DESIGNATION">By Designation</option>
                          <option value="USER">Specific User</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        {step.approverType === 'ROLE' ? (
                          <select
                            value={step.approverRole || 'HR_MANAGER'}
                            onChange={(e) => handleStepChange(index, 'approverRole', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                          >
                            <option value="PRINCIPAL">PRINCIPAL</option>
                            <option value="HR_MANAGER">HR_MANAGER</option>
                            <option value="ACCOUNTS_MANAGER">ACCOUNTS_MANAGER</option>
                            <option value="DEPARTMENT_HEAD">DEPARTMENT_HEAD</option>
                            <option value="DIRECTOR">DIRECTOR</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : step.approverType === 'DESIGNATION' ? (
                          <select
                            value={step.approverDesignationId || ''}
                            onChange={(e) => handleStepChange(index, 'approverDesignationId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Choose Designation --</option>
                            {designations.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="User ID..."
                            value={step.approverUserId || ''}
                            onChange={(e) => handleStepChange(index, 'approverUserId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        )}
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingWorkflow ? 'Save Changes' : 'Create Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules / Applicability Management Drawer */}
      {selectedWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Applicability Rules: {selectedWorkflow.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure departments, designations, or employee groups assigned to this workflow.
                </p>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            {/* List existing rules */}
            <div className="space-y-2 mb-6">
              {selectedWorkflow.rules.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No specific applicability rules configured. This workflow will apply via institutional fallback if default.
                </div>
              ) : (
                selectedWorkflow.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-md mr-2">
                        {rule.assignmentType}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {rule.departmentName || rule.designationName || rule.employeeName || rule.leaveTypeName || 'General Rule'}
                      </span>
                      {rule.isOverride && (
                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                          OVERRIDE
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Rule Form */}
            <form onSubmit={handleAddRule} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Add Applicability Rule</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignment Type</label>
                  <select
                    value={ruleAssignmentType}
                    onChange={(e) => {
                      setRuleAssignmentType(e.target.value);
                      setRuleTargetId('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="DEPARTMENT">Department</option>
                    <option value="DESIGNATION">Designation</option>
                    <option value="LEAVE_TYPE">Leave Type Specific</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target</label>
                  {ruleAssignmentType === 'DEPARTMENT' ? (
                    <select
                      required
                      value={ruleTargetId}
                      onChange={(e) => setRuleTargetId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : ruleAssignmentType === 'DESIGNATION' ? (
                    <select
                      required
                      value={ruleTargetId}
                      onChange={(e) => setRuleTargetId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="">-- Select Designation --</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={ruleTargetId}
                      onChange={(e) => setRuleTargetId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="">-- Select Leave Type --</option>
                      {leaveTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleIsOverride}
                    onChange={(e) => setRuleIsOverride(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded-sm"
                  />
                  <span>Is High-Priority Override</span>
                </label>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
