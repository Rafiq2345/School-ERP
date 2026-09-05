-- AlterTable users
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recovery_mobile" TEXT,
ADD COLUMN "is_mobile_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable password_recovery_requests
CREATE TABLE "password_recovery_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier_provided" TEXT NOT NULL,
    "contact_type" TEXT NOT NULL DEFAULT 'MOBILE',
    "contact_value" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_comments" TEXT,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "temporary_password_generated" BOOLEAN NOT NULL DEFAULT false,
    "requester_ip" TEXT,
    "requester_user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_recovery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable password_recovery_otps
CREATE TABLE "password_recovery_otps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient_masked" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "reset_token_hash" TEXT,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resend_cooldown_until" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "is_invalidated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_recovery_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_recovery_requests_tenant_id_status_idx" ON "password_recovery_requests"("tenant_id", "status");
CREATE INDEX "password_recovery_requests_tenant_id_identifier_provided_idx" ON "password_recovery_requests"("tenant_id", "identifier_provided");
CREATE INDEX "password_recovery_otps_tenant_id_user_id_is_invalidated_idx" ON "password_recovery_otps"("tenant_id", "user_id", "is_invalidated");

-- AddForeignKey
ALTER TABLE "password_recovery_requests" ADD CONSTRAINT "password_recovery_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_recovery_requests" ADD CONSTRAINT "password_recovery_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "password_recovery_requests" ADD CONSTRAINT "password_recovery_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_recovery_otps" ADD CONSTRAINT "password_recovery_otps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_recovery_otps" ADD CONSTRAINT "password_recovery_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
