# Module 09: Leave Management & Entitlement Ledger — Technical Architecture & Audit Specification (Phase 1 Foundation)

> [!NOTE]
> **Production Readiness & Audit Baseline**:
> This document details the database architecture, policy precedence engine, probation entitlement calculation, transactional balance ledger, multi-shift readiness, year-end readiness, and audit capabilities for **Leave Management Phase 1**.

---

## 1. Architectural Blueprint

```mermaid
flowchart TD
    subgraph Configuration Layer
        LT[Leave Types Master\n(Paid/Unpaid, Units, Docs)]
        LP[Leave Policies & Rules\n(Effective-Dated, Multi-Rule)]
        PCE[Probation & Confirmation Engine\n(Live HR Status Validation)]
    end

    subgraph Assignment & Precedence Hierarchy
        LPA[Policy Assignments]
        PR[6-Level Precedence Engine\n(Override > Direct > Dept > Desig > EmpType > Default)]
    end

    subgraph Transactional Entitlement Ledger
        Wizard[Annual Bulk Allocation Wizard\n(Duplicate Protection & Recalc Flags)]
        ELE[Employee Leave Entitlement Summary]
        LLT[Double-Entry Ledger Transactions\n(Continuous Before/After Chain)]
        MBA[Manual Balance Adjustments\n(Policy Negative Guard & Mandatory Reason)]
    end

    subgraph Governance & Architectural Readiness
        Audit[Enriched Audit Trail\n(Actor Attribution & Human Diffs)]
        MultiShift[Multi-Shift Readiness\n(Shift/Hourly Granularity)]
        YearEnd[Year-End Rollover Readiness\n(Carry-Forward/Encashment Rules)]
    end

    LT --> LP
    LP --> LPA
    LPA --> PR --> Wizard
    PCE --> PR

    Wizard --> ELE & LLT
    MBA --> ELE & LLT
    LLT --> Audit

    LT & LP -.-> MultiShift & YearEnd
```

---

## 2. Phase 1 Scope Verification Matrices

### A. IMPLEMENTED & FULLY VERIFIED (Phase 1)

| Sub-System | Verification Details | Route / Entry Point |
| :--- | :--- | :--- |
| **Leave Types Master** | Configurable categories (Paid/Unpaid, Unlimited flag, min leave unit, Full/Half/Shift/Hourly units, attachment requirements with day threshold, unique code validation, deactivation protection). | `/admin/hr/leaves/types` |
| **Leave Policies & Rules** | Versioned effective-dated policies (`effectiveFrom`, `effectiveTo`), multiple leave type bindings, negative balance rules, default school policy fallback. | `/admin/hr/leaves/policies` |
| **Probation & Confirmation Rules** | Live HR confirmation status evaluation (`PROBATION`, `EXTENDED_PROBATION`, `CONFIRMED`). Strict business rule: date passing alone does NOT release confirmation-based entitlement. | `/admin/hr/leaves/policies` |
| **Policy Assignments** | Bulk assignment by Department, Designation, Employment Type, or Individual Employee. 6-level precedence resolver with live impact preview. | `/admin/hr/leaves/assignments` |
| **Annual Entitlement Allocation** | Multi-step wizard with status flags (`READY`, `ALREADY_ALLOCATED`, `NEEDS_RECALCULATION`, `HAS_OVERRIDE`), duplicate allocation prevention, and safe recalculations. | `/admin/hr/leaves/entitlements` |
| **Transactional Entitlement Ledger** | Double-entry balance calculation where $\text{Available} = \text{Opening} + \text{Allocated} + \text{CarriedForward} + \text{Adjusted} - \text{Used} - \text{Encashed} - \text{Expired}$. Exact continuity $N_{\text{after}} = (N+1)_{\text{before}}$. | `/admin/hr/leaves/employees/[id]` |
| **Negative Balance Protection** | Policy-governed restriction blocking adjustments or usage resulting in negative balance unless explicitly allowed up to `maxNegativeBalance`. Unlimited unpaid leaves handled gracefully. | Server-side validation |
| **Manual Balance Adjustments** | Positive (`ADD`) and negative (`SUBTRACT`) adjustments requiring mandatory justification reason server-side, live projected balance preview, actor attribution, and ledger posting. | `/admin/hr/leaves/employees/[id]` |
| **Governance & Audit Trail** | Immutable log tracking actor attribution (Username/Name, Role, System Engine, Legacy fallback), human-readable change summaries (e.g. `Casual Leave: 10d → 12d (+2d)`), diff cards, and search filters. | `/admin/hr/leaves/audit` |

---

### B. ARCHITECTURALLY READY / FUTURE PHASE INTEGRATIONS

- **Multi-Shift Leave Readiness**:
  - `LeavePolicyRule` and `LeaveLedgerTransaction` models contain `allowShiftWise`, `allowHourly`, and `shiftId` attributes to support leave bookings against specific morning, afternoon, or evening shift blocks without altering core Attendance models.
- **Year-End Rollover Readiness**:
  - `LeavePolicyRule` schema contains `yearEndAction` (`EXPIRE`, `CARRY_FORWARD`, `ENCASH`, `MIXED`), `maxCarryForwardDays`, `carryForwardExpiryMonths`, `maxEncashableDays`, and `minBalanceForEncashment`.

---

### C. NOT YET IMPLEMENTED (Intentionally Deferred to Future Modules / Phases)

The following items are intentionally **out of scope** for Phase 1:
1. **Employee Leave Application Portal** (Self-service leave requests and draft submissions).
2. **Student Leave Application System** (Class teacher / principal approval requests).
3. **Multi-Level Approval Workflow** (Multi-tier hierarchical chains, delegated approvers, escalation timers).
4. **Attendance Module Auto-Integration** (Automatically marking `ON_LEAVE` on daily student/employee roll calls).
5. **Leave Modification & Cancellation** (Post-approval cancellations and duty resumption workflows).
6. **Holiday & Sandwich Leave Processing** (Auto-incorporating weekends/holidays into leave counts).
7. **Year-End Rollover Execution** (Automated annual carry-forward, encashment payout calculation, and expiry rollover).
8. **Attendance-to-Payroll Integration** (Automatic salary deductions for unpaid leaves or threshold absence penalties).
9. **Leave Analytics & Reports** (Aggregated historical leave utilization dashboards).
10. **Notifications & Alerts** (Email/SMS/Push notifications for leave approvals).

---

## 3. Database Models Reference

- `leave_types`: Master categories (Unique on `[tenant_id, code]`).
- `leave_policies`: Versioned policy headers (Unique on `[tenant_id, code]`).
- `leave_policy_rules`: Policy-to-type configuration bindings (Unique on `[leave_policy_id, leave_type_id]`).
- `leave_policy_assignments`: Group and employee policy assignments (Indexed on `[tenant_id, employee_id, effective_from]`).
- `employee_leave_entitlements`: Annual employee balance summaries (Unique on `[tenant_id, employee_id, leave_type_id, leave_year]`).
- `leave_ledger_transactions`: Immutable double-entry balance movement logs (Indexed on `[tenant_id, employee_id, leave_year]`).
- `leave_audit_logs`: Governance audit trail for policy revisions, assignments, and balance adjustments.
