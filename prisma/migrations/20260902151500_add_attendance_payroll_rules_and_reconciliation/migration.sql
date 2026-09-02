-- AlterTable
ALTER TABLE "payroll_deduction_inputs" ADD COLUMN     "attendance_date" TIMESTAMP(3),
ADD COLUMN     "attendance_record_id" TEXT,
ADD COLUMN     "deduction_source_key" TEXT,
ADD COLUMN     "shift_id" TEXT,
ADD COLUMN     "source_type" TEXT NOT NULL DEFAULT 'LEAVE_APPLICATION',
ALTER COLUMN "leave_application_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payroll_deduction_policies" ADD COLUMN     "absence_deduction_unit" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
ADD COLUMN     "early_exit_deduction_unit" DECIMAL(5,2) NOT NULL DEFAULT 0.25,
ADD COLUMN     "early_exit_grace_minutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "half_day_deduction_unit" DECIMAL(5,2) NOT NULL DEFAULT 0.50,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "late_deduction_unit" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
ADD COLUMN     "late_grace_minutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "payroll_deduction_policy_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "employee_id" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employment_type_id" TEXT,
    "employee_category_id" TEXT,
    "is_override" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deduction_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_deduction_policy_assignments_tenant_id_policy_id_idx" ON "payroll_deduction_policy_assignments"("tenant_id", "policy_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_policy_assignments_tenant_id_employee_id_idx" ON "payroll_deduction_policy_assignments"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_policy_assignments_tenant_id_department_i_idx" ON "payroll_deduction_policy_assignments"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_policy_assignments_tenant_id_designation__idx" ON "payroll_deduction_policy_assignments"("tenant_id", "designation_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_policy_assignments_tenant_id_assignment_t_idx" ON "payroll_deduction_policy_assignments"("tenant_id", "assignment_type");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_leave_application_id_pay_idx" ON "payroll_deduction_inputs"("tenant_id", "leave_application_id", "payroll_period_start");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_attendance_record_id_idx" ON "payroll_deduction_inputs"("tenant_id", "attendance_record_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_inputs_tenant_id_source_type_idx" ON "payroll_deduction_inputs"("tenant_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_inputs_tenant_id_deduction_source_key_pay_key" ON "payroll_deduction_inputs"("tenant_id", "deduction_source_key", "payroll_period_start");

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "payroll_deduction_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_policy_assignments" ADD CONSTRAINT "payroll_deduction_policy_assignments_employee_category_id_fkey" FOREIGN KEY ("employee_category_id") REFERENCES "employee_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "employee_attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_inputs" ADD CONSTRAINT "payroll_deduction_inputs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
