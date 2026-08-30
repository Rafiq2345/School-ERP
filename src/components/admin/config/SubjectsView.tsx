'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  shortName: string | null;
  subjectType: 'THEORY' | 'PRACTICAL' | 'BOTH' | 'ACTIVITY';
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: {
    classSubjects: number;
  };
}

export function SubjectsView() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shortName: '',
    subjectType: 'THEORY' as 'THEORY' | 'PRACTICAL' | 'BOTH' | 'ACTIVITY',
    description: '',
    sortOrder: 0,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('subjectType', typeFilter);
      if (activeFilter) params.set('isActive', activeFilter);

      const res = await fetch(`/api/admin/config/subjects?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSubjects(json.data);
      } else {
        error('Failed to load subjects', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, activeFilter, error]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      shortName: '',
      subjectType: 'THEORY',
      description: '',
      sortOrder: (subjects.length + 1) * 10,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      shortName: sub.shortName || '',
      subjectType: sub.subjectType,
      description: sub.description || '',
      sortOrder: sub.sortOrder,
      isActive: sub.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Subject name is required';
    if (!formData.code.trim()) errs.code = 'Subject code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = editingSubject
        ? `/api/admin/config/subjects/${editingSubject.id}`
        : '/api/admin/config/subjects';
      const method = editingSubject ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        shortName: formData.shortName || null,
        description: formData.description || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        success(
          editingSubject ? 'Subject Updated' : 'Subject Created',
          `Subject "${json.data.name}" saved successfully.`
        );
        setIsModalOpen(false);
        fetchSubjects();
      } else {
        error('Save Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sub: SubjectItem) => {
    try {
      const res = await fetch(`/api/admin/config/subjects/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sub.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success('Status Updated', `Subject is now ${!sub.isActive ? 'Active' : 'Inactive'}.`);
        fetchSubjects();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const columns: Column<SubjectItem>[] = [
    {
      header: 'Subject Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">{row.name}</span>
            {row.shortName && <span className="text-2xs text-slate-400 ml-1.5 font-normal">({row.shortName})</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (row) => <span className="font-mono font-medium text-slate-700">{row.code}</span>,
    },
    {
      header: 'Subject Type',
      cell: (row) => <StatusBadge status={row.subjectType} />,
    },
    {
      header: 'Classes Taught',
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {row._count?.classSubjects || 0} classes
        </span>
      ),
    },
    {
      header: 'Sort Order',
      accessorKey: 'sortOrder',
      cell: (row) => <span className="font-semibold text-slate-600">{row.sortOrder}</span>,
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.isActive} />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            aria-label="Edit Subject"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            className={row.isActive ? 'text-amber-600' : 'text-emerald-600'}
            aria-label="Toggle Status"
          >
            {row.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Academic Subjects"
        subtitle="Manage master academic subjects, curriculum codes, and classification types (Theory, Practical, Both, Activity)."
        columns={columns}
        data={subjects}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subjects by name, code or short name..."
        onAddNew={handleOpenAdd}
        addNewLabel="Add Academic Subject"
        filterComponent={
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Types</option>
              <option value="THEORY">Theory</option>
              <option value="PRACTICAL">Practical</option>
              <option value="BOTH">Both (Theory & Practical)</option>
              <option value="ACTIVITY">Activity / Co-curricular</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add Academic Subject'}
        subtitle="Define subject name, unique code, subject classification type, and sequence."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. Mathematics"
            />
            <Input
              label="Subject Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              placeholder="e.g. SUB-MATH"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Short / Abbreviated Name"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
              optional
              placeholder="e.g. Math"
            />
            <Select
              label="Subject Type"
              value={formData.subjectType}
              onChange={(e) => setFormData({ ...formData, subjectType: e.target.value as any })}
              options={[
                { value: 'THEORY', label: 'Theory Only' },
                { value: 'PRACTICAL', label: 'Practical Only' },
                { value: 'BOTH', label: 'Both (Theory & Practical)' },
                { value: 'ACTIVITY', label: 'Activity / Co-Curricular' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Sort Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              placeholder="10"
            />
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Active Subject</span>
              </label>
            </div>
          </div>

          <Input
            label="Description / Curriculum Details"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            optional
            placeholder="e.g. Core STEM foundation curriculum"
          />
        </form>
      </Modal>
    </div>
  );
}
