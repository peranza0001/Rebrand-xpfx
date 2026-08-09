/**
 * /account/tier routes — Account verification tier status and requirements
 */
import express, { Request, Response } from 'express';
import { requireAuth } from '../lib/session';
import {
  AccountTier,
  TIER_SPECS,
  determineAccountTier,
  getMandatoryChecklist,
} from '../lib/account-tiers';
import { userData } from '../lib/store';

const router = express.Router();

/**
 * GET /account/tier — Get current user's account tier and progression
 */
router.get('/tier', requireAuth, (req: Request, res: Response) => {
  if (!req.storedUser || !req.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.storedUser.user;
  const data = userData.get(req.userId);

  // Count bank accounts
  const bankAccountsCount = data?.bankAccounts?.length ?? 0;

  const currentTier = determineAccountTier({
    buyVerified: user.buyVerified,
    kycVerified: user.kycVerified,
    bankAccountsCount,
    role: req.storedUser.role,
  });

  const currentSpec = TIER_SPECS[currentTier];

  // Determine next tier
  const tierProgression = [
    AccountTier.TIER_0,
    AccountTier.TIER_1,
    AccountTier.TIER_2,
    AccountTier.TIER_3,
  ];
  const nextTierIndex = tierProgression.indexOf(currentTier) + 1;
  const nextTier = nextTierIndex < tierProgression.length ? tierProgression[nextTierIndex] : null;
  const nextSpec = nextTier ? TIER_SPECS[nextTier] : null;
  const nextChecklist = nextTier ? getMandatoryChecklist(currentTier, nextTier) : [];

  return res.status(200).json({
    currentTier,
    currentSpec,
    nextTier,
    nextSpec,
    mandatoryChecklist: nextChecklist,
    progress: {
      emailVerified: user.buyVerified,
      kycVerified: user.kycVerified,
      bankAccountOnFile: bankAccountsCount > 0,
      phoneVerified: Boolean(user.phone),
    },
  });
});

/**
 * GET /account/tier/requirements — Get full tier system information
 */
router.get('/tier/requirements', requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({
    tiers: Object.entries(TIER_SPECS).map(([tier, spec]) => ({
      tier,
      ...spec,
    })),
    tierOrder: [
      AccountTier.TIER_0,
      AccountTier.TIER_1,
      AccountTier.TIER_2,
      AccountTier.TIER_3,
    ],
  });
});

/**
 * GET /account/tier/limits — Get current trading/withdrawal limits
 */
router.get('/tier/limits', requireAuth, (req: Request, res: Response) => {
  if (!req.storedUser || !req.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.storedUser.user;
  const data = userData.get(req.userId);

  const currentTier = determineAccountTier({
    buyVerified: user.buyVerified,
    kycVerified: user.kycVerified,
    bankAccountsCount: data?.bankAccounts?.length ?? 0,
    role: req.storedUser.role,
  });

  const spec = TIER_SPECS[currentTier];

  // TODO: Calculate daily totals from transactions
  const dailyTradedToday = 0;
  const dailyWithdrawnToday = 0;

  return res.status(200).json({
    currentTier,
    dailyLimits: {
      tradingLimit: spec.dailyTradingLimit,
      tradingUsed: dailyTradedToday,
      tradingRemaining: Math.max(0, spec.dailyTradingLimit - dailyTradedToday),
      withdrawalLimit: spec.dailyWithdrawalLimit,
      withdrawalUsed: dailyWithdrawnToday,
      withdrawalRemaining: Math.max(0, spec.dailyWithdrawalLimit - dailyWithdrawnToday),
    },
    capabilities: {
      liveTrading: spec.liveTrading,
      p2pEnabled: spec.p2pEnabled,
      fiatDeposits: spec.fiatDepositsEnabled,
      fiatWithdrawals: spec.fiatWithdrawalsEnabled,
      leverage: spec.leverageEnabled,
      smartvest: spec.smartvestEnabled,
      referrals: spec.referralEnabled,
    },
  });
});

export default router;
