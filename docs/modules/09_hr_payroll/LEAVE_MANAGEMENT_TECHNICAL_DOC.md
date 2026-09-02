# Module 09: Leave Management & Entitlement Ledger — Technical Architecture & Audit Specification

> [!NOTE]
> **Production Readiness & Audit Baseline**:
> This document details the database architecture, policy precedence engine, probation entitlement calculation, transactional balance ledger, multi-shift duty leave resolution, employee leave application and validation engine, **Dynamic Multi-Level Approval Workflow Architecture**, **Final Approval Entitlement Ledger Deduction**, and **Attendance Auto-Integration (`ON_LEAVE`)** for **Leave Management Phase 1 & Phase 2 (Steps 1, 2 & 3)**.

---

## 1. Architectural Blueprint

```mermaid
flowchart TD
    subgraph Configuration Layer (Phase 1)
        LT[Leave Types Master
(Paid/Unpaid, Units, Docs)]
        LP[Leave Policies & Rules
(Effective-Dated, Multi-Rule)]
        PCE[Probation & Confirmation Engine
(Live HR Status Validation)]
    end

    subgraph Assignment & Precedence Hierarchy (Phase 1)
        LPA[Policy Assignments]
        PR[6-Level Precedence Engine
(Override > Direct > Dept > Desig > EmpType > Default)]
    end

    subgraph Entitlement Ledger & Adjustments (Phase 1 & Phase 2 Step 3)
        Wizard[Annual Bulk Allocation Wizard
(Duplicate Protection & Recalc Flags)]
        ELE[Employee Leave Entitlement Summary]
        LLT[Double-Entry Ledger Transactions
(LEAVE_USAGE Deduction on Final Approval)]
        MBA[Manual Balance Adjustments
(Policy Negative Guard & Mandatory Reason)]
    end

    subgraph Applications & Validation Engine (Phase 2 Step 1)
        LAF[Leave Application Form
(Employee Selection & Scope Selector)]
        WS[Work Schedule Service
(Multi-Shift Duty Resolution)]
        CAL[Central School Calendar
(Holiday & Weekly-Off Exclusions)]
        LCE[Leave Calculation Engine
(Working Units, Live Balance, Overlap & Attachment Validation)]
        LAPP[Leave Applications DB
(Drafts, Pending, Snapshots, Sequential LR-YYYY-XXXXXX)]
    end

    subgraph Dynamic Multi-Level Approval Workflows (Phase 2 Step 2)
        LAW[Approval Workflows Master
(Ordered Steps & Roles/Designations)]
        LAWR[Workflow Precedence Engine
(Override > Direct > Dept > Desig > EmpType > LeaveType > Default)]
        LAI[Approval Instances & Stepper
(Immutable Workflow Snapshot, Pending Level 1)]
        INBOX[Approval Inbox
(Pending for Me / All Pending & Quick Actions)]
        AA[Approver Actions Engine
(Approve, Reject, Send Back, Clarification Inquiries)]
    end

    subgraph Attendance & Shift Integration (Phase 2 Step 3)
        ATT[Daily Employee Attendance Roster
(Morning Shift ON_LEAVE / Afternoon Shift PRESENT)]
        REG[Monthly Attendance Register
(LV Badge on Day, 0 Absences, Exact 0.5d / 1.0d Quantity)]
        AAT[Employee Attendance Audit Log
(Correction / System Linkage Audit)]
    end

    subgraph Governance & Audit Trail
        Audit[Enriched Audit Trail
(Actor Attribution, Diffs & History Timeline)]
    end

    LT --> LP
    LP --> LPA
    LPA --> PR --> Wizard
    PCE --> PR

    Wizard --> ELE & LLT
    MBA --> ELE & LLT
    LLT --> Audit

    LAF --> LCE
    WS --> LCE
    CAL --> LCE
    ELE --> LCE
    LCE --> LAPP
    
    LAPP --> LAWR --> LAI
    LAW --> LAWR
    LAI --> INBOX --> AA
    AA --> LAI
    AA --> Audit
    LAPP --> Audit

    AA -- Final Approval --> LLT
    AA -- Final Approval --> ATT
    ATT --> REG
    ATT --> AAT
    AAT --> Audit
```

---

## 2. Implemented Scope Verification Matrices

### A. IMPLEMENTED & FULLY VERIFIED (Phase 1 & Phase 2 Complete)

| Sub-System | Verification Details | Route / Entry Point |
| :--- | :--- | :--- |
| **Leave Types Master** | Configurable categories (Paid/Unpaid, Unlimited flag, min leave unit, Full/Half/Shift/Hourly units, attachment requirements with day threshold, unique code validation, deactivation protection). | `/admin/hr/leaves/types` |
| **Leave Policies & Rules** | Versioned effective-dated policies (`effectiveFrom`, `effectiveTo`), multiple leave type bindings, negative balance rules, default school policy fallback. | `/admin/hr/leaves/policies` |
| **Probation & Confirmation Rules** | Live HR confirmation status evaluation (`PROBATION`, `EXTENDED_PROBATION`, `CONFIRMED`). Strict business rule: date passing alone does NOT release confirmation-based entitlement. | `/admin/hr/leaves/policies` |
| **Policy Assignments** | Bulk assignment by Department, Designation, Employment Type, or Individual Employee. 6-level precedence resolver with live impact preview. | `/admin/hr/leaves/assignments` |
| **Annual Entitlement Allocation** | Multi-step wizard with status flags (`READY`, `ALREADY_ALLOCATED`, `NEEDS_RECALCULATION`, `HAS_OVERRIDE`), duplicate allocation prevention, and safe recalculations. | `/admin/hr/leaves/entitlements` |
| **Transactional Entitlement Ledger** | Double-entry balance calculation where $\\text{Available} = \\text{Opening} + \\text{Allocated} + \\text{CarriedForward} + \\text{Adjusted} - \\text{Used} - \\text{Encashed} - \\text{Expired}$. Exact continuity $N_{\\text{after}} = (N+1)_{\\text{before}}$. | `/admin/hr/leaves/employees/[id]` |
| **Negative Balance Protection** | Policy-governed restriction blocking adjustments or usage resulting in negative balance unless explicitly allowed up to `maxNegativeBalance`. Unlimited unpaid leaves handled gracefully. | Server-side validation |
| **Manual Balance Adjustments** | Positive (`ADD`) and negative (`SUBTRACT`) adjustments requiring mandatory justification reason server-side, live projected balance preview, actor attribution, and ledger posting. | `/admin/hr/leaves/employees/[id]` |
| **Employee Leave Applications** | Self-service & admin application creation across Full Day, Half Day (First/Second Half), Multi-Shift Duty Segments, and Hourly Short Leave. Includes draft saving, unique request numbers (`LR-YYYY-XXXXXX`), and cancellation. | `/admin/hr/leaves/applications`, `/new`, `/[id]` |
| **Multi-Shift Duty Integration** | Dynamic resolution of employee's actual scheduled shifts via `WorkScheduleService` (Single, Double, Triple shift duties). Relationally stores selected shifts and calculates fractional day quantities ($0.5\\text{d}$, $0.33\\text{d}$). | `/admin/hr/leaves/applications/new` |
| **Hourly / Short Leave Engine** | Start/End time duration calculation within scheduled shift duty hours, standard workday fraction calculation, and validation preventing $start \\ge end$. | Server-side calculation engine |
| **Live Balance & Overlap Engine** | Live effective requestable balance calculation (subtracting active pending requests without double-counting). Comprehensive overlap detection across dates, half-days, specific shifts, and hourly time ranges. | Server-side calculation engine |
| **Document Attachment Enforcement** | Enforces mandatory document/medical certificate upload when requested leave duration exceeds policy threshold. | Server-side & form validation |
| **Dynamic Approval Workflows Master** | Multi-workflow configuration (`LeaveApprovalWorkflow`) with ordered sequential steps (`LeaveApprovalWorkflowStep`), approver sources (`ROLE`, `USER`, `DESIGNATION`, `DEPARTMENT_HEAD`), auto-approval windows, and applicability rules. | `/admin/hr/leaves/workflows` |
| **Workflow Precedence Resolution** | Dynamic resolution evaluating 6-level hierarchy: Individual Override > Direct Employee > Department > Designation > Employment Type > Leave Type Specific > Institutional Default. | `LeaveWorkflowService.resolveWorkflowForApplication` |
| **Immutable Workflow Snapshotting** | At application submission, an immutable `LeaveRequestApprovalInstance` is generated with frozen workflow metadata and active steps. Future master edits do not alter historical requests. | `LeaveApprovalService.initializeApprovalInstance` |
| **Step Execution State Machine** | Multi-tier ordered progression: Step 1 initialized as `PENDING` while Step 2+ set to `WAITING`. Step 1 approve automatically transitions Step 2 to `PENDING`. Final step approval transitions request to `APPROVED`. | `LeaveApprovalService.processApproverAction` |
| **Comprehensive Approver Actions** | Supports `APPROVE`, `REJECT` (mandatory remarks; skips remaining steps and halts workflow), `SEND_BACK` (returns for applicant edit), `REQUEST_CLARIFICATION` (inquiry question recorded and answered by applicant). | `/admin/hr/leaves/applications/[id]/approve` |
| **Approval Inbox** | Unified review dashboard (`/admin/hr/leaves/approvals`) with "Actionable by Me" vs "All Pending" tabs, department/type/search filters, and quick action dialog modal. | `/admin/hr/leaves/approvals` |
| **Final Approval Ledger Deduction** | Atomically creates exactly ONE immutable `LEAVE_USAGE` ledger transaction on Step 3 Final Approval. Guaranteed idempotency prevents double deductions upon replay. | `LeaveEntitlementService.recordLeaveUsageInTx` |
| **Attendance Auto-Integration** | Final approved leave automatically updates scheduled shift segment in Employee Attendance to `ON_LEAVE`. Preserves other active duty shifts on double/triple shift days. | `LeaveAttendanceIntegrationService` |
| **Monthly Register Display & Safety** | Monthly matrix displays `LV` badge on affected date, preserves $0$ unexcused absences, tracks worked hours accurately, and maintains $0.5\text{d}$ quantity safety for downstream consumers. | `/admin/attendance/employees/register` |
| **Governance & Audit Trail** | Immutable log tracking actor attribution (Username/Name, Role, System Engine), human-readable change summaries, diff cards, and search filters across all configuration, approval, ledger, and attendance events. | `/admin/hr/leaves/audit` |
| **Payroll Deduction Foundation (Phase 3 Step 1)** | Unpaid leave deduction contract layer: `PayrollDeductionPolicy`, `PayrollDeductionInput`, and `PayrollDeductionAuditLog`. Final approval of unpaid leave automatically creates pending deduction inputs with monthly period derivation, strict idempotency, and audit logging. Monetary amount remains null pending full Payroll module. | `PayrollDeductionInputService`, `PayrollDeductionPolicyService` |

---

### B. NOT YET IMPLEMENTED (Deferred to Future Phases / Next Steps)

| Sub-System | Planned Phase | Notes |
| :--- | :--- | :--- |
| **Payroll Base Salary & Hourly Rate Calculation** | Phase 3 (Step 2+) | Base salary derivation, per-day rate computation, hourly deduction rate calculation, and net payroll deduction execution once Payroll module is active. |
| **Biometric Punch Synchronization** | Phase 3 | Hardware webhook ingestion and punch-time conflict resolution against approved leave intervals. |

---

## 3. Payroll Deduction Foundation Architecture (Phase 3 Step 1)

### A. Data Models & Entities
1. **`PayrollDeductionPolicy`**:
   - Configurable deduction rules per tenant and leave type (e.g. `UNPAID_LEAVE`, `LATE_ARRIVAL`).
   - Calculation bases: `CALENDAR_DAYS` (1/30th), `WORKING_DAYS` (1/working days), `HOURLY_RATE`.
   - Effective-dated with active status flags and audit attribution.
2. **`PayrollDeductionInput`**:
   - Represents an unfulfilled/pending deduction feed item for the downstream Payroll engine.
   - Status lifecycle: `PENDING` $\rightarrow$ `APPLIED` $\rightarrow$ `REVERSED` $\rightarrow$ `CANCELLED`.
   - Immutable evidence snapshot: captures leave application ID, employee, leave type, policy used, requested days, and calculation evidence.
   - `deductionAmount`: strictly `null` in Phase 3 Step 1 (monetary valuation deferred to Payroll module execution).
3. **`PayrollDeductionAuditLog`**:
   - Append-only immutable governance log tracking deduction events (`GENERATED`, `APPLIED`, `REVERSED`, `CANCELLED`).

### B. Integration & Lifecycle Guards
- **Final Approval Trigger**: Triggered inside `LeaveApprovalService` upon final step approval:
  ```typescript
  if (!application.isPaid) {
    await PayrollDeductionInputService.generateForApprovedLeave(
      tx,
      tenantId,
      applicationId,
      actorUserId
    );
  }
  ```
- **Paid Leave Skip**: Paid leaves (`isPaid = true`) bypass deduction input generation completely (0 deduction records created).
- **Graceful Unconfigured Policy Handling**: If no active `PayrollDeductionPolicy` is configured for the unpaid leave type, the service skips generation gracefully with a warning log and does not block approval.
- **Strict Idempotency**: Unique constraint `@@unique([tenantId, leaveApplicationId, payrollPeriodStart])` ensures re-running or retrying approval returns the existing deduction record without duplicate generation.
- **Reversal Capability**: `reverseDeductionInput` transitions `PENDING`/`APPLIED` inputs to `REVERSED` with a mandatory reason and audit entry without hard deletion.

---

## 4. Approval & Attendance Integration Invariants

1. **Strict Final Approval Gate**:
   - Only **FINAL APPROVED** (`APPROVED`) leave applications can affect the Entitlement Ledger (`LEAVE_USAGE`) and Employee Attendance (`ON_LEAVE`).
   - `DRAFT`, `PENDING_APPROVAL`, `REJECTED`, `SENT_BACK`, and `CANCELLED` requests produce **ZERO** ledger transactions and **ZERO** attendance changes.
2. **Double-Deduction Protection (Idempotency)**:
   - Final approval execution is strictly idempotent. Repeated approver action submissions or batch synchronization routines verify existing `LEAVE_USAGE` ledger records and attendance links, preventing duplicate balance deductions.
3. **Multi-Shift Duty Isolation**:
   - When an employee working a multiple-shift duty schedule (e.g. Morning Shift + Afternoon Shift) takes leave for a specific shift segment, only that selected segment is marked `ON_LEAVE`. Remaining shifts remain active duty, unmarked, and editable.
4. **Quantity Safety Invariant**:
   - A $0.5\\text{d}$ specific-shift leave is preserved strictly as $0.5\\text{d}$ in entitlement consumption, leave analytics, and numeric totals. The Monthly Register `LV` day badge serves as a visual indicator and is decoupled from fractional day quantities.
5. **Absence Immunity Invariant**:
   - Approved leave is never categorized as an unexcused absence in monthly registers or dashboard statistics (`absentCount = 0`, `absentDays = 0`).

---

## 4. Verified Real-World Reference Case

- **Employee**: Fatima Zahra (`EMP-102`, Islamic Studies Department)
- **Schedule**: Double-Shift Teaching Duty (`WS-TEACHING-2X`: Morning `08:00–14:00`, Afternoon `12:00–16:00`)
- **Leave Request**: `LR-2026-000148` (Date: `2026-09-02`, Scope: `SPECIFIC_SHIFT`, Selected: Morning Shift, Quantity: `0.5d` Casual Leave)
- **Approval Flow**:
  1. Department Incharge Review $\\longrightarrow$ **APPROVED**
  2. Principal Approval $\\longrightarrow$ **APPROVED**
  3. HR Office Final Record $\\longrightarrow$ **FINAL APPROVED**
- **Ledger Verification**: `Allocated: 3.0d`, `Used: 0.5d`, `Available: 2.5d`, exactly **1** `LEAVE_USAGE` record (`amount: -0.5`).
- **Attendance Verification**: Morning Shift $\\longrightarrow$ `ON_LEAVE` (`Casual Leave`, `LR-2026-000148`), Afternoon Shift $\\longrightarrow$ `PRESENT` ($4\\text{h}$ worked).
- **Monthly Register**: September 2026 Day 2 shows `LV` badge, `leave = 0.5d`, `absent = 0d`.

---

## 5. Attendance-to-Payroll Rule Engine & Reconciliation (Phase 3 Step 2)

### A. Data Models & Entities
1. **`PayrollDeductionPolicy` (Extended)**:
   - Configurable rule parameters:
     - `lateTriggerCount`: Number of late arrivals before triggering deduction (e.g. 3).
     - `lateGraceMinutes`: Grace threshold in minutes before flagging late (e.g. 15m).
     - `lateDeductionUnit`: Fractional or full-day deduction unit applied per cycle (e.g. 1.00d, 0.50d).
     - `absenceDeductionUnit`: Configurable penalty per unexcused full-day absence (default 1.00d).
     - `halfDayDeductionUnit`: Configurable penalty per half-day absence (default 0.50d).
     - `isDefault`: Boolean flag designating tenant-wide institutional fallback policy.
2. **`PayrollDeductionPolicyAssignment` (New)**:
   - Implements targeted rule assignment across the 6-level hierarchy:
     - Priority 1000: `INDIVIDUAL_OVERRIDE` (`employeeId` + `isOverride=true`)
     - Priority 500: `EMPLOYEE` (`employeeId`)
     - Priority 300: `DEPARTMENT` (`departmentId`)
     - Priority 200: `DESIGNATION` (`designationId`)
     - Priority 100: `EMPLOYMENT_TYPE` / `EMPLOYEE_CATEGORY` (`employmentTypeId` / `employeeCategoryId`)
     - Priority 0: `INSTITUTIONAL_DEFAULT` (`isDefault=true` fallback)
3. **`PayrollDeductionInput` (Extended)**:
   - Source discrimination: `sourceType` (`LEAVE_APPLICATION`, `ATTENDANCE_ABSENCE`, `ATTENDANCE_LATE_ACCUMULATION`, `ATTENDANCE_HALF_DAY`, `ATTENDANCE_EARLY_DEPARTURE`, `ATTENDANCE_SHORT_HOURS`).
   - Attendance context: `attendanceRecordId`, `attendanceDate`, `shiftId`, `deductionSourceKey`.
   - Unique DB constraint: `@@unique([tenantId, deductionSourceKey, payrollPeriodStart])`.
   - Statuses: `PENDING`, `PROCESSED`, `REVERSED`, `CANCELLED`, `SUPERSEDED`.

### B. Business Rules & Reconciliation Invariants
1. **Paid Leave Safety Invariant**:
   - Approved paid leaves (e.g. Fatima Zahra `EMP-102` Casual Leave `LR-2026-000148`) strictly generate **0** deduction inputs.
2. **Unpaid Leave Deduplication**:
   - Shifts covered by approved unpaid leave applications (`isPaid = false`) have their deduction input generated via the Step 1 approval hook (`sourceType = 'LEAVE_APPLICATION'`). The Step 2 attendance engine recognizes this link and skips duplicate absence deduction generation.
3. **Multi-Shift Segment Isolation & Fractional Weights**:
   - For employees scheduled across $N$ shifts on a day, each shift carries a segment weight of $w = 1/N$.
   - An unexcused absence on 1 of 2 shifts generates exactly $0.5\text{d}$ deduction ($1.0 \times 0.5$).
   - An unexcused absence on 1 of 3 shifts generates exactly $0.33\text{d}$ deduction ($1.0 \times 1/3$).
4. **Late Arrival Accumulation & Monthly Period Isolation**:
   - Late occurrences accumulate strictly within their calendar month payroll period (e.g. `September 2026`).
   - For every completed trigger cycle ($K$ lates, where $K = \text{lateTriggerCount}$), a deterministic `ATTENDANCE_LATE_ACCUMULATION` deduction input is generated with detailed calculation evidence citing the late dates and durations.
   - Counters reset cleanly at the start of each new month.
5. **Reconciliation & Reversal on Corrections**:
   - When an attendance record is corrected from `ABSENT` to `PRESENT`, running period reconciliation transitions the prior deduction input to `REVERSED` with an immutable audit entry and reason tracking.
   - Historical deduction records are never hard-deleted.
6. **Strict Idempotency**:
   - Re-running reconciliation multiple times produces zero duplicate deduction inputs.

---

## 6. Year-End Leave Processing Engine (Phase 3 Step 3)

### A. Data Models & Entities
1. **`LeaveYearEndBatch`**:
   - Tracks annual rollover execution batches per tenant and source/target year.
   - Statuses: `COMPLETED`, `REVERSED`.
   - Aggregated metrics: `totalEmployeesScanned`, `totalCarriedForwardDays`, `totalEncashedDays`, `totalExpiredDays`.
   - Execution & Reversal audit attribution: `executedByUserId`, `executedAt`, `reversedByUserId`, `reversedAt`, `reversalReason`.
2. **`LeaveYearEndBatchItem`**:
   - Detailed per-employee, per-leave-type calculation breakdown.
   - Stores `initialBalance`, `carriedForwardDays`, `encashedDays`, `expiredDays`, `finalBalance`, `ruleSnapshot` (JSON), and `status` (`PROCESSED`, `SKIPPED`, `REVERSED`).

### B. Core Business Rules & Invariants
1. **Configurable Year-End Dispositions**:
   - **`EXPIRE`**: Remaining unused balance expires to zero with immutable double-entry ledger deduction (`type = 'EXPIRY'`, `amount = -balance`).
   - **`CARRY_FORWARD`**: Carries forward balance up to configurable `maxCarryForwardDays`. Any excess balance expires. Credited to target leave year entitlement as `carriedForwardDays` without replacing existing upfront allocations.
   - **`ENCASH`**: If balance meets or exceeds `minBalanceForEncashment`, encashes balance up to `maxEncashableDays`. Unused remainder expires. Generates downstream `PayrollDeductionInput` (`sourceType = 'LEAVE_ENCASHMENT'`, `deductionAmount: null`, `status = 'PENDING'`).
   - **`MIXED`**: Carries forward up to `maxCarryForwardDays`, encashes eligible remainder up to `maxEncashableDays`, and expires any excess.
2. **Double-Entry Ledger Integrity**:
   - Balances are continuously chained and never hard-deleted.
   - Closing year records deductions with `CARRY_FORWARD`, `ENCASHMENT`, or `EXPIRY` transactions.
   - Receiving year records addition with `CARRY_FORWARD` transaction.
3. **Idempotency & Reversal Safety**:
   - Multiple executions for the same source leave year are blocked by strict validation guards.
   - Batch reversal posts compensating ledger transactions (`MANUAL_ADJUSTMENT_ADD` on source year, `MANUAL_ADJUSTMENT_SUBTRACT` on target year), transitions downstream encashment payroll inputs to `REVERSED`, and reopens source year entitlements (`status = 'ACTIVE'`).
