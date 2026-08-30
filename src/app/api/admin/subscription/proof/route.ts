import { NextRequest, NextResponse } from 'next/server';
import { PlatformBillingService } from '@/lib/services/platform-billing-service';
import { resolveAuthContext } from '@/lib/auth/server-auth';

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { invoiceId, documentUrl, submittedAmount, paymentDate, transactionRef, bankName, notes } = body;

    if (!invoiceId || !transactionRef || !submittedAmount) {
      return NextResponse.json(
        { success: false, error: { message: 'invoiceId, transactionRef, and submittedAmount are required' } },
        { status: 400 }
      );
    }

    const proof = await PlatformBillingService.submitPaymentProof(
      auth.tenantId,
      invoiceId,
      {
        documentUrl: documentUrl || 'https://storage.eduerp.pk/receipts/proof-placeholder.png',
        submittedAmount: Number(submittedAmount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        transactionRef,
        bankName,
        notes,
      },
      auth.userId
    );

    return NextResponse.json({ success: true, data: proof });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to submit payment proof' } },
      { status: 400 }
    );
  }
}
