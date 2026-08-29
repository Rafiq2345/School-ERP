# School-ERP: High-Level Database Architecture

This document defines the relational database architecture for the School ERP. The schema is organized into modular domain groups. All currency amounts use `DECIMAL(12, 2)` (never floats), timestamps include timezones, and audit columns (`created_at`, `updated_at`, `created_by`, `updated_by`) are standardized across all entities.

---

## 1. Domain Group Overview

```
1. Configuration & Academic Structure: SchoolSetting, AcademicSession, Term, AcademicClass, ClassSection, Subject, ClassSubject
2. Users, Authentication & RBAC: User, Role, Permission, RolePermission, UserRole, UserSession, PasswordResetToken
3. Admissions & Students: AdmissionInquiry, AdmissionApplication, Student, Guardian, StudentGuardianRelation, StudentEnrollmentHistory
4. Attendance & Leaves: StudentDailyAttendance, StudentSubjectAttendance, StaffAttendance, LeaveType, StaffLeaveApplication
5. Academics & Timetable: TimetableSlot, TimetableEntry, TeacherSubjectAssignment
6. Billing, Fees & Finance: FeeGroup, FeeType, FeeStructure, FeeStructureItem, FeeDiscountPolicy, StudentFeeDiscount, FeeInstallmentPlan, FeeInstallment, VoucherGenerationBatch, FeeVoucher, FeeVoucherItem, FeePayment, ZeroBalanceVoucherSettlement, FeeReversalLog, BankAccount, BankStatementEntry, BankReconciliation
7. Exams, Grading & Results: ExamTerm, ExamSchedule, GradeScale, GradeScaleDetail, ExamMarksEntry, StudentResult, StudentResultCard
8. HR & Payroll: Department, Designation, Employee, EmploymentContract, SalaryStructure, SalaryComponent, EmployeeSalaryAssignment, PayrollBatch, EmployeePayslip
9. General Ledger & Accounts: ChartOfAccount, FiscalYear, JournalEntry, JournalEntryLine, BudgetPlan, BudgetItem
10. Library: BookCategory, Book, BookCopy, LibraryMember, BookIssueReturn, LibraryFine
11. Inventory, Procurement & Store: InventoryCategory, InventoryItem, Warehouse, StockLedger, Vendor, PurchaseOrder, GoodsReceivedNote, StoreItemSale, StoreSaleInvoice
12. Central Publishing & Approvals: PublishingWorkflow, PublishingBatch, ApprovalRequest, ApprovalStep, ApprovalActionLog
13. Audit System & Communication: AuditLog, Notice, Circular, MessageTemplate, NotificationLog
```

---

## 2. Detailed Entity Models & Schema Design

### 2.1. School Configuration & Academic Structure
- **`SchoolSetting`**: `id` (UUID, PK), `school_name_en`, `school_name_ur`, `school_code`, `registration_no`, `logo_url`, `contact_email`, `contact_phone`, `address_en`, `address_ur`, `currency_symbol` (e.g. 'Rs.'), `currency_code` ('PKR'), `timezone`, `date_format`, `fiscal_year_start_month`, `is_active`.
- **`AcademicSession`**: `id` (UUID, PK), `name` (e.g. '2026-2027'), `start_date`, `end_date`, `is_current` (Boolean, partial unique index ensuring only one active session), `status` (ACTIVE, CLOSED, ARCHIVED).
- **`Term`**: `id` (UUID, PK), `academic_session_id` (FK), `name_en`, `name_ur`, `start_date`, `end_date`, `is_active`.
- **`AcademicClass`**: `id` (UUID, PK), `name_en` (e.g. 'Grade 5'), `name_ur` (e.g. 'جماعت پنجم'), `numeric_grade` (5), `display_order`, `description`, `is_active`.
- **`ClassSection`**: `id` (UUID, PK), `class_id` (FK -> AcademicClass), `name_en` (e.g. 'Section A'), `name_ur` ('سیکشن اے'), `capacity` (Int), `room_number`, `class_teacher_id` (FK -> Employee, nullable), `is_active`.
- **`Subject`**: `id` (UUID, PK), `name_en` ('Mathematics'), `name_ur` ('ریاضی'), `code` ('MATH-05'), `type` (THEORY, PRACTICAL, COMBINED), `is_elective` (Boolean), `credit_hours`, `is_active`.
- **`ClassSubject`**: `id` (UUID, PK), `class_id` (FK), `subject_id` (FK), `total_marks` (Decimal), `passing_marks` (Decimal), `display_order`.

---

### 2.2. Users, Authentication & RBAC
- **`User`**: `id` (UUID, PK), `username` (Unique), `email` (Unique, nullable), `phone` (Unique, nullable), `password_hash`, `user_type` (ADMIN, EMPLOYEE, TEACHER, STUDENT, PARENT), `status` (ACTIVE, INACTIVE, SUSPENDED, LOCKED), `failed_login_attempts` (Int), `lockout_until` (Timestamp), `last_login_at`, `preferred_locale` ('en' | 'ur'), `avatar_url`, `created_at`, `updated_at`.
- **`Role`**: `id` (UUID, PK), `name` ('Super Admin', 'Principal', 'Accountant', 'Teacher', 'Student', 'Parent'), `code` (Unique), `description`, `is_system` (Boolean, protects system roles from deletion).
- **`Permission`**: `id` (UUID, PK), `module` ('BILLING', 'ADMISSIONS', 'ACADEMICS', 'EXAMS', 'HR', 'ACCOUNTS', 'LIBRARY', 'INVENTORY', 'COMMUNICATION', 'PUBLISHING', 'AUDIT'), `action` ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT', 'PUBLISH', 'UNPUBLISH', 'REVERSE'), `code` (e.g. 'BILLING:REVERSE'), `description`.
- **`RolePermission`**: `role_id` (FK), `permission_id` (FK), PK(`role_id`, `permission_id`).
- **`UserRole`**: `user_id` (FK), `role_id` (FK), PK(`user_id`, `role_id`).
- **`UserSession`**: `id` (UUID, PK), `user_id` (FK), `token_hash`, `ip_address`, `user_agent`, `expires_at`, `is_revoked`, `created_at`.
- **`PasswordResetToken`**: `id` (UUID, PK), `user_id` (FK), `token_hash`, `expires_at`, `used_at`.

---

### 2.3. Admissions & Students
- **`AdmissionInquiry`**: `id` (UUID, PK), `inquiry_no` (Unique), `session_id` (FK), `student_name`, `guardian_name`, `phone`, `email`, `applying_for_class_id` (FK), `source`, `status` (NEW, CONTACTED, TEST_SCHEDULED, ADMITTED, REJECTED), `inquiry_date`.
- **`AdmissionApplication`**: `id` (UUID, PK), `application_no` (Unique), `session_id` (FK), `class_id` (FK), `first_name`, `last_name`, `dob`, `gender`, `cnic_bform`, `guardian_id` (FK, nullable), `test_score`, `status` (PENDING, APPROVED, REJECTED, ENROLLED).
- **`Student`**: `id` (UUID, PK), `admission_no` (Unique), `user_id` (FK -> User, nullable), `first_name_en`, `last_name_en`, `first_name_ur`, `last_name_ur`, `gender` (MALE, FEMALE, OTHER), `dob`, `cnic_bform`, `blood_group`, `religion`, `admission_date`, `photo_url`, `emergency_contact_name`, `emergency_contact_phone`, `medical_notes`, `status` (ACTIVE, ALUMNI, TRANSFERRED, EXPELLED, SUSPENDED), `created_at`, `updated_at`.
- **`Guardian`**: `id` (UUID, PK), `user_id` (FK -> User, nullable), `first_name_en`, `last_name_en`, `first_name_ur`, `last_name_ur`, `relationship_to_student` (FATHER, MOTHER, GUARDIAN), `cnic`, `occupation`, `phone_primary`, `phone_secondary`, `email`, `address_en`, `address_ur`, `is_emergency_contact`.
- **`StudentGuardianRelation`**: `student_id` (FK), `guardian_id` (FK), `relation_type`, `is_primary` (Boolean), PK(`student_id`, `guardian_id`).
- **`StudentEnrollmentHistory`**: `id` (UUID, PK), `student_id` (FK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `roll_number` (Int), `enrollment_date`, `exit_date`, `exit_reason`, `promotion_status` (CURRENT, PROMOTED, REPEATING, WITHDRAWN), `is_active` (Boolean).

---

### 2.4. Attendance & Leave Management
- **`StudentDailyAttendance`**: `id` (UUID, PK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `student_id` (FK), `date` (Date), `status` (PRESENT, ABSENT, LATE, HALF_DAY, EXCUSED_LEAVE), `remarks`, `marked_by_user_id` (FK), Unique(`student_id`, `date`).
- **`StudentSubjectAttendance`**: `id` (UUID, PK), `timetable_slot_id` (FK), `student_id` (FK), `date` (Date), `status`, `marked_by_teacher_id` (FK).
- **`StaffAttendance`**: `id` (UUID, PK), `employee_id` (FK), `date` (Date), `check_in_time`, `check_out_time`, `status` (PRESENT, ABSENT, LATE, ON_LEAVE), `is_manual_override` (Boolean), `remarks`.
- **`StaffLeaveApplication`**: `id` (UUID, PK), `employee_id` (FK), `leave_type_id` (FK), `start_date`, `end_date`, `total_days` (Decimal), `reason`, `status` (PENDING, APPROVED, REJECTED, CANCELLED), `approved_by_user_id` (FK), `created_at`.

---

### 2.5. Academics & Timetable
- **`TeacherSubjectAssignment`**: `id` (UUID, PK), `academic_session_id` (FK), `employee_id` (FK -> Teacher), `class_id` (FK), `section_id` (FK), `subject_id` (FK), `is_primary_teacher` (Boolean).
- **`TimetableSlot`**: `id` (UUID, PK), `day_of_week` (MONDAY .. SATURDAY), `period_number` (Int), `start_time` (Time), `end_time` (Time), `is_break` (Boolean).
- **`TimetableEntry`**: `id` (UUID, PK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `slot_id` (FK -> TimetableSlot), `subject_id` (FK), `teacher_id` (FK -> Employee), `room_number`, `publishing_status` (DRAFT, PUBLISHED).

---

### 2.6. Billing, Fee Management & Financial Records (Critical Integrity)
- **`FeeGroup`**: `id` (UUID, PK), `name_en` ('Monthly Regular Fees', 'Annual Admission Fees'), `name_ur`, `description`, `is_active`.
- **`FeeType`**: `id` (UUID, PK), `fee_group_id` (FK), `name_en` ('Tuition Fee', 'Admission Fee', 'Lab Fee', 'Computer Fee', 'Exam Fee', 'Transport Fee', 'Library Fee', 'Late Fee Fine'), `name_ur`, `code` (Unique), `account_head_id` (FK -> ChartOfAccount), `is_refundable` (Boolean), `is_active`.
- **`FeeStructure`**: `id` (UUID, PK), `academic_session_id` (FK), `class_id` (FK), `name_en`, `frequency` (MONTHLY, BI_MONTHLY, QUARTERLY, TERM_WISE, ANNUAL, ONE_TIME), `is_active`.
- **`FeeStructureItem`**: `id` (UUID, PK), `fee_structure_id` (FK), `fee_type_id` (FK), `amount` (`DECIMAL(12,2)`).
- **`FeeDiscountPolicy`**: `id` (UUID, PK), `name_en` ('Sibling 50% Discount', 'Staff Child Concession', 'Merit Scholarship 100%'), `name_ur`, `discount_type` (PERCENTAGE, FIXED_AMOUNT), `discount_value` (`DECIMAL(12,2)`), `applies_to_fee_type_id` (FK, nullable -> all or specific fee), `is_active`.
- **`StudentFeeDiscount`**: `id` (UUID, PK), `student_id` (FK), `academic_session_id` (FK), `discount_policy_id` (FK), `custom_fixed_amount` (`DECIMAL(12,2)`, nullable), `approved_by_user_id` (FK), `valid_from`, `valid_to`, `is_active`.
- **`VoucherGenerationBatch`**: `id` (UUID, PK), `batch_number` (Unique, e.g. 'VGB-202608-001'), `academic_session_id` (FK), `billing_month` (1..12), `billing_year` (Int), `class_id` (FK, nullable for all classes), `issue_date`, `due_date`, `validity_date`, `total_vouchers_count` (Int), `total_amount_billed` (`DECIMAL(12,2)`), `generated_by_user_id` (FK), `status` (PREVIEW, GENERATED, CANCELLED, LOCKED), `created_at`.
- **`FeeVoucher`**: `id` (UUID, PK), `voucher_no` (Unique, indexed, e.g. 'VCH-2026-000101'), `batch_id` (FK -> VoucherGenerationBatch, nullable for individual generation), `student_id` (FK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `issue_date` (Date), `due_date` (Date), `validity_date` (Date), `subtotal_amount` (`DECIMAL(12,2)`), `discount_amount` (`DECIMAL(12,2)`), `fine_amount` (`DECIMAL(12,2)`), `net_payable_amount` (`DECIMAL(12,2)`), `paid_amount` (`DECIMAL(12,2)`, default 0.00), `balance_amount` (`DECIMAL(12,2)`), `payment_status` (UNPAID, PARTIALLY_PAID, PAID, OVERDUE, REVERSED, SETTLED_ZERO_BALANCE), `publishing_status` (DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED), `is_locked` (Boolean, true when payments/ledger exist), `remarks`, `created_at`, `updated_at`.
- **`FeeVoucherItem`**: `id` (UUID, PK), `voucher_id` (FK -> FeeVoucher), `fee_type_id` (FK), `description`, `original_amount` (`DECIMAL(12,2)`), `discount_amount` (`DECIMAL(12,2)`), `net_amount` (`DECIMAL(12,2)`).
- **`FeePayment`**: `id` (UUID, PK), `receipt_no` (Unique, e.g. 'REC-2026-000452'), `voucher_id` (FK -> FeeVoucher), `student_id` (FK), `payment_date` (Date), `amount` (`DECIMAL(12,2)`), `payment_mode` (CASH, BANK_DEPOSIT, ONLINE_TRANSFER, CHEQUE), `bank_account_id` (FK, nullable), `transaction_reference_no` (e.g. Bank deposit slip / Tx ID), `received_by_user_id` (FK), `journal_entry_id` (FK -> JournalEntry, nullable), `is_reconciled` (Boolean), `status` (CONFIRMED, REVERSED), `created_at`.
- **`ZeroBalanceVoucherSettlement`**: `id` (UUID, PK), `voucher_id` (FK -> FeeVoucher, Unique), `settlement_type` (AUTO_ON_GENERATION, MANUAL_BULK, MANUAL_SINGLE), `settled_amount` (`DECIMAL(12,2)`, original net payable zero), `discount_policy_id` (FK, nullable), `settled_by_user_id` (FK), `settled_at` (Timestamp), `journal_entry_id` (FK -> JournalEntry, scholarship debit / receivable credit without cash impact), `notes`.
- **`FeeReversalLog`**: `id` (UUID, PK), `reversal_type` (PAYMENT_REVERSAL, VOUCHER_ADJUSTMENT), `original_payment_id` (FK, nullable), `voucher_id` (FK), `amount_reversed` (`DECIMAL(12,2)`), `reason` (Text, mandatory), `reversal_journal_entry_id` (FK -> JournalEntry), `initiated_by_user_id` (FK), `approved_by_user_id` (FK), `created_at`.
- **`BankAccount`**: `id` (UUID, PK), `bank_name`, `account_title`, `account_number`, `iban`, `branch_code`, `gl_account_id` (FK -> ChartOfAccount), `opening_balance` (`DECIMAL(12,2)`), `current_balance` (`DECIMAL(12,2)`), `is_active`.
- **`BankStatementEntry`**: `id` (UUID, PK), `bank_account_id` (FK), `transaction_date`, `value_date`, `description`, `reference_no`, `debit` (`DECIMAL(12,2)`), `credit` (`DECIMAL(12,2)`), `balance` (`DECIMAL(12,2)`), `match_status` (UNMATCHED, MATCHED, DISCREPANCY), `matched_payment_id` (FK -> FeePayment, nullable).
- **`BankReconciliation`**: `id` (UUID, PK), `bank_account_id` (FK), `statement_start_date`, `statement_end_date`, `statement_closing_balance` (`DECIMAL(12,2)`), `gl_closing_balance` (`DECIMAL(12,2)`), `difference` (`DECIMAL(12,2)`), `reconciled_by_user_id` (FK), `status` (IN_PROGRESS, COMPLETED, APPROVED).

---

### 2.7. Exams, Grading & Results / GPA
- **`ExamTerm`**: `id` (UUID, PK), `academic_session_id` (FK), `name_en` ('First Term', 'Midterm Exam', 'Final Annual Exam'), `name_ur`, `start_date`, `end_date`, `is_active`.
- **`GradeScale`**: `id` (UUID, PK), `name` ('Standard Metric Grading (A+, A, B, C, D, F)'), `description`, `is_active`.
- **`GradeScaleDetail`**: `id` (UUID, PK), `grade_scale_id` (FK), `grade_letter` ('A+', 'A', 'B'), `gpa_point` (`DECIMAL(3,2)`, e.g. 4.00, 3.70), `min_percentage` (`DECIMAL(5,2)`), `max_percentage` (`DECIMAL(5,2)`), `remarks_en`, `remarks_ur`.
- **`ExamSchedule`**: `id` (UUID, PK), `exam_term_id` (FK), `class_id` (FK), `subject_id` (FK), `exam_date` (Date), `start_time` (Time), `end_time` (Time), `total_marks` (`DECIMAL(5,2)`), `passing_marks` (`DECIMAL(5,2)`), `room_number`.
- **`ExamMarksEntry`**: `id` (UUID, PK), `exam_schedule_id` (FK), `student_id` (FK), `obtained_theory_marks` (`DECIMAL(5,2)`), `obtained_practical_marks` (`DECIMAL(5,2)`), `total_obtained_marks` (`DECIMAL(5,2)`), `is_absent` (Boolean), `remarks`, `entered_by_teacher_id` (FK), `is_locked` (Boolean).
- **`StudentResult`**: `id` (UUID, PK), `exam_term_id` (FK), `student_id` (FK), `academic_session_id` (FK), `class_id` (FK), `section_id` (FK), `total_max_marks` (`DECIMAL(7,2)`), `total_obtained_marks` (`DECIMAL(7,2)`), `percentage` (`DECIMAL(5,2)`), `gpa` (`DECIMAL(3,2)`), `final_grade` (String), `class_rank` (Int, nullable), `section_rank` (Int, nullable), `result_status` (PASS, FAIL, SUPPLEMENTARY, WITHHELD).
- **`StudentResultCard`**: `id` (UUID, PK), `student_result_id` (FK -> StudentResult, Unique), `card_number` (Unique), `publishing_status` (DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED), `published_at` (Timestamp, nullable), `approved_by_user_id` (FK), `qr_verification_code` (UUID).

---

### 2.8. HR, Employee & Payroll Management
- **`Department`**: `id` (UUID, PK), `name_en` ('Academics', 'Administration', 'Accounts', 'IT Support', 'Security'), `name_ur`, `code` (Unique), `is_active`.
- **`Designation`**: `id` (UUID, PK), `department_id` (FK), `title_en` ('Senior Teacher', 'Accountant', 'Lab Assistant'), `title_ur`, `is_active`.
- **`Employee`**: `id` (UUID, PK), `employee_code` (Unique, e.g. 'EMP-012'), `user_id` (FK -> User, nullable), `department_id` (FK), `designation_id` (FK), `first_name_en`, `last_name_en`, `first_name_ur`, `last_name_ur`, `cnic` (Unique), `gender`, `dob`, `joining_date`, `phone`, `email`, `address_en`, `address_ur`, `qualification`, `bank_name`, `bank_account_no`, `employment_status` (PROBATION, PERMANENT, CONTRACT, RESIGNED, TERMINATED), `photo_url`, `created_at`, `updated_at`.
- **`SalaryStructure`**: `id` (UUID, PK), `name_en` ('Teaching Staff Scale A', 'Admin Staff Scale B'), `description`, `is_active`.
- **`SalaryComponent`**: `id` (UUID, PK), `name_en` ('Basic Salary', 'House Rent Allowance', 'Medical Allowance', 'Conveyance Allowance', 'Tax Deduction', 'EODI Deduction', 'Late Penalty'), `type` (EARNING, DEDUCTION), `is_taxable` (Boolean), `is_active`.
- **`EmployeeSalaryAssignment`**: `id` (UUID, PK), `employee_id` (FK), `component_id` (FK), `amount` (`DECIMAL(12,2)`), `is_active`.
- **`PayrollBatch`**: `id` (UUID, PK), `batch_no` (Unique, e.g. 'PAY-202608-01'), `salary_month` (1..12), `salary_year` (Int), `total_gross_salary` (`DECIMAL(14,2)`), `total_deductions` (`DECIMAL(14,2)`), `total_net_salary` (`DECIMAL(14,2)`), `disbursement_status` (DRAFT, APPROVED, DISBURSED, CANCELLED), `approved_by_user_id` (FK), `disbursed_at` (Timestamp).
- **`EmployeePayslip`**: `id` (UUID, PK), `payroll_batch_id` (FK), `employee_id` (FK), `payslip_no` (Unique), `basic_salary` (`DECIMAL(12,2)`), `total_allowances` (`DECIMAL(12,2)`), `total_deductions` (`DECIMAL(12,2)`), `net_salary` (`DECIMAL(12,2)`), `payment_mode` (BANK_TRANSFER, CASH, CHEQUE), `payment_status` (PENDING, PAID), `publishing_status` (DRAFT, APPROVED, PUBLISHED, ARCHIVED).

---

### 2.9. General Ledger, Chart of Accounts & Budget
- **`ChartOfAccount`**: `id` (UUID, PK), `account_code` (Unique, e.g. '1001-01'), `account_name_en` ('Cash in Hand', 'Tuition Fee Revenue', 'Staff Salary Expense'), `account_name_ur`, `account_type` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE), `parent_id` (FK -> Self, nullable for hierarchical tree), `is_reconciliation_account` (Boolean), `is_active`.
- **`FiscalYear`**: `id` (UUID, PK), `title` ('FY 2026-2027'), `start_date`, `end_date`, `is_closed` (Boolean).
- **`JournalEntry`**: `id` (UUID, PK), `voucher_no` (Unique, e.g. 'JV-2026-00089'), `entry_date` (Date), `fiscal_year_id` (FK), `reference_type` (FEE_RECEIPT, FEE_ZERO_SETTLEMENT, FEE_REVERSAL, PAYROLL_DISBURSEMENT, INVENTORY_PURCHASE, STORE_SALE, MANUAL_JV), `reference_id` (UUID, nullable), `narration` (Text), `is_posted` (Boolean), `created_by_user_id` (FK), `created_at`.
- **`JournalEntryLine`**: `id` (UUID, PK), `journal_entry_id` (FK -> JournalEntry), `account_id` (FK -> ChartOfAccount), `debit_amount` (`DECIMAL(14,2)`, default 0.00), `credit_amount` (`DECIMAL(14,2)`, default 0.00), `description`. *(Invariant: SUM(debit) == SUM(credit) for every journal entry)*.
- **`BudgetPlan`**: `id` (UUID, PK), `fiscal_year_id` (FK), `title`, `total_budgeted_amount` (`DECIMAL(14,2)`), `status` (DRAFT, APPROVED, LOCKED).
- **`BudgetItem`**: `id` (UUID, PK), `budget_plan_id` (FK), `account_id` (FK -> Expense/Revenue Account), `allocated_amount` (`DECIMAL(14,2)`), `spent_amount` (`DECIMAL(14,2)`, computed/updated from GL).

---

### 2.10. Library Management
- **`BookCategory`**: `id` (UUID, PK), `name_en` ('Science', 'Literature', 'Islamic Studies', 'Mathematics'), `name_ur`, `code`.
- **`Book`**: `id` (UUID, PK), `category_id` (FK), `title_en`, `title_ur`, `isbn` (Unique, nullable), `author`, `publisher`, `edition`, `total_copies` (Int), `available_copies` (Int), `shelf_location`.
- **`BookCopy`**: `id` (UUID, PK), `book_id` (FK), `barcode_accession_no` (Unique), `condition` (NEW, GOOD, FAIR, DAMAGED, LOST), `status` (AVAILABLE, ISSUED, RESERVED, WRITTEN_OFF).
- **`LibraryMember`**: `id` (UUID, PK), `member_type` (STUDENT, EMPLOYEE), `student_id` (FK, nullable), `employee_id` (FK, nullable), `card_number` (Unique), `max_books_allowed` (Int, default 2), `is_active` (Boolean).
- **`BookIssueReturn`**: `id` (UUID, PK), `book_copy_id` (FK), `member_id` (FK), `issue_date` (Date), `due_date` (Date), `return_date` (Date, nullable), `fine_amount` (`DECIMAL(10,2)`, default 0.00), `fine_paid_status` (NONE, UNPAID, PAID), `issued_by_user_id` (FK).

---

### 2.11. Inventory, Procurement & School Store
- **`InventoryCategory`**: `id` (UUID, PK), `name_en` ('Stationery', 'Uniforms', 'Lab Equipment', 'IT Hardware', 'Cleaning Supplies'), `name_ur`.
- **`InventoryItem`**: `id` (UUID, PK), `category_id` (FK), `item_code` (Unique), `name_en`, `name_ur`, `unit_of_measure` ('PIECE', 'BOX', 'KG', 'SET'), `reorder_level` (Int), `current_stock_quantity` (Decimal), `unit_cost_price` (`DECIMAL(12,2)`), `unit_sale_price` (`DECIMAL(12,2)`, nullable for store resale items).
- **`Vendor`**: `id` (UUID, PK), `name`, `contact_person`, `phone`, `email`, `ntn_tax_no`, `address`, `gl_account_id` (FK -> ChartOfAccount Accounts Payable).
- **`PurchaseOrder`**: `id` (UUID, PK), `po_number` (Unique), `vendor_id` (FK), `order_date`, `expected_delivery_date`, `total_amount` (`DECIMAL(14,2)`), `status` (DRAFT, APPROVED, RECEIVED, CANCELLED).
- **`GoodsReceivedNote`**: `id` (UUID, PK), `grn_number` (Unique), `purchase_order_id` (FK), `vendor_id` (FK), `received_date`, `invoice_no`, `total_amount` (`DECIMAL(14,2)`), `received_by_user_id` (FK), `journal_entry_id` (FK).
- **`StoreSaleInvoice`**: `id` (UUID, PK), `invoice_no` (Unique, e.g. 'STR-2026-00021'), `student_id` (FK, nullable), `customer_name`, `sale_date`, `total_amount` (`DECIMAL(12,2)`), `discount_amount` (`DECIMAL(12,2)`), `net_amount` (`DECIMAL(12,2)`), `payment_mode` (CASH, LINKED_TO_FEE_VOUCHER), `fee_voucher_id` (FK, nullable), `journal_entry_id` (FK).

---

### 2.12. Central Publishing Engine & Workflow State
- **`PublishingWorkflow`**:
  - `id` (UUID, PK)
  - `entity_type` (ENUM: `FEE_VOUCHER`, `EXAM_RESULT`, `RESULT_CARD`, `TIMETABLE`, `NOTICE`, `PAYSLIP`, `DOCUMENT`)
  - `entity_id` (UUID, indexable polymorphic target ID)
  - `current_status` (ENUM: `DRAFT`, `UNDER_REVIEW`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`)
  - `version` (Int, auto-incrementing per entity revision)
  - `target_audience` (Array: `['ADMIN', 'TEACHER', 'EMPLOYEE', 'STUDENT', 'PARENT']`)
  - `created_by_user_id` (FK -> User)
  - `reviewed_by_user_id` (FK -> User, nullable)
  - `approved_by_user_id` (FK -> User, nullable)
  - `published_by_user_id` (FK -> User, nullable)
  - `published_at` (Timestamp, nullable)
  - `archived_at` (Timestamp, nullable)
  - `reason_or_notes` (Text, nullable)
  - `created_at`, `updated_at`
- **`PublishingBatch`**:
  - `id` (UUID, PK)
  - `batch_no` (Unique, e.g. 'PUB-202608-004')
  - `entity_type` (ENUM)
  - `action_type` (ENUM: `BULK_PUBLISH`, `BULK_UNPUBLISH`, `BULK_ARCHIVE`)
  - `total_targeted_count` (Int)
  - `successful_count` (Int)
  - `failed_count` (Int)
  - `initiated_by_user_id` (FK -> User)
  - `execution_summary_json` (JSONB)
  - `created_at`

---

### 2.13. Universal Audit Trail
- **`AuditLog`**:
  - `id` (UUID, PK)
  - `timestamp` (Timestamp with timezone, default `NOW()`, indexed)
  - `user_id` (UUID, FK -> User, nullable for system actions)
  - `user_role` (String, e.g. 'Principal', 'Accountant')
  - `ip_address` (String, e.g. '192.168.1.50')
  - `user_agent` (String)
  - `module` (ENUM: `CONFIG`, `SECURITY`, `ADMISSIONS`, `STUDENTS`, `ACADEMICS`, `ATTENDANCE`, `BILLING`, `EXAMS`, `HR_PAYROLL`, `ACCOUNTS`, `LIBRARY`, `INVENTORY`, `COMMUNICATION`, `PUBLISHING`)
  - `entity_type` (String, e.g. 'FeeVoucher', 'StudentResultCard', 'RolePermission')
  - `entity_id` (UUID)
  - `action` (ENUM: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `PRINT`, `EXPORT`, `PUBLISH`, `UNPUBLISH`, `REVERSE`)
  - `old_values` (JSONB, nullable snapshot before change)
  - `new_values` (JSONB, nullable snapshot after change)
  - `change_summary` (Text, human-readable summary e.g. 'Discount increased from 10% to 25% on Voucher #VCH-2026-0042')
  - `request_id` (UUID / String, correlation ID linking all records touched in a single HTTP request or batch).
