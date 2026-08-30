import { prisma } from '../db/prisma';

export interface SubscriptionOverviewDTO {
  subscription: {
    id: string;
    planName: string;
    billingCycle: string;
    baseFee: number;
    currency: string;
    status: 'ACTIVE' | 'PAYMENT_DUE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'MANUALLY_ACTIVATED' | 'EXEMPT';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    gracePeriodDays: number;
    showHistoryToSchool: boolean;
    suspendedAt: Date | null;
    lastPaymentDate: Date | null;
  };
  currentInvoice: {
    id: string;
    invoiceNo: string;
    billingPeriod: string;
    issueDate: Date;
    dueDate: Date;
    graceUntil: Date | null;
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
      paymentDate: Date;
      transactionRef: string;
      bankName: string | null;
      verificationStatus: 'PENDING' | 'AI_MATCH' | 'AI_MISMATCH' | 'NEEDS_MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';
      aiConfidenceScore: number | null;
      rejectionReason: string | null;
      createdAt: Date;
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
    issueDate: Date;
    dueDate: Date;
    totalPayable: number;
    paidAmount: number;
    status: string;
    latestProofStatus: string | null;
  }[];
}

export class PlatformBillingService {
  /**
   * Retrieves subscription overview for a school tenant, auto-initializing seeds if required.
   */
  public static async getSubscriptionOverview(tenantId: string): Promise<SubscriptionOverviewDTO> {
    // 1. Ensure TenantSubscription exists
    let sub = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      sub = await prisma.tenantSubscription.create({
        data: {
          tenantId,
          planName: 'BASE',
          billingCycle: 'MONTHLY',
          baseFee: 15000.0,
          currency: 'PKR',
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodDays: 7,
          showHistoryToSchool: true,
        },
      });
    }

    // 2. Ensure ProviderReceivingAccounts exist
    let receivingAccounts = await prisma.providerReceivingAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (receivingAccounts.length === 0) {
      const defaultAccount = await prisma.providerReceivingAccount.create({
        data: {
          bankName: 'Meezan Bank Ltd',
          accountTitle: 'EduERP Technologies (Pvt) Ltd',
          accountNumber: '0101-0105678901',
          iban: 'PK36MEZN0001010105678901',
          raastId: 'billing@eduerp.pk',
          instructions: 'Please mention your School Invoice Number in payment description/reference.',
          isActive: true,
        },
      });
      receivingAccounts = [defaultAccount];
    }

    // 3. Ensure a Current Provider Invoice exists
    let currentInvoice = await prisma.providerInvoice.findFirst({
      where: { tenantId, status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
      orderBy: { issueDate: 'desc' },
      include: { proofs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!currentInvoice) {
      // Check if there are any invoices at all
      const latestInvoice = await prisma.providerInvoice.findFirst({
        where: { tenantId },
        orderBy: { issueDate: 'desc' },
        include: { proofs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (!latestInvoice) {
        const now = new Date();
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 15);
        const graceDate = new Date(dueDate);
        graceDate.setDate(graceDate.getDate() + 7);

        currentInvoice = await prisma.providerInvoice.create({
          data: {
            invoiceNo: `INV-${now.getFullYear()}-0001`,
            tenantId,
            subscriptionId: sub.id,
            billingPeriod: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
            issueDate: now,
            dueDate,
            graceUntil: graceDate,
            amount: Number(sub.baseFee),
            totalPayable: Number(sub.baseFee),
            paidAmount: 0.0,
            status: 'UNPAID',
            schoolNotes: 'Base School ERP Monthly Subscription Fee',
          },
          include: { proofs: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
      } else {
        currentInvoice = latestInvoice;
      }
    }

    // 4. Compute dynamic subscription status
    let calculatedStatus = sub.status as SubscriptionOverviewDTO['subscription']['status'];
    const now = new Date();

    if (currentInvoice && currentInvoice.status !== 'PAID' && currentInvoice.status !== 'WAIVED') {
      if (currentInvoice.graceUntil && now > currentInvoice.graceUntil) {
        calculatedStatus = 'SUSPENDED';
      } else if (now > currentInvoice.dueDate) {
        calculatedStatus = 'GRACE_PERIOD';
      } else if (now > new Date(currentInvoice.dueDate.getTime() - 5 * 24 * 60 * 60 * 1000)) {
        calculatedStatus = 'PAYMENT_DUE';
      }
    }

    // 5. Fetch invoice history if allowed
    let historyList: SubscriptionOverviewDTO['invoiceHistory'] = [];
    if (sub.showHistoryToSchool) {
      const history = await prisma.providerInvoice.findMany({
        where: { tenantId },
        orderBy: { issueDate: 'desc' },
        include: { proofs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      historyList = history.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        billingPeriod: inv.billingPeriod,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        totalPayable: Number(inv.totalPayable),
        paidAmount: Number(inv.paidAmount),
        status: inv.status,
        latestProofStatus: inv.proofs[0]?.verificationStatus || null,
      }));
    }

    const latestProof = currentInvoice?.proofs[0] || null;
    const outstanding = currentInvoice
      ? Math.max(0, Number(currentInvoice.totalPayable) - Number(currentInvoice.paidAmount))
      : 0;

    return {
      subscription: {
        id: sub.id,
        planName: sub.planName,
        billingCycle: sub.billingCycle,
        baseFee: Number(sub.baseFee),
        currency: sub.currency,
        status: calculatedStatus,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        gracePeriodDays: sub.gracePeriodDays,
        showHistoryToSchool: sub.showHistoryToSchool,
        suspendedAt: sub.suspendedAt,
        lastPaymentDate: sub.lastPaymentDate,
      },
      currentInvoice: currentInvoice
        ? {
            id: currentInvoice.id,
            invoiceNo: currentInvoice.invoiceNo,
            billingPeriod: currentInvoice.billingPeriod,
            issueDate: currentInvoice.issueDate,
            dueDate: currentInvoice.dueDate,
            graceUntil: currentInvoice.graceUntil,
            amount: Number(currentInvoice.amount),
            taxAmount: Number(currentInvoice.taxAmount),
            discountAmount: Number(currentInvoice.discountAmount),
            previousBalance: Number(currentInvoice.previousBalance),
            totalPayable: Number(currentInvoice.totalPayable),
            paidAmount: Number(currentInvoice.paidAmount),
            outstandingAmount: outstanding,
            status: currentInvoice.status as any,
            schoolNotes: currentInvoice.schoolNotes,
            latestProof: latestProof
              ? {
                  id: latestProof.id,
                  documentUrl: latestProof.documentUrl,
                  submittedAmount: Number(latestProof.submittedAmount),
                  paymentDate: latestProof.paymentDate,
                  transactionRef: latestProof.transactionRef,
                  bankName: latestProof.bankName,
                  verificationStatus: latestProof.verificationStatus as any,
                  aiConfidenceScore: latestProof.aiConfidenceScore ? Number(latestProof.aiConfidenceScore) : null,
                  rejectionReason: latestProof.rejectionReason,
                  createdAt: latestProof.createdAt,
                }
              : null,
          }
        : null,
      receivingAccounts: receivingAccounts.map((acc) => ({
        id: acc.id,
        bankName: acc.bankName,
        accountTitle: acc.accountTitle,
        accountNumber: acc.accountNumber,
        iban: acc.iban,
        raastId: acc.raastId,
        instructions: acc.instructions,
      })),
      invoiceHistory: historyList,
    };
  }

  /**
   * Submits a payment screenshot/proof against an invoice.
   */
  public static async submitPaymentProof(
    tenantId: string,
    invoiceId: string,
    data: {
      documentUrl: string;
      submittedAmount: number;
      paymentDate: Date;
      transactionRef: string;
      bankName?: string;
      notes?: string;
    },
    userId: string
  ) {
    const invoice = await prisma.providerInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new Error('Invoice not found or does not belong to this school.');
    }

    // Simulated Assistive AI Receipt Analysis
    // In production, Gemini Multimodal OCR extracts text from documentUrl image
    const expectedAmount = Number(invoice.totalPayable);
    const amountMatches = Math.abs(data.submittedAmount - expectedAmount) < 1.0;
    const hasValidRef = Boolean(data.transactionRef && data.transactionRef.length >= 4);

    let aiStatus: 'AI_MATCH' | 'NEEDS_MANUAL_REVIEW' = 'NEEDS_MANUAL_REVIEW';
    let aiConfidence = 0.65;

    if (amountMatches && hasValidRef) {
      aiStatus = 'AI_MATCH';
      aiConfidence = 0.95;
    }

    const proof = await prisma.paymentProofSubmission.create({
      data: {
        tenantId,
        invoiceId,
        documentUrl: data.documentUrl,
        submittedAmount: data.submittedAmount,
        paymentDate: data.paymentDate,
        transactionRef: data.transactionRef,
        bankName: data.bankName || null,
        notes: data.notes || null,
        submittedByUserId: userId,
        verificationStatus: aiStatus,
        aiConfidenceScore: aiConfidence,
        aiExtractedDataJson: {
          extractedAmount: data.submittedAmount,
          extractedRef: data.transactionRef,
          extractedDate: data.paymentDate,
          extractedBank: data.bankName || 'Meezan Bank',
          matchedInvoiceNo: invoice.invoiceNo,
        },
      },
    });

    // Universal Audit Log
    await this.logAudit({
      tenantId,
      userId,
      action: 'PAYMENT_PROOF_SUBMIT',
      entityType: 'PAYMENT_PROOF',
      entityId: proof.id,
      newValues: {
        invoiceId,
        submittedAmount: data.submittedAmount,
        transactionRef: data.transactionRef,
        aiStatus,
      },
      changeSummary: `Submitted payment proof of PKR ${data.submittedAmount} for invoice ${invoice.invoiceNo}`,
    });

    return proof;
  }

  /**
   * Provider/Super Admin: Verifies or rejects payment proof and restores access.
   */
  public static async verifyPayment(
    tenantId: string,
    proofId: string,
    verifiedByUserId: string,
    approved: boolean,
    rejectionReason?: string
  ) {
    const proof = await prisma.paymentProofSubmission.findFirst({
      where: { id: proofId, tenantId },
      include: { invoice: true },
    });

    if (!proof) {
      throw new Error('Payment proof not found.');
    }

    const now = new Date();

    if (approved) {
      // 1. Mark proof as verified
      await prisma.paymentProofSubmission.update({
        where: { id: proofId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedByUserId,
          verifiedAt: now,
          rejectionReason: null,
        },
      });

      // 2. Mark invoice as PAID
      await prisma.providerInvoice.update({
        where: { id: proof.invoiceId },
        data: {
          status: 'PAID',
          paidAmount: proof.invoice.totalPayable,
        },
      });

      // 3. Restore TenantSubscription to ACTIVE and update period
      const nextPeriodEnd = new Date(now);
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);

      await prisma.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: 'ACTIVE',
          lastPaymentDate: now,
          suspendedAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
        },
      });

      // 4. Restore Tenant status to ACTIVE
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' },
      });

      await this.logAudit({
        tenantId,
        userId: verifiedByUserId,
        action: 'PAYMENT_VERIFIED',
        entityType: 'PAYMENT_PROOF',
        entityId: proofId,
        changeSummary: `Verified payment of PKR ${proof.submittedAmount} for invoice ${proof.invoice.invoiceNo}. Restored school access.`,
      });
    } else {
      // Mark proof as rejected
      await prisma.paymentProofSubmission.update({
        where: { id: proofId },
        data: {
          verificationStatus: 'REJECTED',
          verifiedByUserId,
          verifiedAt: now,
          rejectionReason: rejectionReason || 'Payment receipt details could not be verified.',
        },
      });

      await this.logAudit({
        tenantId,
        userId: verifiedByUserId,
        action: 'PAYMENT_REJECTED',
        entityType: 'PAYMENT_PROOF',
        entityId: proofId,
        changeSummary: `Rejected payment proof for invoice ${proof.invoice.invoiceNo}. Reason: ${rejectionReason || 'Unverified'}`,
      });
    }

    return { success: true, approved };
  }

  /**
   * Central Access Gate: evaluates if tenant subscription is in good standing.
   */
  public static async evaluateTenantSubscriptionGate(tenantId: string): Promise<{
    isRestricted: boolean;
    status: string;
    reason?: string;
  }> {
    const overview = await this.getSubscriptionOverview(tenantId);
    const isSuspended = overview.subscription.status === 'SUSPENDED';

    return {
      isRestricted: isSuspended,
      status: overview.subscription.status,
      reason: isSuspended
        ? 'Your school ERP subscription payment is overdue past the grace period. Access to normal ERP modules is paused.'
        : undefined,
    };
  }

  private static async logAudit(params: {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    newValues?: any;
    changeSummary?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          module: 'CONFIG',
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          newValues: params.newValues || null,
          changeSummary: params.changeSummary || null,
        },
      });
    } catch {
      // Non-blocking
    }
  }
}
