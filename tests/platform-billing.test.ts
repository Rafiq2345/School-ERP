import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformBillingService } from '../src/lib/services/platform-billing-service';
import { prisma } from '../src/lib/db/prisma';

vi.mock('../src/lib/db/prisma', () => {
  const mockPrisma = {
    tenantSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    providerReceivingAccount: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    providerInvoice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentProofSubmission: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

describe('Platform Billing & Subscription Unit Tests', () => {
  const tenantId = 'tenant-test-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates active subscription and seeds default invoice if none exist', async () => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    vi.mocked(prisma.tenantSubscription.findUnique).mockResolvedValue({
      id: 'sub-01',
      tenantId,
      planName: 'BASE',
      billingCycle: 'MONTHLY',
      baseFee: 15000 as any,
      currency: 'PKR',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      gracePeriodDays: 7,
      showHistoryToSchool: true,
      suspendedAt: null,
      lastPaymentDate: null,
      createdAt: now,
      updatedAt: now,
    });

    vi.mocked(prisma.providerReceivingAccount.findMany).mockResolvedValue([
      {
        id: 'acc-01',
        bankName: 'Meezan Bank Ltd',
        accountTitle: 'EduERP Technologies (Pvt) Ltd',
        accountNumber: '0101-0105678901',
        iban: 'PK36MEZN0001010105678901',
        raastId: 'billing@eduerp.pk',
        instructions: 'Test instructions',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    vi.mocked(prisma.providerInvoice.findFirst).mockResolvedValue({
      id: 'inv-01',
      invoiceNo: 'INV-2026-0001',
      tenantId,
      subscriptionId: 'sub-01',
      billingPeriod: 'August 2026',
      issueDate: now,
      dueDate: periodEnd,
      graceUntil: null,
      amount: 15000 as any,
      taxAmount: 0 as any,
      discountAmount: 0 as any,
      previousBalance: 0 as any,
      totalPayable: 15000 as any,
      paidAmount: 0 as any,
      status: 'UNPAID',
      providerNotes: null,
      schoolNotes: 'Base Fee',
      createdAt: now,
      updatedAt: now,
      proofs: [],
    } as any);

    vi.mocked(prisma.providerInvoice.findMany).mockResolvedValue([]);

    const overview = await PlatformBillingService.getSubscriptionOverview(tenantId);
    expect(overview.subscription.status).toBe('ACTIVE');
    expect(overview.currentInvoice?.invoiceNo).toBe('INV-2026-0001');
    expect(overview.receivingAccounts.length).toBe(1);
  });

  it('submits payment proof with assistive AI extraction confidence score', async () => {
    const now = new Date();
    vi.mocked(prisma.providerInvoice.findFirst).mockResolvedValue({
      id: 'inv-01',
      invoiceNo: 'INV-2026-0001',
      tenantId,
      totalPayable: 15000 as any,
    } as any);

    vi.mocked(prisma.paymentProofSubmission.create).mockResolvedValue({
      id: 'proof-01',
      tenantId,
      invoiceId: 'inv-01',
      documentUrl: 'https://storage.eduerp.pk/receipt.png',
      submittedAmount: 15000 as any,
      paymentDate: now,
      transactionRef: 'MEZN-998877',
      bankName: 'Meezan Bank',
      notes: null,
      submittedByUserId: 'usr-admin-01',
      verificationStatus: 'AI_MATCH',
      aiConfidenceScore: 0.95 as any,
      aiExtractedDataJson: null,
      verifiedByUserId: null,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await PlatformBillingService.submitPaymentProof(
      tenantId,
      'inv-01',
      {
        documentUrl: 'https://storage.eduerp.pk/receipt.png',
        submittedAmount: 15000,
        paymentDate: now,
        transactionRef: 'MEZN-998877',
      },
      'usr-admin-01'
    );

    expect(result.verificationStatus).toBe('AI_MATCH');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('verifies payment and restores access', async () => {
    const now = new Date();
    vi.mocked(prisma.paymentProofSubmission.findFirst).mockResolvedValue({
      id: 'proof-01',
      tenantId,
      invoiceId: 'inv-01',
      submittedAmount: 15000 as any,
      invoice: {
        id: 'inv-01',
        invoiceNo: 'INV-2026-0001',
        totalPayable: 15000 as any,
      },
    } as any);

    const verifyRes = await PlatformBillingService.verifyPayment(tenantId, 'proof-01', 'usr-super-admin', true);
    expect(verifyRes.approved).toBe(true);
    expect(prisma.paymentProofSubmission.update).toHaveBeenCalledWith({
      where: { id: 'proof-01' },
      data: expect.objectContaining({ verificationStatus: 'VERIFIED' }),
    });
    expect(prisma.providerInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-01' },
      data: expect.objectContaining({ status: 'PAID' }),
    });
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });
  });
});
