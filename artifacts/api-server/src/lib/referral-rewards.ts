/**
 * Referral reward engine.
 *
 * When a referred user completes their first qualifying trade the referrer
 * receives a fixed USD credit to their main wallet.  The reward fires once
 * per referred user (idempotent).  Amount is configurable via the
 * REFERRAL_REWARD_USD env var; defaults to $500.
 */
import { getUserData, logActivity, newId, referrals, users } from "./store";
import { notifyUser } from "./notify";
import { logger } from "./logger";

const REFERRAL_REWARD_USD = (() => {
  const raw = process.env.REFERRAL_REWARD_USD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
})();

const NOW = () => new Date().toISOString();

const rewardedReferrals = new Set<string>();

/**
 * Call when a user completes their first qualifying trade.
 *
 * If this user was referred by someone, and the referrer has not already
 * been rewarded for this referral, credits the referrer's main wallet and
 * sends an in-app + email notification.
 *
 * @param referredUserId  ID of the user who just completed their first trade
 */
export function triggerReferralReward(referredUserId: string): void {
  if (rewardedReferrals.has(referredUserId)) return;

  const referredStored = users.get(referredUserId);
  if (!referredStored) return;

  const referrerId = referredStored.referredBy;
  if (!referrerId) return;

  rewardedReferrals.add(referredUserId);

  const referrerStored = users.get(referrerId);
  if (!referrerStored) {
    logger.warn({ referrerId }, "[referral] Referrer not found — skipping reward.");
    return;
  }

  const referrerData = getUserData(referrerId);
  const mainWallet = referrerData.wallets.find((w) => w.type === "main");
  if (!mainWallet) {
    logger.warn({ referrerId }, "[referral] Referrer has no main wallet — skipping reward.");
    return;
  }

  mainWallet.balance = Math.round((mainWallet.balance + REFERRAL_REWARD_USD) * 100) / 100;

  referrerData.transactions.unshift({
    id: newId("tx"),
    walletId: mainWallet.id,
    type: "deposit",
    amount: REFERRAL_REWARD_USD,
    currency: "USD",
    status: "completed",
    description: `Referral reward: ${referredStored.user.fullName} completed their first trade.`,
    createdAt: NOW(),
  });

  const referrerReferrals = referrals.get(referrerId) ?? [];
  const record = referrerReferrals.find((r) => r.referredId === referredUserId);
  if (record) {
    record.status = "active";
    record.earned = REFERRAL_REWARD_USD;
  }

  notifyUser({
    userId: referrerId,
    kind: "referral_reward",
    emailToggle: "deposit" as never,
    title: "Referral reward paid!",
    body: `You earned $${REFERRAL_REWARD_USD.toLocaleString()} because ${referredStored.user.fullName} completed their first trade.`,
    link: "/referrals",
  });

  logActivity({
    actorId: referrerId,
    actorName: referrerStored.user.fullName,
    action: "referral.reward_paid",
    detail: `$${REFERRAL_REWARD_USD} referral reward credited for referring ${referredStored.user.email}.`,
  });

  logger.info(
    { referrerId, referredUserId, reward: REFERRAL_REWARD_USD },
    "[referral] Reward paid to referrer.",
  );
}

/**
 * Returns true if the given user has NO completed trades yet (used to
 * determine whether a newly-completed trade is their first qualifying one).
 */
export function isFirstTrade(userId: string, existingCompletedCount: number): boolean {
  return existingCompletedCount === 0;
}
