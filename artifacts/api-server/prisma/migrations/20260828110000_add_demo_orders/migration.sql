CREATE TYPE "demo_order_type" AS ENUM ('market', 'limit', 'stop');
CREATE TYPE "demo_order_side" AS ENUM ('buy', 'sell');
CREATE TYPE "demo_order_status" AS ENUM ('open', 'filled', 'cancelled');

CREATE TABLE "demo_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "instrument" TEXT NOT NULL,
    "type" "demo_order_type" NOT NULL,
    "side" "demo_order_side" NOT NULL,
    "price" DECIMAL(20,8),
    "amount" DECIMAL(20,8) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "stop_loss" DECIMAL(20,8),
    "take_profit" DECIMAL(20,8),
    "status" "demo_order_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demo_orders_user_id_status_idx" ON "demo_orders"("user_id", "status");
CREATE INDEX "demo_orders_instrument_status_idx" ON "demo_orders"("instrument", "status");