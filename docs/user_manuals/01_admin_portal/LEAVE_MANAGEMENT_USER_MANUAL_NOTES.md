# Module 09: Leave Management & Entitlement Ledger — Admin User Manual Working Notes (Phase 1 Foundation)

> [!NOTE]
> **Working Notes Status**:
> These working notes capture verified, production-ready functionality for **Leave Management Phase 1 (Foundation, Policies, Assignments, Entitlements, Ledger, and Audit)**.
> This document will be consolidated into the final printable client User Manual once the complete end-to-end Leave Management workflow (Applications, Approvals, and Attendance/Payroll Integration) is completed.

---

## 1. Scope & Capability Status

### A. IMPLEMENTED & VERIFIED (Phase 1)
- **Leave Types Master**: Configurable categories (Paid/Unpaid, Unlimited flags, Full/Half/Shift/Hourly units, attachment requirements with day threshold, unique code validation, deactivation protection).
- **Leave Policies**: Versioned, effective-dated policies (`effectiveFrom`, `effectiveTo`), multi-type rule definitions, negative balance limits, consecutive day controls, default school policy fallback.
- **Probation & Confirmation Rules**: Live HR confirmation status evaluation (`PROBATION`, `EXTENDED_PROBATION`, `CONFIRMED`). Planned probation end date alone does NOT release confirmation-based entitlement without actual HR confirmation status.
- **Policy Assignments**: Bulk assignment by Department, Designation, Employment Type, or Individual Employee with 6-level precedence resolution ($	ext{Override} > 	ext{Direct} > 	ext{Department} > 	ext{Designation} > 	ext{Employment Type} > 	ext{Default Policy}$) and live preview.
- **Annual Entitlement Allocation**: Multi-step wizard with status detection (`READY`, `ALREADY_ALLOCATED`, `NEEDS_RECALCULATION`), duplicate allocation prevention, and safe recalculations.
- **Employee Entitlement View**: Employee profile header, active policy indicator, live balance summary (Available, Allocated, Adjusted, Used), and continuous double-entry ledger.
- **Double-Entry Entitlement Ledger**: Transactional balance tracking where $	ext{Available} = 	ext{Opening} + 	ext{Allocated} + 	ext{CarriedForward} + 	ext{Adjustments} - 	ext{Used} - 	ext{Encashed} - 	ext{Expired}$, with strict before/after continuity ($N_{	ext{after}} = (N+1)_{	ext{before}}$).
- **Negative Balance Rules**: Server-enforced policy restrictions preventing negative balances unless explicitly permitted up to `maxNegativeBalance`.
- **Manual Balance Adjustments**: Positive (`ADD`) and negative (`SUBTRACT`) balance modifications with mandatory justification reasons validated server-side, projected balance previews, and actor attribution.
- **Governance Audit Trail**: Immutable log capturing actor attribution (Name, Role, System Engine, Legacy fallback), human-readable value change diffs (e.g. `Casual Leave Balance: 10d → 12d (+2d)`), and advanced search/filters.

---

### B. ARCHITECTURALLY READY / FUTURE (Phase 1 Schema & Engine Prepared)
- **Multi-Shift Leave Requests**: `LeavePolicyRule` and `LeaveLedgerTransaction` support `allowShiftWise`, `allowHourly`, and `shiftId` attributes to support leave applications against specific morning, afternoon, or evening shift blocks without duplicating attendance shift records.
- **Year-End Rollover & Encashment**: Data models include `yearEndAction` (`EXPIRE`, `CARRY_FORWARD`, `ENCASH`, `MIXED`), `maxCarryForwardDays`, `carryForwardExpiryMonths`, `maxEncashableDays`, and `minBalanceForEncashment`.

---

### C. NOT YET IMPLEMENTED (Deferred to Future Phases)
The following features are intentionally out of scope for Phase 1 and will be built in subsequent phases:
- **Employee Leave Application Portal** (Self-service staff requests)
- **Student Leave Application System** (Student/guardian leave requests)
- **Dynamic Multi-Level Approval Workflow** (Approve / Reject / Send Back / Request Clarification chains)
- **Delegated Approvers & Approval Escalation**
- **Attendance Auto-Integration** (Approved Leave $ightarrow$ `ON_LEAVE` roll call status)
- **Leave Modification, Cancellation & Resume Duty**
- **Holiday & Sandwich Leave Processing**
- **Year-End Rollover Execution** (Automated annual carry-forward, encashment payout, and expiry execution)
- **Attendance-to-Payroll Deductions** (Unpaid leave salary deductions and penalty rules)
- **Leave Analytics & Export Reports**
- **Email / SMS / Push Notifications**

---

## 2. Step-by-Step Administrative Guides

### 2.1 Managing Leave Types
**Navigation**: `HR / Payroll > Leave Management > Leave Types` (`/admin/hr/leaves/types`)

1. **Creating a Leave Type**:
   - Click **+ Add Leave Type**.
   - Enter **Leave Type Name** (e.g., *Casual Leave*, *Sick Leave*, *Maternity Leave*).
   - Enter a unique uppercase **Code** (e.g., `CASUAL`, `SICK`, `MATERNITY`).
   - Choose **Paid / Unpaid**:
     - *Paid*: Standard paid benefit.
     - *Unpaid*: Docked/loss-of-pay benefit.
   - Configure **Allocation Units**:
     - *Full Day*: Permitted for standard multi-day or full-day leaves.
     - *Half Day*: Permitted for first-half or second-half leaves.
     - *Shift Wise*: Permitted for specific duty shifts in multi-shift schedules.
     - *Hourly / Short Leave*: Permitted for partial hours with minimum fraction (e.g. 0.13d = 1 hour).
   - Configure **Document Requirements**:
     - Toggle *Attachment Required* and specify the threshold days (e.g. Medical Certificate mandatory for sick leaves $> 2$ days).
   - Click **Create Leave Type**.

2. **Deactivating a Leave Type**:
   - To retire a leave type without breaking historical transactions, click **Deactivate**.
   - Deactivated types cannot be used in new policies but remain visible in historical ledgers.

---

### 2.2 Configuring Leave Policies & Rules
**Navigation**: `HR / Payroll > Leave Management > Policies` (`/admin/hr/leaves/policies`)

1. **Creating a Policy**:
   - Click **+ Create Policy**.
   - Enter **Policy Name**, unique **Code** (e.g., `LP-TEACHING-2026`), and optional **Description**.
   - Set **Effective From** (e.g. `2026-01-01`) and optional **Effective To** (e.g. `2026-12-31`).
   - Toggle **Institutional Default Policy** if this policy serves as the fallback for all employees.
2. **Configuring Policy Rules**:
   - Add one or more Leave Types to the policy.
   - For each leave type:
     - Specify **Annual Entitlement** (e.g., 10 days) or toggle **Unlimited**.
     - Choose **Entitlement Release Timing**:
       - *On Joining*: Full annual quota granted upfront on appointment.
       - *Monthly Accrual*: Accrued evenly each month ($1/12	ext{th}$ per month).
       - *On Confirmation*: Available only once the employee is formally confirmed by HR.
       - *Prorated After Confirmation*: Calculated based on remaining months in the year after confirmation.
     - Choose **Probation Treatment**:
       - *Allowed Full*: Normal policy quota applies during probation.
       - *Limited Days*: Capped at a specific number of days (e.g. max 3 days casual leave).
       - *Not Allowed*: Zero entitlement granted while employee status is `PROBATION` or `EXTENDED_PROBATION`.
       - *Unpaid Only*: Only unpaid leave allowed during probation.
     - Set **Negative Balance Controls**:
       - Toggle *Allow Negative Balance* and specify *Max Negative Days* (e.g. 2 days) if advances are allowed.
   - Click **Save Leave Policy**.

---

### 2.3 Assigning Policies to Staff & Departments
**Navigation**: `HR / Payroll > Leave Management > Policy Assignments` (`/admin/hr/leaves/assignments`)

1. **Bulk Policy Assignment**:
   - Select the target **Leave Policy**.
   - Choose **Assignment Scope**:
     - *Department*: Assigns to all current and future employees in the department (e.g. Teaching Staff).
     - *Designation*: Assigns to a specific job title (e.g. Senior Teachers).
     - *Employment Type*: Assigns by contract type (e.g. Permanent Staff vs Visiting Staff).
     - *Individual Staff*: Assigns to specific selected employees.
   - Set **Effective From** date.
   - (Optional) Toggle **Executive Override** if this assignment should take precedence over all group criteria.
   - Provide a **Mandatory Justification Reason**.
   - Click **Preview Assignment** to review affected staff counts and details before confirming.
   - Click **Confirm & Assign Policy**.

---

### 2.4 Annual Entitlement Allocation Wizard
**Navigation**: `HR / Payroll > Leave Management > Annual Entitlements` (`/admin/hr/leaves/entitlements`)

1. **Running the Allocation Wizard**:
   - Select the **Leave Year** (e.g. `2026`).
   - Filter by **Department** or target **All Staff**.
   - Click **Generate Allocation Preview**.
2. **Reviewing Allocation Statuses**:
   - **`READY`**: Eligible for allocation; calculated entitlements shown per leave type.
   - **`ALREADY_ALLOCATED`**: Annual quotas already posted for this year.
   - **`NEEDS_RECALCULATION`**: Policy assignment or HR confirmation status changed since last allocation.
3. **Posting Allocations**:
   - Review employee rows and policy entitlement breakdowns.
   - Click **Execute Bulk Allocation**.
   - The engine creates `ANNUAL_ALLOCATION` transactions in the double-entry ledger and logs a `System Engine` governance audit event.

---

### 2.5 Employee Balance Summary & Entitlement Ledger
**Navigation**: `HR / Payroll > Leave Management > Employee Balances` (`/admin/hr/leaves/employees/[id]`)

1. **Viewing Employee Quotas**:
   - Displays Employee Name, Code, Department, Designation, and current HR Confirmation Status.
   - Shows active **Resolved Leave Policy** (with resolution source: *Override*, *Direct*, *Department*, *Designation*, *Employment Type*, or *Default*).
   - Balance Cards for each configured leave type display:
     - **Available Balance**: Real-time balance usable for leave bookings.
     - **Allocated Days**: Annual quota granted.
     - **Adjusted Days**: Net manual balance additions or subtractions.
     - **Used Days**: Placeholder for approved leave consumption.
2. **Inspecting the Transactional Ledger**:
   - Complete chronological double-entry history.
   - Shows *Date*, *Transaction Type*, *Leave Type*, *Quantity Change* ($+Delta$ or $-Delta$), *Balance Before*, *Balance After*, *Reason*, and *Performed By*.
   - Invariant: Every transaction's *Balance Before* strictly matches the prior transaction's *Balance After*.

---

### 2.6 Performing Manual Balance Adjustments
**Navigation**: From the Employee Entitlement Ledger view:

1. Click **Manual Adjustment**.
2. Select **Leave Type** (e.g., *Casual Leave*).
3. Select **Adjustment Type**:
   - *Add Days (+)*: Grants additional compensatory or approved days.
   - *Subtract Days (-)*: Deducts balance.
4. Enter **Quantity** (e.g., `1.5` days).
5. Review the **Live Projected Balance Preview** ($10.0	ext{d} ightarrow 11.5	ext{d}$).
   - If subtracting exceeds available balance and the active policy prohibits negative balances, the system blocks the adjustment and displays a warning.
6. Enter **Mandatory Justification Reason** (e.g., *"Principal approved compensatory leave for organizing science exhibition"*). *Note: White-space or empty reasons are strictly rejected server-side.*
7. Set **Effective Date**.
8. Click **Confirm Adjustment**.
   - The adjustment is posted to the ledger, updates the balance summary, and records an immutable audit trail entry with the acting admin's identity.

---

### 2.7 Leave Governance & Audit Trail
**Navigation**: `HR / Payroll > Leave Management > Audit Trail` (`/admin/hr/leaves/audit`)

1. **Reviewing Audit Events**:
   - Primary table displays: *Timestamp*, *Performed By* (Admin Username + Role or `System Engine`), *Entity*, *Action*, *Related Record*, *Human-Readable Change Summary*, and *Reason*.
   - Example summary: `Casual Leave Balance: 10.0d → 12.0d (+2.0d)`.
2. **Filtering & Searching**:
   - Filter by **Entity**: *Balance Adjustments (Ledger)*, *Policies*, *Types*, *Assignments*, *Entitlements*.
   - Filter by **Action**: *ADJUSTED*, *ALLOCATED*, *ASSIGNED*, *CREATED*, *UPDATED*, *DEACTIVATED*.
   - Search across **Reason**, **Actor**, **Employee Name**, and **Policy Code**.
   - Filter by **Date Range**.
3. **Viewing Technical Details**:
   - Click **View Details** on any row to open the details slide-over.
   - View structured before/after diff tables and technical JSON payloads with one-click **Copy JSON** for compliance auditing.
