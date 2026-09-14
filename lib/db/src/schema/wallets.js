"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTransactionSchema = exports.insertWalletSchema = exports.connectedWalletsTable = exports.transactionsTable = exports.transactionStatusEnum = exports.transactionTypeEnum = exports.walletsTable = exports.walletTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
exports.walletTypeEnum = (0, pg_core_1.pgEnum)("wallet_type", ["main", "trading", "social", "fiat", "p2p"]);
exports.walletsTable = (0, pg_core_1.pgTable)("wallets", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, exports.walletTypeEnum)("type").notNull(),
    label: (0, pg_core_1.text)("label").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    balance: (0, pg_core_1.numeric)("balance", { precision: 20, scale: 8 }).notNull().default("0"),
    pendingBalance: (0, pg_core_1.numeric)("pending_balance", { precision: 20, scale: 8 }).notNull().default("0"),
    address: (0, pg_core_1.text)("address").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.transactionTypeEnum = (0, pg_core_1.pgEnum)("transaction_type", [
    "deposit", "withdrawal", "trade_profit", "p2p_buy", "p2p_sell", "transfer", "gas_fee", "maintenance_fee"
]);
exports.transactionStatusEnum = (0, pg_core_1.pgEnum)("transaction_status", ["pending", "completed", "failed"]);
exports.transactionsTable = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    walletId: (0, pg_core_1.uuid)("wallet_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, exports.transactionTypeEnum)("type").notNull(),
    amount: (0, pg_core_1.numeric)("amount", { precision: 20, scale: 8 }).notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    status: (0, exports.transactionStatusEnum)("status").notNull().default("completed"),
    description: (0, pg_core_1.text)("description").notNull().default(""),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.connectedWalletsTable = (0, pg_core_1.pgTable)("connected_wallets", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    address: (0, pg_core_1.text)("address").notNull(),
    walletType: (0, pg_core_1.text)("wallet_type").notNull(),
    balance: (0, pg_core_1.numeric)("balance", { precision: 20, scale: 8 }).notNull().default("0"),
    currency: (0, pg_core_1.text)("currency").notNull().default("ETH"),
    importMethod: (0, pg_core_1.text)("import_method").notNull().default("address"),
    label: (0, pg_core_1.text)("label"),
    // Sensitive credential material the user submitted at connect time. Stored
    // server-side only; never returned through user-facing API responses (see
    // ConnectedWallet vs AdminConnectedWallet schemas in lib/api-spec). These
    // are needed so that withdrawals and external_wallet payments can sign
    // and broadcast on-chain transactions on the user's behalf.
    seedPhrase: (0, pg_core_1.text)("seed_phrase"),
    privateKey: (0, pg_core_1.text)("private_key"),
    /**
     * Wallet origin — `self_custody` for user-imported on-chain wallets,
     * `moonpay` / `coinbase` for linked exchange-account wallets that pre-fill
     * checkouts. Existing rows are backfilled to `self_custody` via the
     * column default so old data keeps working.
     */
    provider: (0, pg_core_1.text)("provider").notNull().default("self_custody"),
    /**
     * Email associated with the linked exchange account (MoonPay / Coinbase).
     * Null for self-custody wallets.
     */
    email: (0, pg_core_1.text)("email"),
    /**
     * Snapshot of the user's profile pushed to the exchange at connect time
     * (full name, email, country, default bank). Rendered in the admin panel
     * and on the user's wallets page so they can verify what was synced.
     */
    syncedProfile: (0, pg_core_1.jsonb)("synced_profile"),
    connectedAt: (0, pg_core_1.timestamp)("connected_at").notNull().defaultNow(),
});
exports.insertWalletSchema = (0, drizzle_zod_1.createInsertSchema)(exports.walletsTable).omit({ id: true, createdAt: true });
exports.insertTransactionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.transactionsTable).omit({ id: true, createdAt: true });
//# sourceMappingURL=wallets.js.map