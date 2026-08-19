import { Router, type IRouter } from "express";
import { getUserData, newId, NOW } from "../lib/store";
import { requireFullAuth } from "../lib/session";
import * as walletLedger from "../lib/wallet-ledger";
import { logger } from "../lib/logger";

const planMeta = {
  conservative: {
    label: "Conservative",
    allocation: { cash: 45, bonds: 40, equities: 15 },
    description: "Capital preservation with steady income exposure.",
  },
  balanced: {
    label: "Balanced",
    allocation: { cash: 20, bonds: 35, equities: 45 },
    description: "Balanced growth with moderate risk and income.",
  },
  growth: {
    label: "Growth",
    allocation: { cash: 10, bonds: 20, equities: 70 },
    description: "Higher upside with stronger equity exposure.",
  },
} as const;

const router: IRouter = Router();
const DISCLAIMER =
  "SmartVest is a simulated educational account, not a TFSA, FHSA, investment product, or registered account.";
const allocations = planMeta;

router.get("/smartvest/plans", (_req, res) => {
  res.json(Object.entries(planMeta).map(([key, entry]) => ({
    key,
    label: entry.label,
    allocation: entry.allocation,
    description: entry.description,
  })));
});

function present(data: ReturnType<typeof getUserData>) {
  const account = data.smartVest;
  const simulatedBalance = data.wallets.reduce((total, wallet) => total + wallet.balance, 0);
  if (!account) return { account: null, simulatedBalance, disclaimer: DISCLAIMER };
  const meta = planMeta[account.plan as keyof typeof planMeta];
  const portfolioValue = Math.max(simulatedBalance + (account.returnPercent ?? 0), 0);
  return {
    account: {
      ...account,
      simulatedBalance,
      portfolioValue,
      returnPercent: account.returnPercent ?? 0,
      allocation: account.allocation ?? meta.allocation,
      planLabel: meta.label,
      description: meta.description,
      suggestedContribution: Math.round(simulatedBalance * 0.12),
      nextReview: "Weekly",
    },
    disclaimer: DISCLAIMER,
  };
}

router.get("/smartvest", requireFullAuth, (req, res) => {
  res.json(present(getUserData(req.userId!)));
});

router.post("/smartvest", requireFullAuth, (req, res) => {
  const plan = req.body?.plan;
  if (!(plan in allocations)) {
    return res.status(400).json({ error: "Choose conservative, balanced, or growth." });
  }
  const data = getUserData(req.userId!);
  const now = NOW();
  const selectedPlan = allocations[plan as keyof typeof allocations];
  data.smartVest = {
    id: newId("sv"),
    plan,
    allocation: selectedPlan.allocation,
    disclaimerAcknowledged: req.body?.disclaimerAcknowledged === true,
    createdAt: now,
    updatedAt: now,
    returnPercent: 4.8,
  };
  return res.status(201).json(present(data));
});

/**
 * PHASE 5: POST /smartvest/complete-plan - Complete plan and credit payout to trading wallet
 * Creates a ledger entry recording the SmartVest payout
 */
router.post("/smartvest/complete-plan", requireFullAuth, async (req, res) => {
  try {
    const data = getUserData(req.userId!);

    if (!data.smartVest) {
      return res.status(400).json({
        error: "No active SmartVest plan",
        message: "Create a plan first with POST /smartvest",
      });
    }

    const account = data.smartVest;
    const simulatedBalance = data.wallets.reduce((total, wallet) => total + wallet.balance, 0);
    const returnPercent = account.returnPercent ?? 4.8;
    const payout = Math.round(simulatedBalance * (returnPercent / 100));

    if (payout <= 0) {
      return res.status(400).json({
        error: "No funds to payout",
        message: "Deposit funds to your account before completing a plan",
      });
    }

    // Get or create main wallet
    let mainWallet = data.wallets.find((wallet) => wallet.type === "main");
    if (!mainWallet) {
      mainWallet = {
        id: `wallet_${Date.now()}`,
        type: "main",
        label: "Main Wallet",
        currency: "USD",
        balance: 0,
        pendingBalance: 0,
        address: "",
      };
      data.wallets.push(mainWallet);
    }

    // Record ledger entry for SmartVest payout
    const entryCreated = await walletLedger.recordLedgerEntry({
      userId: req.userId!,
      walletId: mainWallet.id,
      entryType: "smartvest_payout",
      assetSymbol: "USD",
      amount: payout,
      status: "completed",
      sourceType: "smartvest_plan_completion",
      sourceId: account.id,
      description: `SmartVest ${account.plan} plan payout: ${returnPercent}% return on ${simulatedBalance} USD`,
      metadata: {
        planName: account.plan,
        initialBalance: simulatedBalance,
        returnPercent,
        payoutAmount: payout,
        planDuration: "simulation",
      },
    });

    if (!entryCreated) {
      logger.warn(
        { userId: req.userId, payout, accountId: account.id },
        "[smartvest] Ledger entry creation failed - balance may not reflect"
      );
    }

    // Update user's trading wallet balance
    await walletLedger.updateWalletSubBalance(req.userId!, "trading", payout, "USD");

    // Mark plan as completed and reset
    const now = NOW();
    data.smartVest = {
      id: newId("sv"),
      plan: account.plan,
      allocation: account.allocation,
      disclaimerAcknowledged: true,
      createdAt: now,
      updatedAt: now,
      returnPercent: 4.8,
      lastPayoutAt: now,
      totalPayoutsReceived: (account.totalPayoutsReceived ?? 0) + payout,
    };

    return res.status(200).json({
      status: "ok",
      message: "Plan completed successfully",
      payout: {
        amount: payout,
        returnPercent,
        initialBalance: simulatedBalance,
        currency: "USD",
      },
      newPlan: present(data),
      ledgerEntryCreated: entryCreated,
    });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "[smartvest] Failed to complete plan");
    return res.status(500).json({
      error: "Failed to complete plan",
      message: (err as Error).message,
    });
  }
});

export default router;