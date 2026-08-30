'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ClassItem {
  id: string;
  name: string;
  code: string;
  classCategoryId: string | null;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
  classCategory?: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count?: {
    sections: number;
    classSubjects: number;
  };
}

export function ClassesView() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    classCategoryId: '',
    sortOrder: 0,
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/config/class-categories?isActive=true');
      const json = await res.json();
      if (json.success) {
        setCategories(
          json.data.map((c: any) => ({
            value: c.id,
            label: c.name,
          }))
        );
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('classCategoryId', categoryFilter);
      if (activeFilter) params.set('isActive', activeFilter);

      const res = await fetch(`/api/admin/config/classes?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setClasses(json.data);
      } else {
        error('Failed to load classes', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, activeFilter, error]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      code: '',
      classCategoryId: '',
      sortOrder: (classes.length + 1) * 10,
      description: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setEditingClass(c);
    setFormData({
      name: c.name,
      code: c.code,
      classCategoryId: c.classCategoryId || '',
      sortOrder: c.sortOrder,
      description: c.description || '',
      isActive: c.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Class name is required';
    if (!formData.code.trim()) errs.code = 'Class code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = editingClass
        ? `/api/admin/config/classes/${editingClass.id}`
        : '/api/admin/config/classes';
      const method = editingClass ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        classCategoryId: formData.classCategoryId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        success(
          editingClass ? 'Class Updated' : 'Class Created',
          `Class "${json.data.name}" saved successfully.`
        );
        setIsModalOpen(false);
        fetchClasses();
      } else {
        error('Save Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (c: ClassItem) => {
    try {
      const res = await fetch(`/api/admin/config/classes/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success('Status Updated', `Class is now ${!c.isActive ? 'Active' : 'Inactive'}.`);
        fetchClasses();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const columns: Column<ClassItem>[] = [
    {
      header: 'Class Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
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
      header: 'Category',
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {row.classCategory?.name || <span className="text-slate-400 italic">None</span>}
        </span>
      ),
    },
    {
      header: 'Sections',
      cell: (row) => (
        <span className="font-semibold text-slate-700">
          {row._count?.sections || 0} sections
        </span>
      ),
    },
    {
      header: 'Mapped Subjects',
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {row._count?.classSubjects || 0} subjects
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
            aria-label="Edit Class"
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
        title="School Classes & Grades"
        subtitle="Manage academic grades, grade levels, and their category groupings."
        columns={columns}
        data={classes}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search classes by name or code..."
        onAddNew={handleOpenAdd}
        addNewLabel="Add School Class"
        filterComponent={
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
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
        title={editingClass ? `Edit Class: ${editingClass.name}` : 'Add School Class'}
        subtitle="Define class name, unique code, category grouping, and sort order."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. Grade 9 / Class 9"
            />
            <Input
              label="Class Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              placeholder="e.g. CLS-09"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Class Category"
              value={formData.classCategoryId}
              onChange={(e) => setFormData({ ...formData, classCategoryId: e.target.value })}
              options={[{ value: '', label: '-- None (No Category) --' }, ...categories]}
              optional
            />
            <Input
              label="Sort Order"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              placeholder="10"
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            optional
            placeholder="e.g. Matric Science / Humanities Section Group"
          />

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Active Class</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
