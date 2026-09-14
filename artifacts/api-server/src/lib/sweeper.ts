/**
 * Background sweeper. Runs every 30 seconds and:
 *  - Expires withdrawals stuck in awaiting_gas_fee past their deadline,
 *    refunding the held funds to the user's main wallet and emitting an
 *    in-app notification + admin alert.
 *
 * Started once from server/index.ts; idempotent.
 */
import { logActivity, NOW, userData, users } from "./store";
import { notifyUser, pushAdminAlert } from "./notify";
import { logger } from "./logger";

let started = false;

function sweepOnce(): void {
  const nowMs = Date.now();
  for (const [userId, data] of userData) {
    for (const wd of data.withdrawals) {
      if (wd.status !== "awaiting_gas_fee") continue;
      if (!wd.gasFeeDeadlineAt) continue;
      const deadlineMs = Date.parse(wd.gasFeeDeadlineAt);
      if (Number.isNaN(deadlineMs) || deadlineMs > nowMs) continue;

      wd.status = "expired";
      wd.decidedAt = NOW();
      wd.rejectionReason = wd.rejectionReason ?? "Gas-fee deadline passed.";

      // Release any held funds back to the main wallet (mirrors the reject path).
      const main = data.wallets.find((w) => w.type === "main");
      if (main) {
        main.pendingBalance =
          Math.round((main.pendingBalance - wd.amount) * 100) / 100;
        main.balance = Math.round((main.balance + wd.amount) * 100) / 100;
      }
      const tx = data.transactions.find(
        (t) =>
          t.type === "withdrawal" &&
          t.status === "pending" &&
          Math.abs(t.amount) === wd.amount,
      );
      if (tx) tx.status = "failed";

      const stored = users.get(userId);
      notifyUser({
        userId,
        kind: "withdrawal_expired",
        emailToggle: "withdrawalExpired",
        title: "Withdrawal expired",
        body: `Your withdrawal of ${wd.amount} ${wd.currency} expired because the gas-fee deadline passed. Funds were returned to your main wallet.`,
        link: "/withdrawals",
      });
      pushAdminAlert({
        kind: "withdrawal.expired",
        title: "Withdrawal expired (gas-fee deadline)",
        body: `Withdrawal ${wd.id} (${wd.amount} ${wd.currency}) for ${stored?.user.email ?? userId} expired before the user funded the gas fee.`,
        userId,
        userEmail: stored?.user.email ?? null,
        severity: "warning",
      });
      logActivity({
        actorId: "system",
        actorName: "system.sweeper",
        action: "withdrawal.expire",
        detail: `Auto-expired withdrawal ${wd.id} for ${stored?.user.email ?? userId}.`,
      });
    }
  }
}

export function startSweeper(): void {
  if (started) return;
  started = true;
  const interval = setInterval(() => {
    try {
      sweepOnce();
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "sweeper: failed");
    }
  }, 30_000);
  // Don't keep the event loop alive just for this.
  if (typeof interval.unref === "function") interval.unref();
  logger.info("sweeper: started");
}
