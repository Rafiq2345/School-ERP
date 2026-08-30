# School ERP Architecture Guardrails & Domain Rules

This document establishes the mandatory architectural principles, domain rules, and configuration ownership boundaries governing all current and future module development across the School ERP.

---

## 1. The Three-Tier Domain Architecture

All academic, financial, operational, and administrative features must strictly separate three distinct concepts:

### A. Tier 1: Central Master Definition (Organization / Head Office Catalog)
- **Master Class Catalog** (e.g. Pre-Nursery, Nursery, Class 1 ... Class 12)
- **Master Subject Catalog** (e.g. Mathematics, English, General Science, Physics Lab)
- **Standard Passing Rules & Grading Scheme Templates**
- **Fee Head & Structure Templates**
- **Report & Policy Templates**
- *Core Rule*: Reusable definitions; defining a class centrally does **NOT** mean all campuses offer it.

### B. Tier 2: Campus Offering / Assignment (Campus x Academic Session Scope)
- **Campus Program Selection**:
  - Campus A (Primary) offers Class 1 to Class 5
  - Campus B (Middle) offers Class 6 to Class 8
  - Campus C (Senior) offers Class 9 to Class 12
- **Campus Curriculum Mapping**:
  - Campus -> Academic Session -> Offered Class -> Assigned Subjects (Compulsory/Optional)
- *Core Rule*: **NEVER duplicate Master Class definitions** when multiple campuses offer the same class.

### C. Tier 3: Campus-Specific Operational Records (Strict Campus Scope: Execution & Data)
- **Sections (Strictly Campus-Specific)**:
  - Campus A (Class 6) has [Section 6-A, Section 6-B]
  - Campus B (Class 6) has [Section 6-Blue, Section 6-Green, Section 6-Red]
- **Student Enrollment**: Campus -> Session -> Offered Class -> Section -> Student
- **Daily Operational Transactions**: Attendance, Homework, Fee Vouchers, Payments, Exam Marks, Campus Staff Payroll, Library Issues, Inventory Consumptions.

---

## 2. Core Separation Principles

### A. Permission vs Data Scope
- **Permission = WHAT the user can do**:
  - Evaluated via `hasPermission(user, module, action)`.
  - Canonical 10 Actions: `VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `PRINT`, `EXPORT`, `PUBLISH`, `UNPUBLISH`, `REVERSE`.
  - *Rule*: Never hard-code `if (role === "Admin")` in business modules.
- **Data Scope = WHERE the user can do it**:
  - Handled centrally via `DataScope` and `DataScopeManager.applyScopeFilter(scope)`.
  - *Rule*: Never scatter manual organizational filtering query-by-query across modules.

### B. Single Codebase, Multiple Product Tiers
- **Base School ERP (Always Active / Core)**:
  - Students, Fee Billing, Attendance, Homework, Exams, Basic HR & Payroll, Employee Payslips, Basic Communication, Standard Reports, Administration Configuration, Security & Audit Trail.
- **Optional / Advanced Enterprise Modules (Config-Toggled)**:
  - Admissions Portal, Advanced HR & Appraisals, Advanced Payroll (Loans, Tax, Arrears), Double-Entry Accounts, Budget, Library & Digital Library, Inventory & Fixed Assets, Procurement, School Store POS, Biometric Sync, Custom Report Designer.
- *Rule*: Disabled modules must be hidden across navigation, dashboards, role builders, API gateways, and reporting catalogs.

### C. Enterprise Hierarchy Evolution Path (Additive & Non-Destructive)
- **Small Standalone Schools (Active Today)**:
  - Simple workflow: `Academic Session -> Class -> Section -> Students`.
  - Zero enterprise clutter (no Head Office, Region, or Campus dropdowns exposed).
- **Enterprise Expansion (Future Additive Phase)**:
  - Target hierarchy: `Organization -> Multiple Head Offices -> Multiple Regions -> Multiple Campuses`.
  - Introduced through additive junction tables (`campus_class_offerings`) and `DataScope` resolution without schema-breaking changes.

### D. Financial Safety & Audit Guarantees
- No hard deletes on financial records (Fee Vouchers, Invoices, Payment Receipts, Payslips, Journal Entries). Lifecycle statuses: `DRAFT` -> `POSTED` / `PAID` -> `REVERSED` / `CANCELLED`.
- Reversals generate immutable reversing entries and trigger `AuditLog` records with `action: "REVERSE"`.
- Locked Academic Sessions prevent curriculum and fee schedule modifications.

### E. Upward Reporting Roll-Up
All operational records link to a `campusId` within `DataScope`, allowing SQL aggregation to roll up:
$$\text{Campus Total} \longrightarrow \text{Region Total} \longrightarrow \text{Head Office Total} \longrightarrow \text{Organization Total}$$

---

## 3. Configuration Ownership Matrix & Module Boundaries

| Configuration Domain / Table | Owner Module | Classification | UI Location Rule | Shared Service Consumption |
| :--- | :--- | :--- | :--- | :--- |
| **School Profile** (`school_profiles`) | Administration Config | Core School-Wide | `/admin/settings/profile` | Base Identity Provider |
| **Academic Sessions** (`academic_sessions`) | Administration Config | Core School-Wide | `/admin/settings/academic-years` | Session Scope Provider |
| **Class Categories** (`class_categories`) | Administration Config | Core Master Catalog | `/admin/settings/class-categories` | Category Registry |
| **Master Classes** (`school_classes`) | Administration Config | Core Master Catalog | `/admin/settings/classes` | Master Blueprint |
| **Sections** (`sections`) | Admin Config (Now) / Student (Future) | Campus Offering Structure | `/admin/settings/sections` | Classroom Registry |
| **Subjects Master** (`subjects`) | Administration Config | Core Master Catalog | `/admin/settings/subjects` | Master Blueprint |
| **Curriculum Mapping** (`class_subjects`) | Administration Config | Curriculum Assignment | `/admin/settings/class-subjects` | Session-Class Curriculum |
| **Student Categories & Houses** (`student_categories`, `houses`) | Student Management | Module-Specific Config | `/admin/students/settings` | Student Profile Enhancer |
| **HR Master** (`departments`, `designations`, `employee_categories`, `employment_types`, `leave_types`, `shifts`, `working_day_policies`) | HR & Payroll | Module-Specific Config | `/admin/hr-payroll/settings` | Staff Profile & Payroll Engine |
| **Exam Rules & Grading** (`grading_schemes`, `grade_bands`, `passing_rules`, `subject_passing_rules`, `exam_rule_assignments`) | Examinations | Module-Specific Config | `/admin/exams/settings` | Exam Evaluation Engine |
| **Fee Heads, Structures, Installments, Security Deposits** | Fees & Billing | Module-Specific Config | `/admin/billing/settings` | Billing & Collection Engine |
| **Admission Stages, Tests, Interviews, Forms** | Admissions | Module-Specific Config | `/admin/admissions/settings` | Intake & Registration Engine |
| **Chart of Accounts, Journals, Fiscal Periods** | Accounts | Module-Specific Config | `/admin/accounts/settings` | Double-Entry Ledger Engine |
| **Book Categories, Shelves, Library Fines** | Library | Module-Specific Config | `/admin/library/settings` | Catalog & Circulation Engine |
| **Item Categories, Units, Stores, Vendors** | Inventory / Procurement | Module-Specific Config | `/admin/inventory/settings` | Stock & Purchase Engine |
| **SMS, Email, Notification Templates** | Communication | Module-Specific Config | `/admin/communication/settings` | Message Delivery Engine |
| **Document Number Sequences** (`document_sequences`) | Shared Infrastructure | Reusable Service | `/admin/settings/sequences` (Admin) + Global API | Consumed by Students, Admissions, Billing, HR |
| **Custom Fields** (`custom_field_definitions`, `custom_field_options`) | Shared Infrastructure | Reusable Service | `/admin/settings/custom-fields` + Global API | Consumed by Students, Employees, Admissions |
| **Roles & Permissions** (`roles`, `permissions`, `user_roles`, `role_permissions`) | Shared Infrastructure | Reusable Service | `/admin/settings/users-roles` | Consumed by all modules & navigation |
| **Universal Audit Trail** (`audit_logs`) | Shared Infrastructure | Reusable Service | `/admin/settings/audit` + Module Sub-navs | Consumed by all mutation handlers |
| **Publishing Workflows** (`publishing_workflows`, `publishing_batches`) | Shared Infrastructure | Reusable Service | Consumed by Billing, Exams, Notices | State engine for published entities |
| **Approval Engine** (`approval_requests`, `approval_steps`) | Shared Infrastructure | Reusable Service | Consumed by Admissions, HR, Billing | Multi-step approval authority |

---

## 4. Key Implementation Invariants for Future Modules
1. **Never Move Existing DB Tables for UI Convenience**: Table definitions remain in PostgreSQL; UI settings screens are placed in their respective business module workspaces.
2. **Never Duplicate Configuration**: Business modules manage their own module-specific settings while consuming shared infrastructure (Sequences, Custom Fields, Approvals, Publishing, Audit).
3. **Billing Independence**: Installment Plans, Fee Heads, Discounts, and Security Deposits belong exclusively to Billing (`/admin/billing/settings`), not general Administration Configuration.
4. **Base HR & Payroll Completeness**: Base ERP includes Employee Profiles, Basic Salary, Monthly Payroll Run, and Payslips. Advanced features (Loans, Advances, Tax Slabs) are feature-toggled.
5. **No Premature Hierarchy Complexity**: Small schools maintain their clean single-school workflow without exposure to multi-campus overhead.

---

## 5. Platform Subscription, Licensing & Access Gate Architecture

### A. Separation of Billing Domains
- **Platform Subscription Billing**: The commercial relationship between the **ERP SaaS Provider** and the **School / Institution Tenant** (Software licensing, user seat tiers, hosting, maintenance).
- **Student Fee Billing**: The operational relationship between the **School** and its **Students / Guardians** (Tuition, admission, transport, lab fees).
- *Strict Rule*: School administrators and accountants must never gain provider-level administrative controls over platform billing or license enforcement.

### B. The 5-Stage Central Access Gate
All client navigation and backend API requests evaluate through a unified 5-stage pipeline:
1. **Authentication Gate**: Valid session and active identity.
2. **Subscription License Gate**: Tenant subscription status validation (`ACTIVE`, `TRIAL`, `PAYMENT_DUE`, `GRACE_PERIOD`, `RESTRICTED`, `SUSPENDED`, `EXEMPT`).
3. **Module Registry Gate**: Active product tier and tenant feature toggles.
4. **RBAC Permission Gate (WHAT)**: Canonical 10-action capability check.
5. **Data Scope Gate (WHERE)**: Assigned organizational boundary validation.

### C. Restricted Mode & Subscription Recovery Protocol
- **Backend Enforcement**: When an overdue invoice passes its grace period without verified payment, the tenant enters `RESTRICTED` mode. All operational module endpoints return `403 SubscriptionRestricted`.
- **Restricted UI Scope**: School users are redirected to the isolated **Subscription Recovery Area** (`/subscription/recovery`), which exclusively allows:
  - Viewing outstanding provider invoices & payable amounts.
  - Viewing provider payment bank account / Raast / 1Link instructions.
  - Uploading payment proof (screenshot/receipt) with transaction reference.
  - Checking live verification status of submitted proofs.
  - Accessing provider support contact details and Logout.
- *Strict Rule*: Normal operational modules (Students, Fees, Attendance, Exams, HR/Payroll, Accounts, Library, Inventory, Reports) are completely blocked at the backend level.

### D. Absolute Data Safety & Instant Restoration Guarantees
1. **Zero Data Deletion**: Entering `RESTRICTED` or `SUSPENDED` status **NEVER** deletes student records, academic history, fee invoices, attendance, or payroll data.
2. **Zero Configuration Loss**: When a payment is verified, full ERP access is restored immediately without modifying existing user accounts, roles, permissions, custom fields, or curriculum mappings.
3. **Automated Restoration**: Payment verification automatically triggers tenant unlock and writes a permanent entry to `AuditLog`.

### E. AI-Assisted Payment Proof Verification
- OCR & Multimodal extraction (Gemini) extracts: Amount, Transaction Reference ID, Payment Date/Time, and Receiving Account details from uploaded receipts.
- Verification States: `PENDING`, `AI_MATCH`, `AI_MISMATCH`, `NEEDS_MANUAL_REVIEW`, `VERIFIED`, `REJECTED`.
- *Human-in-the-Loop Principle*: AI is assistive. Mismatched or low-confidence proofs automatically queue into the Platform Provider Review Queue for manual approval/rejection. Future bank/gateway reconciliation will complement or replace manual screenshots.

### F. Provider Privileged Controls & Protected Console
- Platform provider administrators possess privileged capabilities (`PLATFORM:FORCE_ACTIVATE`, `PLATFORM:EXTEND_GRACE`, `PLATFORM:WAIVE_INVOICE`, `PLATFORM:VERIFY_PAYMENT`, `PLATFORM:REJECT_PROOF`, `PLATFORM:MANUAL_SUSPEND`).
- *Strict Rule*: Provider override capabilities are **never** granted to school administrators and reside in a dedicated **Provider Admin Console**, completely isolated from school Administration Configuration.
- Provider internal notes and confidential auditing are strictly hidden from school-facing views.
