CREATE TABLE "aml_screenings" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "risk_level" TEXT NOT NULL,
  "match_count" INTEGER NOT NULL DEFAULT 0,
  "matches" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "aml_screenings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aml_screenings_user_id_status_idx" ON "aml_screenings"("user_id", "status");