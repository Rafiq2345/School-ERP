-- CreateTable
CREATE TABLE "leave_year_end_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "source_leave_year" INTEGER NOT NULL,
    "target_leave_year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "total_employees_scanned" INTEGER NOT NULL DEFAULT 0,
    "total_carried_forward_days" DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    "total_encashed_days" DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    "total_expired_days" DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "executed_by_user_id" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_user_id" TEXT,
    "reversed_at" TIMESTAMP(3),
    "reversal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_year_end_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_year_end_batch_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "leave_policy_id" TEXT,
    "initial_balance" DECIMAL(5,2) NOT NULL,
    "carried_forward_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "encashed_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "expired_days" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "final_balance" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "rule_snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "skip_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_year_end_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_year_end_batches_tenant_id_batch_number_key" ON "leave_year_end_batches"("tenant_id", "batch_number");

-- CreateIndex
CREATE INDEX "leave_year_end_batches_tenant_id_source_leave_year_idx" ON "leave_year_end_batches"("tenant_id", "source_leave_year");

-- CreateIndex
CREATE INDEX "leave_year_end_batches_tenant_id_status_idx" ON "leave_year_end_batches"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leave_year_end_batch_items_tenant_id_batch_id_idx" ON "leave_year_end_batch_items"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "leave_year_end_batch_items_tenant_id_employee_id_leave_type_idx" ON "leave_year_end_batch_items"("tenant_id", "employee_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "leave_year_end_batch_items_tenant_id_status_idx" ON "leave_year_end_batch_items"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "leave_year_end_batches" ADD CONSTRAINT "leave_year_end_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batches" ADD CONSTRAINT "leave_year_end_batches_executed_by_user_id_fkey" FOREIGN KEY ("executed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batches" ADD CONSTRAINT "leave_year_end_batches_reversed_by_user_id_fkey" FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batch_items" ADD CONSTRAINT "leave_year_end_batch_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batch_items" ADD CONSTRAINT "leave_year_end_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "leave_year_end_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batch_items" ADD CONSTRAINT "leave_year_end_batch_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batch_items" ADD CONSTRAINT "leave_year_end_batch_items_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_end_batch_items" ADD CONSTRAINT "leave_year_end_batch_items_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
