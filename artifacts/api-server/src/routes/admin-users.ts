/**
 * Admin user-management endpoints — create user (OTP bypass),
 * profile/status edits, bank/connected-wallet management, per-user trades.
 */
import { Router, type IRouter } from "express";
import {
  CreateAdminUserBody,
  UpdateAdminUserProfileBody,
  UpdateAdminUserStatusBody,
  UpdateAdminUserBankAccountBody,
  CreateAdminUserTradeBody,
  UpdateAdminUserTradeBody,
  type AdminUserDetail,
  type AdminUserSummary,
  type Trade,
} from "@workspace/api-zod";
import {
  createUser,
  freshUserData,
  getUserData,
  hashPassword,
  logActivity,
  newId,
  NOW,
  toAdminConnectedWallet,
  userData,
  users,
  usersByEmail,
} from "../lib/store";
import { persistUser } from "../lib/db-persist";
import { persistAuditEvent, recordAuditEvent } from "../lib/audit-log";
import { requireAdmin } from "../lib/session";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import { deleteBankAccount, persistBankAccount } from "../lib/db-persist";

const router: IRouter = Router();

function buildDetail(userId: string): AdminUserDetail | null {
  const stored = users.get(userId);
  if (!stored) return null;
  const data = getUserData(userId);
  return {
    userId,
    user: stored.user,
    role: stored.role,
    merchant: stored.merchant,
    tradingLocked: stored.tradingLocked,
    socialLocked: data.socialLocked,
    demoMode: stored.demoMode,
    kycStatus: data.kyc.status,
    wallets: data.wallets,
    bankAccounts: data.bankAccounts,
    connectedWallets: data.connectedWallets.map(toAdminConnectedWallet),
    withdrawals: data.withdrawals,
    deposits: data.deposits,
    trades: data.trades,
    cryptoAddresses: data.cryptoAddresses,
    accountFlag: stored.accountFlag,
    suspended: stored.suspended,
    disabled: stored.disabled,
  };
}

// ---------- Create user (OTP bypass) ----------

router.post("/admin/users/create", requireAdmin, async (req, res) => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user", details: parsed.error.issues });
  }
  const email = parsed.data.email.toLowerCase().trim();
  if (usersByEmail.has(email)) {
    return res.status(409).json({ error: "A user with this email already exists." });
  }

  const stored = createUser({
    email,
    password: parsed.data.password,
    fullName: parsed.data.fullName,
    username: parsed.data.username,
    country: parsed.data.country,
    role: parsed.data.role,
    kycVerified: parsed.data.kycVerified ?? false,
    merchant: parsed.data.merchant ?? false,
    phone: parsed.data.phone ?? null,
  });
  if (parsed.data.phone !== undefined) stored.user.phone = parsed.data.phone;
  userData.set(stored.user.id, freshUserData(stored.user.id, { country: stored.user.country }));

  // createUser already persists new users to the DB; avoid duplicate persistence here.

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.user.create",
    detail: `Created ${parsed.data.role} user ${email} (OTP bypass).`,
  });
  const audit = recordAuditEvent({
    actorId: req.userId!, actorName: req.storedUser!.user.fullName,
    action: "admin.user.create", category: "admin",
    detail: `Created user ${email}.`, metadata: { targetType: "user", targetId: stored.user.id, role: stored.role },
  });
  if (audit) {
    try {
      await persistAuditEvent(audit);
    } catch {
      return res.status(503).json({ error: "Audit storage is temporarily unavailable. User creation was not acknowledged." });
    }
  }

  const data = getUserData(stored.user.id);
  const balance = data.wallets.reduce((s, w) => s + w.balance, 0);
  const summary: AdminUserSummary = {
    id: stored.user.id,
    email: stored.user.email,
    fullName: stored.user.fullName,
    country: stored.user.country,
    role: stored.role,
    kycStatus: data.kyc.status,
    balance,
    merchant: stored.merchant,
    tradingLocked: stored.tradingLocked,
    accountFlag: stored.accountFlag,
    suspended: stored.suspended,
    disabled: stored.disabled,
    createdAt: stored.user.createdAt,
  };
  return res.json(summary);
});

// ---------- Profile edits ----------

router.patch("/admin/users/:userId/profile", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const parsed = UpdateAdminUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile", details: parsed.error.issues });
  }

  if (parsed.data.email && parsed.data.email.toLowerCase() !== stored.user.email.toLowerCase()) {
    const newEmail = parsed.data.email.toLowerCase().trim();
    if (usersByEmail.has(newEmail)) {
      return res.status(409).json({ error: "Another user already has that email." });
    }
    usersByEmail.delete(stored.user.email.toLowerCase());
    usersByEmail.set(newEmail, userId);
    stored.user.email = newEmail;
  }
  if (parsed.data.fullName !== undefined) stored.user.fullName = parsed.data.fullName;
  if (parsed.data.username !== undefined) stored.user.username = parsed.data.username;
  if (parsed.data.country !== undefined) stored.user.country = parsed.data.country;
  if (parsed.data.phone !== undefined) {
    stored.phone = parsed.data.phone;
    stored.user.phone = parsed.data.phone;
  }
  if (parsed.data.password) stored.passwordHash = hashPassword(parsed.data.password);

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.user.profile_update",
    detail: `Updated profile for ${stored.user.email} (${userId}).`,
  });
  // Persist updated profile to DB (best-effort)
  void persistUser(stored.user.id, {
    email: stored.user.email,
    username: stored.user.username,
    passwordHash: stored.passwordHash,
    fullName: stored.user.fullName,
    country: stored.user.country,
    phone: stored.phone ?? null,
  });

  return res.json(stored.user);
});

// POST /admin/users/:userId/reregister — persist an existing in-memory user to DB
router.post("/admin/users/:userId/reregister", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  void persistUser(stored.user.id, {
    email: stored.user.email,
    username: stored.user.username,
    passwordHash: stored.passwordHash,
    fullName: stored.user.fullName,
    country: stored.user.country,
    phone: stored.phone ?? null,
  });

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.user.reregister",
    detail: `Persisted user ${stored.user.email} (${userId}) to the database without OTP.`,
  });

  return res.json({ ok: true });
});

// ---------- Status / locks ----------

router.patch("/admin/users/:userId/status", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const parsed = UpdateAdminUserStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status", details: parsed.error.issues });
  }

  const data = getUserData(userId);
  const changes: string[] = [];

  if (parsed.data.role !== undefined && parsed.data.role !== stored.role) {
    stored.role = parsed.data.role;
    stored.demoMode = parsed.data.role === "demo";
    changes.push(`role=${parsed.data.role}`);
  }
  if (parsed.data.kycVerified !== undefined) {
    stored.user.kycVerified = parsed.data.kycVerified;
    data.kyc.status = parsed.data.kycVerified ? "approved" : "not_submitted";
    if (parsed.data.kycVerified) data.kyc.decidedAt = NOW();
    changes.push(`kyc=${parsed.data.kycVerified}`);
  }
  if (parsed.data.tradingLocked !== undefined) {
    stored.tradingLocked = parsed.data.tradingLocked;
    changes.push(`trading=${parsed.data.tradingLocked ? "locked" : "open"}`);
  }
  if (parsed.data.socialLocked !== undefined) {
    data.socialLocked = parsed.data.socialLocked;
    changes.push(`social=${parsed.data.socialLocked ? "locked" : "open"}`);
  }
  if (parsed.data.demoMode !== undefined) {
    stored.demoMode = parsed.data.demoMode;
    changes.push(`demo=${parsed.data.demoMode}`);
  }
  if (parsed.data.merchant !== undefined) {
    stored.merchant = parsed.data.merchant;
    changes.push(`merchant=${parsed.data.merchant}`);
  }
  if (parsed.data.accountFlag !== undefined) {
    stored.accountFlag = parsed.data.accountFlag;
    changes.push(`flag=${parsed.data.accountFlag ?? "none"}`);
    if (parsed.data.accountFlag) {
      notifyUser({
        userId,
        kind: "account_flagged",
        emailToggle: "accountFlagged",
        title: "Your account has been flagged",
        body: `Our compliance team flagged your account (reason: ${parsed.data.accountFlag}). Some actions may be restricted while we review.`,
      });
      pushAdminAlert({
        kind: "user.flag",
        title: "User flagged",
        body: `${stored.user.email} flagged: ${parsed.data.accountFlag}.`,
        userId,
        userEmail: stored.user.email,
        severity: "warning",
        linkUrl: `/users/${userId}`,
        email: true,
      });
      // Auto-reset KYC when flag indicates suspicious activity. Use word
      // boundaries and exclude explicit negations like "not suspicious" so
      // benign clarifying flags don't trigger a reset.
      const flagText = parsed.data.accountFlag.toLowerCase();
      const mentionsSuspicious = /\bsuspicious\b/.test(flagText);
      const negated = /\b(not|no|non|isn'?t|wasn'?t)\b[^.]{0,30}\bsuspicious\b/.test(flagText);
      if (mentionsSuspicious && !negated) {
        data.kyc = {
          userId,
          status: "not_submitted",
          idType: null,
          idNumber: null,
          addressLine1: null,
          city: null,
          country: null,
          rejectionReason: `Auto-reset triggered by suspicious-activity flag: ${parsed.data.accountFlag}`,
          submittedAt: null,
          decidedAt: null,
        };
        stored.user.kycVerified = false;
        changes.push("kyc=auto_reset_suspicious");
        notifyUser({
          userId,
          kind: "kyc_reset",
          emailToggle: "kycReset",
          title: "KYC verification reset (compliance review)",
          body: "Because your account was flagged for suspicious activity, your KYC has been reset and you must re-submit your verification documents from the KYC page before resuming sensitive actions.",
          link: "/kyc",
        });
        pushAdminAlert({
          kind: "user.kyc_auto_reset",
          title: "KYC auto-reset (suspicious flag)",
          body: `${stored.user.email}'s KYC was automatically reset because the account was flagged: ${parsed.data.accountFlag}.`,
          userId,
          userEmail: stored.user.email,
          severity: "warning",
          linkUrl: `/users/${userId}`,
          email: true,
        });
      }
    }
  }
  if (parsed.data.suspended !== undefined && parsed.data.suspended !== stored.suspended) {
    stored.suspended = parsed.data.suspended;
    changes.push(`suspended=${parsed.data.suspended}`);
    notifyUser({
      userId,
      kind: parsed.data.suspended ? "account_suspended" : "account_reinstated",
      emailToggle: "accountSuspended",
      title: parsed.data.suspended ? "Account suspended" : "Account reinstated",
      body: parsed.data.suspended
        ? "Your account has been suspended by an administrator. The platform is now read-only for you. Contact help@xpressprofx.com if you believe this is an error."
        : "Your account has been reinstated. You can resume normal activity.",
    });
    pushAdminAlert({
      kind: parsed.data.suspended ? "user.suspend" : "user.reinstate",
      title: parsed.data.suspended ? "User suspended" : "User reinstated",
      body: `${stored.user.email} ${parsed.data.suspended ? "suspended" : "reinstated"} by admin.`,
      userId,
      userEmail: stored.user.email,
      severity: parsed.data.suspended ? "warning" : "info",
      email: true,
    });
  }
  if (parsed.data.disabled !== undefined && parsed.data.disabled !== stored.disabled) {
    stored.disabled = parsed.data.disabled;
    changes.push(`disabled=${parsed.data.disabled}`);
    notifyUser({
      userId,
      kind: parsed.data.disabled ? "account_disabled" : "account_enabled",
      emailToggle: "accountDisabled",
      title: parsed.data.disabled ? "Account disabled" : "Account re-enabled",
      body: parsed.data.disabled
        ? "Your account has been disabled and you can no longer sign in. Contact help@xpressprofx.com to appeal."
        : "Your account has been re-enabled. You can sign in again.",
    });
    pushAdminAlert({
      kind: parsed.data.disabled ? "user.disable" : "user.enable",
      title: parsed.data.disabled ? "User disabled" : "User enabled",
      body: `${stored.user.email} ${parsed.data.disabled ? "disabled" : "enabled"} by admin.`,
      userId,
      userEmail: stored.user.email,
      severity: parsed.data.disabled ? "critical" : "info",
      email: true,
    });
  }
  if (parsed.data.resetKyc) {
    data.kyc = {
      userId,
      status: "not_submitted",
      idType: null,
      idNumber: null,
      addressLine1: null,
      city: null,
      country: null,
      rejectionReason: null,
      submittedAt: null,
      decidedAt: null,
    };
    stored.user.kycVerified = false;
    changes.push(`kyc=reset`);
    notifyUser({
      userId,
      kind: "kyc_reset",
      emailToggle: "kycReset",
      title: "KYC verification reset",
      body: "Your KYC verification has been reset by an administrator. Please re-submit your verification documents from the KYC page.",
      link: "/kyc",
    });
    pushAdminAlert({
      kind: "user.kyc_reset",
      title: "KYC reset",
      body: `KYC for ${stored.user.email} was reset to not_submitted.`,
      userId,
      userEmail: stored.user.email,
      severity: "info",
    });
  }

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.user.status_update",
    detail: `Updated ${stored.user.email}: ${changes.join(", ") || "no changes"}.`,
  });
  // Persist status/profile changes to DB (best-effort)
  void persistUser(stored.user.id, {
    email: stored.user.email,
    username: stored.user.username,
    passwordHash: stored.passwordHash,
    fullName: stored.user.fullName,
    country: stored.user.country,
    phone: stored.phone ?? null,
  });

  return res.json(buildDetail(userId));
});

// ---------- Connected wallets ----------

router.delete("/admin/users/:userId/connected-wallets/:walletId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const walletId = ((req.params["walletId"] as string) as string);
  const data = getUserData(userId);
  const idx = data.connectedWallets.findIndex((w) => w.id === walletId);
  if (idx === -1) return res.status(404).json({ error: "Connected wallet not found" });
  const removed = data.connectedWallets.splice(idx, 1)[0]!;
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.connected_wallet.delete",
    detail: `Removed connected ${removed.walletType} wallet ${removed.address.slice(0, 8)}… for user ${userId}.`,
  });
  return res.json({ ok: true });
});

// ---------- Bank accounts ----------

router.get("/admin/users/:userId/bank-accounts/:bankId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const bankId = ((req.params["bankId"] as string) as string);
  if (!users.has(userId)) return res.status(404).json({ error: "User not found" });
  const data = getUserData(userId);
  const bank = data.bankAccounts.find((b) => b.id === bankId);
  if (!bank) return res.status(404).json({ error: "Bank account not found" });
  return res.json(bank);
});

router.patch("/admin/users/:userId/bank-accounts/:bankId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const bankId = ((req.params["bankId"] as string) as string);
  const data = getUserData(userId);
  const bank = data.bankAccounts.find((b) => b.id === bankId);
  if (!bank) return res.status(404).json({ error: "Bank account not found" });

  const parsed = UpdateAdminUserBankAccountBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  if (parsed.data.bankName !== undefined) bank.bankName = parsed.data.bankName;
  if (parsed.data.accountHolder !== undefined) bank.accountHolder = parsed.data.accountHolder;
  if (parsed.data.last4 !== undefined) bank.last4 = parsed.data.last4;
  if (parsed.data.currency !== undefined) bank.currency = parsed.data.currency.toUpperCase();
  if (parsed.data.verified !== undefined) bank.verified = parsed.data.verified;
  if (parsed.data.isDefault === true) {
    for (const b of data.bankAccounts) b.isDefault = b.id === bankId;
  } else if (parsed.data.isDefault === false) {
    bank.isDefault = false;
  }
  if (parsed.data.fiatBalance !== undefined) {
    if (parsed.data.fiatBalance < 0) {
      return res.status(400).json({ error: "fiatBalance cannot be negative" });
    }
    bank.fiatBalance = parsed.data.fiatBalance;
  }
  if (parsed.data.fiatCurrency !== undefined && parsed.data.fiatCurrency.length > 0) {
    bank.fiatCurrency = parsed.data.fiatCurrency.toUpperCase();
  }

  void persistBankAccount(bank.id, userId, {
    accountName: bank.accountHolder,
    bankName: bank.bankName,
    accountNumber: undefined,
    routingNumber: undefined,
    iban: undefined,
    swiftCode: undefined,
    debitCardLast4: bank.last4,
    debitCardExpiry: undefined,
    country: bank.currency,
    currency: bank.currency,
    isDefault: bank.isDefault ?? false,
    fiatBalance: bank.fiatBalance,
    fiatCurrency: bank.fiatCurrency,
  });

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.bank.update",
    detail: `Updated bank ${bank.bankName} ****${bank.last4} for user ${userId}.`,
  });
  return res.json(bank);
});

router.delete("/admin/users/:userId/bank-accounts/:bankId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const bankId = ((req.params["bankId"] as string) as string);
  const data = getUserData(userId);
  const idx = data.bankAccounts.findIndex((b) => b.id === bankId);
  if (idx === -1) return res.status(404).json({ error: "Bank account not found" });
  const removed = data.bankAccounts.splice(idx, 1)[0]!;
  void deleteBankAccount(removed.id);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.bank.delete",
    detail: `Removed bank ${removed.bankName} ****${removed.last4} from user ${userId}.`,
  });
  return res.json({ ok: true });
});

// ---------- Per-user trades ----------

router.post("/admin/users/:userId/trades", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const data = getUserData(userId);
  if (!users.has(userId)) return res.status(404).json({ error: "User not found" });

  const parsed = CreateAdminUserTradeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid trade", details: parsed.error.issues });
  }
  const trade: Trade = {
    id: newId("t"),
    pair: parsed.data.pair,
    type: parsed.data.type,
    status: parsed.data.status ?? "active",
    entryPrice: parsed.data.entryPrice,
    currentPrice: parsed.data.currentPrice,
    targetPrice: parsed.data.targetPrice,
    amount: parsed.data.amount,
    currency: parsed.data.currency.toUpperCase(),
    profit: parsed.data.profit,
    expectedProfit: parsed.data.expectedProfit,
    managerId: parsed.data.managerId ?? null,
    createdAt: NOW(),
    completedAt: parsed.data.status === "completed" ? NOW() : null,
  };
  data.trades.unshift(trade);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.trade.create",
    detail: `Opened ${trade.type} ${trade.pair} (${trade.amount}) for user ${userId}.`,
  });
  return res.json(trade);
});

router.patch("/admin/users/:userId/trades/:tradeId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const tradeId = ((req.params["tradeId"] as string) as string);
  const data = getUserData(userId);
  const trade = data.trades.find((t) => t.id === tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const parsed = UpdateAdminUserTradeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  if (parsed.data.pair !== undefined) trade.pair = parsed.data.pair;
  if (parsed.data.type !== undefined) trade.type = parsed.data.type;
  if (parsed.data.amount !== undefined) trade.amount = parsed.data.amount;
  if (parsed.data.entryPrice !== undefined) trade.entryPrice = parsed.data.entryPrice;
  if (parsed.data.currentPrice !== undefined) trade.currentPrice = parsed.data.currentPrice;
  if (parsed.data.targetPrice !== undefined) trade.targetPrice = parsed.data.targetPrice;
  if (parsed.data.profit !== undefined) trade.profit = parsed.data.profit;
  if (parsed.data.expectedProfit !== undefined) trade.expectedProfit = parsed.data.expectedProfit;
  if (parsed.data.managerId !== undefined) trade.managerId = parsed.data.managerId;
  if (parsed.data.status !== undefined) {
    trade.status = parsed.data.status;
    if (parsed.data.status === "completed" && !trade.completedAt) trade.completedAt = NOW();
  }

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.trade.update",
    detail: `Updated trade ${tradeId} for user ${userId}.`,
  });
  return res.json(trade);
});

router.delete("/admin/users/:userId/trades/:tradeId", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const tradeId = ((req.params["tradeId"] as string) as string);
  const data = getUserData(userId);
  const idx = data.trades.findIndex((t) => t.id === tradeId);
  if (idx === -1) return res.status(404).json({ error: "Trade not found" });
  const removed = data.trades.splice(idx, 1)[0]!;
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.trade.delete",
    detail: `Deleted trade ${removed.pair} (${tradeId}) for user ${userId}.`,
  });
  return res.json({ ok: true });
});

export default router;
