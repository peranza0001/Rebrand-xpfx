CREATE TABLE "copy_leaders" (
  "id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "risk_level" TEXT NOT NULL,
  "monthly_return" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "win_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "max_drawdown" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "follower_count" INTEGER NOT NULL DEFAULT 0,
  "suspended" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "copy_leaders_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "copy_relationships" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "leader_id" UUID NOT NULL,
  "allocation_pct" DECIMAL(6,3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stopped_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "copy_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "copy_relationships_user_id_leader_id_key" UNIQUE ("user_id", "leader_id"),
  CONSTRAINT "copy_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "copy_relationships_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "copy_leaders"("id") ON DELETE CASCADE
);
CREATE TABLE "copy_events" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "leader_id" UUID NOT NULL,
  "relationship_id" UUID,
  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'simulated',
  "notional" DECIMAL(18,8) NOT NULL,
  "simulated" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "copy_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "copy_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "copy_events_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "copy_leaders"("id") ON DELETE CASCADE,
  CONSTRAINT "copy_events_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "copy_relationships"("id") ON DELETE SET NULL
);
CREATE INDEX "copy_relationships_user_id_status_idx" ON "copy_relationships"("user_id", "status");
CREATE INDEX "copy_events_user_id_created_at_idx" ON "copy_events"("user_id", "created_at");