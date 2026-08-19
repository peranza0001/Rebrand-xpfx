/**
 * Admin Wallet Management Routes - PHASE 4
 * Endpoints for admins to manage pending deposits/withdrawals
 */

import { Router, type IRouter, Request, Response } from "express";
import { requireAdminRole } from "../lib/rbac";
import { logger } from "../lib/logger";
import * as walletLedger from "../lib/wallet-ledger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

const router: IRouter = Router();

/**
 * GET /api/admin/wallets/pending-deposits - List all pending deposits
 */
router.get("/admin/wallets/pending-deposits", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = require("../lib/db-persist").getPrismaClient();
    if (!prisma?.deposit_requests) {
      return res.status(500).json({ error: "Database not available" });
    }

    const pending = await prisma.deposit_requests.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: 100,
    });

    return res.status(200).json({
      status: "ok",
      count: pending.length,
      deposits: pending,
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to fetch pending deposits");
    return res.status(500).json({ error: "Failed to fetch pending deposits" });
  }
});

/**
 * GET /api/admin/wallets/pending-withdrawals - List all pending withdrawals
 */
router.get("/admin/wallets/pending-withdrawals", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = require("../lib/db-persist").getPrismaClient();
    if (!prisma?.withdrawal_requests) {
      return res.status(500).json({ error: "Database not available" });
    }

    const pending = await prisma.withdrawal_requests.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: 100,
    });

    return res.status(200).json({
      status: "ok",
      count: pending.length,
      withdrawals: pending,
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to fetch pending withdrawals");
    return res.status(500).json({ error: "Failed to fetch pending withdrawals" });
  }
});

/**
 * POST /api/admin/wallets/approve-deposit - Approve a deposit and credit user
 */
router.post("/admin/wallets/approve-deposit", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { depositId, transactionHash } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: "Deposit ID required" });
    }

    const prisma = require("../lib/db-persist").getPrismaClient();
    if (!prisma?.deposit_requests) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Fetch the deposit request
    const deposit = await prisma.deposit_requests.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({ error: "Deposit is not pending" });
    }

    // Update deposit status
    await prisma.deposit_requests.update({
      where: { id: depositId },
      data: {
        status: "completed",
        approved_by_admin: req.user?.id || "unknown",
        approval_timestamp: new Date(),
        transaction_hash: transactionHash,
      },
    });

    // Record approval in ledger
    await walletLedger.recordLedgerEntry({
      userId: deposit.user_id,
      walletId: deposit.wallet_id || "unknown",
      entryType: "deposit_approved",
      assetSymbol: deposit.asset_symbol,
      amount: Number(deposit.amount),
      status: "completed",
      sourceType: "admin_approval",
      sourceId: req.user?.id || "unknown",
      description: `Deposit of ${deposit.amount} ${deposit.asset_symbol} approved by admin`,
      metadata: { transactionHash, depositId },
    });

    // Update user's wallet balance
    const store = require("../lib/store").getStore();
    const user = store.getUser(deposit.user_id);
    if (user && user.mainWallet) {
      await walletLedger.updateWalletSubBalance(
        deposit.user_id,
        "trading",
        Number(deposit.amount),
        deposit.asset_symbol
      );
    }

    return res.status(200).json({
      status: "ok",
      message: "Deposit approved and funds credited",
      depositId,
      amount: deposit.amount,
      assetSymbol: deposit.asset_symbol,
      userId: deposit.user_id,
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to approve deposit");
    return res.status(500).json({ error: "Failed to approve deposit" });
  }
});

/**
 * POST /api/admin/wallets/reject-deposit - Reject a deposit with reason
 */
router.post("/admin/wallets/reject-deposit", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { depositId, reason } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: "Deposit ID required" });
    }

    const prisma = require("../lib/db-persist").getPrismaClient();
    if (!prisma?.deposit_requests) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Fetch and update deposit
    const deposit = await prisma.deposit_requests.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      return res.status(404).json({ error: "Deposit not found" });
    }

    await prisma.deposit_requests.update({
      where: { id: depositId },
      data: {
        status: "rejected",
        approved_by_admin: req.user?.id || "unknown",
        rejection_reason: reason || "Rejected by admin",
      },
    });

    // Record rejection in ledger
    await walletLedger.recordLedgerEntry({
      userId: deposit.user_id,
      walletId: deposit.wallet_id || "unknown",
      entryType: "deposit_initiated",
      assetSymbol: deposit.asset_symbol,
      amount: Number(deposit.amount),
      status: "failed",
      sourceType: "admin_rejection",
      sourceId: req.user?.id || "unknown",
      description: `Deposit rejected: ${reason || "No reason provided"}`,
    });

    return res.status(200).json({
      status: "ok",
      message: "Deposit rejected",
      depositId,
      reason: reason || "No reason provided",
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to reject deposit");
    return res.status(500).json({ error: "Failed to reject deposit" });
  }
});

/**
 * POST /api/admin/wallets/approve-withdrawal - Approve a withdrawal and debit user
 */
router.post("/admin/wallets/approve-withdrawal", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { withdrawalId, transactionHash } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: "Withdrawal ID required" });
    }

    const success = await walletLedger.approveWithdrawal(
      withdrawalId,
      req.user?.id || "unknown",
      transactionHash
    );

    if (!success) {
      return res.status(500).json({ error: "Failed to approve withdrawal" });
    }

    return res.status(200).json({
      status: "ok",
      message: "Withdrawal approved successfully",
      withdrawalId,
      transactionHash: transactionHash || "pending",
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to approve withdrawal");
    return res.status(500).json({ error: "Failed to approve withdrawal" });
  }
});

/**
 * POST /api/admin/wallets/reject-withdrawal - Reject a withdrawal
 */
router.post("/admin/wallets/reject-withdrawal", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { withdrawalId, reason } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: "Withdrawal ID required" });
    }

    const success = await walletLedger.rejectWithdrawal(
      withdrawalId,
      req.user?.id || "unknown",
      reason || "Rejected by admin"
    );

    if (!success) {
      return res.status(500).json({ error: "Failed to reject withdrawal" });
    }

    return res.status(200).json({
      status: "ok",
      message: "Withdrawal rejected successfully",
      withdrawalId,
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to reject withdrawal");
    return res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

/**
 * GET /api/admin/wallets/user/:userId/balance - Get user's full wallet balance
 */
router.get("/admin/wallets/user/:userId/balance", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const balance = await walletLedger.getMainWalletBalance(userId);
    const limits = await walletLedger.getUserFinancialLimits(userId);

    return res.status(200).json({
      status: "ok",
      userId,
      balance,
      limits,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to fetch user balance");
    return res.status(500).json({ error: "Failed to fetch user balance" });
  }
});

/**
 * GET /api/admin/wallets/user/:userId/ledger - Get user's transaction ledger
 */
router.get("/admin/wallets/user/:userId/ledger", requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const entries = await walletLedger.getUserLedgerEntries(userId, limit, offset);

    return res.status(200).json({
      status: "ok",
      userId,
      entries,
      count: entries.length,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[admin-wallets] Failed to fetch user ledger");
    return res.status(500).json({ error: "Failed to fetch user ledger" });
  }
});

export default router;
