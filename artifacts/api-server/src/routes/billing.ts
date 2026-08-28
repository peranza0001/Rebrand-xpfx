/**
 * /billing routes — customer-facing billing snapshot and payment.
 *
 * GET  /billing/me  -> rates, current cycle, history, overdue flag
 * POST /billing/pay -> settle one or more charges from the main wallet
 *
 * Cycle accounting lives in `lib/billing.ts`. Wallet debits go through
 * the user's main wallet and are mirrored as a transaction with type
 * `fee` for traceability.
 */
import { Router, type IRouter } from "express";
import { PayBillingBody } from "@workspace/api-zod";
import type { BillingStatus } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { getUserData, logActivity, newId } from "../lib/store";
import { persistWalletBalance } from "../lib/db-persist";
import { subtractMoney } from "../lib/money";
import {
  ensureCurrentCycle,
  getEffectiveRates,
  isOverdue,
  recomputeTotals,
} from "../lib/billing";

const router: IRouter = Router();

function buildStatus(userId: string): BillingStatus {
  const data = getUserData(userId);
  const cycle = ensureCurrentCycle(data);
  const { rates } = getEffectiveRates(data);
  return {
    rates,
    currentCycle: cycle,
    history: data.billingHistory,
    overdue: isOverdue(cycle),
  };
}

router.get("/billing/me", requireAuth, (req, res) => {
  return res.json(buildStatus(req.userId!));
});

router.post("/billing/pay", requireAuth, (req, res): unknown => {
  const parsed = PayBillingBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payment", details: parsed.error.issues });
  }
  const data = getUserData(req.userId!);
  const cycle = ensureCurrentCycle(data);

  const requested = new Set(parsed.data.items);
  const toPay = cycle.charges.filter((c) => !c.paid && requested.has(c.key));
  if (toPay.length === 0) {
    return res.status(400).json({ error: "Nothing to settle." });
  }
  const total = toPay.reduce((s, c) => s + c.amount, 0);

  // Source wallet — explicit walletId or the main wallet.
  const wallet =
    (parsed.data.walletId
      ? data.wallets.find((w) => w.id === parsed.data.walletId)
      : null) ?? data.wallets.find((w) => w.type === "main");

  if (!wallet) return res.status(400).json({ error: "No funding wallet available." });
  if (wallet.balance < total) {
    return res
      .status(400)
      .json({ error: `Insufficient balance. Needed ${total}, available ${wallet.balance}.` });
  }

  wallet.balance = subtractMoney(wallet.balance, total);
  // PHASE 1 FIX: Persist balance change to survive server restarts
  void persistWalletBalance(wallet.id, wallet.balance, 0);
  const now = new Date().toISOString();
  for (const c of toPay) {
    c.paid = true;
    c.paidAt = now;
  }
  recomputeTotals(cycle);

  data.transactions.unshift({
    id: newId("tx"),
    walletId: wallet.id,
    type: "fee",
    amount: -total,
    currency: cycle.currency,
    status: "completed",
    description: `Monthly fees: ${toPay.map((c) => c.label).join(", ")}`,
    createdAt: now,
  });

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "billing.pay",
    detail: `Settled ${toPay.length} cycle ${cycle.cycleId} item(s) for ${total} ${cycle.currency}`,
  });

  return res.json(buildStatus(req.userId!));
});

export default router;
