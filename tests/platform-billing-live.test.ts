import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlatformBillingService } from '../src/lib/services/platform-billing-service';
import { prisma } from '../src/lib/db/prisma';

describe('Platform Billing Live PostgreSQL Integration Tests', () => {
  let tenantId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new Error('No active tenant found');
    tenantId = tenant.id;

    // Clean reset for live test isolation
    await prisma.paymentProofSubmission.deleteMany({ where: { tenantId } });
    await prisma.providerInvoice.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('auto-provisions subscription, receiving accounts, and current invoice in PostgreSQL', async () => {
    const overview = await PlatformBillingService.getSubscriptionOverview(tenantId);
    expect(overview.subscription).toBeDefined();
    expect(overview.subscription.planName).toBe('BASE');
    expect(overview.receivingAccounts.length).toBeGreaterThanOrEqual(1);
    expect(overview.currentInvoice).toBeDefined();
    expect(overview.currentInvoice?.status).toBe('UNPAID');
  });

  it('submits payment proof in live PostgreSQL, runs AI analysis, verifies, and records audit trail', async () => {
    const overview = await PlatformBillingService.getSubscriptionOverview(tenantId);
    const invoiceId = overview.currentInvoice!.id;

    // 1. Submit Proof
    const proof = await PlatformBillingService.submitPaymentProof(
      tenantId,
      invoiceId,
      {
        documentUrl: 'https://storage.eduerp.pk/live-proof-sample.png',
        submittedAmount: Number(overview.currentInvoice!.totalPayable),
        paymentDate: new Date(),
        transactionRef: 'LIVE-MEZN-00129',
        bankName: 'Meezan Bank Ltd',
        notes: 'Live integration test submission',
      },
      'usr-admin-01'
    );

    expect(proof.id).toBeDefined();
    expect(proof.verificationStatus).toBe('AI_MATCH');

    // 2. Verify Payment via Provider Service
    const verifyRes = await PlatformBillingService.verifyPayment(
      tenantId,
      proof.id,
      'usr-super-admin',
      true
    );
    expect(verifyRes.approved).toBe(true);

    // 3. Confirm in PostgreSQL
    const updatedInvoice = await prisma.providerInvoice.findUnique({ where: { id: invoiceId } });
    expect(updatedInvoice?.status).toBe('PAID');

    const updatedSub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
    expect(updatedSub?.status).toBe('ACTIVE');
    expect(updatedSub?.lastPaymentDate).toBeDefined();

    // 4. Verify Audit Log Entry
    const audit = await prisma.auditLog.findFirst({
      where: { tenantId, entityType: 'PAYMENT_PROOF', action: 'PAYMENT_VERIFIED' },
      orderBy: { timestamp: 'desc' },
    });
    expect(audit).toBeDefined();
    expect(audit?.changeSummary).toContain('Verified payment');
  });
});
