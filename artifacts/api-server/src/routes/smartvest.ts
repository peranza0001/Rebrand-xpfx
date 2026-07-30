import { Router, type IRouter } from "express";
import { getUserData, newId, NOW } from "../lib/store";
import { requireFullAuth } from "../lib/session";

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

export default router;