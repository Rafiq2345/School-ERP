'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, ArrowLeft, CheckCircle, ShieldAlert, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function BulkStudentOperationsView() {
  const { success, error } = useToast();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; classId: string }[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [clsRes, secRes] = await Promise.all([
          fetch('/api/admin/config/classes').then((r) => r.json()),
          fetch('/api/admin/config/sections').then((r) => r.json()),
        ]);
        if (clsRes.success) setClasses(clsRes.data);
        if (secRes.success) setSections(secRes.data);
      } catch {
        // Non-blocking
      }
    }
    loadData();
  }, []);

  const handleFetchStudents = async () => {
    if (!selectedClass) return;
    try {
      const params = new URLSearchParams();
      params.set('classId', selectedClass);
      if (selectedSection) params.set('sectionId', selectedSection);
      params.set('pageSize', '100');

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStudents(json.data);
        setSelectedStudentIds([]);
      }
    } catch {
      error('Fetch Error', 'Failed to fetch student list.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(students.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAssignSection = async () => {
    if (!targetSectionId) {
      error('Target Required', 'Please select a destination section.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      error('Selection Required', 'Please select at least one student.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_SECTION',
          studentIds: selectedStudentIds,
          targetId: targetSectionId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success('Bulk Operation Complete', `Reassigned ${json.data.count} students to new section.`);
        handleFetchStudents();
      } else {
        error('Operation Failed', json.error?.message || 'Bulk update failed.');
      }
    } catch {
      error('Network Error', 'Could not execute bulk update.');
    } finally {
      setIsProcessing(false);
    }
  };

  const classSections = selectedClass
    ? sections.filter((s) => s.classId === selectedClass)
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 me-1" />
              Back to Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">Bulk Student Operations Workspace</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Safely batch reassign class sections and student categories with complete audit trail generation.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Source Class *</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Section (Optional)</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="">All Sections</option>
              {classSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="primary" size="md" onClick={handleFetchStudents} className="w-full">
              Load Students ({students.length})
            </Button>
          </div>
        </div>

        {students.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.length === students.length && students.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs font-bold text-slate-800">
                  {selectedStudentIds.length} of {students.length} Students Selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="">Select Destination Section</option>
                  {classSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteBulkAssignSection}
                  isLoading={isProcessing}
                  disabled={selectedStudentIds.length === 0 || !targetSectionId}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 me-1.5" />
                  Reassign Section
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {students.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleToggleStudent(s.id)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-all ${
                    selectedStudentIds.includes(s.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => {}}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900">{s.nameEn}</span>
                      <span className="text-slate-400 ms-2 font-mono font-bold text-3xs">{s.admissionNo}</span>
                    </div>
                  </div>

                  <span className="text-2xs font-semibold text-slate-600">
                    Current: {s.currentEnrollment?.sectionName || 'Unassigned'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
