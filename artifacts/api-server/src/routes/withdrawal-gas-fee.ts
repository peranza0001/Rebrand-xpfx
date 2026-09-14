/**
 * Withdrawal gas-fee + lifecycle routes:
 *  - POST /admin/withdrawals/:withdrawalId/set-gas-fee — admin sets the
 *    ETH gas fee a user must fund and starts the countdown.
 *  - POST /withdrawals/:withdrawalId/mark-gas-fee-funded — user confirms
 *    they funded the gas fee.
 *  - POST /withdrawals/:withdrawalId/cancel — user cancels their own
 *    pending or awaiting_gas_fee withdrawal.
 */
import { Router, type IRouter } from "express";
import {
  SetWithdrawalGasFeeBody,
  MarkWithdrawalGasFeeFundedBody,
} from "@workspace/api-zod";
import { claimTxHash, logActivity, NOW, userData, users } from "../lib/store";
import { requireAdmin, requireAuth } from "../lib/session";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import {
  getPlatformReceivingAddress,
  verifyOnChainPayment,
} from "../lib/blockchain";

const router: IRouter = Router();

router.post("/admin/withdrawals/:withdrawalId/set-gas-fee", requireAdmin, (req, res) => {
  const parsed = SetWithdrawalGasFeeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
  }
  const id = String(req.params["withdrawalId"] ?? "");
  for (const [userId, data] of userData) {
    const wd = data.withdrawals.find((w) => w.id === id);
    if (!wd) continue;
    if (wd.status !== "pending" && wd.status !== "awaiting_gas_fee") {
      return res.status(400).json({
        error: `Cannot set gas fee on a ${wd.status} withdrawal.`,
      });
    }
    const deadline = new Date(Date.now() + parsed.data.deadlineMinutes * 60_000).toISOString();
    wd.status = "awaiting_gas_fee";
    wd.gasFeeAmount = parsed.data.gasFeeAmount;
    wd.gasFeeDeadlineAt = deadline;
    wd.gasFeeFundedAt = null;
    wd.gasFeeTxHash = null;
    const stored = users.get(userId);
    notifyUser({
      userId,
      kind: "withdrawal_gas_fee_required",
      emailToggle: "withdrawalGasFeeRequired",
      title: "Gas fee required for your withdrawal",
      body: `Please fund ${parsed.data.gasFeeAmount} ETH for gas fees within ${parsed.data.deadlineMinutes} minutes or your withdrawal will expire.`,
      link: "/withdrawals",
    });
    logActivity({
      actorId: req.userId!,
      actorName: req.storedUser!.user.fullName,
      action: "admin.withdrawal.set_gas_fee",
      detail: `Set ${parsed.data.gasFeeAmount} ETH gas fee on withdrawal ${wd.id} (${stored?.user.email ?? userId}); deadline ${deadline}.`,
    });
    return res.json(wd);
  }
  return res.status(404).json({ error: "Withdrawal not found" });
});

router.post("/withdrawals/:withdrawalId/mark-gas-fee-funded", requireAuth, async (req, res) => {
  const parsed = MarkWithdrawalGasFeeFundedBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
  }
  const data = userData.get(req.userId!);
  if (!data) return res.status(404).json({ error: "Withdrawal not found" });
  const id = String(req.params["withdrawalId"] ?? "");
  const wd = data.withdrawals.find((w) => w.id === id);
  if (!wd) return res.status(404).json({ error: "Withdrawal not found" });
  if (wd.status !== "awaiting_gas_fee") {
    return res.status(400).json({
      error: `Withdrawal is ${wd.status}, not awaiting a gas-fee payment.`,
    });
  }
  if (wd.gasFeeDeadlineAt && Date.parse(wd.gasFeeDeadlineAt) < Date.now()) {
    return res.status(400).json({
      error: "Gas-fee deadline has passed. The withdrawal will expire shortly.",
    });
  }
  // On-chain verification: confirm the supplied tx hash actually paid the
  // required gas fee to the platform receiving address before accepting it.
  const ethWallet = data.connectedWallets.find(
    (w) =>
      w.currency?.toUpperCase() === "ETH" ||
      w.walletType?.toUpperCase().includes("ETH"),
  );
  if (!ethWallet) {
    return res.status(400).json({
      error: "No connected ETH wallet found on your account. Please connect an ETH wallet and send the gas fee from it.",
    });
  }
  const platformAddress = getPlatformReceivingAddress();
  const verification = await verifyOnChainPayment({
    txHash: parsed.data.txHash,
    expectedFrom: ethWallet.address,
    expectedTo: platformAddress,
    asset: "ETH",
    expectedAmount: wd.gasFeeAmount ?? 0,
  });
  if (!verification.ok) {
    req.log.warn(
      {
        txHash: parsed.data.txHash,
        walletId: ethWallet.id,
        withdrawalId: wd.id,
        reason: verification.reason,
      },
      "withdrawal.mark-gas-fee-funded: rejected unverified on-chain gas-fee payment",
    );
    return res.status(400).json({
      error: `Gas-fee payment could not be verified on-chain: ${verification.reason}`,
    });
  }
  // Prevent replay: claim this tx hash so it cannot be reused for another
  // withdrawal or any other on-chain settlement purpose.
  const claim = claimTxHash(parsed.data.txHash, {
    userId: req.userId!,
    purpose: "withdrawal_gas_fee",
    recordId: wd.id,
  });
  if (!claim.ok) {
    return res.status(409).json({
      error: `Transaction ${parsed.data.txHash} has already been used to settle ${claim.existing.purpose} ${claim.existing.recordId}.`,
    });
  }
  wd.gasFeeFundedAt = NOW();
  wd.gasFeeTxHash = parsed.data.txHash;
  // Stay in awaiting_gas_fee — the gasFeeFundedAt flag is what unlocks
  // admin approval. Status only advances to `approved` once admin verifies
  // the on-chain payment via /admin/withdrawals/:id/decision.
  const stored = req.storedUser!;
  pushAdminAlert({
    kind: "withdrawal.gas_fee_funded",
    title: "Gas fee funded — verify & approve withdrawal",
    body: `${stored.user.email} marked withdrawal ${wd.id} as funded with tx ${parsed.data.txHash}. Verify the on-chain payment, then approve to deduct the ${wd.gasFeeAmount} ETH gas fee and release the withdrawal.`,
    userId: req.userId!,
    userEmail: stored.user.email,
    severity: "warning",
    linkUrl: `/users/${req.userId}`,
    email: true,
  });
  logActivity({
    actorId: req.userId!,
    actorName: stored.user.fullName,
    action: "withdrawal.gas_fee_funded",
    detail: `Marked gas fee funded for withdrawal ${wd.id} (tx ${parsed.data.txHash}).`,
  });
  return res.json(wd);
});

router.post("/withdrawals/:withdrawalId/cancel", requireAuth, (req, res) => {
  const data = userData.get(req.userId!);
  if (!data) return res.status(404).json({ error: "Withdrawal not found" });
  const id = String(req.params["withdrawalId"] ?? "");
  const wd = data.withdrawals.find((w) => w.id === id);
  if (!wd) return res.status(404).json({ error: "Withdrawal not found" });
  if (wd.status !== "pending" && wd.status !== "awaiting_gas_fee") {
    return res.status(400).json({
      error: `Cannot cancel a ${wd.status} withdrawal.`,
    });
  }
  wd.status = "cancelled";
  wd.decidedAt = NOW();
  wd.rejectionReason = "Cancelled by user.";
  // Release any held funds.
  const main = data.wallets.find((w) => w.type === "main");
  if (main) {
    main.pendingBalance = Math.round((main.pendingBalance - wd.amount) * 100) / 100;
    main.balance = Math.round((main.balance + wd.amount) * 100) / 100;
  }
  const tx = data.transactions.find(
    (t) =>
      t.type === "withdrawal" &&
      t.status === "pending" &&
      Math.abs(t.amount) === wd.amount,
  );
  if (tx) tx.status = "failed";
  pushAdminAlert({
    kind: "withdrawal.cancelled",
    title: "Withdrawal cancelled by user",
    body: `${req.storedUser!.user.email} cancelled withdrawal ${wd.id} (${wd.amount} ${wd.currency}).`,
    userId: req.userId!,
    userEmail: req.storedUser!.user.email,
    severity: "info",
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "withdrawal.cancel",
    detail: `User cancelled withdrawal ${wd.id}.`,
  });
  return res.json(wd);
});

export default router;
