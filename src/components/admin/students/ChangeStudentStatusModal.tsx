'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Calendar,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  StudentLifecycleStatus,
  STUDENT_LIFECYCLE_STATUSES,
  LIFECYCLE_PRESET_REASONS,
} from '@/lib/types/student-lifecycle';

interface ChangeStudentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  admissionNo: string;
  currentStatus: StudentLifecycleStatus;
  currentClassSection?: string;
  onStatusChanged: () => void;
}

export function ChangeStudentStatusModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  admissionNo,
  currentStatus,
  currentClassSection,
  onStatusChanged,
}: ChangeStudentStatusModalProps) {
  const { success, error } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<StudentLifecycleStatus>(
    currentStatus === 'ACTIVE' ? 'WITHDRAWN' : 'ACTIVE'
  );
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leavingCertificateNo, setLeavingCertificateNo] = useState('');
  const [leavingCertificateDate, setLeavingCertificateDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync reason presets when selectedStatus changes
  useEffect(() => {
    const presets = LIFECYCLE_PRESET_REASONS[selectedStatus] || [];
    if (presets.length > 0) {
      setSelectedReason(presets[0]);
    } else {
      setSelectedReason('');
    }
  }, [selectedStatus]);

  const targetMeta = STUDENT_LIFECYCLE_STATUSES[selectedStatus];
  const isMajorAction = targetMeta?.isMajorAction;
  const requiresSLC = targetMeta?.requiresSLC;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalReason =
      selectedReason === 'OTHER' || !selectedReason
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      error('Validation', 'A transition reason is required.');
      return;
    }

    if (selectedStatus === currentStatus) {
      error('Invalid Transition', `Student is already in '${selectedStatus}' status.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: selectedStatus,
          reason: finalReason,
          effectiveDate,
          leavingCertificateNo: requiresSLC ? leavingCertificateNo.trim() || undefined : undefined,
          leavingCertificateDate: requiresSLC ? leavingCertificateDate : undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        success(
          'Status Transition Complete',
          `Student status successfully transitioned to '${targetMeta.label}'.`
        );
        onStatusChanged();
        onClose();
      } else {
        error('Action Failed', json.error?.message || 'Could not change student status.');
      }
    } catch {
      error('Network Error', 'Failed to connect to lifecycle service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Lifecycle & Status Action"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Student Context Banner */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{studentName}</span>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {admissionNo}
              </span>
            </div>
            <p className="text-2xs text-slate-500 mt-0.5">
              Placement: {currentClassSection || 'Current Placement'}
            </p>
          </div>
          <div className="text-end">
            <span className="text-3xs font-bold text-slate-400 uppercase block">Current Status</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase ${
                STUDENT_LIFECYCLE_STATUSES[currentStatus]?.badgeClass || 'bg-slate-100 text-slate-700'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        {/* 1. Target Status Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Select Target Lifecycle Status *
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as StudentLifecycleStatus)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {Object.values(STUDENT_LIFECYCLE_STATUSES).map((s) => (
              <option key={s.key} value={s.key} disabled={s.key === currentStatus}>
                {s.label} {s.key === currentStatus ? '(Current)' : ''}
              </option>
            ))}
          </select>
          <p className="text-2xs text-slate-500 mt-1">{targetMeta?.description}</p>
        </div>

        {/* Major Action Warning */}
        {isMajorAction && selectedStatus !== 'ACTIVE' && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-2xs text-amber-900 leading-relaxed">
              <strong className="font-bold block">Important Lifecycle Business Rule:</strong>
              Transitioning to <strong>{targetMeta.label}</strong> closes current classroom enrollment. Historical academic transcripts, invoices, and payment records remain permanently attached to this Student ID without deletion.
            </div>
          </div>
        )}

        {/* 2. Reason Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transition Reason *
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {(LIFECYCLE_PRESET_REASONS[selectedStatus] || []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="OTHER">Other / Custom Reason...</option>
            </select>
          </div>

          <Input
            label="Effective Date *"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        {selectedReason === 'OTHER' && (
          <Input
            label="Specify Custom Reason *"
            placeholder="Type specific reason for this lifecycle action..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}

        {/* 3. School Leaving Certificate (SLC) Fields if applicable */}
        {requiresSLC && (
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileCheck className="w-4 h-4 text-blue-600" />
              School Leaving Certificate (SLC) Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="SLC Reference Number"
                placeholder="e.g. SLC-2026-0419"
                value={leavingCertificateNo}
                onChange={(e) => setLeavingCertificateNo(e.target.value)}
              />
              <Input
                label="SLC Issue Date"
                type="date"
                value={leavingCertificateDate}
                onChange={(e) => setLeavingCertificateDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 4. Administrative Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Additional Administrative Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add internal notes, board notifications, or clearance details..."
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isMajorAction ? 'primary' : 'primary'}
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className={isMajorAction && selectedStatus === 'WITHDRAWN' ? 'bg-rose-600 hover:bg-rose-700' : ''}
          >
            <CheckCircle className="w-4 h-4 me-1.5" />
            Confirm &amp; Transition Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
