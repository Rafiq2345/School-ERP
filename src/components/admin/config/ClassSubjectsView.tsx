'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Plus, CheckCircle, XCircle, BookCheck, Trash2 } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface ClassSubjectMappingItem {
  id: string;
  tenantId: string;
  academicSessionId: string;
  classId: string;
  subjectId: string;
  isCompulsory: boolean;
  sortOrder: number;
  isActive: boolean;
  academicSession: {
    id: string;
    name: string;
    code: string;
    isCurrent: boolean;
    status: string;
  };
  schoolClass: {
    id: string;
    name: string;
    code: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
    subjectType: string;
  };
}

interface MasterOption {
  value: string;
  label: string;
}

const STORAGE_SESSION_KEY = 'school_erp_cs_active_session';
const STORAGE_CLASS_KEY = 'school_erp_cs_active_class';

export function ClassSubjectsView() {
  const [mappings, setMappings] = useState<ClassSubjectMappingItem[]>([]);
  const [sessions, setSessions] = useState<MasterOption[]>([]);
  const [classes, setClasses] = useState<MasterOption[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string; code: string; subjectType: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalSessionId, setModalSessionId] = useState('');
  const [modalClassId, setModalClassId] = useState('');
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Record<string, { isCompulsory: boolean; sortOrder: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletingMapping, setDeletingMapping] = useState<ClassSubjectMappingItem | null>(null);

  const { success, error } = useToast();
  const isInitialized = useRef(false);

  // Sync URL search params and localStorage on active selection changes
  const updateActiveSelection = (sessionId: string, classId: string) => {
    setSelectedSessionId(sessionId);
    setSelectedClassId(classId);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
        localStorage.setItem(STORAGE_CLASS_KEY, classId);

        const url = new URL(window.location.href);
        url.searchParams.set('academicSessionId', sessionId);
        url.searchParams.set('classId', classId);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // Non-blocking
      }
    }
  };

  const fetchDropdownData = useCallback(async () => {
    try {
      const [sessRes, classRes, subRes] = await Promise.all([
        fetch('/api/admin/config/sessions'),
        fetch('/api/admin/config/classes?isActive=true'),
        fetch('/api/admin/config/subjects?isActive=true'),
      ]);

      const [sessJson, classJson, subJson] = await Promise.all([
        sessRes.json(),
        classRes.json(),
        subRes.json(),
      ]);

      if (subJson.success) {
        setAllSubjects(subJson.data);
      }

      let initialSessionId = '';
      let initialClassId = '';

      // Check URL parameters first
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        initialSessionId = urlParams.get('academicSessionId') || '';
        initialClassId = urlParams.get('classId') || '';

        // Fallback to localStorage if not in URL
        if (!initialSessionId) {
          initialSessionId = localStorage.getItem(STORAGE_SESSION_KEY) || '';
        }
        if (!initialClassId) {
          initialClassId = localStorage.getItem(STORAGE_CLASS_KEY) || '';
        }
      }

      if (sessJson.success && sessJson.data.length > 0) {
        const sessionOpts = sessJson.data.map((s: any) => ({
          value: s.id,
          label: `${s.name} (${s.status})`,
        }));
        setSessions(sessionOpts);

        // Verify if stored session still exists in options
        const validSession = sessionOpts.find((s: any) => s.value === initialSessionId);
        if (validSession) {
          initialSessionId = validSession.value;
        } else {
          const currentSess = sessJson.data.find((s: any) => s.isCurrent) || sessJson.data[0];
          initialSessionId = currentSess.id;
        }
      }

      if (classJson.success && classJson.data.length > 0) {
        const classOpts = classJson.data.map((c: any) => ({
          value: c.id,
          label: `${c.name} (${c.code})`,
        }));
        setClasses(classOpts);

        // Verify if stored class still exists in options
        const validClass = classOpts.find((c: any) => c.value === initialClassId);
        if (validClass) {
          initialClassId = validClass.value;
        } else {
          initialClassId = classOpts[0].value;
        }
      }

      if (initialSessionId && initialClassId) {
        updateActiveSelection(initialSessionId, initialClassId);
        setModalSessionId(initialSessionId);
        setModalClassId(initialClassId);
        isInitialized.current = true;
      }
    } catch {
      error('Load Error', 'Could not load master dropdown data.');
    }
  }, [error]);

  const fetchMappings = useCallback(async () => {
    if (!selectedSessionId || !selectedClassId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('academicSessionId', selectedSessionId);
      params.set('classId', selectedClassId);

      const res = await fetch(`/api/admin/config/class-subjects?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setMappings(json.data);
      } else {
        error('Failed to load mappings', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId, selectedClassId, error]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    if (selectedSessionId && selectedClassId) {
      fetchMappings();
    }
  }, [selectedSessionId, selectedClassId, fetchMappings]);

  // Load modal subject checkboxes for the designated session + class
  const loadModalSubjectsForClass = async (sessionId: string, classId: string) => {
    if (!sessionId || !classId) return;
    setIsModalLoading(true);
    try {
      const params = new URLSearchParams({
        academicSessionId: sessionId,
        classId: classId,
      });
      const res = await fetch(`/api/admin/config/class-subjects?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const initial: Record<string, { isCompulsory: boolean; sortOrder: number }> = {};
        json.data.forEach((m: ClassSubjectMappingItem) => {
          initial[m.subjectId] = {
            isCompulsory: m.isCompulsory,
            sortOrder: m.sortOrder,
          };
        });
        setSelectedSubjectIds(initial);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleOpenAssignModal = () => {
    setModalSessionId(selectedSessionId);
    setModalClassId(selectedClassId);
    loadModalSubjectsForClass(selectedSessionId, selectedClassId);
    setIsAssignModalOpen(true);
  };

  const handleModalSessionChange = (newSessionId: string) => {
    setModalSessionId(newSessionId);
    loadModalSubjectsForClass(newSessionId, modalClassId);
  };

  const handleModalClassChange = (newClassId: string) => {
    setModalClassId(newClassId);
    loadModalSubjectsForClass(modalSessionId, newClassId);
  };

  const handleSubjectCheckboxToggle = (subjectId: string, checked: boolean) => {
    setSelectedSubjectIds((prev) => {
      const copy = { ...prev };
      if (checked) {
        copy[subjectId] = { isCompulsory: true, sortOrder: (Object.keys(prev).length + 1) * 10 };
      } else {
        delete copy[subjectId];
      }
      return copy;
    });
  };

  const handleCompulsoryToggle = (subjectId: string, isCompulsory: boolean) => {
    setSelectedSubjectIds((prev) => {
      if (!prev[subjectId]) return prev;
      return {
        ...prev,
        [subjectId]: { ...prev[subjectId], isCompulsory },
      };
    });
  };

  const handleSaveAssignments = async () => {
    const subjectList = Object.entries(selectedSubjectIds).map(([subjectId, meta]) => ({
      subjectId,
      isCompulsory: meta.isCompulsory,
      sortOrder: meta.sortOrder,
    }));

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/config/class-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicSessionId: modalSessionId,
          classId: modalClassId,
          assignments: subjectList,
        }),
      });
      const json = await res.json();

      if (json.success) {
        success('Curriculum Assigned', `Successfully updated curriculum for designated class.`);
        setIsAssignModalOpen(false);

        // Update active selection to match the saved session + class and reload
        updateActiveSelection(modalSessionId, modalClassId);
        fetchMappings();
      } else {
        error('Assignment Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Failed to save subject assignments.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ClassSubjectMappingItem) => {
    try {
      const res = await fetch(`/api/admin/config/class-subjects/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        success('Status Updated', `Mapping is now ${!item.isActive ? 'Active' : 'Inactive'}.`);
        fetchMappings();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const handleToggleCompulsory = async (item: ClassSubjectMappingItem) => {
    try {
      const res = await fetch(`/api/admin/config/class-subjects/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompulsory: !item.isCompulsory }),
      });
      const json = await res.json();
      if (json.success) {
        success('Requirement Updated', `Subject is now ${!item.isCompulsory ? 'Compulsory' : 'Optional'}.`);
        fetchMappings();
      } else {
        error('Update Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMapping) return;
    try {
      const res = await fetch(`/api/admin/config/class-subjects/${deletingMapping.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        success('Subject Removed', `${deletingMapping.subject.name} removed from class curriculum.`);
        setDeletingMapping(null);
        fetchMappings();
      } else {
        error('Delete Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not reach server.');
    }
  };

  const columns: Column<ClassSubjectMappingItem>[] = [
    {
      header: 'Subject Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <BookCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-900">{row.subject.name}</span>
        </div>
      ),
    },
    {
      header: 'Code',
      cell: (row) => <span className="font-mono font-medium text-slate-700">{row.subject.code}</span>,
    },
    {
      header: 'Type',
      cell: (row) => <StatusBadge status={row.subject.subjectType} />,
    },
    {
      header: 'Requirement',
      cell: (row) => (
        <button
          onClick={() => handleToggleCompulsory(row)}
          className="focus:outline-none cursor-pointer"
          title="Click to toggle Compulsory / Optional"
        >
          <StatusBadge status={row.isCompulsory ? 'COMPULSORY' : 'OPTIONAL'} />
        </button>
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
            onClick={() => handleToggleStatus(row)}
            className={row.isActive ? 'text-amber-600' : 'text-emerald-600'}
            title={row.isActive ? 'Deactivate Subject' : 'Activate Subject'}
          >
            {row.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingMapping(row)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Remove from Curriculum"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workflow Filter Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Curriculum Mapping Workflow</h2>
            <p className="text-xs text-slate-500">
              Select an Academic Session & School Class to manage taught subjects.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <select
              value={selectedSessionId}
              onChange={(e) => updateActiveSelection(e.target.value, selectedClassId)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/75 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {sessions.map((s) => (
                <option key={s.value} value={s.value}>
                  Session: {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px]">
            <select
              value={selectedClassId}
              onChange={(e) => updateActiveSelection(selectedSessionId, e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/75 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {classes.map((c) => (
                <option key={c.value} value={c.value}>
                  Class: {c.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenAssignModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Assign Subjects
          </Button>
        </div>
      </div>

      {/* Curriculum Table */}
      <DataTable
        title="Assigned Class Curriculum"
        subtitle="Active subjects assigned to selected class for the designated academic session."
        columns={columns}
        data={mappings}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No subjects assigned yet"
        emptySubtitle="Click 'Assign Subjects' above to map subjects from master registry to this class."
      />

      {/* Assign Subjects Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Subjects to Class"
        subtitle="Select multiple subjects to include in the curriculum. Choose Compulsory or Optional for each subject."
        maxWidth="2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAssignments} isLoading={isSubmitting}>
              Save Subject Assignments
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
            <Select
              label="Academic Session"
              value={modalSessionId}
              onChange={(e) => handleModalSessionChange(e.target.value)}
              options={sessions}
            />
            <Select
              label="School Class"
              value={modalClassId}
              onChange={(e) => handleModalClassChange(e.target.value)}
              options={classes}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Select Subjects to Assign</span>
              <span className="text-2xs text-slate-500 font-medium">
                {Object.keys(selectedSubjectIds).length} of {allSubjects.length} selected
              </span>
            </div>

            {isModalLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading class curriculum...</div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-slate-50/25">
                {allSubjects.map((sub) => {
                  const isSelected = Boolean(selectedSubjectIds[sub.id]);
                  const isCompulsory = selectedSubjectIds[sub.id]?.isCompulsory ?? true;

                  return (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between p-3 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSubjectCheckboxToggle(sub.id, e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{sub.name}</p>
                          <p className="text-2xs text-slate-500 font-mono">
                            {sub.code} • {sub.subjectType}
                          </p>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-semibold text-slate-500">Requirement:</span>
                          <select
                            value={isCompulsory ? 'true' : 'false'}
                            onChange={(e) => handleCompulsoryToggle(sub.id, e.target.value === 'true')}
                            className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="true">Compulsory</option>
                            <option value="false">Optional</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingMapping)}
        onClose={() => setDeletingMapping(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Subject from Class Curriculum?"
        message={`Are you sure you want to remove "${deletingMapping?.subject?.name}" from ${deletingMapping?.schoolClass?.name}? This mapping will no longer be active for the selected academic session.`}
        confirmLabel="Remove Subject"
        variant="danger"
      />
    </div>
  );
}
