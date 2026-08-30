# School-ERP: Commercial Multi-Tenant Database Architecture

This document defines the multi-tenant relational database architecture for the School ERP. The schema incorporates tenant isolation (`tenant_id`), precise financial types (`DECIMAL(12,2)`), audit columns, and dedicated Platform Control tables.

---

## 1. Domain Group & Tenant Partitioning

```
Platform Control Plane (Proprietary & Isolated):
  - PlatformTenant, SubscriptionLicense, PlatformFeatureToggle, PlatformAuditLog

Tenant-Scoped Operational Domains (Each record contains indexed tenant_id):
  1. Configuration: SchoolSetting, AcademicSession, Term, AcademicClass, ClassSection, Subject, ClassSubject
  2. Users & RBAC: User, Role, Permission, RolePermission, UserRole, UserSession, PasswordResetToken
  3. Admissions & Students: AdmissionInquiry, AdmissionApplication, Student, Guardian, StudentGuardianRelation, StudentEnrollmentHistory
  4. Attendance & Leaves: StudentDailyAttendance, StudentSubjectAttendance, StaffAttendance, LeaveType, StaffLeaveApplication
  5. Academics & Timetable: TimetableSlot, TimetableEntry, TeacherSubjectAssignment
  6. Billing, Fees & Finance: FeeGroup, FeeType, FeeStructure, FeeStructureItem, FeeDiscountPolicy, StudentFeeDiscount, FeeInstallmentPlan, FeeInstallment, VoucherGenerationBatch, FeeVoucher, FeeVoucherItem, FeePayment, ZeroBalanceVoucherSettlement, FeeReversalLog, BankAccount, BankStatementEntry, BankReconciliation
  7. Exams & Results / GPA: ExamTerm, ExamSchedule, GradeScale, GradeScaleDetail, ExamMarksEntry, StudentResult, StudentResultCard
  8. HR & Payroll: Department, Designation, Employee, EmploymentContract, SalaryStructure, SalaryComponent, EmployeeSalaryAssignment, PayrollBatch, EmployeePayslip
  9. General Ledger & Accounts: ChartOfAccount, FiscalYear, JournalEntry, JournalEntryLine, BudgetPlan, BudgetItem
  10. Library: BookCategory, Book, BookCopy, LibraryMember, BookIssueReturn, LibraryFine
  11. Inventory, Procurement & Store: InventoryCategory, InventoryItem, Warehouse, StockLedger, Vendor, PurchaseOrder, GoodsReceivedNote, StoreSaleInvoice
  12. Central Publishing & Approvals: PublishingWorkflow, PublishingBatch, ApprovalRequest, ApprovalStep, ApprovalActionLog
  13. Audit System & Communication: AuditLog, Notice, Circular, MessageTemplate, NotificationLog
```

---

## 2. Platform Owner Data Models (Isolated from School Tenants)

- **`PlatformTenant`**: `id` (UUID, PK), `school_name`, `slug` (Unique, for subdomains), `custom_domain` (Unique, nullable), `deployment_type` (SAAS_SHARED, DEDICATED_INSTANCE), `status` (ACTIVE, TRIAL, SUSPENDED, DEACTIVATED), `contact_email`, `contact_phone`, `created_at`, `updated_at`.
- **`SubscriptionLicense`**: `id` (UUID, PK), `tenant_id` (FK -> PlatformTenant), `license_key` (Unique, cryptographically signed token), `license_tier` (STARTER, STANDARD, ENTERPRISE), `valid_from` (Date), `valid_until` (Date), `max_students_limit` (Int), `max_staff_limit` (Int), `status` (ACTIVE, EXPIRED, CANCELLED).
- **`PlatformFeatureToggle`**: `id` (UUID, PK), `tenant_id` (FK -> PlatformTenant), `module_code` (e.g. 'LIBRARY', 'STORE_POS', 'PAYROLL', 'SMS_GATEWAY'), `is_enabled` (Boolean), `config_overrides` (JSONB), Unique(`tenant_id`, `module_code`).
- **`PlatformAuditLog`**: `id` (UUID, PK), `owner_user_id` (UUID), `target_tenant_id` (UUID, nullable), `action` (e.g. 'TENANT_PROVISIONED', 'LICENSE_RENEWED', 'MODULE_TOGGLED'), `old_values` (JSONB), `new_values` (JSONB), `ip_address`, `timestamp`.

---

## 3. Tenant-Scoped Operational Models (Key Highlights)

All tenant-scoped tables enforce composite uniqueness with `tenant_id` to guarantee clean data segregation:

### 3.1. School Administration Configuration Master Data
- **`SchoolProfile`**: `id` (UUID, PK), `tenant_id` (UUID, Unique), `name_en`, `name_ur`, `code`, `registration_no`, `logo_url`, `contact_email`, `contact_phone`, `address_en`, `address_ur`, `currency_symbol` ('Rs.'), `currency_code` ('PKR'), `timezone`, `date_format`, `is_active`.
- **`AcademicSession`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `start_date`, `end_date`, `is_current` (Boolean), `status` (DRAFT, ACTIVE, CLOSED, LOCKED), `locked_at`, `closed_at`, Unique(`tenant_id`, `code`), Unique(`tenant_id`, `name`), PartialUnique(`tenant_id` WHERE `is_current` = true).
- **`ClassCategory`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`SchoolClass`**: `id` (UUID, PK), `tenant_id` (UUID), `class_category_id` (FK, nullable), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`Section`**: `id` (UUID, PK), `tenant_id` (UUID), `class_id` (FK), `name`, `code`, `capacity`, `sort_order`, `is_active`, Unique(`tenant_id`, `class_id`, `code`).
- **`Subject`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `short_name`, `subject_type` (THEORY, PRACTICAL, BOTH, ACTIVITY), `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`ClassSubject`**: `id` (UUID, PK), `tenant_id` (UUID), `academic_session_id` (FK), `class_id` (FK), `subject_id` (FK), `is_compulsory`, `sort_order`, `is_active`, Unique(`tenant_id`, `academic_session_id`, `class_id`, `subject_id`).
- **`StudentCategory`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`House`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `color`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`AcademicCalendarEvent`**: `id` (UUID, PK), `tenant_id` (UUID), `academic_session_id` (FK, nullable), `title`, `event_type`, `is_holiday` (Boolean), `start_date`, `end_date`, `applicable_to`, `is_active`.
- **`Department`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`Designation`**: `id` (UUID, PK), `tenant_id` (UUID), `department_id` (FK, nullable), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`EmployeeCategory`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`EmploymentType`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `salary_basis`, `sort_order`, `is_active`, Unique(`tenant_id`, `code`).
- **`LeaveType`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `is_paid`, `annual_limit`, `carry_forward_allowed`, `carry_forward_limit`, `requires_approval`, `is_active`, Unique(`tenant_id`, `code`).
- **`Shift`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `start_time`, `end_time`, `grace_minutes`, `break_minutes`, `is_active`, Unique(`tenant_id`, `code`).
- **`WorkingDayPolicy`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `applicable_days` (JSONB), `effective_from`, `effective_to`, `is_active`, Unique(`tenant_id`, `code`).
- **`GradingScheme`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `calculation_mode` (PERCENTAGE, GRADE, GPA, GRADE_AND_GPA), `is_active`, Unique(`tenant_id`, `code`).
- **`GradeBand`**: `id` (UUID, PK), `tenant_id` (UUID), `grading_scheme_id` (FK), `min_value` (Decimal), `max_value` (Decimal), `grade_label`, `gpa_value`, `remarks`, `sort_order`, `is_active`.
- **`PassingRule`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `min_overall_percentage`, `max_failed_subjects`, `percentage_rule_enabled`, `failed_subject_rule_enabled`, `theory_practical_strategy`, `config_json` (JSONB), `is_active`, Unique(`tenant_id`, `code`).
- **`SubjectPassingRule`**: `id` (UUID, PK), `tenant_id` (UUID), `passing_rule_id` (FK), `academic_session_id` (FK, nullable), `class_id` (FK), `subject_id` (FK), `total_pass_marks`, `theory_pass_marks`, `practical_pass_marks`, `pass_logic`, `is_active`, Unique(`tenant_id`, `passing_rule_id`, `class_id`, `subject_id`).
- **`ExamRuleAssignment`**: `id` (UUID, PK), `tenant_id` (UUID), `academic_session_id` (FK), `class_id` (FK), `grading_scheme_id` (FK), `passing_rule_id` (FK), `is_active`, Unique(`tenant_id`, `academic_session_id`, `class_id`).
- **`DocumentSequence`**: `id` (UUID, PK), `tenant_id` (UUID), `module_code`, `document_type`, `prefix`, `suffix`, `starting_number`, `current_number`, `padding_length`, `reset_policy`, `academic_session_id` (FK, nullable), `is_active`, Unique(`tenant_id`, `module_code`, `document_type`, `academic_session_id`).
- **`CustomFieldDefinition`**: `id` (UUID, PK), `tenant_id` (UUID), `entity_type`, `field_key`, `label`, `field_type`, `is_required`, `sort_order`, `validation_rules` (JSONB), `is_active`, Unique(`tenant_id`, `entity_type`, `field_key`).
- **`CustomFieldOption`**: `id` (UUID, PK), `tenant_id` (UUID), `custom_field_definition_id` (FK), `label`, `value`, `sort_order`, `is_active`, Unique(`tenant_id`, `custom_field_definition_id`, `value`).

### 3.2. Users & RBAC
- **`User`**: `id` (UUID, PK), `tenant_id` (UUID), `username` (String), `email` (String, nullable), `phone` (String, nullable), `password_hash`, `mfa_secret` (nullable), `is_mfa_enabled` (Boolean, default false), `user_type` (ADMIN, EMPLOYEE, TEACHER, STUDENT, PARENT), `status` (ACTIVE, INACTIVE, LOCKED), `preferred_locale` ('en' | 'ur'), Unique(`tenant_id`, `username`), Unique(`tenant_id`, `email`).
- **`Role`**: `id` (UUID, PK), `tenant_id` (UUID), `name`, `code`, `is_system` (Boolean), Unique(`tenant_id`, `code`).
- **`Permission`**: `id` (UUID, PK), `module`, `action`, `code`, `description`. (Global standardized permission catalog).
- **`RolePermission`**: `role_id` (FK), `permission_id` (FK), `tenant_id` (UUID), PK(`role_id`, `permission_id`).

### 3.3. Students, Guardians & Admissions
- **`Student`**: `id` (UUID, PK), `tenant_id` (UUID), `admission_no` (String), `user_id` (FK -> User, nullable), `first_name_en`, `last_name_en`, `first_name_ur`, `last_name_ur`, `gender`, `dob`, `cnic_bform`, `status`, Unique(`tenant_id`, `admission_no`).
- **`Guardian`**: `id` (UUID, PK), `tenant_id` (UUID), `first_name_en`, `last_name_en`, `cnic`, `phone_primary`, `email`, `address_en`, `address_ur`.
- **`StudentEnrollmentHistory`**: `id` (UUID, PK), `tenant_id` (UUID), `student_id` (FK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `roll_number`, `promotion_status`.

### 3.4. Billing, Fee Structures & Vouchers (Financial Invariants)
- **`FeeVoucher`**: `id` (UUID, PK), `tenant_id` (UUID), `voucher_no` (String), `batch_id` (FK, nullable), `student_id` (FK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `issue_date`, `due_date`, `validity_date`, `subtotal_amount` (`DECIMAL(12,2)`), `discount_amount` (`DECIMAL(12,2)`), `fine_amount` (`DECIMAL(12,2)`), `net_payable_amount` (`DECIMAL(12,2)`), `paid_amount` (`DECIMAL(12,2)`), `balance_amount` (`DECIMAL(12,2)`), `payment_status` (UNPAID, PARTIALLY_PAID, PAID, OVERDUE, REVERSED, SETTLED_ZERO_BALANCE), `publishing_status` (DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED), `is_locked` (Boolean), Unique(`tenant_id`, `voucher_no`).
- **`FeePayment`**: `id` (UUID, PK), `tenant_id` (UUID), `receipt_no` (String), `voucher_id` (FK), `student_id` (FK), `payment_date`, `amount` (`DECIMAL(12,2)`), `payment_mode` (CASH, BANK_DEPOSIT, ONLINE_TRANSFER, CHEQUE), `bank_account_id` (FK, nullable), `status` (CONFIRMED, REVERSED), Unique(`tenant_id`, `receipt_no`).
- **`ZeroBalanceVoucherSettlement`**: `id` (UUID, PK), `tenant_id` (UUID), `voucher_id` (FK, Unique), `settlement_type` (AUTO_ON_GENERATION, MANUAL_BULK, MANUAL_SINGLE), `settled_amount` (`DECIMAL(12,2)`), `settled_by_user_id` (FK), `settled_at` (Timestamp), `journal_entry_id` (FK).
- **`FeeReversalLog`**: `id` (UUID, PK), `tenant_id` (UUID), `voucher_id` (FK), `original_payment_id` (FK, nullable), `amount_reversed` (`DECIMAL(12,2)`), `reason` (Text), `reversal_journal_entry_id` (FK), `initiated_by_user_id` (FK), `approved_by_user_id` (FK).

### 3.5. General Ledger, HR, Exams, Library, Store & Auditing
- All respective tables (`JournalEntry`, `ChartOfAccount`, `Employee`, `PayrollBatch`, `EmployeePayslip`, `ExamSchedule`, `StudentResultCard`, `Book`, `InventoryItem`, `StoreSaleInvoice`, `AuditLog`, `PublishingWorkflow`) include non-nullable, indexed `tenant_id` (UUID).

