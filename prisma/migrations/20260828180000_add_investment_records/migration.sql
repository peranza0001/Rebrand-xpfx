CREATE TABLE "investment_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan_id" TEXT NOT NULL,
  "plan_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "principal" DECIMAL(20,2) NOT NULL,
  "locked_profit" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "current_day" INTEGER NOT NULL DEFAULT 0,
  "start_date" TIMESTAMP(6) NOT NULL,
  "end_date" TIMESTAMP(6) NOT NULL,
  "weekly_top_up_due" BOOLEAN NOT NULL DEFAULT false,
  "weekly_top_up_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "weekly_top_up_due_since" TIMESTAMP(6),
  "weekly_top_up_paid_at" TIMESTAMP(6),
  "weekly_top_up_approved" BOOLEAN NOT NULL DEFAULT false,
  "top_up_penalty_active" BOOLEAN NOT NULL DEFAULT false,
  "pending_marginal_fee" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "marginal_fee_due_since" TIMESTAMP(6),
  "marginal_fee_paid_at" TIMESTAMP(6),
  "marginal_fee_approved" BOOLEAN NOT NULL DEFAULT false,
  "daily_history" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "investment_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "investment_records_user_id_status_idx" ON "investment_records"("user_id", "status");