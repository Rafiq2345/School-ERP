import { describe, it, expect } from 'vitest';
import { FinancialSafetyEngine, FinancialRecordSummary } from '../src/lib/finance/financial-safety';
import { FinancialInvariantError } from '../src/lib/errors/app-error';

describe('Financial Safety Rules & Invariants', () => {
  it('should reject hard deletion of records with paid amounts or payments', () => {
    const paidRecord: FinancialRecordSummary = {
      id: 'vch-1',
      referenceNo: 'VCH-2026-001',
      paidAmount: 2500,
      hasPayments: true,
      isPostedToGL: true,
      isReconciled: false,
      status: 'PARTIALLY_PAID',
    };

    expect(() => FinancialSafetyEngine.assertRecordMutable(paidRecord)).toThrow(FinancialInvariantError);
  });

  it('should allow deletion of clean, unpaid, draft financial records', () => {
    const cleanRecord: FinancialRecordSummary = {
      id: 'vch-2',
      referenceNo: 'VCH-2026-002',
      paidAmount: 0,
      hasPayments: false,
      isPostedToGL: false,
      isReconciled: false,
      status: 'DRAFT',
    };

    expect(() => FinancialSafetyEngine.assertRecordMutable(cleanRecord)).not.toThrow();
  });

  it('should accurately preview two-phase bulk deletion batches', () => {
    const batch: FinancialRecordSummary[] = [
      { id: 'v1', referenceNo: 'V1', paidAmount: 0, hasPayments: false, isPostedToGL: false, isReconciled: false, status: 'DRAFT' },
      { id: 'v2', referenceNo: 'V2', paidAmount: 1500, hasPayments: true, isPostedToGL: false, isReconciled: false, status: 'PAID' },
      { id: 'v3', referenceNo: 'V3', paidAmount: 0, hasPayments: false, isPostedToGL: true, isReconciled: false, status: 'UNPAID' },
      { id: 'v4', referenceNo: 'V4', paidAmount: 0, hasPayments: false, isPostedToGL: false, isReconciled: false, status: 'UNPAID' },
    ];

    const preview = FinancialSafetyEngine.previewBulkDeletion(batch);

    expect(preview.totalRequested).toBe(4);
    expect(preview.eligibleCount).toBe(2);
    expect(preview.protectedCount).toBe(2);
    expect(preview.eligibleIds).toEqual(['v1', 'v4']);
    expect(preview.protectedRecords.length).toBe(2);
    expect(preview.protectedRecords[0].referenceNo).toBe('V2');
    expect(preview.protectedRecords[1].referenceNo).toBe('V3');
  });

  it('should process zero-balance voucher scholarship settlements with zero cash impact', () => {
    const scholarshipVoucher = {
      id: 'vch-100-scholarship',
      subtotal: 5000,
      discountAmount: 5000,
      netPayable: 0,
    };

    const settlement = FinancialSafetyEngine.calculateZeroBalanceSettlement(scholarshipVoucher);

    expect(settlement.voucherId).toBe('vch-100-scholarship');
    expect(settlement.cashImpact).toBe(0.0); // Zero fake cash generated!
    expect(settlement.discountConcessionAmount).toBe(5000);
    expect(settlement.status).toBe('SETTLED_ZERO_BALANCE');
    expect(settlement.glAccountingDebit).toBe('Scholarship & Concession Expense');
    expect(settlement.glAccountingCredit).toBe('Student Fee Receivable');
  });

  it('should reject zero-balance settlement calculation on vouchers with remaining balance', () => {
    const standardVoucher = {
      id: 'vch-standard',
      subtotal: 5000,
      discountAmount: 1000,
      netPayable: 4000,
    };

    expect(() => FinancialSafetyEngine.calculateZeroBalanceSettlement(standardVoucher)).toThrow(
      FinancialInvariantError
    );
  });
});
