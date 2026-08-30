/**
 * /investment-plans routes
 *
 * User endpoints:
 * - GET /investment-plans - list available plans
 * - GET /investment-plans/:planId - get plan details
 * - POST /investment-plans/:planId/subscribe - subscribe to a plan
 * - GET /investment-plans/subscriptions - list user's subscriptions
 * - PATCH /investment-plans/:subscriptionId - pause/resume subscription
 * - GET /investment-plans/:subscriptionId/performance - get performance data
 *
 * Requires account checklist completion before subscription.
 */

import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { requireAdmin, requireAuth } from "../lib/session";
import { notifyUser } from "../lib/notify";
import { getUserData, logActivity, managers, users } from "../lib/store";
import { generatePlanProjection, INVESTMENT_PLANS, normalizePlanId, type InvestmentPlanType } from "../lib/investment-plans";
import { subtractMoney } from "../lib/money";
import { persistInvestmentRecord, persistWallet } from "../lib/db-persist";

const router: IRouter = Router();

/**
 * GET /investment-plans
 * List all available investment plans
 */
router.get("/investment-plans", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const plans = Object.values(INVESTMENT_PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    minDeposit: plan.minDeposit,
    estimatedReturn: plan.estimatedReturnPercent,
    tradingDuration: plan.tradingDuration,
    recommendedHoldDays: plan.recommendedHoldDays,
    leverage: plan.automationLevel === "aggressive" ? 5 : plan.automationLevel === "active" ? 3 : 1,
    riskLevel: plan.riskLevel,
    assets: plan.features,
    automationEnabled: true,
    active: true,
  }));

  res.json({
    plans,
    userHasActiveSubscription: Boolean(data.activePlanSubscription),
    checklistRequired: Boolean(data.checklistIncomplete),
    checklist: data.accountChecklist,
  });
});

/**
 * GET /investment-plans/:planId
 * Get specific plan details
 */
router.get("/investment-plans/:planId", requireAuth, (req, res) => {
  let planId: InvestmentPlanType;
  try {
    planId = normalizePlanId(req.params["planId"]);
  } catch {
    return res.status(404).json({ error: "Plan not found" });
  }
  const data = getUserData(req.userId!);
  const plan = INVESTMENT_PLANS[planId];

  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const projection = generatePlanProjection(planId, Math.max(plan.minDeposit, data.wallets.find((w) => w.type === "main")?.balance ?? plan.minDeposit));
  const hasSubscription = data.activePlanSubscription?.planId === planId;

  return res.json({
    ...plan,
    projection,
    userCanSubscribe: !hasSubscription && !data.checklistIncomplete,
    checklistRequired: data.checklistIncomplete,
    accountChecklist: data.accountChecklist,
  });
});

/**
 * POST /investment-plans/:planId/subscribe
 * Subscribe to an investment plan
 * Requires:
 * - Sufficient balance in main wallet
 * - Account checklist completion
 * - No active subscriptions to other plans
 */
router.post("/investment-plans/:planId/subscribe", requireAuth, async (req, res) => {
  let planId: InvestmentPlanType;
  try {
    planId = normalizePlanId(req.params["planId"]);
  } catch {
    return res.status(404).json({ error: "Plan not found" });
  }
  const { amount } = req.body as { amount?: number };
  const data = getUserData(req.userId!);

  if (data.checklistIncomplete) {
    return res.status(403).json({
      error: "Account checklist incomplete",
      message: "All mandatory account-checklist items must be completed before any investment plan can be activated.",
      checklistItems: data.accountChecklist.items,
      missingMandatory: data.accountChecklist.missingMandatory,
    });
  }

  const plan = INVESTMENT_PLANS[planId];
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const subscriptionAmount = Number(amount ?? plan.minDeposit);
  const mainWallet = data.wallets.find((w) => w.type === "main");
  if (!mainWallet || subscriptionAmount < plan.minDeposit) {
    return res.status(400).json({
      error: "Insufficient deposit",
      message: `The minimum deposit for ${plan.name} is $${plan.minDeposit}.`,
      minimumDeposit: plan.minDeposit,
    });
  }

  if (mainWallet.balance < subscriptionAmount) {
    return res.status(400).json({
      error: "Insufficient balance",
      message: `You need at least $${subscriptionAmount} in your main wallet to activate this plan.`,
      balance: mainWallet.balance,
    });
  }

  if (data.activePlanSubscription) {
    return res.status(400).json({
      error: "Already subscribed",
      message: `You are already subscribed to ${data.activePlanSubscription.planName}. Complete or pause that plan first.`,
    });
  }

  mainWallet.balance = subtractMoney(mainWallet.balance, subscriptionAmount);
  const projection = generatePlanProjection(planId, subscriptionAmount);
  const manager = req.storedUser!.user.selectedManagerId ? managers.find((m) => m.id === req.storedUser!.user.selectedManagerId) ?? managers[0] ?? null : managers[0] ?? null;

  data.activePlanSubscription = {
    subscriptionId: randomUUID(),
    userId: req.userId!,
    planId,
    planName: plan.name,
    status: "active",
    initialDeposit: subscriptionAmount,
    currentBalance: projection.projectedBalance,
    estimatedProfit: projection.estimatedProfit,
    estimatedProfitPct: projection.estimatedProfitPct,
    accountManagerId: manager?.id ?? null,
    accountManagerName: manager?.name ?? null,
    subscriptionStarted: new Date().toISOString(),
    subscriptionEnd: null,
    lastRebalance: new Date().toISOString(),
    manuallyControlledBy: null,
    automationEnabled: true,
    longTradeDays: projection.longTradeDays,
    shortTradeDays: projection.shortTradeDays,
    marketSignal: projection.marketSignal,
  };

  const durable = await persistInvestmentRecord({
    id: data.activePlanSubscription.subscriptionId,
    userId: req.userId!,
    planId: plan.id,
    planName: plan.name,
    status: data.activePlanSubscription.status,
    principal: subscriptionAmount,
    lockedProfit: projection.estimatedProfit,
    currentDay: 0,
    startDate: data.activePlanSubscription.subscriptionStarted,
    endDate: new Date(Date.now() + plan.durationDays * 86400000).toISOString(),
    weeklyTopUpDue: false,
    weeklyTopUpAmount: plan.weeklyTopUp,
    weeklyTopUpApproved: false,
    topUpPenaltyActive: false,
    pendingMarginalFee: 0,
    marginalFeeApproved: false,
    dailyHistory: [],
  });
  if (!durable) {
    mainWallet.balance = subscriptionAmount + mainWallet.balance;
    data.activePlanSubscription = null;
    return res.status(503).json({ error: "Investment persistence is unavailable", message: "The plan was not activated because durable database persistence could not be confirmed." });
  }
  const walletDurable = await persistWallet(mainWallet.id, req.userId!, { walletType: mainWallet.type, balance: mainWallet.balance, pendingBalance: mainWallet.pendingBalance, currency: mainWallet.currency, label: mainWallet.label, address: mainWallet.address });
  if (!walletDurable) {
    data.activePlanSubscription = null;
    return res.status(503).json({ error: "Wallet persistence is unavailable", message: "The plan was not activated because the wallet debit could not be durably confirmed." });
  }

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "plan.subscribe",
    detail: `Activated ${plan.name} investment plan with $${subscriptionAmount}`,
  });

  notifyUser({
    userId: req.userId!,
    kind: "plan_subscribed",
    emailToggle: "planNotifications",
    title: "Investment plan activated",
    body: `Your ${plan.name} plan is live. Estimated return ${projection.estimatedProfitPct}% with automated execution and account manager oversight.`,
    link: "/dashboard",
  });

  return res.json({
    success: true,
    message: "Successfully subscribed to investment plan",
    subscription: data.activePlanSubscription,
    projection,
  });
});

/**
 * GET /investment-plans/subscriptions
 * Get user's active subscriptions
 */
router.get("/investment-plans/subscriptions", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);

  const subscriptions = data.activePlanSubscription
    ? [{
        id: data.activePlanSubscription.subscriptionId,
        planId: data.activePlanSubscription.planId,
        planName: data.activePlanSubscription.planName,
        status: data.activePlanSubscription.status,
        initialDeposit: data.activePlanSubscription.initialDeposit,
        currentBalance: data.activePlanSubscription.currentBalance,
        estimatedProfit: data.activePlanSubscription.estimatedProfit,
        estimatedProfitPct: data.activePlanSubscription.estimatedProfitPct,
        accountManagerId: data.activePlanSubscription.accountManagerId,
        accountManagerName: data.activePlanSubscription.accountManagerName,
        subscriptionStarted: data.activePlanSubscription.subscriptionStarted,
        subscriptionEnd: data.activePlanSubscription.subscriptionEnd,
        lastRebalance: data.activePlanSubscription.lastRebalance,
        longTradeDays: data.activePlanSubscription.longTradeDays,
        shortTradeDays: data.activePlanSubscription.shortTradeDays,
        marketSignal: data.activePlanSubscription.marketSignal,
        automationEnabled: data.activePlanSubscription.automationEnabled,
        performance: {
          dailyReturn: data.activePlanSubscription.estimatedProfitPct / Math.max(30, data.activePlanSubscription.longTradeDays + data.activePlanSubscription.shortTradeDays),
          weeklyReturn: (data.activePlanSubscription.estimatedProfitPct / Math.max(30, data.activePlanSubscription.longTradeDays + data.activePlanSubscription.shortTradeDays)) * 7,
          monthlyReturn: (data.activePlanSubscription.estimatedProfitPct / Math.max(30, data.activePlanSubscription.longTradeDays + data.activePlanSubscription.shortTradeDays)) * 30,
        },
      }]
    : [];

  res.json({ subscriptions });
});

/**
 * GET /investment-plans/:subscriptionId/performance
 * Get performance and analytics for a subscription
 */
router.get("/investment-plans/:subscriptionId/performance", requireAuth, (req, res) => {
  const subscriptionId = req.params["subscriptionId"];
  const data = getUserData(req.userId!);

  if (!data.activePlanSubscription || data.activePlanSubscription.subscriptionId !== subscriptionId) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  const sub = data.activePlanSubscription;
  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(sub.subscriptionStarted).getTime()) / (1000 * 60 * 60 * 24)));
  const dailyReturn = sub.estimatedProfitPct / Math.max(1, daysActive);

  return res.json({
    subscriptionId,
    initialDeposit: sub.initialDeposit,
    currentBalance: sub.currentBalance,
    totalProfit: sub.estimatedProfit,
    totalProfitPercent: sub.estimatedProfitPct,
    daysActive,
    dailyReturn,
    weeklyReturn: dailyReturn * 7,
    monthlyReturn: dailyReturn * 30,
    longTradeDays: sub.longTradeDays,
    shortTradeDays: sub.shortTradeDays,
    marketSignal: sub.marketSignal,
    chartData: [
      { date: "Day 1", balance: sub.initialDeposit, profit: 0 },
      { date: "Day 15", balance: sub.initialDeposit + sub.estimatedProfit * 0.4, profit: sub.estimatedProfit * 0.4 },
      { date: "Day 30", balance: sub.initialDeposit + sub.estimatedProfit * 0.7, profit: sub.estimatedProfit * 0.7 },
      { date: "Today", balance: sub.currentBalance, profit: sub.estimatedProfit },
    ],
  });
});

router.patch("/investment-plans/:subscriptionId/control", requireAdmin, (req, res) => {
  const subscriptionId = req.params["subscriptionId"];
  const { status, managerId, manualControl } = req.body as { status?: string; managerId?: string; manualControl?: boolean };
  for (const [id, stored] of users) {
    const data = getUserData(id);
    if (data.activePlanSubscription?.subscriptionId === subscriptionId) {
      if (status) data.activePlanSubscription.status = status as "active" | "paused" | "cancelled" | "completed";
      if (managerId) {
        const manager = managers.find((m) => m.id === managerId) ?? null;
        data.activePlanSubscription.accountManagerId = manager?.id ?? null;
        data.activePlanSubscription.accountManagerName = manager?.name ?? null;
      }
      if (typeof manualControl === "boolean") data.activePlanSubscription.manuallyControlledBy = manualControl ? req.userId! : null;
      logActivity({
        actorId: req.userId!,
        actorName: req.storedUser!.user.fullName,
        action: "plan.admin_control",
        detail: `Administration updated plan ${subscriptionId} for ${stored.user.fullName}`,
      });
      return res.json({ success: true, subscription: data.activePlanSubscription });
    }
  }
  return res.status(404).json({ error: "Subscription not found" });
});

router.post("/investment-plans/:userId/gas-wallet", requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { address, currency = "ETH", balance = 0, walletLabel } = req.body as { address?: string; currency?: string; balance?: number; walletLabel?: string };
  const data = getUserData(userId);

  if (!address) {
    return res.status(400).json({ error: "Gas wallet address is required" });
  }

  data.gasFeeWallet = {
    userId,
    address,
    currency,
    balance: Number(balance) || 0,
    gasFeesRequired: 0,
    lastUpdatedAt: new Date().toISOString(),
    walletLabel,
  };

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "plan.gas_wallet_configured",
    detail: `Configured gas wallet for ${userId}`,
  });

  return res.json({ success: true, gasFeeWallet: data.gasFeeWallet });
});

router.get("/investment-plans/:userId/checklist", requireAuth, (req, res) => {
  const data = getUserData(req.params["userId"]);
  res.json({
    checklist: data.accountChecklist,
    checklistIncomplete: data.checklistIncomplete,
  });
});

export default router;
