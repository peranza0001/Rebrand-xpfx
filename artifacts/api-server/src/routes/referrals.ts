/**
 * /referrals routes — referral code, link, history.
 */
import { Router, type IRouter } from "express";
import type { ReferralEntry } from "@workspace/api-zod";
import { referrals } from "../lib/store";
import { requireAuth } from "../lib/session";
import { env } from "../lib/env";

const router: IRouter = Router();

router.get("/referrals", requireAuth, (req, res) => {
  const stored = req.storedUser!;
  const list = referrals.get(stored.user.id) ?? [];
  const recent: ReferralEntry[] = list.slice(0, 25).map((r) => ({
    id: r.referredId,
    referredName: r.referredName,
    joinedAt: r.joinedAt,
    status: r.status,
    earned: r.earned,
  }));
  const earnings = Math.round(list.reduce((s, r) => s + r.earned, 0) * 100) / 100;
  const activeReferrals = list.filter((r) => r.status === "active").length;
  const appUrl = (env.PUBLIC_APP_URL ?? env.FRONTEND_URL ?? "https://xpressprofx.com").replace(/\/+$/, "");
  res.json({
    code: stored.referralCode,
    link: `${appUrl}/signup?ref=${stored.referralCode}`,
    signups: list.length,
    activeReferrals,
    earnings,
    currency: "USD",
    programDays: 30,
    recent,
  });
});

export default router;
