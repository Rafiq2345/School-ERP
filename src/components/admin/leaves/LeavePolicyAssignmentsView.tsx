'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { LeaveManagementNav } from './LeaveManagementNav';
import {
  BulkAssignLeavePolicyDto,
  LeaveAssignmentPreviewItem,
  LeavePolicyAssignmentDto,
  LeavePolicyDto,
} from '@/lib/types/leave';

export function LeavePolicyAssignmentsView() {
  const [assignments, setAssignments] = useState<LeavePolicyAssignmentDto[]>([]);
  const [policies, setPolicies] = useState<LeavePolicyDto[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [assignmentType, setAssignmentType] = useState<'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'EMPLOYEE'>('DEPARTMENT');
  const [targetPolicyId, setTargetPolicyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDesigId, setSelectedDesigId] = useState('');
  const [selectedEmpTypeId, setSelectedEmpTypeId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isOverride, setIsOverride] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Preview State
  const [previewItems, setPreviewItems] = useState<LeaveAssignmentPreviewItem[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignRes, policiesRes, deptsRes, desigsRes, empTypesRes, empsRes] = await Promise.all([
        fetch('/api/admin/hr/leaves/assignments'),
        fetch('/api/admin/hr/leaves/policies?status=ACTIVE'),
        fetch('/api/admin/config/departments'),
        fetch('/api/admin/config/designations'),
        fetch('/api/admin/config/employment-types'),
        fetch('/api/admin/attendance/employees/roster?date=' + new Date().toISOString().split('T')[0]),
      ]);

      const assignJson = await assignRes.json();
      const policiesJson = await policiesRes.json();
      const deptsJson = await deptsRes.json();
      const desigsJson = await desigsRes.json();
      const empTypesJson = await empTypesRes.json();
      const empsJson = await empsRes.json();

      if (assignJson.success) setAssignments(assignJson.data);
      if (policiesJson.success) {
        setPolicies(policiesJson.data);
        if (policiesJson.data.length > 0) setTargetPolicyId(policiesJson.data[0].id);
      }
      if (deptsJson.data) {
        setDepartments(deptsJson.data);
        if (deptsJson.data.length > 0) setSelectedDeptId(deptsJson.data[0].id);
      }
      if (desigsJson.data) setDesignations(desigsJson.data);
      if (empTypesJson.data) setEmploymentTypes(empTypesJson.data);
      if (empsJson.data) setEmployees(empsJson.data.employees || []);
    } catch (e) {
      console.error('Error loading assignment data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePreview = async () => {
    if (!targetPolicyId) {
      alert('Please select a target Leave Policy');
      return;
    }

    try {
      setIsPreviewing(true);
      const payload: BulkAssignLeavePolicyDto = {
        leavePolicyId: targetPolicyId,
        assignmentType,
        departmentId: assignmentType === 'DEPARTMENT' ? selectedDeptId : undefined,
        designationId: assignmentType === 'DESIGNATION' ? selectedDesigId : undefined,
        employmentTypeId: assignmentType === 'EMPLOYMENT_TYPE' ? selectedEmpTypeId : undefined,
        employeeIds: assignmentType === 'EMPLOYEE' ? selectedEmployeeIds : undefined,
        isOverride,
        effectiveFrom,
        reason,
      };

      const res = await fetch('/api/admin/hr/leaves/assignments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setPreviewItems(json.data.employees);
      } else {
        alert(json.error?.message || 'Failed to generate preview');
      }
    } catch (e: any) {
      alert(e.message || 'Error generating preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!targetPolicyId) return;

    try {
      const payload: BulkAssignLeavePolicyDto = {
        leavePolicyId: targetPolicyId,
        assignmentType,
        departmentId: assignmentType === 'DEPARTMENT' ? selectedDeptId : undefined,
        designationId: assignmentType === 'DESIGNATION' ? selectedDesigId : undefined,
        employmentTypeId: assignmentType === 'EMPLOYMENT_TYPE' ? selectedEmpTypeId : undefined,
        employeeIds: assignmentType === 'EMPLOYEE' ? selectedEmployeeIds : undefined,
        isOverride,
        effectiveFrom,
        reason,
      };

      const res = await fetch('/api/admin/hr/leaves/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.data.message);
        setPreviewItems([]);
        loadData();
      } else {
        alert(json.error?.message || 'Failed to assign policy');
      }
    } catch (e: any) {
      alert(e.message || 'Error assigning leave policy');
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
              <Users className="w-7 h-7 text-emerald-600" />
              Bulk Leave Policy Assignments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Assign leave policies to departments, designations, or specific staff with live impact preview and override controls.
            </p>
          </div>
        </div>

        {/* Assignment Wizard Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
          <h3 className="text-base font-bold text-slate-900">Step 1: Choose Target Policy & Scope</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Leave Policy *
              </label>
              <select
                value={targetPolicyId}
                onChange={(e) => setTargetPolicyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assignment Scope *
              </label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DEPARTMENT">By Department</option>
                <option value="DESIGNATION">By Designation</option>
                <option value="EMPLOYMENT_TYPE">By Employment Type</option>
                <option value="EMPLOYEE">Selected Staff (Individual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Effective From Date *
              </label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              >
              </input>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            {assignmentType === 'DEPARTMENT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {assignmentType === 'DESIGNATION' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Designation
                </label>
                <select
                  value={selectedDesigId}
                  onChange={(e) => setSelectedDesigId(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {assignmentType === 'EMPLOYMENT_TYPE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Employment Type
                </label>
                <select
                  value={selectedEmpTypeId}
                  onChange={(e) => setSelectedEmpTypeId(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {employmentTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name} ({et.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {assignmentType === 'EMPLOYEE' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Target Staff
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {employees.map((emp) => (
                    <label
                      key={emp.employeeId}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.employeeId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployeeIds([...selectedEmployeeIds, emp.employeeId]);
                          } else {
                            setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.employeeId));
                          }
                        }}
                      />
                      <span className="font-semibold text-slate-800 truncate">
                        {emp.employeeNo} - {emp.employeeName}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOverride}
                      onChange={(e) => setIsOverride(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Mark as Individual Custom Override (Precedence Level 1)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-xs"
            >
              {isPreviewing ? 'Analyzing...' : 'Preview Affected Staff'}
            </button>
          </div>
        </div>

        {/* Live Preview Table */}
        {previewItems.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Step 2: Preview Impact ({previewItems.length} Staff Affected)
              </h3>
              <button
                onClick={handleApply}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-xs"
              >
                Confirm & Apply Assignment
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Current Policy</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Proposed Policy</th>
                    <th className="px-4 py-3">Override?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewItems.map((item) => (
                    <tr key={item.employeeId}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.employeeNo} - {item.employeeName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.departmentName}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700">{item.currentPolicyName}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          {item.currentPolicySource}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700">{item.proposedPolicyName}</td>
                      <td className="px-4 py-3">
                        {item.isOverride ? (
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            OVERRIDE
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Existing Active Assignments Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Active Policy Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Policy</th>
                  <th className="px-6 py-3.5">Scope</th>
                  <th className="px-6 py-3.5">Assigned Target</th>
                  <th className="px-6 py-3.5">Effective Date</th>
                  <th className="px-6 py-3.5">Override?</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No active policy assignments found.
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {a.leavePolicyName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
                          {a.assignmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {a.assignmentType === 'EMPLOYEE' && `${a.employeeNo} - ${a.employeeName}`}
                        {a.assignmentType === 'DEPARTMENT' && a.departmentName}
                        {a.assignmentType === 'DESIGNATION' && a.designationName}
                        {a.assignmentType === 'EMPLOYMENT_TYPE' && a.employmentTypeName}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{a.effectiveFrom}</td>
                      <td className="px-6 py-4">
                        {a.isOverride ? (
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Custom Override
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
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
