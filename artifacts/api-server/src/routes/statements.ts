import { Router, type IRouter } from "express";
import { getUserData, NOW, users } from "../lib/store";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/statements", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const stored = users.get(req.userId!);
  const walletBalance = data.wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalDeposits = data.deposits.reduce((sum, entry) => sum + entry.amount, 0);
  const totalWithdrawals = data.withdrawals.reduce((sum, entry) => sum + entry.amount, 0);
  const openTrades = data.trades.filter((trade) => trade.status === "active").length;
  const recentActivity = [...data.transactions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      label: entry.description ?? entry.type ?? "Activity",
      amount: entry.amount,
      currency: entry.currency ?? "USD",
      createdAt: entry.createdAt,
    }));

  return res.json({
    statementId: `stmt-${req.userId}-${NOW()}`,
    generatedAt: NOW(),
    accountHolder: stored?.user.fullName ?? "Account Holder",
    totals: {
      walletBalance,
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals,
      openTrades,
    },
    recentActivity,
    summary: {
      status: openTrades > 0 ? "Active trading account" : "Ready for trading",
      note: "This statement is generated from your current in-platform activity and is intended for reference only.",
    },
  });
});

export default router;
