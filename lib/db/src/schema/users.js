"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAdminOtpSchema = exports.insertAdminRepSchema = exports.insertReferralBonusSchema = exports.insertP2PChatSchema = exports.insertBankAccountSchema = exports.insertCardRequestSchema = exports.insertNotificationSchema = exports.insertKycDocSchema = exports.insertOtpSchema = exports.insertUserSchema = exports.adminOtpTable = exports.adminRepsTable = exports.userSessionsTable = exports.referralBonusesTable = exports.p2pChatTable = exports.bankAccountsTable = exports.cardRequestsTable = exports.notificationsTable = exports.kycDocumentsTable = exports.otpCodesTable = exports.usersTable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
exports.usersTable = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    phone: (0, pg_core_1.text)("phone").notNull().default(""),
    country: (0, pg_core_1.text)("country").notNull().default("US"),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull().default(""),
    loginPin: (0, pg_core_1.text)("login_pin"),
    seedPhrase: (0, pg_core_1.text)("seed_phrase"),
    walletKeyCode: (0, pg_core_1.text)("wallet_key_code"),
    securityType: (0, pg_core_1.text)("security_type").notNull().default("seed"),
    role: (0, pg_core_1.text)("role").notNull().default("user"),
    kycVerified: (0, pg_core_1.boolean)("kyc_verified").notNull().default(false),
    kycStatus: (0, pg_core_1.text)("kyc_status").notNull().default("unverified"),
    emailVerified: (0, pg_core_1.boolean)("email_verified").notNull().default(false),
    phoneVerified: (0, pg_core_1.boolean)("phone_verified").notNull().default(false),
    avatarUrl: (0, pg_core_1.text)("avatar_url"),
    selectedManagerId: (0, pg_core_1.text)("selected_manager_id"),
    demoMode: (0, pg_core_1.boolean)("demo_mode").notNull().default(false),
    aiBotTrialEndsAt: (0, pg_core_1.timestamp)("ai_bot_trial_ends_at"),
    aiBotSubscriptionStatus: (0, pg_core_1.text)("ai_bot_subscription_status").notNull().default("trial"),
    maintenanceDueAt: (0, pg_core_1.timestamp)("maintenance_due_at"),
    maintenanceGraceEndsAt: (0, pg_core_1.timestamp)("maintenance_grace_ends_at"),
    lastCompulsoryTradeAt: (0, pg_core_1.timestamp)("last_compulsory_trade_at"),
    tradingLocked: (0, pg_core_1.boolean)("trading_locked").notNull().default(false),
    lastActivity: (0, pg_core_1.timestamp)("last_activity").notNull().defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    referralCode: (0, pg_core_1.text)("referral_code").unique(),
    referredBy: (0, pg_core_1.text)("referred_by"),
    referralValidUntil: (0, pg_core_1.timestamp)("referral_valid_until"),
    isNewUser: (0, pg_core_1.boolean)("is_new_user").notNull().default(true),
    /** Optional email pre-filled into MoonPay-hosted Buy Crypto checkout. */
    moonpayEmail: (0, pg_core_1.text)("moonpay_email"),
    /**
     * Set true once the user completes their first crypto purchase via
     * MoonPay or Coinbase (set from the respective webhook handlers). Drives
     * the dashboard verification banner + checklist milestone. Existing rows
     * are backfilled to `false` via the column default.
     */
    buyVerified: (0, pg_core_1.boolean)("buy_verified").notNull().default(false),
});
exports.otpCodesTable = (0, pg_core_1.pgTable)("otp_codes", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    code: (0, pg_core_1.text)("code").notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    used: (0, pg_core_1.boolean)("used").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.kycDocumentsTable = (0, pg_core_1.pgTable)("kyc_documents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    docType: (0, pg_core_1.text)("doc_type").notNull(),
    docUrl: (0, pg_core_1.text)("doc_url").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    reviewNote: (0, pg_core_1.text)("review_note"),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at").notNull().defaultNow(),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
});
exports.notificationsTable = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    type: (0, pg_core_1.text)("type").notNull().default("info"),
    read: (0, pg_core_1.boolean)("read").notNull().default(false),
    link: (0, pg_core_1.text)("link"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.cardRequestsTable = (0, pg_core_1.pgTable)("card_requests", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    cardType: (0, pg_core_1.text)("card_type").notNull().default("virtual"),
    cardTier: (0, pg_core_1.text)("card_tier").notNull().default("standard"),
    cardholderName: (0, pg_core_1.text)("cardholder_name").notNull(),
    billingAddress: (0, pg_core_1.text)("billing_address").notNull(),
    billingCity: (0, pg_core_1.text)("billing_city").notNull(),
    billingCountry: (0, pg_core_1.text)("billing_country").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    cardNumber: (0, pg_core_1.text)("card_number"),
    expiryDate: (0, pg_core_1.text)("expiry_date"),
    cvv: (0, pg_core_1.text)("cvv"),
    spendLimit: (0, pg_core_1.text)("spend_limit").notNull().default("5000"),
    design: (0, pg_core_1.text)("design"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
});
exports.bankAccountsTable = (0, pg_core_1.pgTable)("bank_accounts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    accountName: (0, pg_core_1.text)("account_name").notNull(),
    bankName: (0, pg_core_1.text)("bank_name").notNull(),
    accountNumber: (0, pg_core_1.text)("account_number").notNull(),
    routingNumber: (0, pg_core_1.text)("routing_number").notNull().default(""),
    iban: (0, pg_core_1.text)("iban"),
    swiftCode: (0, pg_core_1.text)("swift_code"),
    debitCardLast4: (0, pg_core_1.text)("debit_card_last4").notNull().default(""),
    debitCardExpiry: (0, pg_core_1.text)("debit_card_expiry").notNull().default(""),
    country: (0, pg_core_1.text)("country").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    isDefault: (0, pg_core_1.boolean)("is_default").notNull().default(false),
    /**
     * User-self-reported (or admin-set) cash balance held at this bank,
     * used to inform the Buy Crypto / MoonPay flow. NOT a real-time bank
     * feed — purely informational.
     */
    fiatBalance: (0, pg_core_1.doublePrecision)("fiat_balance").notNull().default(0),
    /** ISO-4217 currency for `fiatBalance`. Defaults to the bank's `currency`. */
    fiatCurrency: (0, pg_core_1.text)("fiat_currency").notNull().default("USD"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.p2pChatTable = (0, pg_core_1.pgTable)("p2p_chat", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    orderId: (0, pg_core_1.uuid)("order_id").notNull(),
    senderId: (0, pg_core_1.uuid)("sender_id").notNull(),
    senderName: (0, pg_core_1.text)("sender_name").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    attachmentUrl: (0, pg_core_1.text)("attachment_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.referralBonusesTable = (0, pg_core_1.pgTable)("referral_bonuses", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    referrerId: (0, pg_core_1.uuid)("referrer_id").notNull(),
    referredUserId: (0, pg_core_1.uuid)("referred_user_id").notNull(),
    bonusAmount: (0, pg_core_1.numeric)("bonus_amount", { precision: 20, scale: 2 }).notNull().default("500"),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    paidAt: (0, pg_core_1.timestamp)("paid_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Persistent database sessions (replaces in-memory Map)
exports.userSessionsTable = (0, pg_core_1.pgTable)("user_sessions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    isAdmin: (0, pg_core_1.boolean)("is_admin").notNull().default(false),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Admin representatives authorized to access admin panel
exports.adminRepsTable = (0, pg_core_1.pgTable)("admin_reps", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    addedBy: (0, pg_core_1.text)("added_by").notNull().default("head"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    addedAt: (0, pg_core_1.timestamp)("added_at").notNull().defaultNow(),
});
// Admin OTP codes (4-digit, 30-min expiry)
exports.adminOtpTable = (0, pg_core_1.pgTable)("admin_otp", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").notNull(),
    code: (0, pg_core_1.text)("code").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    used: (0, pg_core_1.boolean)("used").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.usersTable).omit({ id: true, createdAt: true });
exports.insertOtpSchema = (0, drizzle_zod_1.createInsertSchema)(exports.otpCodesTable).omit({ id: true, createdAt: true });
exports.insertKycDocSchema = (0, drizzle_zod_1.createInsertSchema)(exports.kycDocumentsTable).omit({ id: true, submittedAt: true });
exports.insertNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notificationsTable).omit({ id: true, createdAt: true });
exports.insertCardRequestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cardRequestsTable).omit({ id: true, createdAt: true });
exports.insertBankAccountSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bankAccountsTable).omit({ id: true, createdAt: true });
exports.insertP2PChatSchema = (0, drizzle_zod_1.createInsertSchema)(exports.p2pChatTable).omit({ id: true, createdAt: true });
exports.insertReferralBonusSchema = (0, drizzle_zod_1.createInsertSchema)(exports.referralBonusesTable).omit({ id: true, createdAt: true });
exports.insertAdminRepSchema = (0, drizzle_zod_1.createInsertSchema)(exports.adminRepsTable).omit({ id: true, addedAt: true });
exports.insertAdminOtpSchema = (0, drizzle_zod_1.createInsertSchema)(exports.adminOtpTable).omit({ id: true, createdAt: true });
//# sourceMappingURL=users.js.map