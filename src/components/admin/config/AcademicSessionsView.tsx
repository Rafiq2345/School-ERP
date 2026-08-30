'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Edit2, Lock, Sparkles } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface AcademicSessionItem {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'LOCKED';
  lockedAt: string | null;
  closedAt: string | null;
  _count?: {
    classSubjects: number;
    calendarEvents: number;
  };
}

export function AcademicSessionsView() {
  const [sessions, setSessions] = useState<AcademicSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSessionItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'LOCKED',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'warning' | 'danger' | 'lock';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    action: async () => {},
  });

  const { success, error } = useToast();

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/config/sessions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      } else {
        error('Failed to load sessions', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, error]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleOpenAdd = () => {
    setEditingSession(null);
    setFormData({
      name: '',
      code: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      isCurrent: false,
      status: 'DRAFT',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (session: AcademicSessionItem) => {
    if (session.status === 'LOCKED') {
      error('Session Locked', 'Locked historical sessions are immutable and cannot be edited.');
      return;
    }
    setEditingSession(session);
    setFormData({
      name: session.name,
      code: session.code,
      startDate: new Date(session.startDate).toISOString().split('T')[0],
      endDate: new Date(session.endDate).toISOString().split('T')[0],
      isCurrent: session.isCurrent,
      status: session.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Session name is required';
    if (!formData.code.trim()) errs.code = 'Session code is required';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.endDate) errs.endDate = 'End date is required';

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        errs.endDate = 'End date must be strictly after start date';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = editingSession
        ? `/api/admin/config/sessions/${editingSession.id}`
        : '/api/admin/config/sessions';
      const method = editingSession ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        success(
          editingSession ? 'Session Updated' : 'Session Created',
          `Academic session ${json.data.name} saved successfully.`
        );
        setIsModalOpen(false);
        fetchSessions();
      } else {
        error('Save Failed', json.error?.message || 'Could not save session.');
      }
    } catch {
      error('Network Error', 'Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakeCurrent = (session: AcademicSessionItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Set as Active Current Session',
      message: `Are you sure you want to set "${session.name}" as the active current session? Any previous current session will automatically become non-current.`,
      variant: 'warning',
      action: async () => {
        try {
          const res = await fetch(`/api/admin/config/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isCurrent: true, status: 'ACTIVE' }),
          });
          const json = await res.json();
          if (json.success) {
            success('Active Session Set', `"${session.name}" is now the active current session.`);
            fetchSessions();
          } else {
            error('Action Failed', json.error?.message);
          }
        } catch {
          error('Network Error', 'Failed to update session.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCloseSession = (session: AcademicSessionItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Close Academic Session',
      message: `Are you sure you want to mark "${session.name}" as CLOSED? This indicates the academic year has concluded.`,
      variant: 'warning',
      action: async () => {
        try {
          const res = await fetch(`/api/admin/config/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CLOSED', isCurrent: false }),
          });
          const json = await res.json();
          if (json.success) {
            success('Session Closed', `Academic session "${session.name}" marked as closed.`);
            fetchSessions();
          } else {
            error('Action Failed', json.error?.message);
          }
        } catch {
          error('Network Error', 'Failed to update session.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLockSession = (session: AcademicSessionItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'LOCK Historical Academic Session',
      message: `CRITICAL ACTION: Locking session "${session.name}" will make all its records and assignments permanently immutable. This action cannot be reversed. Are you sure you want to lock this session?`,
      variant: 'lock',
      action: async () => {
        try {
          const res = await fetch(`/api/admin/config/sessions/${session.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'LOCKED', isCurrent: false }),
          });
          const json = await res.json();
          if (json.success) {
            success('Session Locked', `Academic session "${session.name}" is now permanently locked.`);
            fetchSessions();
          } else {
            error('Action Failed', json.error?.message);
          }
        } catch {
          error('Network Error', 'Failed to lock session.');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const columns: Column<AcademicSessionItem>[] = [
    {
      header: 'Session Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">{row.name}</span>
            {row.isCurrent && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                <Sparkles className="w-2.5 h-2.5" /> CURRENT
              </span>
            )}
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
      header: 'Duration',
      cell: (row) => (
        <span className="text-slate-600">
          {new Date(row.startDate).toLocaleDateString()} — {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Curriculum Subjects',
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {row._count?.classSubjects || 0} mapped
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {!row.isCurrent && row.status !== 'LOCKED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMakeCurrent(row)}
              className="text-2xs"
            >
              Set Current
            </Button>
          )}

          {row.status !== 'LOCKED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(row)}
              aria-label="Edit Session"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCloseSession(row)}
              className="text-amber-600 hover:text-amber-800"
              aria-label="Close Session"
            >
              Close
            </Button>
          )}

          {row.status === 'CLOSED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLockSession(row)}
              className="text-purple-600 hover:text-purple-800"
              aria-label="Lock Session"
            >
              <Lock className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status === 'LOCKED' && (
            <span className="inline-flex items-center gap-1 text-2xs text-purple-600 font-semibold px-2 py-1 bg-purple-50 rounded-lg">
              <Lock className="w-3 h-3" /> Historical
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Academic Sessions & Years"
        subtitle="Manage academic calendar periods, active enrollment years, and historical session archives."
        columns={columns}
        data={sessions}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sessions by name or code..."
        onAddNew={handleOpenAdd}
        addNewLabel="Add Academic Session"
        filterComponent={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
            <option value="LOCKED">Locked</option>
          </select>
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSession ? `Edit Session: ${editingSession.name}` : 'Add Academic Session'}
        subtitle="Specify session code, name, and valid calendar date bounds."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingSession ? 'Save Changes' : 'Create Session'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Session Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="e.g. 2026-2027"
            />
            <Input
              label="Session Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              placeholder="e.g. SESS-2026-27"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={formErrors.startDate}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={formErrors.endDate}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Select
              label="Session Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'DRAFT', label: 'Draft (Planning)' },
                { value: 'ACTIVE', label: 'Active (Current/In-Progress)' },
                { value: 'CLOSED', label: 'Closed (Concluded)' },
              ]}
            />
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCurrent}
                  onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Set as Active Current Session</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
