/**
 * Account Verification Tiers - Progressive KYC and trading limits model
 * 
 * TIER 0: New User (default)
 *   - No KYC required
 *   - Demo trading only (no real deposits)
 *   - Limited API access
 *   - Education required before upgrade
 * 
 * TIER 1: Verified Email
 *   - Email verification required
 *   - Basic KYC (selfie + ID photo)
 *   - Up to $500 trading limit per day
 *   - Can deposit via MoonPay
 *   - Email notifications
 * 
 * TIER 2: Full KYC
 *   - Complete KYC (address verification)
 *   - Banking information on file
 *   - Up to $10,000 trading limit per day
 *   - P2P trading enabled
 *   - Can withdraw to bank account
 * 
 * TIER 3: Premium/VIP
 *   - All TIER 2 features
 *   - Unlimited trading
 *   - Dedicated support
 *   - Advanced features (SmartVest, leverage)
 *   - Priority processing
 */

export enum AccountTier {
  TIER_0 = 'tier_0',
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  TIER_3 = 'tier_3',
}

export interface TierRequirements {
  /** Human readable tier name */
  name: string;
  /** KYC documents required */
  kycRequired: boolean;
  /** Email verification required */
  emailRequired: boolean;
  /** Bank account on file required */
  bankAccountRequired: boolean;
  /** Daily trading limit in USD */
  dailyTradingLimit: number;
  /** Daily withdrawal limit in USD */
  dailyWithdrawalLimit: number;
  /** Can perform live trading */
  liveTrading: boolean;
  /** Can use P2P features */
  p2pEnabled: boolean;
  /** Can deposit fiat */
  fiatDepositsEnabled: boolean;
  /** Can withdraw fiat */
  fiatWithdrawalsEnabled: boolean;
  /** Can use leverage/margin */
  leverageEnabled: boolean;
  /** Can use SmartVest investment */
  smartvestEnabled: boolean;
  /** Can invite referrals */
  referralEnabled: boolean;
}

export const TIER_SPECS: Record<AccountTier, TierRequirements> = {
  [AccountTier.TIER_0]: {
    name: 'Demo User',
    kycRequired: false,
    emailRequired: false,
    bankAccountRequired: false,
    dailyTradingLimit: 0, // Demo only
    dailyWithdrawalLimit: 0,
    liveTrading: false,
    p2pEnabled: false,
    fiatDepositsEnabled: false,
    fiatWithdrawalsEnabled: false,
    leverageEnabled: false,
    smartvestEnabled: false,
    referralEnabled: false,
  },
  [AccountTier.TIER_1]: {
    name: 'Verified',
    kycRequired: false,
    emailRequired: true,
    bankAccountRequired: false,
    dailyTradingLimit: 500,
    dailyWithdrawalLimit: 200,
    liveTrading: true,
    p2pEnabled: false,
    fiatDepositsEnabled: true,
    fiatWithdrawalsEnabled: false,
    leverageEnabled: false,
    smartvestEnabled: false,
    referralEnabled: true,
  },
  [AccountTier.TIER_2]: {
    name: 'Verified (KYC)',
    kycRequired: true,
    emailRequired: true,
    bankAccountRequired: true,
    dailyTradingLimit: 10000,
    dailyWithdrawalLimit: 5000,
    liveTrading: true,
    p2pEnabled: true,
    fiatDepositsEnabled: true,
    fiatWithdrawalsEnabled: true,
    leverageEnabled: false,
    smartvestEnabled: true,
    referralEnabled: true,
  },
  [AccountTier.TIER_3]: {
    name: 'Premium',
    kycRequired: true,
    emailRequired: true,
    bankAccountRequired: true,
    dailyTradingLimit: Infinity,
    dailyWithdrawalLimit: Infinity,
    liveTrading: true,
    p2pEnabled: true,
    fiatDepositsEnabled: true,
    fiatWithdrawalsEnabled: true,
    leverageEnabled: true,
    smartvestEnabled: true,
    referralEnabled: true,
  },
};

/**
 * Determine account tier based on user verification status.
 * Uses available fields from in-memory User and StoredUser objects.
 */
export function determineAccountTier(user: {
  kycVerified: boolean;
  buyVerified?: boolean;  // Email verification proxy (buyVerified indicates email verified)
  bankAccountsCount?: number;
  role: string;
}): AccountTier {
  // Demo/special roles stay at TIER_0
  if (user.role === 'demo') {
    return AccountTier.TIER_0;
  }

  // TIER_3: VIP by role or admin assignment
  if (user.role === 'vip') {
    return AccountTier.TIER_3;
  }

  // TIER_2: Full KYC + bank account on file
  if (user.kycVerified && (user.bankAccountsCount ?? 0) > 0) {
    return AccountTier.TIER_2;
  }

  // TIER_1: Email verified (proxy via buyVerified flag)
  if (user.buyVerified) {
    return AccountTier.TIER_1;
  }

  // TIER_0: Default for all new users
  return AccountTier.TIER_0;
}

/**
 * Get mandatory checklist items before user can trade at a given tier.
 */
export function getMandatoryChecklist(currentTier: AccountTier, targetTier: AccountTier): string[] {
  const spec = TIER_SPECS[targetTier];
  const checklist: string[] = [];

  if (spec.emailRequired) {
    checklist.push('verify_email');
  }
  if (spec.kycRequired) {
    checklist.push('complete_kyc');
  }
  if (spec.bankAccountRequired) {
    checklist.push('add_bank_account');
  }

  return checklist;
}

/**
 * Check if user can perform an action based on tier.
 */
export function canPerformAction(
  userTier: AccountTier,
  action: keyof Omit<TierRequirements, 'name'>
): boolean {
  const spec = TIER_SPECS[userTier];
  const value = spec[action];
  
  // For numeric limits, check if > 0
  if (typeof value === 'number') {
    return value > 0;
  }
  
  return value === true;
}

/**
 * Check if daily trading limit is exceeded.
 */
export function checkDailyTradingLimit(
  userTier: AccountTier,
  tradedToday: number
): { allowed: boolean; remaining: number; limit: number } {
  const spec = TIER_SPECS[userTier];
  const limit = spec.dailyTradingLimit;
  const remaining = Math.max(0, limit - tradedToday);
  
  return {
    allowed: tradedToday < limit,
    remaining,
    limit,
  };
}

/**
 * Check if daily withdrawal limit is exceeded.
 */
export function checkDailyWithdrawalLimit(
  userTier: AccountTier,
  withdrawnToday: number
): { allowed: boolean; remaining: number; limit: number } {
  const spec = TIER_SPECS[userTier];
  const limit = spec.dailyWithdrawalLimit;
  const remaining = Math.max(0, limit - withdrawnToday);
  
  return {
    allowed: withdrawnToday < limit,
    remaining,
    limit,
  };
}
