'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  Smartphone,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  FileText,
  User,
} from 'lucide-react';
import { validatePakistanMobile } from '@/lib/validation/auth-validation';

interface RecoveryRequestItem {
  id: string;
  identifierProvided: string;
  contactType: string;
  contactValue: string | null;
  reason: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  adminComments: string | null;
  temporaryPasswordGenerated: boolean;
  requesterIp: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    recoveryMobile: string | null;
    userType: string;
    status: string;
  } | null;
  reviewedBy: {
    id: string;
    username: string;
  } | null;
}

export function RecoveryRequestsView() {
  const [requests, setRequests] = useState<RecoveryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequestItem | null>(null);
  const [actionType, setActionType] = useState<'GENERATE_TEMP_PASSWORD' | 'UPDATE_PHONE' | 'APPROVE_RESET_TOKEN' | 'REJECT' | null>(null);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [adminCommentsInput, setAdminCommentsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<{ temporaryPassword?: string; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/security/recovery-requests?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    let normalizedPhone: string | undefined = undefined;
    if (actionType === 'UPDATE_PHONE') {
      const mobileRes = validatePakistanMobile(newPhoneInput);
      if (!mobileRes.isValid) {
        alert(mobileRes.error || 'Enter a valid 11-digit mobile number (e.g. 03001234567).');
        return;
      }
      normalizedPhone = mobileRes.normalized;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`/api/admin/security/recovery-requests/${selectedRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          newPhone: normalizedPhone,
          adminComments: adminCommentsInput,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionResult(json.data);
        loadRequests();
      } else {
        alert(json.error?.message || 'Failed to complete review action.');
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">PENDING</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">COMPLETED</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">VERIFIED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Password Recovery Requests</h1>
            <p className="text-xs text-slate-500">
              Review and verify identity fallback requests from staff, students, and parents
            </p>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'COMPLETED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-800">
              {requests.length} Recovery Ticket(s)
            </span>
          </div>

          <button
            onClick={() => loadRequests()}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading recovery requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No recovery requests found matching the current filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    {getStatusBadge(item.status)}
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Ticket #{item.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div>
                      <span className="text-slate-400">Identifier: </span>
                      <span className="font-semibold text-slate-900">{item.identifierProvided}</span>
                    </div>

                    {item.user && (
                      <div>
                        <span className="text-slate-400">Matched User: </span>
                        <span className="font-semibold text-blue-600">
                          {item.user.username} ({item.user.userType})
                        </span>
                      </div>
                    )}

                    {item.contactValue && (
                      <div>
                        <span className="text-slate-400">Reachable Phone: </span>
                        <span className="font-mono text-slate-800">{item.contactValue}</span>
                      </div>
                    )}
                  </div>

                  {item.reason && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  )}

                  {item.adminComments && (
                    <p className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100 max-w-xl">
                      <span className="font-bold text-blue-900">Admin Note: </span>
                      {item.adminComments}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {item.status === 'PENDING' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedRequest(item);
                        setActionType('GENERATE_TEMP_PASSWORD');
                        setActionResult(null);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Generate Temp Password
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRequest(item);
                        setActionType('UPDATE_PHONE');
                        setNewPhoneInput(item.contactValue || '');
                        setActionResult(null);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Update Mobile
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRequest(item);
                        setActionType('REJECT');
                        setActionResult(null);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTION MODAL */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {actionType === 'GENERATE_TEMP_PASSWORD' && 'Generate Temporary Password'}
                {actionType === 'UPDATE_PHONE' && 'Verify & Update Recovery Phone'}
                {actionType === 'REJECT' && 'Reject Recovery Request'}
              </h3>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                  setActionResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {!actionResult ? (
              <div className="space-y-4 text-xs">
                {actionType === 'GENERATE_TEMP_PASSWORD' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                    <p className="font-bold">Important Security Rule:</p>
                    <p className="text-[11px] leading-relaxed">
                      Existing passwords are never displayed. Generating a temporary password will securely reset the password hash and enforce <span className="font-bold">MUST CHANGE PASSWORD ON NEXT LOGIN</span>.
                    </p>
                  </div>
                )}

                {actionType === 'UPDATE_PHONE' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      New Verified Recovery Mobile (11 Digits)
                    </label>
                    <input
                      type="text"
                      value={newPhoneInput}
                      onChange={(e) => setNewPhoneInput(e.target.value)}
                      placeholder="e.g. 03001234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Enter the verified 11-digit Pakistan mobile number in 03XXXXXXXXX format.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admin Verification Comments / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={adminCommentsInput}
                    onChange={(e) => setAdminCommentsInput(e.target.value)}
                    placeholder="e.g. Verified CNIC and employment record in person..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(null);
                      setActionType(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAction}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Action'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-center">
                {actionResult.temporaryPassword ? (
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Temporary Password Generated</h4>
                    <p className="text-xs text-slate-500">
                      Provide this temporary password securely to the user. They will be required to set a new password on login.
                    </p>

                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-slate-900 tracking-wider">
                        {actionResult.temporaryPassword}
                      </span>
                      <button
                        onClick={() => handleCopy(actionResult.temporaryPassword!)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">{actionResult.message}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                    setActionResult(null);
                  }}
                  className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
