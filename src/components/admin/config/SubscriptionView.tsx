'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  UploadCloud,
  FileText,
  Copy,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowUpRight,
  Info,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DataTable, Column } from '@/components/ui/DataTable';

interface SubscriptionData {
  subscription: {
    id: string;
    planName: string;
    billingCycle: string;
    baseFee: number;
    currency: string;
    status: 'ACTIVE' | 'PAYMENT_DUE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'MANUALLY_ACTIVATED' | 'EXEMPT';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    gracePeriodDays: number;
    showHistoryToSchool: boolean;
    suspendedAt: string | null;
    lastPaymentDate: string | null;
  };
  currentInvoice: {
    id: string;
    invoiceNo: string;
    billingPeriod: string;
    issueDate: string;
    dueDate: string;
    graceUntil: string | null;
    amount: number;
    taxAmount: number;
    discountAmount: number;
    previousBalance: number;
    totalPayable: number;
    paidAmount: number;
    outstandingAmount: number;
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
    schoolNotes: string | null;
    latestProof?: {
      id: string;
      documentUrl: string;
      submittedAmount: number;
      paymentDate: string;
      transactionRef: string;
      bankName: string | null;
      verificationStatus: 'PENDING' | 'AI_MATCH' | 'AI_MISMATCH' | 'NEEDS_MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';
      aiConfidenceScore: number | null;
      rejectionReason: string | null;
      createdAt: string;
    } | null;
  } | null;
  receivingAccounts: {
    id: string;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string | null;
    raastId: string | null;
    instructions: string | null;
  }[];
  invoiceHistory: {
    id: string;
    invoiceNo: string;
    billingPeriod: string;
    issueDate: string;
    dueDate: string;
    totalPayable: number;
    paidAmount: number;
    status: string;
    latestProofStatus: string | null;
  }[];
}

export function SubscriptionView() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    transactionRef: '',
    submittedAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    bankName: 'Meezan Bank',
    notes: '',
    documentUrl: 'https://storage.eduerp.pk/receipts/proof-screenshot.png',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { success, error } = useToast();

  const fetchSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscription');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        error('Failed to load subscription', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not fetch subscription information.');
    } finally {
      setIsLoading(false)
    }
  }, [error]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    success('Copied to Clipboard', `${label} copied successfully.`);
    setTimeout(() => setCopiedField(null), 3000);
  };

  const handleOpenProofModal = () => {
    if (!data?.currentInvoice) return;
    setFormData({
      transactionRef: '',
      submittedAmount: String(data.currentInvoice.outstandingAmount),
      paymentDate: new Date().toISOString().split('T')[0],
      bankName: 'Meezan Bank',
      notes: '',
      documentUrl: 'https://storage.eduerp.pk/receipts/receipt-sample.png',
    });
    setFormErrors({});
    setIsProofModalOpen(true);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.currentInvoice) return;

    const errors: Record<string, string> = {};
    if (!formData.transactionRef.trim()) {
      errors.transactionRef = 'Transaction Reference / UTR Number is required';
    }
    if (!formData.submittedAmount || Number(formData.submittedAmount) <= 0) {
      errors.submittedAmount = 'Valid paid amount is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/subscription/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: data.currentInvoice.id,
          transactionRef: formData.transactionRef.trim(),
          submittedAmount: Number(formData.submittedAmount),
          paymentDate: formData.paymentDate,
          bankName: formData.bankName,
          notes: formData.notes,
          documentUrl: formData.documentUrl,
        }),
      });
      const json = await res.json();

      if (json.success) {
        success(
          'Payment Proof Submitted',
          'Your payment screenshot and transaction details were submitted. AI verification in progress.'
        );
        setIsProofModalOpen(false);
        fetchSubscriptionData();
      } else {
        error('Submission Failed', json.error?.message);
      }
    } catch {
      error('Network Error', 'Could not submit payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
        Loading institutional subscription and invoice details...
      </div>
    );
  }

  const { subscription, currentInvoice, receivingAccounts, invoiceHistory } = data;
  const latestProof = currentInvoice?.latestProof;

  // Status Badge configurations
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active License
          </span>
        );
      case 'PAYMENT_DUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Payment Due
          </span>
        );
      case 'GRACE_PERIOD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> In Grace Period
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Lock className="w-3.5 h-3.5 text-rose-600" /> Restricted / Suspended
          </span>
        );
      case 'MANUALLY_ACTIVATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Provider Override
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const historyColumns: Column<(typeof invoiceHistory)[0]>[] = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNo',
      cell: (row) => <span className="font-mono font-bold text-slate-800 text-xs">{row.invoiceNo}</span>,
    },
    {
      header: 'Billing Period',
      accessorKey: 'billingPeriod',
      cell: (row) => <span className="text-xs text-slate-600">{row.billingPeriod}</span>,
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Total Payable',
      accessorKey: 'totalPayable',
      cell: (row) => (
        <span className="font-bold text-xs text-slate-900">
          PKR {row.totalPayable.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Invoice Status',
      accessorKey: 'status',
      cell: (row) => (
        <span
          className={`px-2 py-0.5 rounded-md text-3xs font-bold uppercase tracking-wider ${
            row.status === 'PAID'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : row.status === 'OVERDUE'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Proof Status',
      accessorKey: 'latestProofStatus',
      cell: (row) => (
        <span className="text-2xs text-slate-500 font-semibold">
          {row.latestProofStatus || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Suspended or Due */}
      {subscription.status === 'SUSPENDED' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5 text-rose-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-rose-900">ERP Access Suspended (Payment Overdue)</h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              Your school subscription invoice has passed its grace period. Normal ERP operational modules are paused. Please transfer the outstanding fee to the provider account below and submit your payment receipt to restore access immediately.
            </p>
          </div>
        </div>
      )}

      {subscription.status === 'GRACE_PERIOD' && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3.5 text-orange-900 shadow-xs">
          <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-orange-900">Subscription in Grace Period</h3>
            <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
              The invoice due date has elapsed. You are currently operating under the {subscription.gracePeriodDays}-day grace period. Please submit payment proof to avoid automatic suspension.
            </p>
          </div>
        </div>
      )}

      {/* Header & Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">School Software Subscription & Licensing</h2>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Platform billing and software licensing agreement between your institution and the ERP provider.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
              <span>
                <strong>Plan:</strong> {subscription.planName} Tier
              </span>
              <span>&bull;</span>
              <span>
                <strong>Billing Cycle:</strong> {subscription.billingCycle}
              </span>
              <span>&bull;</span>
              <span>
                <strong>Renewal Period End:</strong> {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Invoice & Payment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Current Invoice Card */}
        <div className="lg:col-span-2 space-y-6">
          {currentInvoice ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-2xs font-bold text-blue-600 uppercase tracking-wider font-mono">
                    {currentInvoice.invoiceNo}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Invoice for {currentInvoice.billingPeriod}
                  </h3>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentInvoice.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : currentInvoice.status === 'OVERDUE'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {currentInvoice.status}
                  </span>
                </div>
              </div>

              {/* Invoice Numbers Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Issue Date</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {new Date(currentInvoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Due Date</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {new Date(currentInvoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    PKR {currentInvoice.totalPayable.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-3xs font-bold text-rose-600 uppercase tracking-wider">Outstanding</span>
                  <p className="text-sm font-extrabold text-rose-600 mt-0.5">
                    PKR {currentInvoice.outstandingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Submission CTA / Status */}
              {currentInvoice.status !== 'PAID' && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">
                    Transfer fees using the provider bank accounts on the right, then submit your screenshot.
                  </p>
                  <Button variant="primary" size="md" onClick={handleOpenProofModal}>
                    <UploadCloud className="w-4 h-4 me-2" />
                    Submit Payment Proof
                  </Button>
                </div>
              )}

              {/* Latest Proof Status Banner if submitted */}
              {latestProof && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">Recent Payment Submission</span>
                        <span className="text-3xs font-mono text-slate-400">
                          Ref: {latestProof.transactionRef}
                        </span>
                      </div>
                      <div>
                        {latestProof.verificationStatus === 'VERIFIED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {latestProof.verificationStatus === 'AI_MATCH' && (
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Matched (Pending Final Review)
                          </span>
                        )}
                        {latestProof.verificationStatus === 'NEEDS_MANUAL_REVIEW' && (
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Manual Review Required
                          </span>
                        )}
                        {latestProof.verificationStatus === 'REJECTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-600">
                      <span>Amount: PKR {latestProof.submittedAmount.toLocaleString()}</span>
                      <span>&bull;</span>
                      <span>Date: {new Date(latestProof.paymentDate).toLocaleDateString()}</span>
                      {latestProof.aiConfidenceScore && (
                        <>
                          <span>&bull;</span>
                          <span className="text-blue-700 font-semibold">
                            AI Confidence: {Math.round(latestProof.aiConfidenceScore * 100)}%
                          </span>
                        </>
                      )}
                    </div>

                    {latestProof.rejectionReason && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-2">
                        <strong>Rejection Note:</strong> {latestProof.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              No open subscription invoices found. Your account is in good standing.
            </div>
          )}

          {/* Invoice History (Controlled by Provider Visibility) */}
          {subscription.showHistoryToSchool && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Subscription Invoice History</h3>
                <span className="text-2xs text-slate-400 font-semibold">Archived Records</span>
              </div>
              <DataTable
                columns={historyColumns}
                data={invoiceHistory}
                keyExtractor={(item) => item.id}
                emptyTitle="No past invoices found"
              />
            </div>
          )}
        </div>

        {/* Right 1 Col: Payment Instructions Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Official Receiving Accounts</h3>
            </div>

            <div className="space-y-4">
              {receivingAccounts.map((acc) => (
                <div key={acc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div>
                    <span className="text-3xs font-bold text-blue-700 uppercase tracking-wider font-mono">
                      {acc.bankName}
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{acc.accountTitle}</p>
                  </div>

                  <div>
                    <span className="text-3xs text-slate-400 uppercase font-semibold">Account No:</span>
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 mt-1">
                      <span className="font-mono text-xs font-bold text-slate-800">{acc.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.accountNumber, 'Account Number')}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                        title="Copy Account Number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {acc.iban && (
                    <div>
                      <span className="text-3xs text-slate-400 uppercase font-semibold">IBAN:</span>
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 mt-1">
                        <span className="font-mono text-2xs font-bold text-slate-800 truncate me-2">{acc.iban}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.iban!, 'IBAN')}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer shrink-0"
                          title="Copy IBAN"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {acc.raastId && (
                    <div>
                      <span className="text-3xs text-slate-400 uppercase font-semibold">Raast ID:</span>
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 mt-1">
                        <span className="font-mono text-xs font-bold text-slate-800">{acc.raastId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.raastId!, 'Raast ID')}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                          title="Copy Raast ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {acc.instructions && (
                    <p className="text-3xs text-slate-500 leading-relaxed bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                      {acc.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-800 block">Provider Support:</span>
              <p className="text-2xs text-slate-500">Email: billing@eduerp.pk</p>
              <p className="text-2xs text-slate-500">Phone / WhatsApp: +92 (300) 123-4567</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Payment Proof Modal */}
      <Modal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        title="Submit Subscription Payment Proof"
        subtitle={`Submit transfer receipt against invoice ${currentInvoice?.invoiceNo || ''}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsProofModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitProof} isLoading={isSubmitting}>
              Submit Proof for Verification
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitProof} className="space-y-4">
          <Input
            label="Transaction Reference / UTR Number *"
            placeholder="e.g. MEZN-987654321 or Raast Ref ID"
            value={formData.transactionRef}
            onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
            error={formErrors.transactionRef}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid (PKR) *"
              type="number"
              placeholder="15000"
              value={formData.submittedAmount}
              onChange={(e) => setFormData({ ...formData, submittedAmount: e.target.value })}
              error={formErrors.submittedAmount}
            />
            <Input
              label="Payment Date *"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Channel / Bank</label>
            <select
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white"
            >
              <option value="Meezan Bank">Meezan Bank Ltd</option>
              <option value="Raast">Raast Direct Instant Transfer</option>
              <option value="1Link 1Bill">1Link 1Bill / ATM Transfer</option>
              <option value="JazzCash">JazzCash Corporate</option>
              <option value="Easypaisa">Easypaisa Corporate</option>
            </select>
          </div>

          <Input
            label="Receipt Screenshot / Document URL"
            placeholder="https://storage.eduerp.pk/receipts/..."
            value={formData.documentUrl}
            onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
          />

          <Input
            label="Additional Notes (Optional)"
            placeholder="Any extra details for the provider finance team"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
