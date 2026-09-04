# Leave Management — User Manual & Operational Notes

> [!NOTE]
> **Module Status & Audit Baseline**:
> Leave Management **core functional workflow is 100% COMPLETE & VERIFIED** across all operational capabilities (Leave Types, 6-Level Precedence Policies, Probation Engine, Entitlement Ledger, Multi-Shift Applications, Dynamic Multi-Tier Approvals, Attendance Auto-Integration, Compensating Reversals, Year-End Rollover Wizard, and Attendance/Unpaid Leave Payroll Deduction Feeds).
> 
> *Final Audit Verdict: **B. LEAVE MANAGEMENT FUNCTIONALLY COMPLETE BUT INTEGRATIONS REMAIN**.*

---

## 1. System Overview & Architecture

The Leave Management module provides complete administration of institutional leave types, staff entitlement ledgers, multi-shift duty leave applications, dynamic multi-level approval workflows, atomic ledger deductions, automatic attendance integration, and automated annual rollovers.

### Key Operational Capabilities
1. **Configurable Leave Types Master**: Paid/Unpaid classification, units (Days/Hours), medical document thresholds, and active status toggles.
2. **6-Level Policy Precedence Engine**: `Individual Override > Designation > Department > Employment Type > Institutional Default`.
3. **Probation & Accrual Engine**: Enforces joining, monthly accrual, on-confirmation release, or prorated rules based on live employee HR confirmation status.
4. **Multi-Shift Duty Applications**: Segment-precise leave requesting for single, double, and triple-shift staff with automated calendar holiday exclusions and live balance checks.
5. **Dynamic Multi-Level Approval Chains**: Configurable multi-tier routing by department or designation with Approvals Inbox, quick actions, stepper history, and clarification threads.
6. **Attendance Auto-Integration**: Shift-segment precise `ON_LEAVE` status badges on Daily Roster and Monthly Register without incorrect absence penalties.
7. **Append-Only Transactional Ledger**: Double-entry `LeaveLedgerTransaction` records for annual allocations, usage deductions, manual adjustments, and cancellations.
8. **Compensating Reversals & Safety**: Full non-destructive balance and attendance restoration on leave cancellation.
9. **Year-End Processing & Rollover Engine**: Annual batch execution with `CARRY_FORWARD` caps, `EXPIRE`, `ENCASH`, `MIXED` rules, pre-execution previews, duplicate execution blocking, and compensating-entry batch reversal.
10. **Contract-First Payroll Deduction Feed**: Streams verified unpaid leave deductions, attendance late arrival accumulation penalties (e.g. 3 lates = 1 absence), and encashment items to the payroll system.

---

## 2. Navigation Structure

Located under **Admin Portal > HR & Payroll > Leave Management**:
- **Overview**: `/admin/hr/leaves` (Operational dashboard, pending metrics, quick links)
- **Applications**: `/admin/hr/leaves/applications` (List, search, filter & status tracking)
- **New Application**: `/admin/hr/leaves/applications/new` (Employee selector, calendar & multi-shift scope picker)
- **Approval Inbox**: `/admin/hr/leaves/approvals` (Pending approvals drawer, "Actionable by Me" vs "All Pending")
- **Workflows Master**: `/admin/hr/leaves/workflows` (Configurable multi-tier approval chains & applicability rules)
- **Leave Types**: `/admin/hr/leaves/types` (Paid/Unpaid types, minimum units, document requirement thresholds)
- **Leave Policies**: `/admin/hr/leaves/policies` (Annual limits, probation release, negative balance guards)
- **Policy Assignments**: `/admin/hr/leaves/assignments` (Department, designation, employment type, and employee assignments)
- **Entitlements & Ledger**: `/admin/hr/leaves/entitlements` (Annual bulk allocation wizard & employee balance list)
- **Employee Ledger Detail**: `/admin/hr/leaves/employees/[id]` (Multi-year balance breakdown, manual adjustments & immutable history)
- **Payroll Rules**: `/admin/hr/leaves/payroll-rules` (Late arrival accumulation, unexcused absence & half-day deduction rules)
- **Payroll Deductions**: `/admin/hr/leaves/payroll-deductions` (Contract-first deduction feed, period reconciliation & exception audit)
- **Year-End Processing**: `/admin/hr/leaves/year-end` (Annual rollover wizard, preview calculations, batch execution & reversals)
- **Leave Audit**: `/admin/hr/leaves/audit` (Governance log, actor attribution & human-readable diff trail)

---

## 3. Leave Types Configuration (`/admin/hr/leaves/types`)

<!-- [Screenshot Placeholder: Leave Types Master View] -->

### Creating & Managing Leave Types
1. Navigate to **Leave Types**.
2. Click **New Leave Type**.
3. Configure the parameters:
   - **Name & Code**: e.g., `Casual Leave` (`CASUAL`), `Sick Leave` (`SICK`), `Annual Leave` (`ANNUAL`), `Leave Without Pay` (`UNPAID`).
   - **Category**: Paid Leave or Unpaid Leave.
   - **Unit**: `DAYS` or `HOURS`.
   - **Documentation Requirements**: Toggle `Requires Document` and set `Min Days for Document` (e.g., medical certificate required for $> 2\text{d}$).
   - **Unlimited Balance**: For unpaid or emergency leaves without numeric limits.
   - **Active Status**: Enable or disable leave type availability.
4. Save the configuration.

---

## 4. Leave Policies & 6-Level Precedence Engine (`/admin/hr/leaves/policies` & `/assignments`)

<!-- [Screenshot Placeholder: Policy Configuration & Multi-Rule Builder] -->

### Configuring Policies & Rules
1. Navigate to **Leave Policies** to define institutional rule templates.
2. For each leave type within a policy, configure:
   - **Annual Allocation Days**: Base entitlement per leave year (e.g., 15 days Casual, 15 days Sick, 30 days Annual).
   - **Negative Balance Guard**: Allow or strictly prevent negative leave balances.
   - **Probation Rules**:
     - `NOT_ALLOWED`: Staff on probation cannot take this leave type.
     - `ALLOWED_FULL`: Full annual entitlement accessible during probation.
     - `ALLOWED_LIMITED`: Configurable cap (e.g., maximum 3 days) during probation.
     - `ON_CONFIRMATION_RELEASE`: Entitlement credited upon HR employment confirmation.
     - `MONTHLY_ACCRUAL`: Entitlement earned progressively month by month.
     - `PRORATED_AFTER_CONFIRMATION`: Prorated balance calculated for remainder of leave year upon confirmation.
   - **Year-End Rule**: `CARRY_FORWARD`, `EXPIRE`, `ENCASH`, or `MIXED` with configurable caps and thresholds.

### Policy Assignments & Precedence Hierarchy
Assignments are managed on `/admin/hr/leaves/assignments`. When resolving an employee's policy, the system evaluates the 6-level precedence hierarchy:
1. **Priority 1000 — Individual Override**: Direct employee assignment marked as override.
2. **Priority 500 — Individual Assignment**: Direct employee assignment.
3. **Priority 300 — Department Assignment**: Applied to all employees in the department (e.g., Science Faculty).
4. **Priority 200 — Designation Assignment**: Applied to specific designations (e.g., Senior Lecturer).
5. **Priority 100 — Employment Type / Category**: Applied to contractual/permanent staff groups.
6. **Priority 0 — Institutional Default**: Fallback school policy marked as default.

---

## 5. Annual Bulk Allocation Wizard & Entitlement Ledger (`/admin/hr/leaves/entitlements`)

<!-- [Screenshot Placeholder: Bulk Allocation Wizard & Employee Detail Ledger] -->

### Running Annual Bulk Allocation
1. Navigate to **Entitlements & Ledger**.
2. Select the target **Leave Year** (e.g., `2026` or `2027`).
3. Click **Preview Allocations**: Resolves all active employees against their applicable policies and computes upfront allocations.
4. Optional: Check **Overwrite / Recalculate** if updating existing allocations.
5. Click **Allocate Entitlements**: Creates or updates `EmployeeLeaveEntitlement` records and posts `ALLOCATION` entries to the immutable ledger.

### Individual Employee Ledger (`/admin/hr/leaves/employees/[id]`)
- **Multi-Year Synchronization**: Selecting a year (e.g., `?year=2027`) synchronizes the year dropdown, balance cards, and ledger history.
- **4-Column Balance Breakdown**: Each leave card displays `Allocated`, `Carry Fwd`, `Adjusted`, `Used`, and net `Available`.
- **Manual Balance Adjustments**:
  - Administrative button to **Add** or **Subtract** days.
  - **Mandatory Justification**: Required reason note explaining the operational or policy adjustment.
  - **Negative Balance Safety**: Policy guards prevent subtractions exceeding available balance.
  - **Actor Attribution**: User ID, timestamp, and before/after balances recorded in `LeaveAuditLog`.

---

## 6. Employee Leave Application Flow (`/admin/hr/leaves/applications/new`)

<!-- [Screenshot Placeholder: Leave Application Creation with Multi-Shift Picker] -->

### Submitting a Leave Application
1. **Select Employee**: Select applicant (e.g., `Fatima Zahra — EMP-102`).
2. **Select Leave Type**: System automatically displays available balance and policy indicators.
3. **Select Leave Scope**:
   - **Full Day**: Start and end date picker. Automatically subtracts calendar holidays and scheduled weekly-offs.
   - **Half Day**: Selection of First Half or Second Half ($0.5\text{d}$ quantity).
   - **Specific Shift**: For multiple-shift staff (e.g., Morning + Afternoon shifts), selecting one shift accurately requests fractional duration (e.g., $0.5\text{d}$ or $0.33\text{d}$).
   - **Hourly / Short Leave**: Selection of start and end hours within duty shift.
4. **Live Validation**:
   - Checks effective remaining balance ($\text{Available} - \text{Pending}$).
   - Prevents duplicate or overlapping applications for the same employee and shift.
   - Enforces medical/supporting document attachment if requested days exceed policy threshold.
5. **Submit**: Creates application with sequential reference number (`LR-YYYY-XXXXXX`) and initiates Level 1 of the resolved approval workflow.

---

## 7. Dynamic Multi-Level Approval Workflows (`/admin/hr/leaves/workflows` & `/approvals`)

<!-- [Screenshot Placeholder: Workflow Step Builder & Approval Inbox] -->

### Configuring Approval Workflows
1. Navigate to **Workflows Master**.
2. Click **New Approval Workflow** (or edit existing).
3. Build sequential approval steps:
   - Level 1: `Department Incharge` / `Line Manager`
   - Level 2: `Principal`
   - Level 3: `HR Office`
4. Approver source options: **By Role** (`PRINCIPAL`, `HR_MANAGER`, etc.), **Line Manager / Dept Head**, **By Designation**, or **Specific User**.
5. Assign applicability rules targeting specific Departments, Designations, or Leave Types.

### Approver Actions in Approval Inbox (`/admin/hr/leaves/approvals`)
Approvers review requests under **Actionable by Me** or **All Pending**:
- **Approve**: Advances request to next sequential step; marks application **APPROVED** if at final step.
- **Reject**: Halts workflow; requires mandatory rejection reason; marks request **REJECTED**.
- **Send Back**: Returns application to applicant for revision with remarks.
- **Request Clarification**: Sends inquiry to applicant; applicant can submit response directly on detail page.

---

## 8. Attendance Auto-Integration & Shift Isolation (`/admin/attendance/employees`)

<!-- [Screenshot Placeholder: Daily Attendance Roster with Morning Shift ON_LEAVE Badge] -->

### Shift-Segment Precise Leave Posting
- Upon final approval of a leave request, the system automatically writes `ON_LEAVE` status records to `EmployeeAttendanceRecord` and `EmployeeShiftAttendanceRecord`.
- **Multiple Shift Isolation**: For employees assigned to multiple shifts, only the approved shift is marked `ON_LEAVE` (displaying leave type and `LR` reference). Other shifts remain open for regular duty attendance marking.
- **Monthly Register Integration**: On `/admin/attendance/employees/register`, approved dates display the `LV` badge and increment `Leave Days` without counting as unexcused absence.
- **Attendance Reversal**: Cancelling an approved leave automatically reverts attendance status to non-leave/deleted while preserving punch audit records.

---

## 9. Leave Cancellation, Modification & Resume Duty

### Cancellation Mechanics
- **Pending Applications**: Cancelling releases pending balance holds immediately.
- **Approved Applications**:
  - Posts a `LEAVE_CANCELLATION_REFUND` transaction to the entitlement ledger restoring balance.
  - Reverts linked `ON_LEAVE` attendance records.
  - Transitions downstream payroll deduction inputs to `REVERSED`.
  - Records full actor attribution and reason in the audit log.

### Resume Duty (Early Return Operational Guideline)
- When an employee returns early from approved medical or maternity leave:
  1. HR records the cancellation or amendment of the unutilized portion of the leave request.
  2. The system refunds remaining unused days back to the entitlement ledger.
  3. Future scheduled `ON_LEAVE` attendance badges are cleared, opening shifts for regular attendance marking.

---

## 10. Year-End Processing & Rollover Wizard (`/admin/hr/leaves/year-end`)

<!-- [Screenshot Placeholder: Year-End Preview & Batch History Drawer] -->

### Running Annual Year-End Rollover
1. Navigate to **Year-End Processing**.
2. Select **Source Leave Year** (e.g., `2026`) and **Target Leave Year** (e.g., `2027`).
3. Click **Preview Year-End Rollover**:
   - Evaluates all employee entitlements against their policy year-end rules.
   - Calculates exact `Carry-Forward`, `Encashment`, and `Expiry` quantities per employee and leave type.
4. Click **Execute Year-End Processing**:
   - Generates an immutable batch record (`LeaveYearEndBatch`, e.g. `YEB-2026-0002`).
   - Posts closing deductions (`CARRY_FORWARD`, `ENCASHMENT`, `EXPIRY`) to source year ledgers.
   - Credits target year entitlements with `carriedForwardDays` and posts incoming `CARRY_FORWARD` ledger transactions.
   - Generates `ENCASHMENT` payroll deduction contract inputs with deferred valuation.
   - Closes source year entitlements (`status = 'CLOSED'`).

### Duplicate Execution Protection & Controlled Reversal
- **Duplicate Protection**: The system strictly blocks re-execution for an already-completed year-end batch (`HTTP 422`).
- **Controlled Reversal**:
  1. In Batch History, click **Reverse Batch**.
  2. Enter a mandatory reversal reason.
  3. System posts compensating ledger transactions (`MANUAL_ADJUSTMENT_ADD` on source year, `MANUAL_ADJUSTMENT_SUBTRACT` on target year).
  4. Transitions encashment payroll inputs to `REVERSED`.
  5. Re-opens source year entitlements (`status = 'ACTIVE'`).
  6. Batch status transitions to `REVERSED`.
  7. Preview and execution become safely re-executable.

---

## 11. Attendance-to-Payroll Rules & Reconciliation Feed (`/admin/hr/leaves/payroll-rules` & `/payroll-deductions`)

> [!IMPORTANT]
> **Module Scope & Interface Boundary**:
> Leave Management **produces verified leave and attendance payroll deduction data**, while **final Gross-to-Net salary calculation and pay slip generation belongs to Module 10 (Payroll Engine)**.

<!-- [Screenshot Placeholder: Payroll Rules Configuration and Deductions Feed] -->

### Configuring Attendance-to-Payroll Rules (`/admin/hr/leaves/payroll-rules`)
- **Late Arrival Accumulation**: Configurable threshold (e.g., 3 late arrivals = 1 full-day absence deduction) with grace minutes.
- **Absence & Half-Day Penalties**: Configurable deduction units for unexcused full-day or half-day absences.
- **6-Level Precedence**: Supports institutional defaults, department-specific rules, and individual overrides.

### Period Reconciliation Feed (`/admin/hr/leaves/payroll-deductions`)
- Streams `PayrollDeductionInput` records for:
  - `LEAVE_APPLICATION`: Approved unpaid leave requests (`isPaid = false`).
  - `ATTENDANCE_ABSENCE`: Unexcused daily absences.
  - `ATTENDANCE_LATE_ACCUMULATION`: Deductions triggered by completed late arrival cycles.
  - `LEAVE_ENCASHMENT`: Encashment items generated by Year-End processing.
- **Reconciliation Engine**: Scans active payroll period, detects new exceptions, skips paid leaves, deduplicates covered shifts, and automatically reverses obsolete exceptions if historical attendance is corrected.

---

## 12. Governance, Security & Audit Trail (`/admin/hr/leaves/audit`)

<!-- [Screenshot Placeholder: Comprehensive Leave Audit Trail Log Viewer] -->

- **Server-Side Security**: All API endpoints enforce tenant isolation and role permissions via server middleware (`resolveAuthContext`).
- **Immutable Ledger**: Entitlement balances are computed from append-only transaction history (`LeaveLedgerTransaction`).
- **Enriched Audit Trail (`LeaveAuditLog`)**: Captures:
  - Action types: `POLICY_CREATED`, `ENTITLEMENT_ALLOCATED`, `MANUAL_ADJUSTMENT`, `APPLICATION_SUBMITTED`, `STEP_APPROVED`, `REVERSED`, `YEAR_END_BATCH_EXECUTED`, etc.
  - Full Actor Attribution: User ID, Name, IP address, and timestamp.
  - Structured Diffs: Before and after states for governance tracking.
  - Mandatory Justifications: Captured on adjustments, rejections, cancellations, and reversals.

---

## 13. Implementation & Verification Status

### A. IMPLEMENTED & VERIFIED (100% Core Functional Workflow)
- [x] **Leave Types Master**: Paid/Unpaid, unit selection, document thresholds, active status (`/admin/hr/leaves/types`).
- [x] **Leave Policies & Multi-Rule Configuration**: Annual limits, probation rules, negative balance guards (`/admin/hr/leaves/policies`).
- [x] **6-Level Precedence Engine & Assignments**: Override, employee, department, designation, employment type, default (`/admin/hr/leaves/assignments`).
- [x] **Annual Bulk Allocation Wizard**: Upfront entitlement allocation with recalculation protection (`/admin/hr/leaves/entitlements`).
- [x] **Double-Entry Entitlement Ledger**: Multi-year synchronization, 4-col balance cards, manual adjustments (`/admin/hr/leaves/employees/[id]`).
- [x] **Employee Leave Applications**: Full-day, half-day, shift-specific, hourly, multi-shift duty resolution, live validation (`/admin/hr/leaves/applications/new`).
- [x] **Dynamic Multi-Level Approval Workflows**: Configurable multi-tier chains, approver resolution, Approval Inbox, stepper actions (`/admin/hr/leaves/workflows` & `/approvals`).
- [x] **Attendance Auto-Integration**: Shift-segment `ON_LEAVE` badge auto-posting, Monthly Register `LV` badges, cancellation reversal (`/admin/attendance/employees`).
- [x] **Compensating Cancellations & Reversals**: `LEAVE_CANCELLATION_REFUND`, attendance rollback, payroll input reversal.
- [x] **Year-End Leave Processing Engine**: Preview calculation, rollover execution, carry-forward caps, encashment, expiry, duplicate protection, controlled reversal (`/admin/hr/leaves/year-end`).
- [x] **Attendance-to-Payroll Rules & Reconciliation Feed**: Late arrival accumulation, period reconciliation, deduction contracts (`/admin/hr/leaves/payroll-rules` & `/payroll-deductions`).
- [x] **Governance & Security Audit Trail**: Server-side RBAC, `LeaveAuditLog` diffs, actor attribution (`/admin/hr/leaves/audit`).

---

### B. EXTERNAL / DOWNSTREAM INTEGRATIONS REMAINING
- [ ] **Gross-to-Net Payroll Calculation Engine (Module 10)**: Downstream payroll engine consumption of `PayrollDeductionInput` contracts to compute net pay slips.
- [ ] **Multi-Channel External Notification Gateways (Module 14)**: Live Email, SMS, and WhatsApp alert delivery via external service providers.
- [ ] **General Ledger Encashment Journal Posting (Module 11)**: Downstream financial journal entries once encashment items are monetized in payroll.

---

### C. FUTURE ENHANCEMENTS (Phase 4 Roadmap)
- [ ] **Dedicated Analytics & Export Reporting Suite (`/admin/hr/leaves/reports`)**: Printable PDF and Excel export generation for department-wise utilization summaries and leave liability reports.
- [ ] **Approver Out-of-Office Delegation Table & UI**: Temporary delegation mapping allowing approvers to assign proxies while on leave.
- [ ] **Background Auto-Escalation Daemon**: Automated scheduler to escalate pending approval steps breaching configured SLA response hours.
- [ ] **Dedicated Resume Duty Administrative Screen**: Streamlined UI for recording early returns from long medical/maternity leaves.
