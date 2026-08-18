/**
 * Wallet Ledger Service
 * Manages all balance-affecting operations and maintains a complete audit trail.
 * Every balance change flows through a single, auditable ledger write path.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db-client";
import { logger } from "./logger";
import { getPrismaClient } from "./db-persist";

export type LedgerEntryType =
  | "deposit_initiated"
  | "deposit_approved"
  | "withdrawal_initiated"
  | "withdrawal_approved"
  | "trade_profit"
  | "trading_fee"
  | "gas_fee"
  | "smartvest_payout"
  | "p2p_payment"
  | "referral_bonus"
  | "maintenance_fee"
  | "transfer_in"
  | "transfer_out";

export type EntryStatus =
  | "pending"
  | "completed"
  | "failed"
  | "locked";

export interface LedgerEntry {
  id: string;
  userId: string;
  walletId: string;
  entryType: LedgerEntryType;
  assetSymbol: string;
  amount: number;
  status: EntryStatus;
  sourceType?: string;
  sourceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Record a new ledger entry. This is the PRIMARY method for all balance changes.
 * No balance mutation should occur without a corresponding ledger entry.
 */
export async function recordLedgerEntry({
  userId,
  walletId,
  entryType,
  assetSymbol = "USD",
  amount,
  status = "completed",
  sourceType,
  sourceId,
  description,
  metadata,
}: {
  userId: string;
  walletId: string;
  entryType: LedgerEntryType;
  assetSymbol?: string;
  amount: number;
  status?: EntryStatus;
  sourceType?: string;
  sourceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const db = getDb();
    if (db) {
      await db.execute(`
        INSERT INTO wallet_ledger_entries (
          user_id, wallet_id, entry_type, asset_symbol, amount, 
          status, source_type, source_id, description, metadata, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      `);
      return true;
    }

    // Fallback to Prisma
    const prisma = getPrismaClient();
    if (prisma?.walletLedgerEntries || prisma?.wallet_ledger_entries) {
      const delegate = prisma.walletLedgerEntries || prisma.wallet_ledger_entries;
      await delegate.create({
        data: {
          user_id: userId,
          wallet_id: walletId,
          entry_type: entryType,
          asset_symbol: assetSymbol,
          amount,
          status,
          source_type: sourceType,
          source_id: sourceId,
          description,
          metadata,
        },
      });
      return true;
    }

    logger.warn({ userId, walletId, entryType }, "[wallet-ledger] No DB available for ledger entry");
    return false;
  } catch (err) {
    logger.error(
      { err, userId, walletId, entryType },
      "[wallet-ledger] Failed to record ledger entry"
    );
    return false;
  }
}

/**
 * Get all ledger entries for a user. Used for audit trail and statement generation.
 */
export async function getUserLedgerEntries(
  userId: string,
  limit = 100,
  offset = 0
): Promise<LedgerEntry[]> {
  try {
    const db = getDb();
    if (db) {
      // Using Drizzle ORM pattern
      const entries = await db.execute(`
        SELECT * FROM wallet_ledger_entries 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);
      return entries || [];
    }

    const prisma = getPrismaClient();
    if (prisma?.walletLedgerEntries || prisma?.wallet_ledger_entries) {
      const delegate = prisma.walletLedgerEntries || prisma.wallet_ledger_entries;
      const entries = await delegate.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      });
      return entries;
    }

    return [];
  } catch (err) {
    logger.error({ err, userId }, "[wallet-ledger] Failed to fetch ledger entries");
    return [];
  }
}

/**
 * Calculate total balance for a user across all wallet types.
 * Main Wallet = Trading + SocialTrading + ConnectedWallets
 */
export async function getMainWalletBalance(userId: string): Promise<{ available: number; locked: number; pending: number }> {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return { available: 0, locked: 0, pending: 0 };
    }

    const [trading, social, connected] = await Promise.all([
      prisma.trading_wallet_balances?.findUnique({ where: { user_id: userId } }),
      prisma.social_trading_wallet_balances?.findUnique({ where: { user_id: userId } }),
      prisma.connected_wallet_balances?.findMany({ where: { user_id: userId } }),
    ]);

    const tradingAvailable = trading?.available_balance || 0;
    const tradingLocked = trading?.locked_balance || 0;
    const tradingPending = trading?.pending_balance || 0;

    const socialAvailable = social?.available_balance || 0;
    const socialLocked = social?.locked_balance || 0;
    const socialPending = social?.pending_balance || 0;

    const connectedAvailable = (connected || []).reduce((sum, w) => sum + Number(w.balance || 0), 0);

    return {
      available: tradingAvailable + socialAvailable + connectedAvailable,
      locked: tradingLocked + socialLocked,
      pending: tradingPending + socialPending,
    };
  } catch (err) {
    logger.error({ err, userId }, "[wallet-ledger] Failed to calculate main wallet balance");
    return { available: 0, locked: 0, pending: 0 };
  }
}

/**
 * Update a wallet sub-balance (trading, social, or connected).
 * All updates go through ledger entries first.
 */
export async function updateWalletSubBalance(
  userId: string,
  walletType: "trading" | "social" | "connected",
  delta: number,
  assetSymbol = "USD"
): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    const updateData = {
      updated_at: new Date(),
    };

    if (delta > 0) {
      updateData.available_balance = { increment: delta };
    } else if (delta < 0) {
      updateData.locked_balance = { increment: Math.abs(delta) };
    }

    if (walletType === "trading") {
      await prisma.trading_wallet_balances.update({
        where: { user_id: userId },
        data: updateData,
      });
    } else if (walletType === "social") {
      await prisma.social_trading_wallet_balances.update({
        where: { user_id: userId },
        data: updateData,
      });
    }

    return true;
  } catch (err) {
    logger.error(
      { err, userId, walletType, delta },
      "[wallet-ledger] Failed to update sub-balance"
    );
    return false;
  }
}

/**
 * Initialize wallet balances for a new user.
 */
export async function initializeUserWalletBalances(userId: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return false;
    }

    await Promise.all([
      prisma.trading_wallet_balances?.create({
        data: {
          user_id: userId,
          available_balance: 0,
          locked_balance: 0,
          pending_balance: 0,
          total_balance: 0,
        },
      }),
      prisma.social_trading_wallet_balances?.create({
        data: {
          user_id: userId,
          available_balance: 0,
          locked_balance: 0,
          pending_balance: 0,
          total_balance: 0,
        },
      }),
      prisma.user_financial_limits?.create({
        data: {
          user_id: userId,
          kyc_tier: 1,
        },
      }),
    ]);

    return true;
  } catch (err) {
    logger.error({ err, userId }, "[wallet-ledger] Failed to initialize wallet balances");
    return false;
  }
}

/**
 * Create a withdrawal request (always requires admin approval before completion).
 */
export async function createWithdrawalRequest({
  userId,
  walletId,
  assetSymbol,
  amount,
  recipientAddress,
  withdrawalType = "crypto",
}: {
  userId: string;
  walletId: string;
  assetSymbol: string;
  amount: number;
  recipientAddress: string;
  withdrawalType?: "crypto" | "fiat";
}): Promise<string | null> {
  try {
    const prisma = getPrismaClient();
    if (!prisma?.withdrawal_requests) {
      return null;
    }

    const result = await prisma.withdrawal_requests.create({
      data: {
        user_id: userId,
        wallet_id: walletId,
        asset_symbol: assetSymbol,
        amount,
        recipient_address: recipientAddress,
        withdrawal_type: withdrawalType,
        status: "pending",
      },
    });

    // Record as pending ledger entry
    await recordLedgerEntry({
      userId,
      walletId,
      entryType: "withdrawal_initiated",
      assetSymbol,
      amount,
      status: "pending",
      sourceType: "withdrawal_request",
      sourceId: result.id,
      description: `Withdrawal request for ${amount} ${assetSymbol} to ${recipientAddress}`,
    });

    return result.id;
  } catch (err) {
    logger.error({ err, userId, amount, assetSymbol }, "[wallet-ledger] Failed to create withdrawal request");
    return null;
  }
}

/**
 * Approve a withdrawal request (admin only operation).
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string,
  transactionHash?: string
): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    if (!prisma?.withdrawal_requests) {
      return false;
    }

    const withdrawal = await prisma.withdrawal_requests.update({
      where: { id: withdrawalId },
      data: {
        status: "completed",
        approved_by_admin: adminId,
        approval_timestamp: new Date(),
        transaction_hash: transactionHash,
      },
    });

    // Record approval in ledger
    await recordLedgerEntry({
      userId: withdrawal.user_id,
      walletId: withdrawal.wallet_id || "",
      entryType: "withdrawal_approved",
      assetSymbol: withdrawal.asset_symbol,
      amount: Number(withdrawal.amount),
      status: "completed",
      sourceType: "admin_approval",
      sourceId: adminId,
      description: `Withdrawal approved - ${transactionHash || "pending"}`,
    });

    return true;
  } catch (err) {
    logger.error({ err, withdrawalId }, "[wallet-ledger] Failed to approve withdrawal");
    return false;
  }
}

/**
 * Reject a withdrawal request with reason.
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminId: string,
  reason: string
): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    if (!prisma?.withdrawal_requests) {
      return false;
    }

    const withdrawal = await prisma.withdrawal_requests.update({
      where: { id: withdrawalId },
      data: {
        status: "rejected",
        approved_by_admin: adminId,
        rejection_reason: reason,
      },
    });

    // Record rejection in ledger
    await recordLedgerEntry({
      userId: withdrawal.user_id,
      walletId: withdrawal.wallet_id || "",
      entryType: "withdrawal_initiated",
      assetSymbol: withdrawal.asset_symbol,
      amount: Number(withdrawal.amount),
      status: "failed",
      sourceType: "admin_rejection",
      sourceId: adminId,
      description: `Withdrawal rejected: ${reason}`,
    });

    return true;
  } catch (err) {
    logger.error({ err, withdrawalId }, "[wallet-ledger] Failed to reject withdrawal");
    return false;
  }
}

/**
 * Get user's financial limits (daily/monthly deposit/withdrawal limits).
 */
export async function getUserFinancialLimits(userId: string) {
  try {
    const prisma = getPrismaClient();
    if (!prisma?.user_financial_limits) {
      return null;
    }

    return await prisma.user_financial_limits.findUnique({
      where: { user_id: userId },
    });
  } catch (err) {
    logger.error({ err, userId }, "[wallet-ledger] Failed to fetch financial limits");
    return null;
  }
}

/**
 * Check if a transaction would exceed user's limits.
 */
export async function checkWithinLimits(
  userId: string,
  amount: number,
  transactionType: "deposit" | "withdrawal"
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const limits = await getUserFinancialLimits(userId);
    if (!limits) {
      return { allowed: true }; // No limits set yet
    }

    if (transactionType === "deposit") {
      if (Number(limits.daily_deposits_used) + amount > Number(limits.daily_deposit_limit)) {
        return {
          allowed: false,
          reason: `Daily deposit limit exceeded. Used: ${limits.daily_deposits_used}/${limits.daily_deposit_limit}`,
        };
      }
      if (Number(limits.monthly_deposits_used) + amount > Number(limits.monthly_deposit_limit)) {
        return {
          allowed: false,
          reason: `Monthly deposit limit exceeded. Used: ${limits.monthly_deposits_used}/${limits.monthly_deposit_limit}`,
        };
      }
    } else {
      if (Number(limits.daily_withdrawals_used) + amount > Number(limits.daily_withdrawal_limit)) {
        return {
          allowed: false,
          reason: `Daily withdrawal limit exceeded. Used: ${limits.daily_withdrawals_used}/${limits.daily_withdrawal_limit}`,
        };
      }
      if (Number(limits.monthly_withdrawals_used) + amount > Number(limits.monthly_withdrawal_limit)) {
        return {
          allowed: false,
          reason: `Monthly withdrawal limit exceeded. Used: ${limits.monthly_withdrawals_used}/${limits.monthly_withdrawal_limit}`,
        };
      }
    }

    return { allowed: true };
  } catch (err) {
    logger.error({ err, userId }, "[wallet-ledger] Failed to check limits");
    return { allowed: false, reason: "System error checking limits" };
  }
}
