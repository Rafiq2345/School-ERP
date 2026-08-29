# School-ERP: Financial Safety Rules & Invariants

## 1. Executive Summary & Integrity Mandate
Financial records in the School ERP govern student fee receivables, cash receipts, bank collections, scholarship settlements, payroll disbursements, and double-entry general ledgers.

To ensure **absolute financial integrity**, the system enforces architectural invariants at the database, service layer, and API levels.

---

## 2. Core Architectural Financial Invariants

### 2.1. Protection of Realized Financial Records (No Blind Deletions)
- **Rule**: Any fee voucher with `paid_amount > 0`, linked `FeePayment` records, or general ledger postings is **HARD-LOCKED**.
- Attempting a standard `DELETE` on a protected voucher will be rejected at the service and database trigger levels with `FINANCIAL_RECORD_PROTECTED`.

### 2.2. Two-Phase Safe Bulk Voucher Deletion
When an administrator requests bulk voucher deletion (e.g. deleting accidentally generated draft batch):
- **Phase 1 (Inspection & Preview)**:
  - Scans all target vouchers.
  - Classifies each into:
    - **`ELIGIBLE_FOR_DELETION`**: Status is `DRAFT` or `UNPAID`, `paid_amount == 0.00`, zero payment receipts linked, zero bank matches, zero GL journals posted.
    - **`PROTECTED_CANNOT_DELETE`**: `paid_amount > 0`, payments linked, reconciled, or closed in accounting period.
  - Generates an itemized preview report detailing eligible counts and blocked voucher numbers with reasons.
- **Phase 2 (Atomic Confirmation)**:
  - Deletes only `ELIGIBLE` vouchers within a single atomic database transaction.
  - Records an audit log with the user ID, timestamp, deletion reason, and count of removed items.

### 2.3. Zero-Payable Voucher Settlement (No Fake Cash Inflows)
- **The Problem**: When a student receives a 100% discount, full sibling concession, or merit scholarship, their fee voucher net payable is `Rs. 0.00`.
- **The Invariant**: **A zero-payable voucher must NEVER generate a cash/bank payment receipt or inflate daily cash collection reports.**
- **The Solution**:
  1. Zero-payable vouchers are processed via a dedicated **`ZeroBalanceVoucherSettlement`** entity.
  2. The voucher status is transitioned to `SETTLED_ZERO_BALANCE` (not `PAID_CASH`).
  3. Accounting Impact:
     - **Debit**: `Scholarship & Fee Concession Expense` (Account Head)
     - **Credit**: `Student Fee Receivable` (Account Head)
     - **Cash / Bank Account is untouched ($0.00 cash impact)**.
  4. Modes Supported:
     - *Automatic Settlement*: Configurable policy auto-settles zero-balance vouchers upon batch generation.
     - *Manual Bulk Settlement*: Review queue allowing finance officers to verify scholarship eligibility before settling.

### 2.4. Controlled Financial Reversals & Adjustments
- **The Invariant**: Paid receipts or posted financial entries cannot be modified in place.
- **The Workflow**:
  1. An authorized user with `BILLING:REVERSE` permission submits a **Reversal Request** specifying:
     - `payment_id` / `voucher_id`
     - Mandatory `reason` (e.g. 'Bank deposit bounced', 'Incorrect payment allocation')
     - Supporting document upload (optional slip/receipt).
  2. Reversal is reviewed and approved by a Senior Finance Admin.
  3. System executes an atomic reversal:
     - Marks `FeePayment.status = 'REVERSED'`.
     - Decrements `FeeVoucher.paid_amount` and restores `balance_amount`.
     - Posts a reversing Journal Entry to General Ledger:
       - **Debit**: `Fee Receivable`
       - **Credit**: `Cash / Bank Account`
     - Writes an immutable record to `FeeReversalLog` and `AuditLog`.

### 2.5. Daily Collection Integrity & Cash Reconciliation
- **Daily Collection Report**:
  $$\text{Daily Collection} = \sum \text{FeePayment.amount} \quad \forall \text{ payments where } \text{status} = \text{CONFIRMED} \land \text{date} = \text{selected\_date}$$
- Settlements from scholarships and zero-balance vouchers are reported in a separate "Non-Cash Concessions & Adjustments" column, guaranteeing that physical cash in the teller drawer matches the ERP cash report down to the cent.

### 2.6. Bank Reconciliation Locking
- Once a payment receipt is matched and reconciled against a bank statement in `BankReconciliation`, it cannot be reversed until the reconciliation period is explicitly unlocked by an authorized Finance Manager.
