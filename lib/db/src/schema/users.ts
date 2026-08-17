import { pgTable, text, boolean, timestamp, uuid, numeric, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  country: text("country").notNull().default("US"),
  passwordHash: text("password_hash").notNull().default(""),
  loginPin: text("login_pin"),
  walletKeyCode: text("wallet_key_code"),
  securityType: text("security_type").notNull().default("seed"),
  role: text("role").notNull().default("user"),
  kycVerified: boolean("kyc_verified").notNull().default(false),
  kycStatus: text("kyc_status").notNull().default("unverified"),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  avatarUrl: text("avatar_url"),
  selectedManagerId: text("selected_manager_id"),
  demoMode: boolean("demo_mode").notNull().default(false),
  aiBotTrialEndsAt: timestamp("ai_bot_trial_ends_at"),
  aiBotSubscriptionStatus: text("ai_bot_subscription_status").notNull().default("trial"),
  maintenanceDueAt: timestamp("maintenance_due_at"),
  maintenanceGraceEndsAt: timestamp("maintenance_grace_ends_at"),
  lastCompulsoryTradeAt: timestamp("last_compulsory_trade_at"),
  tradingLocked: boolean("trading_locked").notNull().default(false),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  referralValidUntil: timestamp("referral_valid_until"),
  isNewUser: boolean("is_new_user").notNull().default(true),
  /** Optional email pre-filled into MoonPay-hosted Buy Crypto checkout. */
  moonpayEmail: text("moonpay_email"),
  /**
   * Set true once the user completes their first crypto purchase via
   * MoonPay or Coinbase (set from the respective webhook handlers). Drives
   * the dashboard verification banner + checklist milestone. Existing rows
   * are backfilled to `false` via the column default.
   */
  buyVerified: boolean("buy_verified").notNull().default(false),
});

export const otpCodesTable = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  userId: uuid("user_id").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  signupPayload: jsonb("signup_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kycDocumentsTable = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  docType: text("doc_type").notNull(),
  docUrl: text("doc_url").notNull(),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cardRequestsTable = pgTable("card_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  cardType: text("card_type").notNull().default("virtual"),
  cardTier: text("card_tier").notNull().default("standard"),
  cardholderName: text("cardholder_name").notNull(),
  billingAddress: text("billing_address").notNull(),
  billingCity: text("billing_city").notNull(),
  billingCountry: text("billing_country").notNull(),
  status: text("status").notNull().default("pending"),
  cardNumber: text("card_number"),
  expiryDate: text("expiry_date"),
  cvv: text("cvv"),
  spendLimit: text("spend_limit").notNull().default("5000"),
  design: text("design"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const bankAccountsTable = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  accountName: text("account_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  routingNumber: text("routing_number").notNull().default(""),
  iban: text("iban"),
  swiftCode: text("swift_code"),
  debitCardLast4: text("debit_card_last4").notNull().default(""),
  debitCardExpiry: text("debit_card_expiry").notNull().default(""),
  country: text("country").notNull(),
  currency: text("currency").notNull().default("USD"),
  isDefault: boolean("is_default").notNull().default(false),
  /**
   * User-self-reported (or admin-set) cash balance held at this bank,
   * used to inform the Buy Crypto / MoonPay flow. NOT a real-time bank
   * feed — purely informational.
   */
  fiatBalance: doublePrecision("fiat_balance").notNull().default(0),
  /** ISO-4217 currency for `fiatBalance`. Defaults to the bank's `currency`. */
  fiatCurrency: text("fiat_currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const p2pChatTable = pgTable("p2p_chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referralBonusesTable = pgTable("referral_bonuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id").notNull(),
  referredUserId: uuid("referred_user_id").notNull(),
  bonusAmount: numeric("bonus_amount", { precision: 20, scale: 2 }).notNull().default("500"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Persistent database sessions (replaces in-memory Map)
export const userSessionsTable = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin representatives authorized to access admin panel
export const adminRepsTable = pgTable("admin_reps", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  addedBy: text("added_by").notNull().default("head"),
  isActive: boolean("is_active").notNull().default(true),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

// Admin OTP codes (4-digit, 30-min expiry)
export const adminOtpTable = pgTable("admin_otp", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertOtpSchema = createInsertSchema(otpCodesTable).omit({ id: true, createdAt: true });
export const insertKycDocSchema = createInsertSchema(kycDocumentsTable).omit({ id: true, submittedAt: true });
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const insertCardRequestSchema = createInsertSchema(cardRequestsTable).omit({ id: true, createdAt: true });
export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({ id: true, createdAt: true });
export const insertP2PChatSchema = createInsertSchema(p2pChatTable).omit({ id: true, createdAt: true });
export const insertReferralBonusSchema = createInsertSchema(referralBonusesTable).omit({ id: true, createdAt: true });
export const insertAdminRepSchema = createInsertSchema(adminRepsTable).omit({ id: true, addedAt: true });
export const insertAdminOtpSchema = createInsertSchema(adminOtpTable).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type OtpCode = typeof otpCodesTable.$inferSelect;
export type KycDocument = typeof kycDocumentsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type CardRequest = typeof cardRequestsTable.$inferSelect;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
export type P2PChat = typeof p2pChatTable.$inferSelect;
export type ReferralBonus = typeof referralBonusesTable.$inferSelect;
