/**
 * /trades routes — trade history, social trading wallet, releasing trade funds.
 */
import { Router, type IRouter } from "express";
import { getUserData, logActivity } from "../lib/store";
import { requireAuth } from "../lib/session";
import { enforceGasFee } from "../lib/gas-fee-gate";
import { notifyUser } from "../lib/notify";
import { isFirstTrade, triggerReferralReward } from "../lib/referral-rewards";
import { requireLiveTrading } from "../lib/tier-middleware";
import { determineAccountTier, checkDailyTradingLimit } from "../lib/account-tiers";

const router: IRouter = Router();

router.get("/trades", requireAuth, (req, res) => {
  res.json(getUserData(req.userId!).trades);
});

router.get("/trades/social-wallet", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const completedProfits = data.trades
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.profit, 0);
  const activeProfits = data.trades
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + t.profit, 0);
  res.json({
    totalProfits: completedProfits,
    pendingProfits: activeProfits,
    currency: "USD",
    locked: data.socialLocked,
    activeTrades: data.trades.filter((t) => t.status === "active").length,
  });
});

router.post("/trades/:tradeId/release", requireAuth, requireLiveTrading, (req, res) => {
  if (!enforceGasFee(req, res, "trade_release")) return;
  if (req.storedUser!.tradingLocked) {
    return res.status(403).json({ success: false, message: "Trading is locked on your account." });
  }
  
  // Check daily trading limit
  const data = getUserData(req.userId!);
  const userTier = determineAccountTier({
    buyVerified: req.storedUser!.user.buyVerified,
    kycVerified: req.storedUser!.user.kycVerified,
    bankAccountsCount: data.bankAccounts.length,
    role: req.storedUser!.role,
  });
  const tradedToday = data.trades
    .filter(t => {
      const createdDate = new Date(t.createdAt).toDateString();
      const today = new Date().toDateString();
      return createdDate === today;
    })
    .reduce((sum, t) => sum + t.amount, 0);
  const limitCheck = checkDailyTradingLimit(userTier, tradedToday);
  if (!limitCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: `Daily trading limit of $${limitCheck.limit} reached`,
      limit: limitCheck.limit,
      used: tradedToday,
      remaining: limitCheck.remaining,
    });
  }
  const trade = data.trades.find((t) => t.id === req.params["tradeId"]);
  if (!trade) {
    return res.status(404).json({ success: false, message: "Trade not found" });
  }
  if (trade.status !== "completed") {
    return res.json({
      success: false,
      message: "Only completed trades can be released.",
    });
  }
  const main = data.wallets.find((w) => w.type === "main");
  if (main) main.balance = Math.round((main.balance + trade.profit) * 100) / 100;
  const released = trade.profit;
  trade.profit = 0;

  // Trigger referral reward on first completed trade release (idempotent — fires only once per user).
  const completedReleased = data.trades.filter((t) => t.status === "completed" && t.profit === 0).length;
  if (isFirstTrade(req.userId!, completedReleased - 1)) {
    triggerReferralReward(req.userId!);
  }

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "trade.release",
    detail: `Released $${released} from ${trade.pair} to main wallet`,
  });
  notifyUser({
    userId: req.userId!,
    kind: "trade_released",
    emailToggle: "tradeOpened",
    title: "Trade profits released",
    body: `$${released.toFixed(2)} from your ${trade.pair} trade has been moved to your main wallet.`,
    link: "/trades",
  });
  return res.json({
    success: true,
    message: `Released funds to your main wallet.`,
  });
});

export default router;
