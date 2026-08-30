'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Key,
  Users,
  Search,
  Lock,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
}

interface PermissionGroup {
  moduleCode: string;
  moduleNameEn: string;
  moduleNameUr: string;
  category: string;
  isBaseModule: boolean;
  isEnabled: boolean;
  permissions: {
    id: string;
    action: string;
    code: string;
    description: string | null;
  }[];
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  VIEW: { label: 'View', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  CREATE: { label: 'Create', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  EDIT: { label: 'Edit', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  DELETE: { label: 'Delete', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  APPROVE: { label: 'Approve', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  PRINT: { label: 'Print', color: 'text-slate-700 bg-slate-100 border-slate-200' },
  EXPORT: { label: 'Export', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  PUBLISH: { label: 'Publish', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  UNPUBLISH: { label: 'Unpublish', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  REVERSE: { label: 'Reverse', color: 'text-red-700 bg-red-50 border-red-200' },
};

export function RolesPermissionsView() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Role Create / Edit State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '' });
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Permission Matrix State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const { success, error } = useToast();

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const json = await res.json();
      if (json.success) {
        setRoles(json.data);
      } else {
        error('Failed to load roles', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', code: '', description: '' });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleItem) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      error('Validation Error', 'Role name is required.');
      return;
    }

    setIsSubmittingRole(true);
    try {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : '/api/admin/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      });
      const json = await res.json();

      if (json.success) {
        success('Role Saved', `Role "${roleForm.name}" has been ${editingRole ? 'updated' : 'created'} successfully.`);
        setIsRoleModalOpen(false);
        fetchRoles();
      } else {
        error('Action Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to save role.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleOpenPermissionMatrix = async (role: RoleItem) => {
    setSelectedRole(role);
    setIsPermissionModalOpen(true);
    setIsLoadingPermissions(true);
    setPermissionSearch('');
    setSelectedCategory('ALL');

    try {
      const [permRes, roleDetailRes] = await Promise.all([
        fetch('/api/admin/permissions'),
        fetch(`/api/admin/roles/${role.id}`),
      ]);

      const [permJson, roleDetailJson] = await Promise.all([
        permRes.json(),
        roleDetailRes.json(),
      ]);

      if (permJson.success) {
        setPermissionGroups(permJson.data);
      }
      if (roleDetailJson.success) {
        setSelectedPermissionIds(new Set(roleDetailJson.data.assignedPermissionIds));
      }
    } catch {
      error('Load Error', 'Failed to load permission matrix.');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const handleToggleModuleAll = (group: PermissionGroup, selectAll: boolean) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      group.permissions.forEach((p) => {
        if (selectAll) {
          next.add(p.id);
        } else {
          next.delete(p.id);
        }
      });
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissionIds),
        }),
      });
      const json = await res.json();

      if (json.success) {
        success('Permissions Updated', `Assigned ${selectedPermissionIds.size} permissions to "${selectedRole.name}".`);
        setIsPermissionModalOpen(false);
        fetchRoles();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to save role permissions.');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }, [roles, searchQuery]);

  const filteredPermissionGroups = useMemo(() => {
    return permissionGroups
      .filter((g) => g.isEnabled)
      .filter((g) => {
        if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
          return false;
        }
        if (!permissionSearch.trim()) return true;
        const q = permissionSearch.toLowerCase().trim();
        return (
          g.moduleNameEn.toLowerCase().includes(q) ||
          g.moduleCode.toLowerCase().includes(q) ||
          g.permissions.some((p) => p.code.toLowerCase().includes(q))
        );
      });
  }, [permissionGroups, selectedCategory, permissionSearch]);

  const categories = ['ALL', 'CORE', 'ACADEMIC', 'ADMINISTRATION', 'FINANCE', 'RESOURCES', 'SYSTEM'];

  const columns: Column<RoleItem>[] = [
    {
      header: 'Role Name & Identifier',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            row.isSystem ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {row.isSystem ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{row.name}</span>
              {row.isSystem && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  Protected
                </span>
              )}
            </div>
            <p className="text-2xs text-slate-500 font-mono mt-0.5">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      cell: (row) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-xs">
          {row.description || <span className="text-slate-400 italic">No description provided</span>}
        </span>
      ),
    },
    {
      header: 'Assigned Users',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.userCount}</span>
        </div>
      ),
    },
    {
      header: 'Active Permissions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-xs text-slate-800">{row.permissionCount} capabilities</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenPermissionMatrix(row)}
            leftIcon={<Key className="w-3.5 h-3.5 text-blue-600" />}
            className="text-xs font-semibold"
          >
            Manage Permissions
          </Button>
          {!row.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEditModal(row)}
              className="text-slate-600 hover:text-blue-600"
              title="Edit Role Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Roles & 10-Action Permissions Matrix</h2>
            <p className="text-xs text-slate-500">
              Define user roles and configure capability-based access across all ERP modules.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-8 pe-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create New Role
          </Button>
        </div>
      </div>

      {/* Roles DataTable */}
      <DataTable
        title="Configured User Roles"
        subtitle="Roles define WHAT capabilities a user can perform. Organizational Scope defines WHERE they can perform it."
        columns={columns}
        data={filteredRoles}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No roles found"
        emptySubtitle="Create a new role using the button above to assign capabilities."
      />

      {/* Create / Edit Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? 'Edit Role Details' : 'Create New System Role'}
        subtitle="Define role name and description. Permissions can be assigned after creation."
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveRole} isLoading={isSubmittingRole}>
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <Input
            label="Role Name"
            placeholder="e.g. Senior Accountant"
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            required
          />

          {!editingRole && (
            <Input
              label="Role Code (Optional)"
              placeholder="e.g. SENIOR_ACCOUNTANT (auto-generated if blank)"
              value={roleForm.code}
              onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the duties and intended responsibilities of this role..."
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </form>
      </Modal>

      {/* Permission Matrix Modal */}
      <Modal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        title={`Manage Permissions: ${selectedRole?.name || ''}`}
        subtitle="Toggle capability actions grouped by ERP module. Disabled modules are automatically excluded."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Key className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">{selectedPermissionIds.size} capabilities selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPermissionModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSavePermissions} isLoading={isSavingPermissions}>
                Save Permissions
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Permission Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter capabilities..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-8 pe-3 py-1 text-2xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Permission Matrix Content */}
          {isLoadingPermissions ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading module permissions...</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-1">
              {filteredPermissionGroups.map((group) => {
                const groupPermIds = group.permissions.map((p) => p.id);
                const allSelected = groupPermIds.length > 0 && groupPermIds.every((id) => selectedPermissionIds.has(id));

                return (
                  <div
                    key={group.moduleCode}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{group.moduleNameEn}</span>
                            <span className="text-2xs text-slate-400 font-mono">({group.moduleCode})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleModuleAll(group, !allSelected)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-semibold text-blue-700 hover:bg-blue-100/60 transition-colors cursor-pointer"
                        >
                          {allSelected ? (
                            <>
                              <CheckSquare className="w-3 h-3 text-blue-600" />
                              <span>Clear All</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3 h-3 text-slate-400" />
                              <span>Select All</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Pill Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermissionIds.has(perm.id);
                        const styleMeta = ACTION_LABELS[perm.action] || {
                          label: perm.action,
                          color: 'text-slate-700 bg-slate-100 border-slate-200',
                        };

                        return (
                          <label
                            key={perm.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                              isChecked
                                ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-200'
                                : 'bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-2xs font-bold text-slate-800 truncate leading-tight">
                                {styleMeta.label}
                              </p>
                              <p className="text-3xs text-slate-400 font-mono truncate">{perm.code}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
