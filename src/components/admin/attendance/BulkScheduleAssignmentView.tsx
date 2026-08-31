'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Check,
  Building,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function BulkScheduleAssignmentView() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Selected Form Values
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<
    'DEPARTMENT' | 'DESIGNATION' | 'EMPLOYMENT_TYPE' | 'EMPLOYEE' | 'ALL'
  >('DEPARTMENT');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedDesigId, setSelectedDesigId] = useState<string>('');
  const [selectedEmpTypeId, setSelectedEmpTypeId] = useState<string>('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Preview State
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  const { success, error } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [schedRes, deptRes, desigRes, empRes] = await Promise.all([
          fetch('/api/admin/attendance/employees/schedules').then((r) => r.json()),
          fetch('/api/admin/config/departments').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/admin/config/designations').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/admin/attendance/employees/roster').then((r) => r.json()).catch(() => ({ data: { roster: [] } })),
        ]);

        if (schedRes.data && schedRes.data.length > 0) {
          setSchedules(schedRes.data);
          setSelectedScheduleId(schedRes.data[0].id);
        }
        if (deptRes.data) setDepartments(deptRes.data);
        if (desigRes.data) setDesignations(desigRes.data);
        if (empRes.data?.roster) {
          setEmployees(empRes.data.roster.map((r: any) => r.employee));
        }
      } catch {}
    }
    loadData();
  }, []);

  const handlePreview = async () => {
    if (!selectedScheduleId) {
      error('Schedule Required', 'Please select a target Work Schedule.');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const payload: any = {
        scheduleId: selectedScheduleId,
        assignmentType: assignmentType === 'ALL' ? 'EMPLOYEE' : assignmentType,
        departmentId: assignmentType === 'DEPARTMENT' ? selectedDeptId : undefined,
        designationId: assignmentType === 'DESIGNATION' ? selectedDesigId : undefined,
        employmentTypeId: assignmentType === 'EMPLOYMENT_TYPE' ? selectedEmpTypeId : undefined,
        employeeIds:
          assignmentType === 'EMPLOYEE'
            ? selectedEmpIds
            : assignmentType === 'ALL'
            ? employees.map((e) => e.id)
            : undefined,
        effectiveDate: effectiveFrom,
      };

      const res = await fetch('/api/admin/attendance/employees/schedules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setPreviewData(json.data);
      } else {
        error('Preview Error', json.error?.message || 'Failed to generate preview.');
      }
    } catch {
      error('Network Error', 'Failed to communicate with preview engine.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedScheduleId || !previewData || previewData.totalAffected === 0) {
      error('Cannot Assign', 'No affected employees to assign.');
      return;
    }

    setIsAssigning(true);
    try {
      const payload: any = {
        scheduleId: selectedScheduleId,
        assignmentType: assignmentType === 'ALL' ? 'EMPLOYEE' : assignmentType,
        departmentId: assignmentType === 'DEPARTMENT' ? selectedDeptId : undefined,
        designationId: assignmentType === 'DESIGNATION' ? selectedDesigId : undefined,
        employmentTypeId: assignmentType === 'EMPLOYMENT_TYPE' ? selectedEmpTypeId : undefined,
        employeeIds:
          assignmentType === 'EMPLOYEE'
            ? selectedEmpIds
            : assignmentType === 'ALL'
            ? employees.map((e) => e.id)
            : undefined,
        isOverride,
        effectiveFrom,
        effectiveTo: effectiveTo ? effectiveTo : null,
        reason: reason.trim() || 'Bulk Work Schedule Assignment',
      };

      const res = await fetch('/api/admin/attendance/employees/schedules/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        success(
          'Schedule Assigned',
          `Successfully assigned schedule to ${json.data.affectedEmployeesCount} employees.`
        );
        setPreviewData(null);
        setReason('');
      } else {
        error('Assignment Failed', json.error?.message || 'Could not assign schedule.');
      }
    } catch {
      error('Network Error', 'Failed to save schedule assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Bulk Work Schedule Assignment</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign complete Work Schedules to Departments, Designations, Employment Types, or specific staff
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/attendance/employees/schedules"
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            &larr; Back to Schedules
          </Link>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Schedule Selector */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Select Target Work Schedule <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white"
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Scope */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Assignment Scope <span className="text-rose-500">*</span>
            </label>
            <select
              value={assignmentType}
              onChange={(e: any) => setAssignmentType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white"
            >
              <option value="DEPARTMENT">By Department</option>
              <option value="DESIGNATION">By Designation</option>
              <option value="EMPLOYMENT_TYPE">By Employment Type</option>
              <option value="EMPLOYEE">Selected Individual Employees</option>
              <option value="ALL">All Active Employees</option>
            </select>
          </div>

          {/* Target Specific Filter */}
          <div>
            {assignmentType === 'DEPARTMENT' && (
              <>
                <label className="font-semibold text-slate-700 block mb-1.5">Target Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {assignmentType === 'DESIGNATION' && (
              <>
                <label className="font-semibold text-slate-700 block mb-1.5">Target Designation</label>
                <select
                  value={selectedDesigId}
                  onChange={(e) => setSelectedDesigId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select designation...</option>
                  {designations.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {assignmentType === 'EMPLOYMENT_TYPE' && (
              <>
                <label className="font-semibold text-slate-700 block mb-1.5">Target Employment Type</label>
                <select
                  value={selectedEmpTypeId}
                  onChange={(e) => setSelectedEmpTypeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Select employment type...</option>
                  {employmentTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {assignmentType === 'EMPLOYEE' && (
              <>
                <label className="font-semibold text-slate-700 block mb-1.5">Select Employees</label>
                <select
                  multiple
                  value={selectedEmpIds}
                  onChange={(e) =>
                    setSelectedEmpIds(Array.from(e.target.selectedOptions, (option) => option.value))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl h-20"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstNameEn} ({emp.employeeNo})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Effective Dates and Reason */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-4 border-t border-slate-100">
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Effective From Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Effective To Date (Optional)</label>
            <input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Assignment Reason / Note</label>
            <input
              type="text"
              placeholder="e.g. Academic faculty duty schedule realignment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Individual Override Flag */}
        {assignmentType === 'EMPLOYEE' && (
          <label className="flex items-center gap-2 text-xs text-indigo-900 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isOverride}
              onChange={(e) => setIsOverride(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span className="font-semibold">
              Mark as Individual Employee Custom Exception / Override (Takes highest priority over department/default schedules)
            </span>
          </label>
        )}

        {/* Preview Trigger Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-3xs text-slate-400">
            Click Preview to verify affected staff list before saving
          </span>
          <button
            onClick={handlePreview}
            disabled={isPreviewLoading}
            className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {isPreviewLoading ? 'Calculating Preview...' : 'Preview Affected Staff'}
          </button>
        </div>
      </div>

      {/* PREVIEW RESULTS TABLE */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Preview: {previewData.totalAffected} Employees Affected
              </h3>
              <p className="text-xs text-slate-500">Review current schedule vs proposed new assignment</p>
            </div>

            <button
              onClick={handleConfirmAssignment}
              disabled={isAssigning || previewData.totalAffected === 0}
              className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isAssigning ? 'Applying Schedule...' : 'Confirm & Apply Schedule Assignment'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-3xs font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Employee ID &amp; Name</th>
                  <th className="py-3 px-4">Department &amp; Designation</th>
                  <th className="py-3 px-4">Current Schedule</th>
                  <th className="py-3 px-4 text-emerald-700 font-bold">New Proposed Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.employees.map((emp: any) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {emp.name}
                      <span className="text-3xs font-mono text-slate-400 ml-1.5 font-normal">({emp.employeeNo})</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {emp.departmentName} &bull; <span className="text-slate-500">{emp.designationName}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">
                      {emp.currentScheduleName}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                      {schedules.find((s) => s.id === selectedScheduleId)?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
