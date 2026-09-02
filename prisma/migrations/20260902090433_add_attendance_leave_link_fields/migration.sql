-- AlterTable
ALTER TABLE "employee_attendance_records" ADD COLUMN     "half_day_period" TEXT,
ADD COLUMN     "leave_application_id" TEXT,
ADD COLUMN     "leave_end_time" TEXT,
ADD COLUMN     "leave_scope" TEXT,
ADD COLUMN     "leave_start_time" TEXT;

-- CreateIndex
CREATE INDEX "employee_attendance_records_tenant_id_leave_application_id_idx" ON "employee_attendance_records"("tenant_id", "leave_application_id");

-- AddForeignKey
ALTER TABLE "employee_attendance_records" ADD CONSTRAINT "employee_attendance_records_leave_application_id_fkey" FOREIGN KEY ("leave_application_id") REFERENCES "leave_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
