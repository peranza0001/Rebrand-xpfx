import { pgTable, numeric, text, timestamp, uuid, integer, pgEnum } from "drizzle-orm/pg-core";

export const demoOrderTypeEnum = pgEnum("demo_order_type", ["market", "limit", "stop"]);
export const demoOrderSideEnum = pgEnum("demo_order_side", ["buy", "sell"]);
export const demoOrderStatusEnum = pgEnum("demo_order_status", ["open", "filled", "cancelled"]);

export const demoOrdersTable = pgTable("demo_orders", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  instrument: text("instrument").notNull(),
  type: demoOrderTypeEnum("type").notNull(),
  side: demoOrderSideEnum("side").notNull(),
  price: numeric("price", { precision: 20, scale: 8 }),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  leverage: integer("leverage").notNull(),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 20, scale: 8 }),
  status: demoOrderStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DemoOrder = typeof demoOrdersTable.$inferSelect;
