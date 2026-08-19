/**
 * Extended admin routes — user detail, wallet adjust, vault, crypto addresses
 */
import { Router, type IRouter } from "express";
import {
  AdminAdjustWalletBody,
  AdminAdjustWalletParams,
  GetAdminUserDetailParams,
  GetAdminUserVaultParams,
  UpdateAdminUserVaultBody,
  UpdateAdminUserVaultParams,
  GetAdminUserCryptoAddressesParams,
  UpdateAdminUserCryptoAddressesBody,
  UpdateAdminUserCryptoAddressesParams,
} from "@workspace/api-zod";
import {
  getUserData,
  logActivity,
  newId,
  NOW,
  toAdminConnectedWallet,
  users,
} from "../lib/store";
import { requireAdmin } from "../lib/session";
import { persistWalletBalance } from "../lib/db-persist";

const router: IRouter = Router();

// GET /admin/users/:userId/detail
router.get("/admin/users/:userId/detail", requireAdmin, (req, res) => {
  const p = GetAdminUserDetailParams.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "Invalid params" });

  const stored = users.get(p.data.userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const data = getUserData(p.data.userId);

  return res.json({
    userId: p.data.userId,
    user: stored.user,
    role: stored.role,
    merchant: stored.merchant,
    tradingLocked: stored.tradingLocked,
    socialLocked: data.socialLocked,
    demoMode: stored.demoMode,
    kycStatus: data.kyc.status,
    wallets: data.wallets,
    bankAccounts: data.bankAccounts,
    connectedWallets: data.connectedWallets.map(toAdminConnectedWallet),
    withdrawals: data.withdrawals,
    deposits: data.deposits,
    trades: data.trades,
    cryptoAddresses: data.cryptoAddresses,
  });
});

// POST /admin/users/:userId/wallet-adjust
router.post("/admin/users/:userId/wallet-adjust", requireAdmin, (req, res) => {
  const p = AdminAdjustWalletParams.safeParse(req.params);
  const b = AdminAdjustWalletBody.safeParse(req.body);
  if (!p.success || !b.success) return res.status(400).json({ error: "Invalid request" });

  const data = getUserData(p.data.userId);
  const wallet = data.wallets.find((w) => w.id === b.data.walletId);
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });

  wallet.balance = Math.max(0, wallet.balance + b.data.delta);
  // PHASE 1 FIX: Persist balance change to survive server restarts
  void persistWalletBalance(wallet.id, wallet.balance, 0);

  // Log transaction
  data.transactions.unshift({
    id: newId("tx"),
    walletId: wallet.id,
    type: b.data.delta >= 0 ? "deposit" : "withdrawal",
    amount: b.data.delta,
    currency: wallet.currency,
    status: "completed",
    description: b.data.note ?? (b.data.delta >= 0 ? "Admin credit adjustment" : "Admin debit adjustment"),
    createdAt: NOW(),
  });

  logActivity({
    actorId: null,
    actorName: "Admin",
    action: "admin.wallet_adjust",
    detail: `Adjusted wallet ${wallet.id} for user ${p.data.userId} by ${b.data.delta >= 0 ? "+" : ""}${b.data.delta} ${wallet.currency}. ${b.data.note ?? ""}`,
  });

  return res.json(wallet);
});

// GET /admin/users/:userId/vault
router.get("/admin/users/:userId/vault", requireAdmin, (req, res) => {
  const p = GetAdminUserVaultParams.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "Invalid params" });

  const stored = users.get(p.data.userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const data = getUserData(p.data.userId);
  return res.json({ notes: data.vault.notes });
});

// PATCH /admin/users/:userId/vault
router.patch("/admin/users/:userId/vault", requireAdmin, (req, res) => {
  const p = UpdateAdminUserVaultParams.safeParse(req.params);
  const b = UpdateAdminUserVaultBody.safeParse(req.body);
  if (!p.success || !b.success) return res.status(400).json({ error: "Invalid request" });

  const data = getUserData(p.data.userId);
  data.vault = {
    notes: b.data.notes ?? null,
  };

  return res.json(data.vault);
});

// GET /admin/users/:userId/crypto-addresses
router.get("/admin/users/:userId/crypto-addresses", requireAdmin, (req, res) => {
  const p = GetAdminUserCryptoAddressesParams.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "Invalid params" });

  const data = getUserData(p.data.userId);
  return res.json(data.cryptoAddresses);
});

// PATCH /admin/users/:userId/crypto-addresses
router.patch("/admin/users/:userId/crypto-addresses", requireAdmin, (req, res) => {
  const p = UpdateAdminUserCryptoAddressesParams.safeParse(req.params);
  const b = UpdateAdminUserCryptoAddressesBody.safeParse(req.body);
  if (!p.success || !b.success) return res.status(400).json({ error: "Invalid request" });

  const data = getUserData(p.data.userId);
  data.cryptoAddresses = { ...data.cryptoAddresses, ...b.data };
  return res.json(data.cryptoAddresses);
});

export default router;
