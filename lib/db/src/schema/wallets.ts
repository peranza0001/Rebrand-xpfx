import { pgTable, text, numeric, timestamp, uuid, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletTypeEnum = pgEnum("wallet_type", ["main", "trading", "social", "fiat", "p2p"]);

export const walletsTable = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: walletTypeEnum("type").notNull(),
  label: text("label").notNull(),
  currency: text("currency").notNull().default("USD"),
  balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
  pendingBalance: numeric("pending_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionTypeEnum = pgEnum("transaction_type", [
    "deposit", "withdrawal", "trade_profit", "p2p_buy", "p2p_sell", "transfer", "gas_fee", "maintenance_fee"
]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").notNull(),
  userId: uuid("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: transactionStatusEnum("status").notNull().default("completed"),
  description: text("description").notNull().default(""),
  is_demo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const connectedWalletsTable = pgTable("connected_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  address: text("address").notNull(),
  walletType: text("wallet_type").notNull(),
  balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
  currency: text("currency").notNull().default("ETH"),
  importMethod: text("import_method").notNull().default("address"),
  label: text("label"),
  /**
   * Wallet origin — `self_custody` for user-imported on-chain wallets,
   * `moonpay` / `coinbase` for linked exchange-account wallets that pre-fill
   * checkouts. Existing rows are backfilled to `self_custody` via the
   * column default so old data keeps working.
   */
  provider: text("provider").notNull().default("self_custody"),
  /**
   * Email associated with the linked exchange account (MoonPay / Coinbase).
   * Null for self-custody wallets.
   */
  email: text("email"),
  /**
   * Snapshot of the user's profile pushed to the exchange at connect time
   * (full name, email, country, default bank). Rendered in the admin panel
   * and on the user's wallets page so they can verify what was synced.
   */
  syncedProfile: jsonb("synced_profile"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type ConnectedWallet = typeof connectedWalletsTable.$inferSelect;
