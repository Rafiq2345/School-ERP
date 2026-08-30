'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ClassCategoryItem {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
  _count?: {
    classes: number;
  };
}

export function ClassCategoriesView() {
  const [categories, setCategories] = useState<ClassCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClassCategoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sortOrder: 0,
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeFilter) params.set('isActive', activeFilter);

      const res = await fetch(`/api/admin/config/class-categories?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      } else {
        error('Failed to load categories', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, activeFilter, error]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      sortOrder: (categories.length + 1) * 10,
      description: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ClassCategoryItem) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      sortOrder: category.sortOrder,
      description: category.description || '',
      isActive: category.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Category name is required';
    if (!formData.code.trim()) errs.code = 'Category code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/admin/config/class-categories/${editingCategory.id}`
        : '/api/admin/config/class-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        success(
          editingCategory ? 'Category Updated' : 'Category Created',
          `Class Category "${json.data.name}" saved successfully.`
        );
        setIsModalOpen(false);
        fetchCategories();
      } else {
        error('Save Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (category: ClassCategoryItem) => {
    try {
      const res = await fetch(`/api/admin/config/class-categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success('Status Updated', `Category is now ${!category.isActive ? 'Active' : 'Inactive'}.`);
        fetchCategories();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const columns: Column<ClassCategoryItem>[] = [
    {
      header: 'Category Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500 shrink-0" />
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
      header: 'Sort Order',
      accessorKey: 'sortOrder',
      cell: (row) => <span className="font-semibold text-slate-600">{row.sortOrder}</span>,
    },
    {
      header: 'Classes Enrolled',
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {row._count?.classes || 0} classes
        </span>
      ),
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
            aria-label="Edit Category"
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
        title="Class Categories"
        subtitle="Manage optional institutional groupings such as Pre-Primary, Primary, Middle, Secondary, and Higher Secondary."
        columns={columns}
        data={categories}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories by name or code..."
        onAddNew={handleOpenAdd}
        addNewLabel="Add Class Category"
        filterComponent={
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Class Category'}
        subtitle="Define class category name, code, and display sequence."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. Secondary"
            />
            <Input
              label="Category Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              placeholder="e.g. SECONDARY"
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
                <span>Active Category</span>
              </label>
            </div>
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            optional
            placeholder="e.g. Covers Grade 9 and Grade 10 Matric / O-Levels"
          />
        </form>
      </Modal>
    </div>
  );
}
