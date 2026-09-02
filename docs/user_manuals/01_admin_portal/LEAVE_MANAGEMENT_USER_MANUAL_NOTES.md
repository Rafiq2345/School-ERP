# Leave Management — User Manual & Operational Notes

## 1. Overview
The Leave Management System provides end-to-end administration of staff leave types, policies, annual entitlement ledgers, multi-shift applications, **dynamic multi-level approval workflows**, **atomic ledger deduction**, and **attendance auto-integration**.

---

## 2. Navigation Structure
Located under **Admin Portal > HR & Payroll > Leave Management**:
- **Overview**: `/admin/hr/leaves`
- **Applications**: `/admin/hr/leaves/applications` (List, Search & Status Tracking)
- **New Application**: `/admin/hr/leaves/applications/new` (Employee selection, calendar & multi-shift picker)
- **Approval Inbox**: `/admin/hr/leaves/approvals` (Pending approvals & quick action drawer)
- **Workflows Master**: `/admin/hr/leaves/workflows` (Configurable multi-tier approval chains & rules)
- **Leave Types**: `/admin/hr/leaves/types` (Paid/Unpaid categories, min units, documentation rules)
- **Leave Policies**: `/admin/hr/leaves/policies` (Annual limits, probation release, negative balance rules)
- **Policy Assignments**: `/admin/hr/leaves/assignments` (Department, designation, and employee assignments)
- **Entitlements & Ledger**: `/admin/hr/leaves/entitlements` (Bulk annual allocation wizard & individual ledger)
- **Leave Audit**: `/admin/hr/leaves/audit` (Governance log & human-readable diff trail)

---

## 3. Configuring Approval Workflows (`/admin/hr/leaves/workflows`)

<!-- [Screenshot Placeholder: Workflows Master & Step Builder Dialog] -->

### Creating a New Workflow
1. Click **New Approval Workflow**.
2. Enter **Workflow Name** (e.g. `Teaching Staff Academic Leave Workflow`) and **Code** (e.g. `WF-TEACHING`).
3. Set **Effective Date Range** and check **Set as Default** if this represents institutional fallback.
4. **Step Builder**:
   - Add sequential steps (e.g. Level 1: `Department Incharge`, Level 2: `Principal`, Level 3: `HR Manager`).
   - Choose approver source: **By Role** (`PRINCIPAL`, `HR_MANAGER`, `ACCOUNTS_MANAGER`, etc.), **Department Head**, **By Designation**, or **Specific User**.
   - Mark steps as **Required** or optional.
5. Save the workflow.

### Managing Applicability Rules
- Click **Manage Applicability** on any workflow card.
- Add rules targeting specific **Departments** (e.g. Faculty of Science & Math), **Designations**, or **Leave Types**.
- High-priority **Overrides** take top precedence over group assignments.

---

## 4. Approval Inbox & Reviewing Applications (`/admin/hr/leaves/approvals`)

<!-- [Screenshot Placeholder: Approval Inbox Actionable by Me vs All Pending] -->

### Filtering Requests
- **All Pending**: Displays all requests currently awaiting any approval stage across the school.
- **Actionable by Me**: Displays only requests where the current logged-in user or role is designated for the pending level.
- Filter by Department, Leave Type, or text search (Applicant name, Employee Code, Request #).

### Taking Approver Actions
From the Approval Inbox or Application Detail view (`/admin/hr/leaves/applications/[id]`):
1. **Approve**: Advances the request to the next approval step, or marks the application **APPROVED** if final.
2. **Reject**: Mandatory rejection reason required; halts workflow and marks request **REJECTED**.
3. **Send Back**: Returns application to applicant for modification with clear revision remarks.
4. **Request Clarification**: Sends inquiry to the applicant (e.g. asking for lecture coverage plan). Applicant can respond directly on the detail page, returning status to **PENDING**.

---

## 5. Employee Leave Application Flow (`/admin/hr/leaves/applications/new`)

<!-- [Screenshot Placeholder: Leave Application Creation with Multi-Shift Picker] -->

1. **Select Employee**: Dropdown automatically lists eligible staff (e.g. `Fatima Zahra — EMP-102`).
2. **Policy & Balance Resolution**: Automatically loads the employee's active leave policy, allocated balances, and eligible leave types.
3. **Leave Scope**:
   - **Full Day**: Date range picker (automatically deducts weekly holidays and calendar events).
   - **Half Day**: Selection of First Half or Second Half (0.5d quantity).
   - **Specific Shift**: For employees assigned to multiple shifts (e.g. Morning + Afternoon), selecting one shift accurately requests fractional quantity (e.g. 0.5d or 0.33d).
   - **Hourly Short Leave**: Selection of start/end time within duty shift hours.
4. **Document Upload**: If requested quantity exceeds the policy threshold, medical/supporting certificate upload is enforced.
5. **Submit**: Automatically routes the request to the resolved approval workflow at Level 1.

---

## 6. Attendance Auto-Integration (`/admin/attendance/employees`)

<!-- [Screenshot Placeholder: Daily Roster with Morning Shift ON_LEAVE Badge and Afternoon Shift PRESENT] -->

### Shift-Segment Precise Leave Visualization
- When a leave request is final-approved (all workflow steps approved), the system automatically posts `ON_LEAVE` attendance records for the employee's approved shifts/dates.
- **Specific Shift Leave**: On `/admin/attendance/employees?date=YYYY-MM-DD`, only the approved shift (e.g. `Morning Shift`) is marked with an `ON LEAVE` badge displaying the Leave Type (e.g. `Casual Leave`) and Request Number (e.g. `LR-2026-000148`). Remaining scheduled shifts (e.g. `Afternoon Shift`) remain open for normal duty attendance marking.
- **Monthly Register**: On `/admin/attendance/employees/register`, approved leave dates display the `LV` badge and increment the `Leave Days` total column without penalizing the employee or counting as unexcused absence.
- **Audit & Evidence**: If manual attendance was logged prior to approval (e.g. marked absent), approval converts the status to `ON_LEAVE` while retaining the original punch evidence in the audit log.

---

## 7. Entitlement Ledger & Quantity Safety

<!-- [Screenshot Placeholder: Employee Leave Entitlement Ledger Double-Entry History] -->

- **Atomic Deduction**: Final approval writes exactly **ONE** `LEAVE_USAGE` ledger transaction.
- **Quantity Invariant**: A 0.5d specific shift leave deducts exactly 0.5d from balance (e.g., 3.0d $\\rightarrow$ 2.5d).
- **Decoupled Indicators**: The 1-calendar-day `LV` badge on the register represents attendance status and does not convert the numerical entitlement deduction into 1.0 full day.

---

## 8. Payroll Deduction Feed (Phase 3 Step 1 Foundation)

<!-- [Screenshot Placeholder: Unpaid Leave Deduction Input Summary] -->

- **Unpaid Leave Deduction Integration**: When an unpaid leave application (`Leave Without Pay` / `isPaid=false`) is final-approved, the system automatically checks for an active `PayrollDeductionPolicy` and creates a `PENDING` deduction input record (`PayrollDeductionInput`).
- **Payroll Period Assignment**: Deduction records automatically derive the applicable monthly payroll period (e.g. `September 2026`) based on the leave start date.
- **Contract-First Architecture**: In Phase 3 Step 1, the foundation captures the exact leave quantity, calculation basis (`CALENDAR_DAYS` / `WORKING_DAYS`), employee identity, and audit snapshot. The monetary `deductionAmount` remains `null` until the active Payroll calculation engine processes the feed.
- **Paid Leave Safety**: Approved paid leaves (`CASUAL`, `ANNUAL`, `SICK`, etc.) never generate deduction input records.
- **Reversals**: Deduction inputs can be transitioned to `REVERSED` with mandatory reason tracking if leave is modified or cancelled.

---


---

## 9. Attendance-to-Payroll Rules & Reconciliation Feed (Phase 3 Step 2)

<!-- [Screenshot Placeholder: Attendance-to-Payroll Rules and Deductions Feed] -->

- **Rules Engine (`/admin/hr/leaves/payroll-rules`)**:
  - Administrators can define institutional and department-level deduction policies for late arrival accumulation, unexcused absences, and half-day penalties.
  - The 6-level precedence hierarchy guarantees that specific individual overrides or departmental policies automatically take precedence over institutional defaults.
- **Deduction & Reconciliation Feed (`/admin/hr/leaves/payroll-deductions`)**:
  - Provides a real-time, contract-first feed of all pending payroll deductions arising from both approved unpaid leaves and attendance exceptions.
  - **Reconciliation Preview**: Administrators can preview period deductions before committing, displaying total employees scanned, exceptions found, paid leaves skipped, and unpaid leaves deduplicated.
  - **Period Reconciliation Execution**: Reconciles the active monthly payroll period, creating pending deductions and automatically reversing obsolete exceptions when historical attendance corrections occur.
  - **Immutable Audit Trail**: Every deduction generation and reversal records actor attribution and calculation evidence.


## 11. Year-End Processing & Rollover Wizard (Phase 3 Step 3)

<!-- [Screenshot Placeholder: Year-End Processing Preview and Batch History] -->

- **Run Year-End Processing (`/admin/hr/leaves/year-end`)**:
  - Administrators select the closing source leave year (e.g., 2026) and receiving target year (e.g., 2027).
  - **Preview Engine**: Calculates individual carry-forward, encashment, and expiry quantities per employee and leave type rule before committing.
  - **Batch Execution**: Finalizes closing year balances, credits target year carry-forward counters, and generates encashment payroll contract inputs with complete double-entry ledger auditability.
- **Batch History & Reversals**:
  - Displays historical batches with status (`COMPLETED`, `REVERSED`), audit timestamps, and breakdown modals.
  - Supports administrative batch reversal with automatic compensating ledger postings and payroll input status reversal.

## 12. Implementation Status

### IMPLEMENTED & FULLY VERIFIED:
- Leave Types Master (`/admin/hr/leaves/types`)
- Leave Policies & Multi-Rule Configuration (`/admin/hr/leaves/policies`)
- 6-Level Precedence Engine & Policy Assignments (`/admin/hr/leaves/assignments`)
- Annual Bulk Allocation Wizard (`/admin/hr/leaves/entitlements`)
- Transactional Double-Entry Entitlement Ledger (`/admin/hr/leaves/employees/[id]`)
- Employee Leave Applications & Validation Engine (`/admin/hr/leaves/applications`)
- Dynamic Multi-Level Approval Workflows (`/admin/hr/leaves/workflows`)
- Approvals Inbox & Stepper Timeline (`/admin/hr/leaves/approvals`)
- Final Approval Ledger Deduction (`LEAVE_USAGE`)
- Attendance Auto-Integration (`ON_LEAVE` badges & multi-shift isolation)
- Monthly Register Matrix & Safety Controls (`/admin/attendance/employees/register`)
- Comprehensive Governance Audit Trail (`/admin/hr/leaves/audit`)
- Payroll Deduction Foundation — Phase 3 Step 1 (`PayrollDeductionPolicy`, `PayrollDeductionInput`, `PayrollDeductionAuditLog`)
- Attendance-to-Payroll Rule Engine & Reconciliation — Phase 3 Step 2 (`/admin/hr/leaves/payroll-rules` & `/admin/hr/leaves/payroll-deductions`)
- Year-End Processing & Rollover Engine — Phase 3 Step 3 (`/admin/hr/leaves/year-end`)

### NOT YET IMPLEMENTED (Deferred to Next Steps / Future Phases):
- Payroll Base Salary & Net Deduction Calculations (Phase 3 Step 4+)
- Hardware Biometric Punch Auto-Sync (Phase 3)
