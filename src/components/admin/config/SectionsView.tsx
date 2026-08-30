'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Edit2, CheckCircle, XCircle, Users } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface SectionItem {
  id: string;
  classId: string;
  name: string;
  code: string;
  capacity: number | null;
  sortOrder: number;
  isActive: boolean;
  schoolClass?: {
    id: string;
    name: string;
    code: string;
  };
}

export function SectionsView() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [formData, setFormData] = useState({
    classId: '',
    name: '',
    code: '',
    capacity: '' as number | string,
    sortOrder: 0,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/admin/config/classes?isActive=true');
      const json = await res.json();
      if (json.success) {
        setClasses(
          json.data.map((c: any) => ({
            value: c.id,
            label: `${c.name} (${c.code})`,
          }))
        );
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('classId', classFilter);
      if (activeFilter) params.set('isActive', activeFilter);

      const res = await fetch(`/api/admin/config/sections?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSections(json.data);
      } else {
        error('Failed to load sections', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, classFilter, activeFilter, error]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleOpenAdd = () => {
    setEditingSection(null);
    setFormData({
      classId: classes[0]?.value || '',
      name: '',
      code: '',
      capacity: 35,
      sortOrder: (sections.length + 1) * 10,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec: SectionItem) => {
    setEditingSection(sec);
    setFormData({
      classId: sec.classId,
      name: sec.name,
      code: sec.code,
      capacity: sec.capacity ?? '',
      sortOrder: sec.sortOrder,
      isActive: sec.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.classId) errs.classId = 'Please select a parent class';
    if (!formData.name.trim()) errs.name = 'Section name is required';
    if (!formData.code.trim()) errs.code = 'Section code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = editingSection
        ? `/api/admin/config/sections/${editingSection.id}`
        : '/api/admin/config/sections';
      const method = editingSection ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        capacity: formData.capacity !== '' ? Number(formData.capacity) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        success(
          editingSection ? 'Section Updated' : 'Section Created',
          `Section "${json.data.name}" saved successfully.`
        );
        setIsModalOpen(false);
        fetchSections();
      } else {
        error('Save Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sec: SectionItem) => {
    try {
      const res = await fetch(`/api/admin/config/sections/${sec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sec.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success('Status Updated', `Section is now ${!sec.isActive ? 'Active' : 'Inactive'}.`);
        fetchSections();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const columns: Column<SectionItem>[] = [
    {
      header: 'Section Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (row) => <span className="font-mono font-medium text-slate-700">{row.code}</span>,
    },
    {
      header: 'Parent Class',
      cell: (row) => (
        <span className="font-semibold text-blue-700">
          {row.schoolClass?.name || 'Class'}
        </span>
      ),
    },
    {
      header: 'Max Student Capacity',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {row.capacity ? `${row.capacity} students` : <span className="text-slate-400 italic">Unlimited</span>}
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
            aria-label="Edit Section"
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
        title="Class Sections"
        subtitle="Manage class sections, student capacity limits, and section divisions."
        columns={columns}
        data={sections}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sections by name or code..."
        onAddNew={handleOpenAdd}
        addNewLabel="Add Section"
        filterComponent={
          <div className="flex items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.value} value={cls.value}>
                  {cls.label}
                </option>
              ))}
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
        title={editingSection ? `Edit Section: ${editingSection.name}` : 'Add Class Section'}
        subtitle="Assign to a class, specify section code, name, and student capacity."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingSection ? 'Save Changes' : 'Create Section'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Parent School Class"
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            options={classes}
            error={formErrors.classId}
            placeholder="-- Select Class --"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Section Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. Section A / Rose"
            />
            <Input
              label="Section Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              placeholder="e.g. SEC-A"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Student Capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              optional
              placeholder="35"
            />
            <Input
              label="Sort Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              placeholder="10"
            />
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Active Section</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
