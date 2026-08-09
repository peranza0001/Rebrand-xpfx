/**
 * /admin routes — admin-only stats, user list, withdrawal/KYC review, activity log.
 */
import { Router, type IRouter } from "express";
import {
  AdminMarkBillingPaidBody,
  UpdateBillingDefaultsBody,
  UpdateUserBillingRatesBody,
  CreatePromotionBody,
  DecideKycBody,
  DecideWithdrawalBody,
  GetAdminWithdrawalsQueryParams,
  SetBankVerificationBody,
  SetCardDecisionBody,
  UpdatePromotionBody,
  type AdminBankSummary,
  type AdminBillingOverview,
  type AdminBillingUserRow,
  type AdminCardSummary,
  type AdminUserSummary,
  type Promotion,
} from "@workspace/api-zod";
import {
  activityLog,
  defaultBillingRates,
  getUserData,
  logActivity,
  newId,
  NOW,
  promotions,
  userData,
  users,
} from "../lib/store";
import { persistBankAccount } from "../lib/db-persist";
import {
  ensureCurrentCycle,
  getEffectiveRates,
  recomputeTotals,
} from "../lib/billing";
import { requireAdmin } from "../lib/session";
import { notifyUser } from "../lib/notify";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, (_req, res) => {
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let pendingWithdrawals = 0;
  let pendingKyc = 0;
  let activeTrades = 0;
  for (const [, data] of userData) {
    totalDeposits += data.deposits
      .filter((d) => d.status === "completed")
      .reduce((s, d) => s + d.amount, 0);
    totalWithdrawals += data.withdrawals
      .filter((w) => w.status === "approved")
      .reduce((s, w) => s + w.amount, 0);
    pendingWithdrawals += data.withdrawals.filter(
      (w) => w.status === "pending" || w.status === "awaiting_gas_fee",
    ).length;
    if (data.kyc.status === "pending") pendingKyc += 1;
    activeTrades += data.trades.filter((t) => t.status === "active").length;
  }
  return res.json({
    totalUsers: users.size,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    pendingWithdrawals,
    pendingKyc,
    activeTrades,
    currency: "USD",
  });
});

router.get("/admin/users", requireAdmin, (_req, res) => {
  const list: AdminUserSummary[] = [];
  for (const [id, stored] of users) {
    const data = getUserData(id);
    const balance = data.wallets.reduce((s, w) => s + w.balance, 0);
    list.push({
      id: stored.user.id,
      email: stored.user.email,
      fullName: stored.user.fullName,
      country: stored.user.country,
      role: stored.role,
      kycStatus: data.kyc.status,
      balance: Math.round(balance * 100) / 100,
      merchant: stored.merchant,
      tradingLocked: stored.tradingLocked,
      accountFlag: stored.accountFlag,
      suspended: stored.suspended,
      disabled: stored.disabled,
      createdAt: stored.user.createdAt,
    });
  }
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(list);
});

router.get("/admin/withdrawals", requireAdmin, (req, res) => {
  const parsed = GetAdminWithdrawalsQueryParams.safeParse(req.query);
  const filterStatus = parsed.success ? parsed.data.status : undefined;
  const all = [];
  for (const [, data] of userData) {
    for (const w of data.withdrawals) {
      if (!filterStatus || w.status === filterStatus) all.push(w);
    }
  }
  all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(all);
});

router.post("/admin/withdrawals/:withdrawalId/decision", requireAdmin, (req, res) => {
  const parsed = DecideWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid decision." });
  }
  const id = req.params["withdrawalId"];
  for (const [userId, data] of userData) {
    const wd = data.withdrawals.find((w) => w.id === id);
    if (!wd) continue;
    if (wd.status !== "pending" && wd.status !== "awaiting_gas_fee") {
      return res.status(400).json({ success: false, message: "Already decided." });
    }
    // Universal gas-fee gate: every approval requires that an admin first
    // set a gas fee AND that the user funded it. Rejection / cancellation
    // is always allowed so admins can unwind a stuck request.
    if (parsed.data.decision === "approve") {
      // Hard gate 0 — admin must have set a non-zero gas fee.
      if (!wd.gasFeeAmount || wd.gasFeeAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal ${wd.id}: a gas fee must be set first via "Set gas fee" before approval.`,
        });
      }
      // Hard gate 1 — user must have submitted the on-chain funding tx and
      // marked it funded. Best-effort verifyOnChainPayment also runs in
      // /withdrawals/{id}/gas-fee/mark-funded; if that flagged a failure
      // the gasFeeFundedAt would not be set.
      if (!wd.gasFeeFundedAt) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal ${wd.id}: the user has not yet funded the ${wd.gasFeeAmount} ETH gas fee. Wait for them to mark it funded, or reject the withdrawal.`,
        });
      }
      // Hard gate 2 — deadline must not have passed. When it has, mark
      // the withdrawal expired AND refund the held funds so they are not
      // stranded (mirrors the reject branch / awaiting_gas_fee sweeper).
      if (wd.gasFeeDeadlineAt && Date.parse(wd.gasFeeDeadlineAt) < Date.now()) {
        wd.status = "expired";
        wd.decidedAt = NOW();
        const mainW = data.wallets.find((w) => w.type === "main");
        if (mainW) {
          mainW.pendingBalance = Math.round((mainW.pendingBalance - wd.amount) * 100) / 100;
          mainW.balance = Math.round((mainW.balance + wd.amount) * 100) / 100;
        }
        const expiredTx = data.transactions.find(
          (t) =>
            t.type === "withdrawal" &&
            t.status === "pending" &&
            Math.abs(t.amount) === wd.amount,
        );
        if (expiredTx) expiredTx.status = "failed";
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal ${wd.id}: the gas-fee funding deadline has passed. The withdrawal has been marked expired and the held funds have been returned to the user's main wallet.`,
        });
      }
      // Hard gate 3 — user must currently hold enough ETH in a connected
      // wallet to cover the deduction. No best-effort, no silent skip.
      const ethWallet = data.connectedWallets.find(
        (w) =>
          w.currency?.toUpperCase() === "ETH" ||
          w.walletType?.toUpperCase().includes("ETH"),
      );
      if (!ethWallet) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal ${wd.id}: the user has no connected ETH wallet from which to deduct the ${wd.gasFeeAmount} ETH gas fee.`,
        });
      }
      if (ethWallet.balance < wd.gasFeeAmount) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal ${wd.id}: connected ETH wallet only has ${ethWallet.balance} ETH but the gas fee requires ${wd.gasFeeAmount} ETH.`,
        });
      }
    }
    const stored = users.get(userId);
    const main = data.wallets.find((w) => w.type === "main");
    if (parsed.data.decision === "approve") {
      wd.status = "approved";
      wd.decidedAt = NOW();
      if (main) {
        main.pendingBalance = Math.round((main.pendingBalance - wd.amount) * 100) / 100;
      }
      // Deduct the funded gas-fee from the user's connected ETH wallet.
      // Hard-checked above, so this branch is guaranteed to find a wallet
      // with sufficient balance.
      if (wd.gasFeeAmount && wd.gasFeeAmount > 0) {
        const ethWallet = data.connectedWallets.find(
          (w) =>
            w.currency?.toUpperCase() === "ETH" ||
            w.walletType?.toUpperCase().includes("ETH"),
        )!;
        ethWallet.balance =
          Math.round((ethWallet.balance - wd.gasFeeAmount) * 1_000_000) / 1_000_000;
        wd.gasFeeDeductedAt = NOW();
      }
      // Mark matching pending tx as completed
      const tx = data.transactions.find(
        (t) => t.type === "withdrawal" && t.status === "pending" && Math.abs(t.amount) === wd.amount,
      );
      if (tx) tx.status = "completed";
    } else {
      wd.status = "rejected";
      wd.rejectionReason = parsed.data.reason ?? "Rejected by admin";
      wd.decidedAt = NOW();
      if (main) {
        main.pendingBalance = Math.round((main.pendingBalance - wd.amount) * 100) / 100;
        main.balance = Math.round((main.balance + wd.amount) * 100) / 100;
      }
      const tx = data.transactions.find(
        (t) => t.type === "withdrawal" && t.status === "pending" && Math.abs(t.amount) === wd.amount,
      );
      if (tx) tx.status = "failed";
    }
    notifyUser({
      userId,
      kind: parsed.data.decision === "approve" ? "withdrawal_approved" : "withdrawal_rejected",
      emailToggle: parsed.data.decision === "approve" ? "withdrawalApproved" : "withdrawalRejected",
      title:
        parsed.data.decision === "approve"
          ? "Withdrawal approved"
          : "Withdrawal rejected",
      body:
        parsed.data.decision === "approve"
          ? `Your withdrawal of ${wd.amount} ${wd.currency} was approved and is being processed.`
          : `Your withdrawal of ${wd.amount} ${wd.currency} was rejected: ${wd.rejectionReason ?? "no reason provided"}. Funds were returned to your main wallet.`,
      link: "/withdrawals",
    });
    logActivity({
      actorId: req.userId!,
      actorName: req.storedUser!.user.fullName,
      action: "admin.withdrawal.decision",
      detail: `${parsed.data.decision} withdrawal ${wd.id} for user ${stored?.user.email ?? userId}`,
    });
    return res.json({ success: true, withdrawal: wd, message: `Withdrawal ${parsed.data.decision}d.` });
  }
  return res.status(404).json({ success: false, message: "Withdrawal not found." });
});

router.post("/admin/kyc/:userId/decision", requireAdmin, (req, res) => {
  const parsed = DecideKycBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid decision." });
  }
  const targetId = String(req.params["userId"] ?? "");
  const stored = users.get(targetId);
  if (!stored) {
    return res.status(404).json({ success: false, message: "User not found." });
  }
  const data = getUserData(targetId);
  if (parsed.data.decision === "approve") {
    data.kyc.status = "approved";
    data.kyc.rejectionReason = null;
    data.kyc.decidedAt = NOW();
    stored.user.kycVerified = true;
  } else {
    data.kyc.status = "rejected";
    data.kyc.rejectionReason = parsed.data.reason ?? "Rejected by admin";
    data.kyc.decidedAt = NOW();
    stored.user.kycVerified = false;
  }
  notifyUser({
    userId: targetId,
    kind: parsed.data.decision === "approve" ? "kyc_approved" : "kyc_rejected",
    emailToggle: parsed.data.decision === "approve" ? "kycApproved" : "kycRejected",
    title:
      parsed.data.decision === "approve" ? "KYC approved" : "KYC rejected",
    body:
      parsed.data.decision === "approve"
        ? "Your KYC verification was approved. You can now request withdrawals."
        : `Your KYC submission was rejected: ${data.kyc.rejectionReason ?? "no reason provided"}. Please re-submit from the KYC page.`,
    link: "/kyc",
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.kyc.decision",
    detail: `${parsed.data.decision} KYC for ${stored.user.email}`,
  });
  return res.json({ success: true, kyc: data.kyc, message: `KYC ${parsed.data.decision}d.` });
});

router.get("/admin/banks", requireAdmin, (_req, res) => {
  const list: AdminBankSummary[] = [];
  for (const [userId, data] of userData) {
    const stored = users.get(userId);
    if (!stored) continue;
    for (const b of data.bankAccounts) {
      list.push({
        id: b.id,
        userId: b.userId,
        userName: stored.user.fullName,
        userEmail: stored.user.email,
        bankName: b.bankName,
        accountHolder: b.accountHolder,
        last4: b.last4,
        currency: b.currency,
        verified: b.verified,
        createdAt: b.createdAt,
      });
    }
  }
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(list);
});

router.post("/admin/banks/:bankId/verification", requireAdmin, (req, res) => {
  const parsed = SetBankVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Invalid body." });
  }
  const id = String(req.params["bankId"] ?? "");
  for (const [userId, data] of userData) {
    const bank = data.bankAccounts.find((b) => b.id === id);
    if (!bank) continue;
    bank.verified = parsed.data.verified;
    const stored = users.get(userId);
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
      action: "admin.bank.verification",
      detail: `${parsed.data.verified ? "Verified" : "Unverified"} bank ${bank.bankName} ****${bank.last4} for ${stored?.user.email ?? userId}`,
    });
    return res.json({
      id: bank.id,
      userId: bank.userId,
      userName: stored?.user.fullName ?? "",
      userEmail: stored?.user.email ?? "",
      bankName: bank.bankName,
      accountHolder: bank.accountHolder,
      last4: bank.last4,
      currency: bank.currency,
      verified: bank.verified,
      createdAt: bank.createdAt,
    });
  }
  return res.status(404).json({ success: false, message: "Bank account not found." });
});

router.get("/admin/cards", requireAdmin, (_req, res) => {
  const list: AdminCardSummary[] = [];
  for (const [userId, data] of userData) {
    const stored = users.get(userId);
    if (!stored) continue;
    for (const c of data.cards) {
      list.push({
        ...c,
        userName: stored.user.fullName,
        userEmail: stored.user.email,
      });
    }
  }
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(list);
});

router.post("/admin/cards/:cardId/decision", requireAdmin, (req, res) => {
  const parsed = SetCardDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid decision" });
  }
  const id = String(req.params["cardId"] ?? "");
  for (const [userId, data] of userData) {
    const card = data.cards.find((c) => c.id === id);
    if (!card) continue;
    const stored = users.get(userId);
    if (parsed.data.decision === "approve") {
      card.status = "approved";
      card.approvedAt = NOW();
      card.rejectionReason = null;
    } else {
      card.status = "rejected";
      card.rejectionReason = parsed.data.reason ?? "Rejected by admin";
    }
    logActivity({
      actorId: req.userId!,
      actorName: req.storedUser!.user.fullName,
      action: "admin.card.decision",
      detail: `${parsed.data.decision} card ${card.id} for ${stored?.user.email ?? userId}`,
    });
    return res.json({
      ...card,
      userName: stored?.user.fullName ?? "",
      userEmail: stored?.user.email ?? "",
    });
  }
  return res.status(404).json({ error: "Card not found" });
});

router.get("/admin/promotions", requireAdmin, (_req, res) => {
  return res.json(promotions);
});

router.post("/admin/promotions", requireAdmin, (req, res) => {
  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid promotion", details: parsed.error.issues });
  }
  const promo: Promotion = {
    id: newId("promo"),
    ...parsed.data,
    participants: 0,
    joined: false,
    createdAt: NOW(),
  };
  promotions.unshift(promo);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.promotion.create",
    detail: `Created promotion "${promo.title}"`,
  });
  return res.status(201).json(promo);
});

router.patch("/admin/promotions/:promotionId", requireAdmin, (req, res) => {
  const parsed = UpdatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  const id = String(req.params["promotionId"] ?? "");
  const promo = promotions.find((p) => p.id === id);
  if (!promo) return res.status(404).json({ error: "Promotion not found" });
  Object.assign(promo, parsed.data);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.promotion.update",
    detail: `Updated promotion "${promo.title}"`,
  });
  return res.json(promo);
});

router.delete("/admin/promotions/:promotionId", requireAdmin, (req, res) => {
  const id = String(req.params["promotionId"] ?? "");
  const idx = promotions.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Promotion not found" });
  const [removed] = promotions.splice(idx, 1);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.promotion.delete",
    detail: `Deleted promotion "${removed!.title}"`,
  });
  return res.json({ success: true, message: "Promotion deleted." });
});

router.get("/admin/activity", requireAdmin, (_req, res) => {
  return res.json(activityLog.slice(0, 100));
});

// ---------------------------- Billing (admin) ----------------------------

function rowFor(userId: string): AdminBillingUserRow {
  const stored = users.get(userId)!;
  const data = getUserData(userId);
  const cycle = ensureCurrentCycle(data);
  const { rates, usingDefaults } = getEffectiveRates(data);
  return {
    userId,
    userName: stored.user.fullName,
    userEmail: stored.user.email,
    rates,
    usingDefaults,
    currentCycle: cycle,
  };
}

router.get("/admin/billing", requireAdmin, (_req, res) => {
  const rows: AdminBillingUserRow[] = [];
  for (const [uid, u] of users) {
    if (u.role === "admin") continue;
    rows.push(rowFor(uid));
  }
  const overview: AdminBillingOverview = { defaults: { ...defaultBillingRates }, rows };
  return res.json(overview);
});

router.patch("/admin/billing", requireAdmin, (req, res): unknown => {
  const parsed = UpdateBillingDefaultsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rates", details: parsed.error.issues });
  }
  Object.assign(defaultBillingRates, parsed.data);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.billing.defaults.update",
    detail: `Updated default billing rates`,
  });
  return res.json({ ...defaultBillingRates });
});

router.patch("/admin/billing/users/:userId", requireAdmin, (req, res): unknown => {
  const parsed = UpdateUserBillingRatesBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rates", details: parsed.error.issues });
  }
  const targetId = String(req.params["userId"] ?? "");
  if (!users.has(targetId)) return res.status(404).json({ error: "User not found" });
  const data = getUserData(targetId);
  data.billingRatesOverride = { ...parsed.data };
  // Refresh current cycle so unpaid charges adopt new rates immediately.
  ensureCurrentCycle(data);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.billing.user.update",
    detail: `Updated billing rates for ${users.get(targetId)!.user.email}`,
  });
  return res.json(rowFor(targetId));
});

router.post("/admin/billing/users/:userId/mark-paid", requireAdmin, (req, res): unknown => {
  const parsed = AdminMarkBillingPaidBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment", details: parsed.error.issues });
  }
  const targetId = String(req.params["userId"] ?? "");
  if (!users.has(targetId)) return res.status(404).json({ error: "User not found" });
  const data = getUserData(targetId);
  const cycle = ensureCurrentCycle(data);
  const requested = new Set(parsed.data.items);
  const now = NOW();
  let updated = 0;
  for (const c of cycle.charges) {
    if (!c.paid && requested.has(c.key)) {
      c.paid = true;
      c.paidAt = now;
      updated += 1;
    }
  }
  if (updated === 0) return res.status(400).json({ error: "Nothing to settle." });
  recomputeTotals(cycle);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.billing.markPaid",
    detail: `Manually settled ${updated} item(s) for ${users.get(targetId)!.user.email}`,
  });
  return res.json(rowFor(targetId));
});

export default router;
