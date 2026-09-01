'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle2,
  XCircle,
  FileEdit,
  ArrowLeft,
  Coins,
  Send,
  Ban,
  AlertCircle,
  Download,
  ShieldCheck,
  Building,
  RotateCcw,
  HelpCircle,
  MessageSquare,
  GitBranch,
  Layers,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { LeaveApplicationDto, ApproverActionType } from '@/lib/types/leave';

interface Props {
  applicationId: string;
}

export function LeaveApplicationDetailView({ applicationId }: Props) {
  const router = useRouter();
  const [application, setApplication] = useState<LeaveApplicationDto | null>(null);
  const [approvalInstance, setApprovalInstance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Approver Action Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ApproverActionType>('APPROVE');
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Clarification Reply Box
  const [clarificationReply, setClarificationReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const loadApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appRes, approvalRes] = await Promise.all([
        fetch(`/api/admin/hr/leaves/applications/${applicationId}`),
        fetch(`/api/admin/hr/leaves/applications/${applicationId}/approval-instance`).catch(() => null),
      ]);

      const json = await appRes.json();
      if (!appRes.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch application');
      }
      setApplication(json.data);

      if (approvalRes && approvalRes.ok) {
        const apprvJson = await approvalRes.json();
        if (apprvJson.success) {
          setApprovalInstance(apprvJson.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const handleSubmitDraft = async () => {
    if (!confirm('Are you sure you want to submit this draft application for approval?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/hr/leaves/applications/${applicationId}/submit`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit application');
      }
      loadApplication();
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Enter cancellation reason:', 'Cancelled by administrator');
    if (!reason) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/hr/leaves/applications/${applicationId}?reason=${encodeURIComponent(reason)}`,
        {
          method: 'DELETE',
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to cancel application');
      }
      loadApplication();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const openApproverModal = (action: ApproverActionType) => {
    setSelectedAction(action);
    setActionRemarks('');
    setActionError(null);
    setActionSuccess(null);
    setIsActionModalOpen(true);
  };

  const handleExecuteApproverAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedAction === 'REJECT' || selectedAction === 'SEND_BACK' || selectedAction === 'REQUEST_CLARIFICATION') && !actionRemarks.trim()) {
      setActionError('Remarks/Comments are required for this action.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/hr/leaves/applications/${applicationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          remarks: actionRemarks.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to process approver action');
      }

      setActionSuccess(json.data.message || 'Action executed successfully');
      setTimeout(() => {
        setIsActionModalOpen(false);
        loadApplication();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || 'Error occurred while processing action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendClarificationResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationReply.trim()) return;

    setReplyLoading(true);
    try {
      const res = await fetch(`/api/admin/hr/leaves/applications/${applicationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_CLARIFICATION_RESPONSE',
          clarificationResponse: clarificationReply.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to submit clarification response');
      }

      setClarificationReply('');
      loadApplication();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading application details...
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-rose-50 border border-rose-200 rounded-xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <p className="text-sm font-semibold text-rose-800">{error || 'Application not found'}</p>
        <Link
          href="/admin/hr/leaves/applications"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications List
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full text-xs">DRAFT</span>;
      case 'PENDING_APPROVAL':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-full text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            PENDING APPROVAL
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </span>
        );
      case 'SENT_BACK':
        return (
          <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 font-bold rounded-full text-xs flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> SENT BACK
          </span>
        );
      case 'CLARIFICATION_REQUIRED':
        return (
          <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold rounded-full text-xs flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> CLARIFICATION REQUIRED
          </span>
        );
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold rounded-full text-xs">CANCELLED</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full text-xs">{status}</span>;
    }
  };

  const currentPendingStep = approvalInstance?.steps?.find(
    (s: any) => s.status === 'PENDING' || s.status === 'CLARIFICATION_REQUESTED'
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/hr/leaves/applications"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 font-mono">{application.applicationNumber}</h1>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-xs text-slate-500">
              Submitted: {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : 'Not submitted (Draft)'}
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          {application.status === 'DRAFT' && (
            <button
              onClick={handleSubmitDraft}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Approval</span>
            </button>
          )}

          {(application.status === 'PENDING_APPROVAL' || application.status === 'CLARIFICATION_REQUIRED') && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => openApproverModal('APPROVE')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Step</span>
              </button>

              <button
                onClick={() => openApproverModal('REJECT')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                onClick={() => openApproverModal('REQUEST_CLARIFICATION')}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>Ask Clarification</span>
              </button>

              <button
                onClick={() => openApproverModal('SEND_BACK')}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Send Back</span>
              </button>
            </div>
          )}

          {application.status !== 'APPROVED' && application.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
              title="Cancel Application"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details, Breakdown, and Interactive Approval Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee & Leave Request Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 text-xs sm:text-sm">
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Application Overview
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block text-xs">Employee:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {application.employee.firstNameEn} {application.employee.lastNameEn}
                </span>
                <span className="text-slate-500 font-mono ml-1 text-xs">({application.employee.employeeNo})</span>
                <div className="text-xs text-slate-500 mt-0.5">
                  {application.employee.departmentName} • {application.employee.designationName}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-xs">Leave Type:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{application.leaveType.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      application.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {application.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Scope: {application.leaveScope}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs">
              <div>
                <span className="text-slate-500 block">Date Range:</span>
                <span className="font-semibold text-slate-800">
                  {application.startDate} to {application.endDate}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Requested:</span>
                <span className="font-bold text-blue-700 text-sm">{application.requestedDays}d</span>
                <span className="text-slate-400 ml-1">({application.workingDaysCount} working days)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Holidays / Off-Days:</span>
                <span className="font-semibold text-slate-700">{application.holidaysCount}d excluded</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-slate-500 block text-xs mb-1">Reason for Leave:</span>
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed">
                {application.reason}
              </p>
            </div>
          </div>

          {/* DYNAMIC MULTI-LEVEL APPROVAL WORKFLOW TIMELINE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <span>Approval Workflow Timeline</span>
              </h3>
              {approvalInstance && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
                  {approvalInstance.workflowName} ({approvalInstance.workflowCode})
                </span>
              )}
            </div>

            {/* Stepper Visualization */}
            {approvalInstance && approvalInstance.steps ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {approvalInstance.steps.map((step: any) => {
                  const isApproved = step.status === 'APPROVED';
                  const isPending = step.status === 'PENDING';
                  const isClarification = step.status === 'CLARIFICATION_REQUESTED';
                  const isRejected = step.status === 'REJECTED';
                  const isSentBack = step.status === 'SENT_BACK';
                  const isWaiting = step.status === 'WAITING';

                  return (
                    <div key={step.id} className="relative group">
                      {/* Step Indicator Bullet */}
                      <div
                        className={`absolute -left-6 top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold bg-white transition-all ${
                          isApproved
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                            : isPending
                            ? 'border-blue-600 bg-blue-50 text-blue-600 ring-4 ring-blue-100 animate-pulse'
                            : isClarification
                            ? 'border-purple-600 bg-purple-50 text-purple-600 ring-4 ring-purple-100'
                            : isRejected
                            ? 'border-rose-600 bg-rose-50 text-rose-600'
                            : isSentBack
                            ? 'border-amber-600 bg-amber-50 text-amber-600'
                            : 'border-slate-300 text-slate-400'
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : isRejected ? (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        ) : isSentBack ? (
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>

                      {/* Step Content Card */}
                      <div
                        className={`p-4 rounded-xl border transition-all text-xs ${
                          isPending
                            ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                            : isClarification
                            ? 'bg-purple-50/40 border-purple-200'
                            : isApproved
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50/30 border-rose-200'
                            : isSentBack
                            ? 'bg-amber-50/30 border-amber-200'
                            : 'bg-slate-50/50 border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              Step {step.stepNumber}: {step.stepName}
                            </span>
                            <span className="text-slate-400 font-mono ml-2">
                              ({step.approverRole || step.approverType})
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-blue-100 text-blue-800'
                                : isClarification
                                ? 'bg-purple-100 text-purple-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isSentBack
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>

                        {/* Step Details & Remarks */}
                        {isApproved && (
                          <div className="text-emerald-800 space-y-1 mt-1">
                            <div>Approved by {step.actionByUserName || 'Authorized Approver'} on {new Date(step.actionAt).toLocaleString()}</div>
                            {step.remarks && <p className="italic bg-white/80 p-2 rounded-md border border-emerald-100">&ldquo;{step.remarks}&rdquo;</p>}
                          </div>
                        )}

                        {isRejected && (
                          <div className="text-rose-800 space-y-1 mt-1">
                            <div>Rejected on {new Date(step.actionAt).toLocaleString()}</div>
                            {step.remarks && <p className="italic bg-white/80 p-2 rounded-md border border-rose-100">&ldquo;{step.remarks}&rdquo;</p>}
                          </div>
                        )}

                        {isSentBack && (
                          <div className="text-amber-800 space-y-1 mt-1">
                            <div>Sent back on {new Date(step.actionAt).toLocaleString()}</div>
                            {step.remarks && <p className="italic bg-white/80 p-2 rounded-md border border-amber-100">&ldquo;{step.remarks}&rdquo;</p>}
                          </div>
                        )}

                        {isClarification && step.clarificationDetails && (
                          <div className="space-y-2 mt-2 bg-white/80 p-3 rounded-lg border border-purple-200">
                            <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                              <span>Inquiry from {step.clarificationDetails.askedByName || 'Approver'}:</span>
                            </div>
                            <p className="italic text-slate-700">&ldquo;{step.clarificationDetails.question}&rdquo;</p>

                            {step.clarificationDetails.response ? (
                              <div className="border-t border-purple-100 pt-2 mt-2">
                                <span className="font-semibold text-emerald-800">Applicant Response:</span>
                                <p className="italic text-slate-700">&ldquo;{step.clarificationDetails.response}&rdquo;</p>
                              </div>
                            ) : (
                              <form onSubmit={handleSendClarificationResponse} className="pt-2 border-t border-purple-100 space-y-2">
                                <label className="block text-[11px] font-bold text-purple-950">Reply to Clarification Inquiry:</label>
                                <textarea
                                  rows={2}
                                  required
                                  placeholder="Provide response or alternative coverage arrangement..."
                                  value={clarificationReply}
                                  onChange={(e) => setClarificationReply(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                                />
                                <button
                                  type="submit"
                                  disabled={replyLoading}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  {replyLoading ? 'Sending...' : 'Submit Clarification Response'}
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                        {isWaiting && (
                          <div className="text-slate-400 mt-1 italic">
                            Awaiting completion of previous approval levels...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                Approval workflow will initialize upon submission.
              </div>
            )}

            {/* Action History Drawer / Trail */}
            {approvalInstance?.actionHistory && approvalInstance.actionHistory.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audit History & Comments Trail</span>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {approvalInstance.actionHistory.map((item: any) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-900">{item.action}</span> by <strong className="text-slate-800">{item.actorName}</strong>
                        {item.remarks && <p className="text-slate-600 mt-0.5 italic">&ldquo;{item.remarks}&rdquo;</p>}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shifts Breakdown */}
          {application.shifts && application.shifts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Scheduled Shift Selections ({application.shifts.length})
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Shift Name</th>
                      <th className="py-2.5 px-3">Shift Timings</th>
                      <th className="py-2.5 px-3 text-right">Fraction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {application.shifts.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-semibold text-slate-800">{s.date}</td>
                        <td className="py-2 px-3 text-purple-700 font-medium">
                          {s.shiftName} ({s.shiftCode})
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{s.leaveFraction}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Snapshot & Policy Metadata */}
        <div className="space-y-6">
          {/* Balance Snapshot Card */}
          {application.balanceSnapshot && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" />
                Balance at Submission
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Available Balance:</span>
                  <span className="font-bold text-slate-900">{application.balanceSnapshot.availableBalance}d</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pending Requests:</span>
                  <span className="font-semibold text-amber-700">
                    -{application.balanceSnapshot.pendingRequestedDays}d
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Requested Amount:</span>
                  <span className="font-bold text-blue-700">-{application.requestedDays}d</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2">
                  <span>Projected Balance:</span>
                  <span
                    className={
                      application.balanceSnapshot.projectedBalanceAfterApproval < 0
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }
                  >
                    {application.balanceSnapshot.projectedBalanceAfterApproval}d
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Policy Snapshot Card */}
          {application.leavePolicy && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Applicable Leave Policy
              </h3>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">{application.leavePolicy.name}</div>
                <div className="font-mono text-[10px] text-slate-500 mt-0.5">{application.leavePolicy.code}</div>
              </div>

              <div className="text-[11px] text-slate-500">
                This request was validated and recorded under policy version snapshots to maintain historical integrity.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog Modal */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5 mb-3">
              {selectedAction === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {selectedAction === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
              {selectedAction === 'SEND_BACK' && <RotateCcw className="w-5 h-5 text-amber-600" />}
              {selectedAction === 'REQUEST_CLARIFICATION' && <HelpCircle className="w-5 h-5 text-purple-600" />}

              <h3 className="text-base font-bold text-slate-900">
                {selectedAction === 'APPROVE' && 'Approve Current Step'}
                {selectedAction === 'REJECT' && 'Reject Leave Application'}
                {selectedAction === 'SEND_BACK' && 'Send Back Application'}
                {selectedAction === 'REQUEST_CLARIFICATION' && 'Request Clarification from Staff'}
              </h3>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteApproverAction} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {selectedAction === 'APPROVE' && 'Approval Comments (Optional)'}
                  {selectedAction === 'REJECT' && 'Rejection Reason *'}
                  {selectedAction === 'SEND_BACK' && 'Instructions / Reason for Send Back *'}
                  {selectedAction === 'REQUEST_CLARIFICATION' && 'Clarification Question / Inquiry *'}
                </label>
                <textarea
                  rows={3}
                  required={selectedAction !== 'APPROVE'}
                  placeholder="Enter comments..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                    selectedAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : selectedAction === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : selectedAction === 'SEND_BACK'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${selectedAction.replace('_', ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
