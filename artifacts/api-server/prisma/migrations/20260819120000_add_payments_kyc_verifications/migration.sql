CREATE TABLE "payment_intents" (
  "id" UUID NOT NULL,
  "processor_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "amount" DECIMAL(18,8) NOT NULL,
  "currency" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_intents_processor_id_key" ON "payment_intents"("processor_id");
CREATE INDEX "payment_intents_user_id_status_idx" ON "payment_intents"("user_id", "status");

CREATE TABLE "kyc_verifications" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_ref" TEXT,
  "status" TEXT NOT NULL,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kyc_verifications_user_id_status_idx" ON "kyc_verifications"("user_id", "status");