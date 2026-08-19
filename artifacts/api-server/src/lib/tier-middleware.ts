/**
 * Express middleware for account tier-based access control.
 */
import type { NextFunction, Request, Response } from 'express';
import { AccountTier, TIER_SPECS, determineAccountTier, canPerformAction } from './account-tiers';
import { getUserData } from './store';

/**
 * Middleware to require a minimum account tier.
 */
export function requireTier(minTier: AccountTier) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.storedUser) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data = req.userId ? getUserData(req.userId) : null;
    const bankAccountsCount = data?.bankAccounts?.length ?? 0;
    const userTier = determineAccountTier({
      kycVerified: req.storedUser.user.kycVerified,
      buyVerified: req.storedUser.user.buyVerified,
      bankAccountsCount,
      role: req.storedUser.role,
    });

    const tierHierarchy: Record<AccountTier, number> = {
      [AccountTier.TIER_0]: 0,
      [AccountTier.TIER_1]: 1,
      [AccountTier.TIER_2]: 2,
      [AccountTier.TIER_3]: 3,
      [AccountTier.TIER_4]: 4,
      [AccountTier.TIER_5]: 5,
      [AccountTier.TIER_6]: 6,
      [AccountTier.TIER_7]: 7,
      [AccountTier.TIER_8]: 8,
    };

    if (tierHierarchy[userTier] < tierHierarchy[minTier]) {
      const spec = TIER_SPECS[minTier];
      res.status(403).json({
        error: `This feature requires ${spec.name} account`,
        currentTier: userTier,
        requiredTier: minTier,
        requirements: spec,
      });
      return;
    }

    res.locals.userTier = userTier;
    next();
  };
}

/**
 * Middleware to require live trading capability (not demo).
 */
export function requireLiveTrading(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const data = req.userId ? getUserData(req.userId) : null;
  const bankAccountsCount = data?.bankAccounts?.length ?? 0;
  const userTier = determineAccountTier({
    kycVerified: req.storedUser.user.kycVerified,
    buyVerified: req.storedUser.user.buyVerified,
    bankAccountsCount,
    role: req.storedUser.role,
  });

  if (!canPerformAction(userTier, 'liveTrading')) {
    res.status(403).json({
      error: 'Your account tier does not support live trading',
      currentTier: userTier,
      hint: 'Verify your email to enable live trading',
    });
    return;
  }

  res.locals.userTier = userTier;
  next();
}

/**
 * Middleware to require KYC verification.
 */
export function requireKyc(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!req.storedUser.user.kycVerified) {
    res.status(403).json({
      error: 'KYC verification required for this action',
      hint: 'Complete KYC to unlock advanced features',
    });
    return;
  }

  next();
}

/**
 * Middleware to check P2P trading capability.
 */
export function requireP2pAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const data = req.userId ? getUserData(req.userId) : null;
  const bankAccountsCount = data?.bankAccounts?.length ?? 0;
  const userTier = determineAccountTier({
    kycVerified: req.storedUser.user.kycVerified,
    buyVerified: req.storedUser.user.buyVerified,
    bankAccountsCount,
    role: req.storedUser.role,
  });

  if (!canPerformAction(userTier, 'p2pEnabled')) {
    res.status(403).json({
      error: 'P2P trading requires KYC verification',
      currentTier: userTier,
      hint: 'Complete KYC to unlock P2P trading',
    });
    return;
  }

  res.locals.userTier = userTier;
  next();
}

/**
 * Middleware to check SmartVest investment capability.
 */
export function requireSmartvestAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const data = req.userId ? getUserData(req.userId) : null;
  const bankAccountsCount = data?.bankAccounts?.length ?? 0;
  const userTier = determineAccountTier({
    kycVerified: req.storedUser.user.kycVerified,
    buyVerified: req.storedUser.user.buyVerified,
    bankAccountsCount,
    role: req.storedUser.role,
  });

  if (!canPerformAction(userTier, 'smartvestEnabled')) {
    res.status(403).json({
      error: 'SmartVest requires KYC verification',
      currentTier: userTier,
      hint: 'Complete KYC to unlock SmartVest investment features',
    });
    return;
  }

  res.locals.userTier = userTier;
  next();
}
