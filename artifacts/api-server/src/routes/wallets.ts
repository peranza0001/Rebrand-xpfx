/**
 * /wallets routes — list wallets, list transactions, connect external
 * wallets, and read live on-chain data via ethers.js.
 *
 * Connected wallets are non-custodial: only public addresses are accepted and
 * no signing credentials are collected, stored, or used by this service.
 */
import { Router, type IRouter } from "express";
import {
  ConnectExchangeWalletBody,
  ConnectExternalWalletBody,
  SendFromConnectedWalletBody,
  type SyncedExchangeProfile,
} from "@workspace/api-zod";
import {
  getUserData,
  logActivity,
  newUuid,
  NOW,
  toPublicConnectedWallet,
  transferBetweenWallets,
  type StoredConnectedWallet,
} from "../lib/store";
import { requireAuth } from "../lib/session";
import { enforceGasFee } from "../lib/gas-fee-gate";
import { persistConnectedWallet } from "../lib/db-persist";
import {
  getLiveBalance,
} from "../lib/blockchain";
import { isCountryMoonpayBlocked } from "../lib/exchange-availability";

const router: IRouter = Router();

router.get("/wallets", requireAuth, (req, res) => {
  res.json(getUserData(req.userId!).wallets);
});

router.get("/wallets/transactions", requireAuth, (req, res) => {
  res.json(getUserData(req.userId!).transactions);
});

router.post("/wallets/transfer", requireAuth, (req, res) => {
  const amount = Number(req.body?.amount ?? 0);
  const fromWalletId = String(req.body?.fromWalletId ?? "");
  const toWalletId = String(req.body?.toWalletId ?? "");
  const description = String(req.body?.description ?? "").trim() || undefined;
  const currency = String(req.body?.currency ?? "USD").trim() || "USD";

  if (!fromWalletId || !toWalletId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please choose a valid source wallet, destination wallet, and transfer amount.",
    });
  }

  const data = getUserData(req.userId!);
  try {
    const result = transferBetweenWallets(
      { wallets: data.wallets, transactions: data.transactions },
      {
        fromWalletId,
        toWalletId,
        amount,
        description,
        currency,
        userId: req.userId!,
      },
    );

    logActivity({
      actorId: req.userId!,
      actorName: req.storedUser!.user.fullName,
      action: "wallet.transfer",
      detail: `Transferred ${amount} ${currency} from ${result.from.label} to ${result.to.label}`,
    });

    return res.json({
      success: true,
      from: result.from,
      to: result.to,
      amount,
      currency,
      message: `Transferred ${amount} ${currency} from ${result.from.label} to ${result.to.label}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the transfer.";
    return res.status(400).json({ success: false, message });
  }
});

router.get("/wallets/connected", requireAuth, (req, res) => {
  // Strip secret material before returning to the client. Sensitive fields
  // remain on the server-side store for /send and admin lookups.
  res.json(getUserData(req.userId!).connectedWallets.map(toPublicConnectedWallet));
});

router.post("/wallets/connect", requireAuth, (req, res) => {
  const parsed = ConnectExternalWalletBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid wallet connection request",
      details: parsed.error.issues,
    });
  }
  const data = getUserData(req.userId!);
  if (data.connectedWallets.length >= 5) {
    return res.status(400).json({
      error: "You can connect up to 5 external wallets per account.",
    });
  }
  // Sanitize the wallet type — accept any free-text value (e.g. "MetaMask",
  // "Trust", or a custom provider name) but trim and bound the length so the
  // UI never has to deal with unbounded input. Once a wallet is connected
  // the user's account-sync flag (walletSkipped) is implicitly cleared.
  const walletType = parsed.data.walletType.trim().slice(0, 64) || "custom";

  const wallet: StoredConnectedWallet = {
    id: newUuid(),
    address: parsed.data.address.trim(),
    walletType,
    balance: 0,
    currency: "ETH",
    connectionStatus: "public_address",
    connectedAt: NOW(),
    provider: "self_custody",
    label: null,
    email: null,
    syncedProfile: null,
  };
  data.connectedWallets.push(wallet);
  data.walletSkipped = false;
  void persistConnectedWallet(wallet.id, req.userId!, {
    address: wallet.address,
    walletType: wallet.walletType,
    balance: wallet.balance,
    currency: wallet.currency,
    provider: wallet.provider,
    label: wallet.label ?? null,
    email: wallet.email ?? null,
    syncedProfile: wallet.syncedProfile,
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "wallet.connect",
    detail: `Connected external ${walletType} wallet ${wallet.address.slice(0, 8)}...`,
  });
  // Public response — no secret material returned to the client.
  return res.json(toPublicConnectedWallet(wallet));
});

router.get("/wallets/connected/:walletId/balance", requireAuth, async (req, res) => {
  const data = getUserData(req.userId!);
  const wallet = data.connectedWallets.find((w) => w.id === req.params["walletId"]);
  if (!wallet) {
    return res.status(404).json({ error: "Connected wallet not found." });
  }
  try {
    const live = await getLiveBalance(wallet.address);
    return res.json({
      walletId: wallet.id,
      ...live,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live balance lookup failed.";
    req.log.warn({ err: message, address: wallet.address }, "live balance lookup failed");
    return res.json({
      walletId: wallet.id,
      address: wallet.address,
      chain: "ethereum-mainnet",
      ethBalance: 0,
      tokens: [],
      gasPriceGwei: 0,
      estimatedSendGasFeeEth: 0,
      fetchedAt: NOW(),
      source: "public",
      error: message,
    });
  }
});

/**
 * Connect an exchange-account wallet (MoonPay or Coinbase). The user
 * supplies signing material (seed phrase or private key) just like the
 * self-custody connect flow, but the link is tagged with `provider` so it
 * appears under the Exchange Wallets section in the UI and admins see the
 * synced exchange profile metadata. Region availability is enforced
 * server-side: MoonPay is unavailable in the configured unsupported
 * country list. Re-connecting the same provider replaces the prior link.
 */
router.post("/wallets/exchange/connect", requireAuth, (req, res) => {
  const parsed = ConnectExchangeWalletBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid exchange wallet request",
      details: parsed.error.issues,
    });
  }
  const stored = req.storedUser!;
  const data = getUserData(req.userId!);
  const provider = parsed.data.provider;

  // Region availability — MoonPay is unavailable in sanctioned/restricted
  // countries. Coinbase is treated as globally available unless an admin
  // configures otherwise; we keep its gate symmetric for future expansion.
  if (provider === "moonpay" && isCountryMoonpayBlocked(stored.user.country)) {
    return res.status(403).json({
      error:
        "MoonPay is not available in your country. Please use a different exchange provider.",
    });
  }

  // One link per provider per user — replace any prior link.
  const existingIdx = data.connectedWallets.findIndex(
    (w) => w.provider === provider,
  );
  if (existingIdx !== -1) {
    data.connectedWallets.splice(existingIdx, 1);
  }

  const defaultBank = data.bankAccounts.find((b) => b.isDefault) ??
    data.bankAccounts[0] ?? null;
  const syncedProfile: SyncedExchangeProfile = {
    fullName: stored.user.fullName,
    email: stored.user.email,
    country: stored.user.country,
    phone: stored.user.phone ?? null,
    bankName: defaultBank?.bankName ?? null,
    bankLast4: defaultBank?.last4 ?? null,
    cardLast4: null,
  };

  const label = parsed.data.label?.trim().slice(0, 64) ||
    (provider === "moonpay" ? "MoonPay account" : "Coinbase account");

  const wallet: StoredConnectedWallet = {
    id: newUuid(),
    address: parsed.data.address.trim(),
    walletType: provider,
    balance: 0,
    currency: "ETH",
    connectionStatus: "public_address",
    connectedAt: NOW(),
    provider,
    label,
    email: stored.user.email,
    syncedProfile,
  };
  data.connectedWallets.push(wallet);
  data.walletSkipped = false;
  void persistConnectedWallet(wallet.id, req.userId!, {
    address: wallet.address,
    walletType: wallet.walletType,
    balance: wallet.balance,
    currency: wallet.currency,
    provider: wallet.provider,
    label: wallet.label ?? null,
    email: wallet.email ?? null,
    syncedProfile: wallet.syncedProfile,
  });
  logActivity({
    actorId: req.userId!,
    actorName: stored.user.fullName,
    action: "wallet.exchange_connect",
    detail: `Linked ${provider} exchange wallet ${wallet.address.slice(0, 8)}...`,
  });
  return res.json(toPublicConnectedWallet(wallet));
});

router.delete("/wallets/exchange/:walletId", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const idx = data.connectedWallets.findIndex(
    (w) => w.id === req.params["walletId"] && w.provider !== "self_custody",
  );
  if (idx === -1) {
    return res.status(404).json({ error: "Exchange wallet not found." });
  }
  const removed = data.connectedWallets.splice(idx, 1)[0]!;
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "wallet.exchange_disconnect",
    detail: `Disconnected ${removed.provider} exchange wallet ${removed.address.slice(0, 8)}…`,
  });
  return res.json({ ok: true });
});

router.post("/wallets/connected/:walletId/send", requireAuth, async (req, res) => {
  if (!enforceGasFee(req, res, "wallet_transfer")) return;
  const parsed = SendFromConnectedWalletBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      hash: null,
      from: null,
      to: null,
      asset: "",
      amount: 0,
      blockNumber: null,
      confirmations: 0,
      status: null,
      message: "Invalid send request.",
    });
  }
  const data = getUserData(req.userId!);
  const wallet = data.connectedWallets.find((w) => w.id === req.params["walletId"]);
  if (!wallet) {
    return res.status(404).json({
      success: false,
      hash: null,
      from: null,
      to: null,
      asset: parsed.data.asset,
      amount: parsed.data.amount,
      blockNumber: null,
      confirmations: 0,
      status: null,
      message: "Connected wallet not found.",
    });
  }
  return res.status(403).json({
    success: false,
    hash: null,
    from: wallet.address,
    to: parsed.data.to,
    asset: parsed.data.asset,
    amount: parsed.data.amount,
    blockNumber: null,
    confirmations: 0,
    status: null,
    message: "Connected wallets are non-custodial. Sign this transaction in your wallet provider.",
  });
});

export default router;
