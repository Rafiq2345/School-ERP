-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN     "allow_full_day" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_half_day" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_hourly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allow_shift_wise" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "attachment_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attachment_threshold_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "default_allocation_method" TEXT NOT NULL DEFAULT 'ANNUAL_UPFRONT',
ADD COLUMN     "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "min_leave_unit" DECIMAL(3,2) NOT NULL DEFAULT 0.50;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "day_specific_timings" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "early_exit_grace_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effective_to" TIMESTAMP(3),
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "min_hours_full_day" DECIMAL(4,2) DEFAULT 6.00,
ADD COLUMN     "min_hours_half_day" DECIMAL(4,2) DEFAULT 3.50,
ADD COLUMN     "working_days" JSONB,
ALTER COLUMN "break_minutes" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL DEFAULT 'BASE',
    "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "base_fee" DECIMAL(10,2) NOT NULL DEFAULT 15000.00,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "show_history_to_school" BOOLEAN NOT NULL DEFAULT true,
    "suspended_at" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_invoices" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "billing_period" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "grace_until" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "previous_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_payable" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "provider_notes" TEXT,
    "school_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proof_submissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "submitted_amount" DECIMAL(10,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_ref" TEXT NOT NULL,
    "bank_name" TEXT,
    "notes" TEXT,
    "submitted_by_user_id" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ai_confidence_score" DECIMAL(4,2),
    "ai_extracted_data_json" JSONB,
    "verified_by_user_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_proof_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_receiving_accounts" (
    "id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_title" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "iban" TEXT,
    "raast_id" TEXT,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_receiving_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_shift_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "employee_id" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "applicable_days" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "reason" TEXT,
    "assigned_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "action" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "affected_employees_count" INTEGER,
    "reason" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admission_no" TEXT NOT NULL,
    "registration_no" TEXT,
    "first_name_en" TEXT NOT NULL,
    "last_name_en" TEXT,
    "full_name_ur" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'MALE',
    "dob" TIMESTAMP(3) NOT NULL,
    "blood_group" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "religion" TEXT DEFAULT 'ISLAM',
    "nationality" TEXT DEFAULT 'PAKISTANI',
    "national_id" TEXT,
    "photo_url" TEXT,
    "admission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admission_session_id" TEXT NOT NULL,
    "category_id" TEXT,
    "house_id" TEXT,
    "primary_contact_phone" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "current_address_en" TEXT,
    "current_address_ur" TEXT,
    "permanent_address_en" TEXT,
    "city" TEXT DEFAULT 'Karachi',
    "current_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "custom_field_values" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name_en" TEXT NOT NULL,
    "full_name_ur" TEXT,
    "national_id" TEXT,
    "relationship_type" TEXT NOT NULL DEFAULT 'FATHER',
    "occupation" TEXT,
    "employer" TEXT,
    "designation" TEXT,
    "annual_income" DECIMAL(12,2),
    "primary_phone" TEXT NOT NULL,
    "secondary_phone" TEXT,
    "email" TEXT,
    "residential_address" TEXT,
    "office_address" TEXT,
    "city" TEXT DEFAULT 'Karachi',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardian_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'FATHER',
    "is_primary_contact" BOOLEAN NOT NULL DEFAULT true,
    "is_emergency_contact" BOOLEAN NOT NULL DEFAULT false,
    "is_financial_responsible" BOOLEAN NOT NULL DEFAULT true,
    "has_portal_access" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_guardian_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_session_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "roll_number" TEXT,
    "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrollment_type" TEXT NOT NULL DEFAULT 'NEW_ADMISSION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "promoted_from_enrollment_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaving_certificate_no" TEXT,
    "leaving_certificate_date" TIMESTAMP(3),
    "remarks" TEXT,
    "changed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "verified_at" TIMESTAMP(3),
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_previous_schools" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "last_class_passed" TEXT NOT NULL,
    "board_or_institute" TEXT,
    "slc_number" TEXT,
    "slc_issue_date" TIMESTAMP(3),
    "percentage_or_gpa" DECIMAL(5,2),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_previous_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "source_session_id" TEXT NOT NULL,
    "target_session_id" TEXT NOT NULL,
    "source_class_id" TEXT NOT NULL,
    "source_section_id" TEXT,
    "target_class_id" TEXT,
    "target_section_id" TEXT,
    "is_graduation" BOOLEAN NOT NULL DEFAULT false,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "promoted_count" INTEGER NOT NULL DEFAULT 0,
    "repeated_count" INTEGER NOT NULL DEFAULT 0,
    "graduated_count" INTEGER NOT NULL DEFAULT 0,
    "held_count" INTEGER NOT NULL DEFAULT 0,
    "excluded_count" INTEGER NOT NULL DEFAULT 0,
    "is_rolled_back" BOOLEAN NOT NULL DEFAULT false,
    "rolled_back_at" TIMESTAMP(3),
    "rolled_back_by_user_id" TEXT,
    "rollback_reason" TEXT,
    "processed_by_user_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_batch_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "source_enrollment_id" TEXT,
    "target_enrollment_id" TEXT,
    "previous_student_status" TEXT NOT NULL,
    "new_student_status" TEXT NOT NULL,
    "target_class_id" TEXT,
    "target_section_id" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendance_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "academic_session_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "recorded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "previous_remarks" TEXT,
    "new_remarks" TEXT,
    "correction_reason" TEXT NOT NULL,
    "corrected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_holidays" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "holiday_type" TEXT NOT NULL DEFAULT 'PUBLIC_HOLIDAY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'WHOLE_SCHOOL',
    "academic_session_id" TEXT,
    "target_class_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_user_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_off_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "academic_session_id" TEXT,
    "days_of_week" INTEGER[] DEFAULT ARRAY[0]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_off_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "holiday_id" TEXT,
    "action" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_no" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name_en" TEXT NOT NULL,
    "last_name_en" TEXT,
    "full_name_ur" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'MALE',
    "dob" TIMESTAMP(3),
    "national_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employee_category_id" TEXT,
    "employment_type_id" TEXT,
    "shift_id" TEXT,
    "joining_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "standard_working_hours" DECIMAL(4,2) DEFAULT 8.00,
    "confirmation_status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "probation_end_date" TIMESTAMP(3),
    "confirmation_date" TIMESTAMP(3),
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendance_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL,
    "shift_id" TEXT NOT NULL,
    "scheduled_start_time" TEXT,
    "scheduled_end_time" TEXT,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_exit_minutes" INTEGER NOT NULL DEFAULT 0,
    "worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "is_weekly_off" BOOLEAN NOT NULL DEFAULT false,
    "leave_type_id" TEXT,
    "remarks" TEXT,
    "punch_source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recorded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendance_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "shift_id" TEXT,
    "attendance_date" TIMESTAMP(3) NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "previous_check_in" TIMESTAMP(3),
    "new_check_in" TIMESTAMP(3),
    "previous_check_out" TIMESTAMP(3),
    "new_check_out" TIMESTAMP(3),
    "previous_remarks" TEXT,
    "new_remarks" TEXT,
    "correction_reason" TEXT NOT NULL,
    "corrected_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_attendance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_days" (
    "id" TEXT NOT NULL,
    "work_schedule_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "shift_ids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_schedule_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "employee_id" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employment_type_id" TEXT,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policy_rules" (
    "id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "annual_entitlement" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
    "allocation_method" TEXT NOT NULL DEFAULT 'ANNUAL_UPFRONT',
    "min_leave_unit" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "allow_half_day" BOOLEAN NOT NULL DEFAULT true,
    "allow_shift_wise" BOOLEAN NOT NULL DEFAULT true,
    "allow_hourly" BOOLEAN NOT NULL DEFAULT false,
    "allow_negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "max_negative_balance" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "max_consecutive_days" INTEGER,
    "probation_treatment" TEXT NOT NULL DEFAULT 'ALLOWED',
    "probation_entitlement" DECIMAL(5,2),
    "entitlement_release" TEXT NOT NULL DEFAULT 'ON_JOINING',
    "year_end_action" TEXT NOT NULL DEFAULT 'EXPIRE',
    "max_carry_forward_days" DECIMAL(5,2),
    "carry_forward_expiry_months" INTEGER,
    "max_encashable_days" DECIMAL(5,2),
    "min_balance_for_encashment" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policy_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "employee_id" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employment_type_id" TEXT,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_entitlements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "leave_policy_id" TEXT NOT NULL,
    "leave_year" INTEGER NOT NULL,
    "allocation_method" TEXT NOT NULL DEFAULT 'ANNUAL_UPFRONT',
    "opening_balance" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "allocated_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "carried_forward_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "adjusted_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "used_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "encashed_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "expired_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "available_balance" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "has_override" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_ledger_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "leave_policy_id" TEXT,
    "entitlement_id" TEXT,
    "leave_year" INTEGER NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DECIMAL(5,2) NOT NULL,
    "balance_before" DECIMAL(5,2) NOT NULL,
    "balance_after" DECIMAL(5,2) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "shift_id" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "reason" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_applications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_number" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "leave_policy_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "leave_scope" TEXT NOT NULL DEFAULT 'FULL_DAY',
    "half_day_period" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "duration_hours" DECIMAL(5,2),
    "requested_days" DECIMAL(5,2) NOT NULL,
    "working_days_count" INTEGER NOT NULL DEFAULT 0,
    "holidays_count" INTEGER NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "attachment_size" INTEGER,
    "attachment_mime" TEXT,
    "requires_attachment" BOOLEAN NOT NULL DEFAULT false,
    "is_attachment_provided" BOOLEAN NOT NULL DEFAULT false,
    "employee_status_snapshot" TEXT,
    "policy_snapshot_json" JSONB,
    "balance_snapshot" JSONB,
    "applicant_user_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_application_dates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "holiday_name" TEXT,
    "leave_quantity" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_application_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_application_shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift_id" TEXT NOT NULL,
    "shift_code" TEXT NOT NULL,
    "shift_name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "leave_fraction" DECIMAL(5,2) NOT NULL DEFAULT 0.50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_application_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_workflows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_workflow_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "employee_id" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employment_type_id" TEXT,
    "leave_type_id" TEXT,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_approval_workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_workflow_steps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "approver_type" TEXT NOT NULL DEFAULT 'ROLE',
    "approver_user_id" TEXT,
    "approver_role" TEXT,
    "approver_designation_id" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "auto_approve_after_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_approval_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_approval_instances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "workflow_id" TEXT,
    "workflow_name" TEXT NOT NULL,
    "workflow_code" TEXT NOT NULL,
    "workflow_snapshot" JSONB NOT NULL,
    "current_step_number" INTEGER NOT NULL DEFAULT 1,
    "total_steps" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_request_approval_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_approval_steps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "approver_type" TEXT NOT NULL,
    "approver_user_id" TEXT,
    "approver_role" TEXT,
    "approver_designation_id" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "assigned_at" TIMESTAMP(3),
    "action_at" TIMESTAMP(3),
    "action_by_user_id" TEXT,
    "action" TEXT,
    "remarks" TEXT,
    "clarification_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_request_approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_approval_action_histories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_id" TEXT,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "remarks" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_approval_action_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_code" TEXT NOT NULL,
    "policy_name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "leave_type_id" TEXT,
    "calculation_basis" TEXT NOT NULL,
    "fixed_divisor" DECIMAL(6,2),
    "late_trigger_count" INTEGER,
    "max_deduction_days_per_period" DECIMAL(5,2),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deduction_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_inputs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "leave_application_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT,
    "payroll_period_start" TIMESTAMP(3) NOT NULL,
    "payroll_period_end" TIMESTAMP(3) NOT NULL,
    "payroll_period_label" TEXT NOT NULL,
    "deduction_scope" TEXT NOT NULL,
    "calculation_basis" TEXT NOT NULL,
    "deduction_days" DECIMAL(5,2) NOT NULL,
    "fixed_divisor_used" DECIMAL(6,2),
    "deduction_amount" DECIMAL(12,2),
    "currency_code" TEXT NOT NULL DEFAULT 'PKR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reversal_reason" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversed_by_user_id" TEXT,
    "system_actor_note" TEXT,
    "calculation_evidence" JSONB NOT NULL,
    "created_by_user_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deduction_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "deduction_input_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_deduction_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_invoices_invoice_no_key" ON "provider_invoices"("invoice_no");

-- CreateIndex
CREATE INDEX "employee_shift_assignments_tenant_id_employee_id_effective__idx" ON "employee_shift_assignments"("tenant_id", "employee_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_shift_assignments_tenant_id_department_id_effectiv_idx" ON "employee_shift_assignments"("tenant_id", "department_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_shift_assignments_tenant_id_designation_id_effecti_idx" ON "employee_shift_assignments"("tenant_id", "designation_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_shift_assignments_tenant_id_assignment_type_idx" ON "employee_shift_assignments"("tenant_id", "assignment_type");

-- CreateIndex
CREATE INDEX "employee_shift_assignments_tenant_id_is_active_idx" ON "employee_shift_assignments"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "shift_audit_logs_tenant_id_shift_id_idx" ON "shift_audit_logs"("tenant_id", "shift_id");

-- CreateIndex
CREATE INDEX "shift_audit_logs_tenant_id_created_at_idx" ON "shift_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "students_tenant_id_current_status_idx" ON "students"("tenant_id", "current_status");

-- CreateIndex
CREATE INDEX "students_tenant_id_category_id_idx" ON "students"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "students_tenant_id_house_id_idx" ON "students"("tenant_id", "house_id");

-- CreateIndex
CREATE INDEX "students_tenant_id_admission_session_id_idx" ON "students"("tenant_id", "admission_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_tenant_id_admission_no_key" ON "students"("tenant_id", "admission_no");

-- CreateIndex
CREATE INDEX "guardians_tenant_id_national_id_idx" ON "guardians"("tenant_id", "national_id");

-- CreateIndex
CREATE INDEX "guardians_tenant_id_primary_phone_idx" ON "guardians"("tenant_id", "primary_phone");

-- CreateIndex
CREATE UNIQUE INDEX "student_guardian_relations_tenant_id_student_id_guardian_id_key" ON "student_guardian_relations"("tenant_id", "student_id", "guardian_id");

-- CreateIndex
CREATE INDEX "student_enrollments_tenant_id_class_id_section_id_idx" ON "student_enrollments"("tenant_id", "class_id", "section_id");

-- CreateIndex
CREATE INDEX "student_enrollments_tenant_id_is_current_idx" ON "student_enrollments"("tenant_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_tenant_id_student_id_academic_session_i_key" ON "student_enrollments"("tenant_id", "student_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "student_status_history_tenant_id_student_id_idx" ON "student_status_history"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_documents_tenant_id_student_id_idx" ON "student_documents"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_previous_schools_tenant_id_student_id_idx" ON "student_previous_schools"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "promotion_batches_tenant_id_source_session_id_idx" ON "promotion_batches"("tenant_id", "source_session_id");

-- CreateIndex
CREATE INDEX "promotion_batches_tenant_id_target_session_id_idx" ON "promotion_batches"("tenant_id", "target_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_batches_tenant_id_batch_number_key" ON "promotion_batches"("tenant_id", "batch_number");

-- CreateIndex
CREATE INDEX "promotion_batch_items_tenant_id_batch_id_idx" ON "promotion_batch_items"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "promotion_batch_items_tenant_id_student_id_idx" ON "promotion_batch_items"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_attendance_records_tenant_id_attendance_date_idx" ON "student_attendance_records"("tenant_id", "attendance_date");

-- CreateIndex
CREATE INDEX "student_attendance_records_tenant_id_class_id_section_id_at_idx" ON "student_attendance_records"("tenant_id", "class_id", "section_id", "attendance_date");

-- CreateIndex
CREATE INDEX "student_attendance_records_tenant_id_student_id_idx" ON "student_attendance_records"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_attendance_records_tenant_id_status_idx" ON "student_attendance_records"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_records_tenant_id_student_id_attendance__key" ON "student_attendance_records"("tenant_id", "student_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_audit_logs_tenant_id_attendance_record_id_idx" ON "attendance_audit_logs"("tenant_id", "attendance_record_id");

-- CreateIndex
CREATE INDEX "attendance_audit_logs_tenant_id_student_id_idx" ON "attendance_audit_logs"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "school_holidays_tenant_id_start_date_end_date_idx" ON "school_holidays"("tenant_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "school_holidays_tenant_id_status_idx" ON "school_holidays"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "school_holidays_tenant_id_scope_idx" ON "school_holidays"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "school_holidays_tenant_id_academic_session_id_idx" ON "school_holidays"("tenant_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "weekly_off_settings_tenant_id_is_active_idx" ON "weekly_off_settings"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_off_settings_tenant_id_academic_session_id_key" ON "weekly_off_settings"("tenant_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "holiday_audit_logs_tenant_id_holiday_id_idx" ON "holiday_audit_logs"("tenant_id", "holiday_id");

-- CreateIndex
CREATE INDEX "holiday_audit_logs_tenant_id_action_idx" ON "holiday_audit_logs"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "holiday_audit_logs_tenant_id_created_at_idx" ON "holiday_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_current_status_idx" ON "employees"("tenant_id", "current_status");

-- CreateIndex
CREATE INDEX "employees_tenant_id_department_id_idx" ON "employees"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_designation_id_idx" ON "employees"("tenant_id", "designation_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_employee_no_key" ON "employees"("tenant_id", "employee_no");

-- CreateIndex
CREATE INDEX "employee_attendance_records_tenant_id_attendance_date_idx" ON "employee_attendance_records"("tenant_id", "attendance_date");

-- CreateIndex
CREATE INDEX "employee_attendance_records_tenant_id_employee_id_idx" ON "employee_attendance_records"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_attendance_records_tenant_id_status_idx" ON "employee_attendance_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "employee_attendance_records_tenant_id_shift_id_idx" ON "employee_attendance_records"("tenant_id", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_attendance_records_tenant_id_employee_id_attendanc_key" ON "employee_attendance_records"("tenant_id", "employee_id", "attendance_date", "shift_id");

-- CreateIndex
CREATE INDEX "employee_attendance_audit_logs_tenant_id_attendance_record__idx" ON "employee_attendance_audit_logs"("tenant_id", "attendance_record_id");

-- CreateIndex
CREATE INDEX "employee_attendance_audit_logs_tenant_id_employee_id_idx" ON "employee_attendance_audit_logs"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_attendance_audit_logs_tenant_id_shift_id_idx" ON "employee_attendance_audit_logs"("tenant_id", "shift_id");

-- CreateIndex
CREATE INDEX "employee_attendance_audit_logs_tenant_id_created_at_idx" ON "employee_attendance_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "work_schedules_tenant_id_is_active_idx" ON "work_schedules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "work_schedules_tenant_id_is_default_idx" ON "work_schedules"("tenant_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_tenant_id_code_key" ON "work_schedules"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "work_schedule_days_work_schedule_id_idx" ON "work_schedule_days"("work_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedule_days_work_schedule_id_day_of_week_key" ON "work_schedule_days"("work_schedule_id", "day_of_week");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_employee_id_effecti_idx" ON "employee_schedule_assignments"("tenant_id", "employee_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_department_id_effec_idx" ON "employee_schedule_assignments"("tenant_id", "department_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_designation_id_effe_idx" ON "employee_schedule_assignments"("tenant_id", "designation_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_employment_type_id__idx" ON "employee_schedule_assignments"("tenant_id", "employment_type_id", "effective_from");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_schedule_id_idx" ON "employee_schedule_assignments"("tenant_id", "schedule_id");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_tenant_id_is_active_idx" ON "employee_schedule_assignments"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "leave_policies_tenant_id_status_idx" ON "leave_policies"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_policies_tenant_id_is_default_idx" ON "leave_policies"("tenant_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_tenant_id_code_key" ON "leave_policies"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "leave_policy_rules_leave_policy_id_idx" ON "leave_policy_rules"("leave_policy_id");

-- CreateIndex
CREATE INDEX "leave_policy_rules_leave_type_id_idx" ON "leave_policy_rules"("leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policy_rules_leave_policy_id_leave_type_id_key" ON "leave_policy_rules"("leave_policy_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_employee_id_effective_fr_idx" ON "leave_policy_assignments"("tenant_id", "employee_id", "effective_from");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_department_id_effective__idx" ON "leave_policy_assignments"("tenant_id", "department_id", "effective_from");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_designation_id_effective_idx" ON "leave_policy_assignments"("tenant_id", "designation_id", "effective_from");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_employment_type_id_effec_idx" ON "leave_policy_assignments"("tenant_id", "employment_type_id", "effective_from");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_leave_policy_id_idx" ON "leave_policy_assignments"("tenant_id", "leave_policy_id");

-- CreateIndex
CREATE INDEX "leave_policy_assignments_tenant_id_is_active_idx" ON "leave_policy_assignments"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "employee_leave_entitlements_tenant_id_leave_year_idx" ON "employee_leave_entitlements"("tenant_id", "leave_year");

-- CreateIndex
CREATE INDEX "employee_leave_entitlements_tenant_id_employee_id_idx" ON "employee_leave_entitlements"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_leave_entitlements_tenant_id_leave_type_id_idx" ON "employee_leave_entitlements"("tenant_id", "leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_entitlements_tenant_id_employee_id_leave_typ_key" ON "employee_leave_entitlements"("tenant_id", "employee_id", "leave_type_id", "leave_year");

-- CreateIndex
CREATE INDEX "leave_ledger_transactions_tenant_id_employee_id_leave_year_idx" ON "leave_ledger_transactions"("tenant_id", "employee_id", "leave_year");

-- CreateIndex
CREATE INDEX "leave_ledger_transactions_tenant_id_employee_id_leave_type__idx" ON "leave_ledger_transactions"("tenant_id", "employee_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_ledger_transactions_tenant_id_transaction_type_idx" ON "leave_ledger_transactions"("tenant_id", "transaction_type");

-- CreateIndex
CREATE INDEX "leave_ledger_transactions_tenant_id_effective_date_idx" ON "leave_ledger_transactions"("tenant_id", "effective_date");

-- CreateIndex
CREATE INDEX "leave_audit_logs_tenant_id_entity_type_entity_id_idx" ON "leave_audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "leave_audit_logs_tenant_id_action_idx" ON "leave_audit_logs"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "leave_audit_logs_tenant_id_created_at_idx" ON "leave_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_applications_tenant_id_employee_id_start_date_end_dat_idx" ON "leave_applications"("tenant_id", "employee_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "leave_applications_tenant_id_status_idx" ON "leave_applications"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_applications_tenant_id_leave_type_id_idx" ON "leave_applications"("tenant_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_applications_tenant_id_created_at_idx" ON "leave_applications"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "leave_applications_tenant_id_application_number_key" ON "leave_applications"("tenant_id", "application_number");

-- CreateIndex
CREATE INDEX "leave_application_dates_tenant_id_date_idx" ON "leave_application_dates"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_application_dates_application_id_date_key" ON "leave_application_dates"("application_id", "date");

-- CreateIndex
CREATE INDEX "leave_application_shifts_tenant_id_date_shift_id_idx" ON "leave_application_shifts"("tenant_id", "date", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_application_shifts_application_id_date_shift_id_key" ON "leave_application_shifts"("application_id", "date", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_sequences_tenant_id_year_key" ON "leave_sequences"("tenant_id", "year");

-- CreateIndex
CREATE INDEX "leave_approval_workflows_tenant_id_is_active_idx" ON "leave_approval_workflows"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "leave_approval_workflows_tenant_id_is_default_idx" ON "leave_approval_workflows"("tenant_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "leave_approval_workflows_tenant_id_code_key" ON "leave_approval_workflows"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_workflow_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_employee_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_department_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_designation_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "designation_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_employment_type_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "employment_type_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_leave_type_id_idx" ON "leave_approval_workflow_rules"("tenant_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_rules_tenant_id_assignment_type_idx" ON "leave_approval_workflow_rules"("tenant_id", "assignment_type");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_steps_tenant_id_workflow_id_idx" ON "leave_approval_workflow_steps"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_steps_tenant_id_approver_role_idx" ON "leave_approval_workflow_steps"("tenant_id", "approver_role");

-- CreateIndex
CREATE INDEX "leave_approval_workflow_steps_tenant_id_approver_user_id_idx" ON "leave_approval_workflow_steps"("tenant_id", "approver_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_approval_workflow_steps_workflow_id_step_number_key" ON "leave_approval_workflow_steps"("workflow_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "leave_request_approval_instances_application_id_key" ON "leave_request_approval_instances"("application_id");

-- CreateIndex
CREATE INDEX "leave_request_approval_instances_tenant_id_status_idx" ON "leave_request_approval_instances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_request_approval_instances_tenant_id_current_step_num_idx" ON "leave_request_approval_instances"("tenant_id", "current_step_number");

-- CreateIndex
CREATE INDEX "leave_request_approval_instances_tenant_id_created_at_idx" ON "leave_request_approval_instances"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_request_approval_steps_tenant_id_status_idx" ON "leave_request_approval_steps"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_request_approval_steps_tenant_id_approver_role_idx" ON "leave_request_approval_steps"("tenant_id", "approver_role");

-- CreateIndex
CREATE INDEX "leave_request_approval_steps_tenant_id_approver_user_id_idx" ON "leave_request_approval_steps"("tenant_id", "approver_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_request_approval_steps_instance_id_step_number_key" ON "leave_request_approval_steps"("instance_id", "step_number");

-- CreateIndex
CREATE INDEX "leave_approval_action_histories_tenant_id_instance_id_idx" ON "leave_approval_action_histories"("tenant_id", "instance_id");

-- CreateIndex
CREATE INDEX "leave_approval_action_histories_tenant_id_created_at_idx" ON "leave_approval_action_histories"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "payroll_deduction_policies_tenant_id_scope_idx" ON "payroll_deduction_policies"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "payroll_deduction_policies_tenant_id_is_active_idx" ON "payroll_deduction_policies"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "payroll_deduction_policies_tenant_id_leave_type_id_idx" ON "payroll_deduction_policies"("tenant_id", "leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_policies_tenant_id_policy_code_leave_type_key" ON "payroll_deduction_policies"("tenant_id", "policy_code", "leave_type_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_employee_id_payroll_peri_idx" ON "payroll_deduction_inputs"("tenant_id", "employee_id", "payroll_period_start");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_status_idx" ON "payroll_deduction_inputs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_leave_application_id_idx" ON "payroll_deduction_inputs"("tenant_id", "leave_application_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_policy_id_idx" ON "payroll_deduction_inputs"("tenant_id", "policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_inputs_tenant_id_leave_application_id_pay_key" ON "payroll_deduction_inputs"("tenant_id", "leave_application_id", "payroll_period_start");

-- CreateIndex
CREATE INDEX "payroll_deduction_audit_logs_tenant_id_deduction_input_id_idx" ON "payroll_deduction_audit_logs"("tenant_id", "deduction_input_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_audit_logs_tenant_id_created_at_idx" ON "payroll_deduction_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_types_tenant_id_is_active_idx" ON "leave_types"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "shifts_tenant_id_is_active_idx" ON "shifts"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "shifts_tenant_id_is_default_idx" ON "shifts"("tenant_id", "is_default");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proof_submissions" ADD CONSTRAINT "payment_proof_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proof_submissions" ADD CONSTRAINT "payment_proof_submissions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "provider_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_assignments" ADD CONSTRAINT "employee_shift_assignments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_audit_logs" ADD CONSTRAINT "shift_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_audit_logs" ADD CONSTRAINT "shift_audit_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_admission_session_id_fkey" FOREIGN KEY ("admission_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "student_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardian_relations" ADD CONSTRAINT "student_guardian_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardian_relations" ADD CONSTRAINT "student_guardian_relations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardian_relations" ADD CONSTRAINT "student_guardian_relations_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_promoted_from_enrollment_id_fkey" FOREIGN KEY ("promoted_from_enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_previous_schools" ADD CONSTRAINT "student_previous_schools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_previous_schools" ADD CONSTRAINT "student_previous_schools_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_target_session_id_fkey" FOREIGN KEY ("target_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_source_class_id_fkey" FOREIGN KEY ("source_class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_source_section_id_fkey" FOREIGN KEY ("source_section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_target_class_id_fkey" FOREIGN KEY ("target_class_id") REFERENCES "school_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_target_section_id_fkey" FOREIGN KEY ("target_section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_rolled_back_by_user_id_fkey" FOREIGN KEY ("rolled_back_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batch_items" ADD CONSTRAINT "promotion_batch_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batch_items" ADD CONSTRAINT "promotion_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "promotion_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batch_items" ADD CONSTRAINT "promotion_batch_items_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "student_attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_audit_logs" ADD CONSTRAINT "attendance_audit_logs_corrected_by_user_id_fkey" FOREIGN KEY ("corrected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_off_settings" ADD CONSTRAINT "weekly_off_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_off_settings" ADD CONSTRAINT "weekly_off_settings_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_audit_logs" ADD CONSTRAINT "holiday_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_audit_logs" ADD CONSTRAINT "holiday_audit_logs_holiday_id_fkey" FOREIGN KEY ("holiday_id") REFERENCES "school_holidays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_audit_logs" ADD CONSTRAINT "holiday_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_category_id_fkey" FOREIGN KEY ("employee_category_id") REFERENCES "employee_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_audit_logs" ADD CONSTRAINT "employee_attendance_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_audit_logs" ADD CONSTRAINT "employee_attendance_audit_logs_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "employee_attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_audit_logs" ADD CONSTRAINT "employee_attendance_audit_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_audit_logs" ADD CONSTRAINT "employee_attendance_audit_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendance_audit_logs" ADD CONSTRAINT "employee_attendance_audit_logs_corrected_by_user_id_fkey" FOREIGN KEY ("corrected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_days" ADD CONSTRAINT "work_schedule_days_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_rules" ADD CONSTRAINT "leave_policy_rules_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_rules" ADD CONSTRAINT "leave_policy_rules_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_entitlements" ADD CONSTRAINT "employee_leave_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_entitlements" ADD CONSTRAINT "employee_leave_entitlements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_entitlements" ADD CONSTRAINT "employee_leave_entitlements_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_entitlements" ADD CONSTRAINT "employee_leave_entitlements_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_ledger_transactions" ADD CONSTRAINT "leave_ledger_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_ledger_transactions" ADD CONSTRAINT "leave_ledger_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_ledger_transactions" ADD CONSTRAINT "leave_ledger_transactions_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_ledger_transactions" ADD CONSTRAINT "leave_ledger_transactions_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_ledger_transactions" ADD CONSTRAINT "leave_ledger_transactions_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "employee_leave_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_audit_logs" ADD CONSTRAINT "leave_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application_dates" ADD CONSTRAINT "leave_application_dates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application_dates" ADD CONSTRAINT "leave_application_dates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application_shifts" ADD CONSTRAINT "leave_application_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application_shifts" ADD CONSTRAINT "leave_application_shifts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application_shifts" ADD CONSTRAINT "leave_application_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflows" ADD CONSTRAINT "leave_approval_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "leave_approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_rules" ADD CONSTRAINT "leave_approval_workflow_rules_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_steps" ADD CONSTRAINT "leave_approval_workflow_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_steps" ADD CONSTRAINT "leave_approval_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "leave_approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_steps" ADD CONSTRAINT "leave_approval_workflow_steps_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_workflow_steps" ADD CONSTRAINT "leave_approval_workflow_steps_approver_designation_id_fkey" FOREIGN KEY ("approver_designation_id") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_instances" ADD CONSTRAINT "leave_request_approval_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_instances" ADD CONSTRAINT "leave_request_approval_instances_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_instances" ADD CONSTRAINT "leave_request_approval_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "leave_approval_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_steps" ADD CONSTRAINT "leave_request_approval_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_steps" ADD CONSTRAINT "leave_request_approval_steps_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "leave_request_approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_approval_steps" ADD CONSTRAINT "leave_request_approval_steps_action_by_user_id_fkey" FOREIGN KEY ("action_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_action_histories" ADD CONSTRAINT "leave_approval_action_histories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_action_histories" ADD CONSTRAINT "leave_approval_action_histories_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "leave_request_approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_approval_action_histories" ADD CONSTRAINT "leave_approval_action_histories_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policies" ADD CONSTRAINT "payroll_deduction_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policies" ADD CONSTRAINT "payroll_deduction_policies_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policies" ADD CONSTRAINT "payroll_deduction_policies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "payroll_deduction_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_leave_application_id_fkey" FOREIGN KEY ("leave_application_id") REFERENCES "leave_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_reversed_by_user_id_fkey" FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_audit_logs" ADD CONSTRAINT "payroll_deduction_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_audit_logs" ADD CONSTRAINT "payroll_deduction_audit_logs_deduction_input_id_fkey" FOREIGN KEY ("deduction_input_id") REFERENCES "payroll_deduction_inputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_audit_logs" ADD CONSTRAINT "payroll_deduction_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
