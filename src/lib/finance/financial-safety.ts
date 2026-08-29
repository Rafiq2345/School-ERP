import { FinancialInvariantError } from '../errors/app-error';

export interface FinancialRecordSummary {
  id: string;
  referenceNo: string;
  paidAmount: number;
  hasPayments: boolean;
  isPostedToGL: boolean;
  isReconciled: boolean;
  status: string;
}

export interface BulkDeletionPreview {
  totalRequested: number;
  eligibleCount: number;
  protectedCount: number;
  eligibleIds: string[];
  protectedRecords: Array<{
    id: string;
    referenceNo: string;
    reason: string;
  }>;
}

export class FinancialSafetyEngine {
  /**
   * Asserts that a financial record is safe for deletion or modification.
   * Throws FinancialInvariantError if the record is locked by payments or accounting entries.
   */
  public static assertRecordMutable(record: FinancialRecordSummary): void {
    if (record.paidAmount > 0) {
      throw new FinancialInvariantError(
        `Financial record [${record.referenceNo}] is protected: Paid amount (Rs. ${record.paidAmount}) exists. Use formal Reversal workflow.`
      );
    }

    if (record.hasPayments) {
      throw new FinancialInvariantError(
        `Financial record [${record.referenceNo}] is protected: Linked payment receipts exist.`
      );
    }

    if (record.isPostedToGL) {
      throw new FinancialInvariantError(
        `Financial record [${record.referenceNo}] is protected: Already posted to General Ledger.`
      );
    }

    if (record.isReconciled) {
      throw new FinancialInvariantError(
        `Financial record [${record.referenceNo}] is protected: Reconciled with bank statement.`
      );
    }
  }

  /**
   * Phase 1: Previews a bulk deletion batch, categorizing records into eligible vs protected.
   */
  public static previewBulkDeletion(records: FinancialRecordSummary[]): BulkDeletionPreview {
    const eligibleIds: string[] = [];
    const protectedRecords: Array<{ id: string; referenceNo: string; reason: string }> = [];

    for (const record of records) {
      if (record.paidAmount > 0) {
        protectedRecords.push({
          id: record.id,
          referenceNo: record.referenceNo,
          reason: `Paid amount of Rs. ${record.paidAmount} exists`,
        });
      } else if (record.hasPayments) {
        protectedRecords.push({
          id: record.id,
          referenceNo: record.referenceNo,
          reason: 'Linked payment receipts exist',
        });
      } else if (record.isPostedToGL) {
        protectedRecords.push({
          id: record.id,
          referenceNo: record.referenceNo,
          reason: 'Posted to General Ledger',
        });
      } else if (record.isReconciled) {
        protectedRecords.push({
          id: record.id,
          referenceNo: record.referenceNo,
          reason: 'Reconciled in bank statement',
        });
      } else {
        eligibleIds.push(record.id);
      }
    }

    return {
      totalRequested: records.length,
      eligibleCount: eligibleIds.length,
      protectedCount: protectedRecords.length,
      eligibleIds,
      protectedRecords,
    };
  }

  /**
   * Calculates zero-balance voucher scholarship settlement metadata ensuring zero cash impact.
   */
  public static calculateZeroBalanceSettlement(voucher: {
    id: string;
    subtotal: number;
    discountAmount: number;
    netPayable: number;
  }) {
    if (voucher.netPayable > 0) {
      throw new FinancialInvariantError(
        `Cannot execute Zero-Balance settlement: Net payable is Rs. ${voucher.netPayable} (must be 0.00).`
      );
    }

    return {
      voucherId: voucher.id,
      settledAmount: 0.0,
      discountConcessionAmount: voucher.discountAmount,
      cashImpact: 0.0, // Invariant: $0.00 cash inflow
      status: 'SETTLED_ZERO_BALANCE',
      glAccountingDebit: 'Scholarship & Concession Expense',
      glAccountingCredit: 'Student Fee Receivable',
    };
  }
}
