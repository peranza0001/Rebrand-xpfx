/**
 * /coinbase routes — Coinbase on-ramp Buy Crypto initiate + webhook.
 *
 * Mirrors the MoonPay flow: builds a hosted-checkout URL (sandbox fallback
 * when COINBASE_API_KEY is unset), persists a pending record so the
 * webhook can credit a platform wallet only when the user actually picked
 * one as their destination, verifies a webhook HMAC over the raw body
 * using COINBASE_WEBHOOK_SECRET, and is idempotent across retries.
 */
import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  InitiateCoinbaseBuyBody,
  CoinbaseWebhookBody,
  type CoinbaseInitiateResponse,
} from "@workspace/api-zod";
import {
  getUserData,
  logActivity,
  markBuyVerified,
  moonpayPendingTx,
  moonpayProcessedTx,
  newId,
  NOW,
  users,
} from "../lib/store";
import { requireAuth } from "../lib/session";
import { logger } from "../lib/logger";
import { env, isProduction } from "../lib/env";
import { persistWalletBalance } from "../lib/db-persist";

const router: IRouter = Router();

const SANDBOX_HOST = "https://pay-sandbox.coinbase.com/buy";
const LIVE_HOST = "https://pay.coinbase.com/buy";
const SANDBOX_FALLBACK_KEY = "ck_test_demo";

router.post("/coinbase/initiate", requireAuth, (req, res) => {
  const parsed = InitiateCoinbaseBuyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Coinbase request",
      details: parsed.error.issues,
    });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);

  const hasVerifiedBank = data.bankAccounts.some((b) => b.verified);
  if (!hasVerifiedBank) {
    return res.status(403).json({
      error: "A verified bank account is required to use Coinbase buy-crypto.",
    });
  }

  const apiKeyEnv = env.COINBASE_API_KEY;
  const secretEnv = env.COINBASE_API_SECRET;
  const configured = !!apiKeyEnv;
  const apiKey = apiKeyEnv || SANDBOX_FALLBACK_KEY;
  const sandbox = !configured;
  const host = sandbox ? SANDBOX_HOST : LIVE_HOST;

  const externalTxId = newId("cb");
  const params = new URLSearchParams();
  params.set("appId", apiKey);
  params.set("destinationWallets", parsed.data.destinationAddress);
  params.set("defaultAsset", parsed.data.assetSymbol.toUpperCase());
  params.set("presetFiatAmount", String(parsed.data.fiatAmount));
  params.set("fiatCurrency", parsed.data.fiatCurrency.toUpperCase());
  params.set("partnerUserId", u.id);
  params.set("externalTransactionId", externalTxId);
  params.set("email", u.email);

  const matchedPlatformWallet = data.wallets.find(
    (w) =>
      w.address &&
      w.address.toLowerCase() === parsed.data.destinationAddress.toLowerCase(),
  );
  if (parsed.data.destinationKind === "platform" && !matchedPlatformWallet) {
    return res.status(400).json({
      error:
        "destinationAddress does not match any of your platform wallets. " +
        "Pick a platform wallet from the dropdown or switch destinationKind to external.",
    });
  }
  const resolvedDestinationKind: "platform" | "external" = matchedPlatformWallet
    ? "platform"
    : "external";

  if (configured && !secretEnv && isProduction) {
    logger.error(
      "[coinbase] COINBASE_API_SECRET is absent in production — refusing to issue live checkout URL.",
    );
    return res.status(503).json({
      error:
        "Coinbase live checkout is not available: COINBASE_API_SECRET is not configured.",
    });
  }

  // Reuse the moonpay pending map — this in-memory store is provider-
  // agnostic at the address-ownership level and the webhook keys off the
  // generated externalTransactionId.
  moonpayPendingTx.set(externalTxId, {
    userId: u.id,
    destinationKind: resolvedDestinationKind,
    destinationAddress: parsed.data.destinationAddress,
    walletId: matchedPlatformWallet ? matchedPlatformWallet.id : null,
    assetSymbol: parsed.data.assetSymbol.toUpperCase(),
    fiatAmount: parsed.data.fiatAmount,
    fiatCurrency: parsed.data.fiatCurrency.toUpperCase(),
    createdAt: NOW(),
  });

  const query = params.toString();
  let signed = false;
  let url = `${host}?${query}`;
  if (configured && secretEnv) {
    const signature = createHmac("sha256", secretEnv)
      .update(`?${query}`)
      .digest("base64");
    url += `&signature=${encodeURIComponent(signature)}`;
    signed = true;
  }

  const notice = !configured
    ? "Coinbase is not configured on the server. Showing the Coinbase sandbox so you can preview the flow — no real funds will move. Add COINBASE_API_KEY and COINBASE_API_SECRET as Replit Secrets to enable live purchases."
    : !secretEnv
      ? "COINBASE_API_SECRET is not set, so the URL is unsigned. Add it as a Replit Secret to enable signed checkouts."
      : null;

  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "coinbase.initiate",
    detail: `Initiated Coinbase buy of ${parsed.data.fiatAmount} ${parsed.data.fiatCurrency} → ${parsed.data.assetSymbol} into ${resolvedDestinationKind} wallet (${parsed.data.destinationAddress.slice(0, 10)}…). ${sandbox ? "[sandbox]" : "[live]"}`,
  });

  const response: CoinbaseInitiateResponse = {
    url,
    sandbox,
    signed,
    configured,
    autoFilled: true,
    notice,
  };
  return res.json(response);
});

router.get("/coinbase/status/:id", requireAuth, (req, res) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const userId = req.userId!;
  if (!id) {
    return res.status(400).json({ error: "Missing transaction id" });
  }
  // Settled (idempotency) path
  const processed = moonpayProcessedTx.get(id);
  if (processed && processed.userId === userId) {
    const response = {
      id,
      status:
        processed.outcome === "skipped_external"
          ? ("skipped_external" as const)
          : ("completed" as const),
      outcome: processed.outcome,
      walletId: processed.walletId,
      cryptoAmount: processed.cryptoAmount,
      cryptoCode: processed.cryptoCode,
      processedAt: new Date(processed.processedAt).toISOString(),
      destinationKind: null,
      destinationAddress: null,
      assetSymbol: null,
      fiatAmount: null,
      fiatCurrency: null,
    };
    return res.json(response);
  }
  // Pending path — keyed by the externalTransactionId we issued at initiate
  const pending = moonpayPendingTx.get(id);
  if (pending && pending.userId === userId) {
    return res.json({
      id,
      status: "pending" as const,
      outcome: null,
      walletId: pending.walletId,
      cryptoAmount: null,
      cryptoCode: null,
      processedAt: null,
      destinationKind: pending.destinationKind,
      destinationAddress: pending.destinationAddress,
      assetSymbol: pending.assetSymbol,
      fiatAmount: pending.fiatAmount,
      fiatCurrency: pending.fiatCurrency,
    });
  }
  return res.json({
    id,
    status: "unknown" as const,
    outcome: null,
    walletId: null,
    cryptoAmount: null,
    cryptoCode: null,
    processedAt: null,
    destinationKind: null,
    destinationAddress: null,
    assetSymbol: null,
    fiatAmount: null,
    fiatCurrency: null,
  });
});

router.post("/coinbase/webhook", (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer) : null;
  if (!rawBody) {
    logger.warn(
      "[coinbase] Webhook missing raw body buffer — check app.ts middleware order.",
    );
    return res.status(400).json({ error: "Webhook body not captured" });
  }
  const rawText = rawBody.toString("utf8");

  const webhookSecret = env.COINBASE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (isProduction) {
      logger.error(
        "[coinbase] COINBASE_WEBHOOK_SECRET is not set in production — refusing to process webhook.",
      );
      return res.status(503).json({
        error: "Coinbase webhook is not configured on this server.",
      });
    }
    logger.warn(
      "[coinbase] COINBASE_WEBHOOK_SECRET is not set — accepting unsigned webhook in dev. Do NOT deploy without this secret.",
    );
  }
  if (webhookSecret) {
    // Coinbase's documented header is `X-CC-Webhook-Signature` — a hex
    // HMAC-SHA256 of the raw body. Express lower-cases header names.
    const provided = req.header("x-cc-webhook-signature") ?? "";
    if (!provided) {
      return res.status(401).json({ error: "Missing webhook signature" });
    }
    const expected = createHmac("sha256", webhookSecret)
      .update(rawText)
      .digest("hex");
    let providedBuf: Buffer;
    try {
      providedBuf = Buffer.from(provided, "hex");
    } catch {
      return res.status(401).json({ error: "Malformed webhook signature" });
    }
    const expectedBuf = Buffer.from(expected, "hex");
    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      logger.warn("[coinbase] Rejected webhook with bad signature.");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return res.status(400).json({ error: "Webhook body is not valid JSON" });
  }
  const parsed = CoinbaseWebhookBody.safeParse(body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid webhook payload", details: parsed.error.issues });
  }

  const event = parsed.data;
  const tx = event.data;
  const isCompletion =
    (event.type === "transaction.completed" ||
      event.type === "transaction.updated" ||
      event.type === "charge:confirmed") &&
    (tx.status === "completed" || tx.status === "CONFIRMED");

  if (!isCompletion) {
    return res.json({ ok: true });
  }

  // Idempotency — share the moonpay processed-tx map so a Coinbase tx
  // id that collides with one is still settled at most once.
  if (moonpayProcessedTx.has(tx.id)) {
    return res.json({ ok: true, idempotent: true });
  }

  const externalCustomerId = tx.externalCustomerId ?? null;
  const stored = externalCustomerId ? users.get(externalCustomerId) : null;
  if (!stored) {
    logger.warn(
      { externalCustomerId, txId: tx.id },
      "[coinbase] Webhook completion for unknown user.",
    );
    return res.json({ ok: true });
  }

  const data = getUserData(stored.user.id);
  const cryptoCode = (tx.currency?.code ?? tx.baseCurrencyCode ?? "").toUpperCase();
  const cryptoAmount = tx.quoteCurrencyAmount ?? tx.baseCurrencyAmount ?? 0;
  const externalTxId = tx.externalTransactionId ?? null;

  const txWalletAddress = (tx.walletAddress ?? "").toLowerCase();
  const platformByAddress = txWalletAddress
    ? data.wallets.find(
        (w) => w.address && w.address.toLowerCase() === txWalletAddress,
      )
    : undefined;

  if (!platformByAddress) {
    if (externalTxId) moonpayPendingTx.delete(externalTxId);
    const skippedRecord = {
      userId: stored.user.id,
      outcome: "skipped_external" as const,
      walletId: null,
      cryptoAmount,
      cryptoCode,
      processedAt: NOW(),
    };
    moonpayProcessedTx.set(tx.id, skippedRecord);
    // Also key by the externalTransactionId we issued at /coinbase/initiate
    // so GET /coinbase/status/:id resolves with the same id the client has.
    if (externalTxId) moonpayProcessedTx.set(externalTxId, skippedRecord);
    // Crypto-buy verification milestone — completion of the Coinbase
    // purchase is enough regardless of where the funds were delivered.
    markBuyVerified(stored.user.id);
    logActivity({
      actorId: null,
      actorName: "Coinbase",
      action: "coinbase.completed.external",
      detail: `Coinbase purchase ${tx.id} (${cryptoAmount} ${cryptoCode}) delivered to ${tx.walletAddress ?? "?"} for ${stored.user.email}. Platform wallet not credited.`,
    });
    return res.json({ ok: true });
  }

  const wallet = platformByAddress;
  if (cryptoAmount > 0) {
    wallet.balance += cryptoAmount;
    // PHASE 1 FIX: Persist balance change to survive server restarts
    void persistWalletBalance(wallet.id, wallet.balance, 0);
  }
  data.transactions.unshift({
    id: newId("tx"),
    walletId: wallet.id,
    type: "deposit",
    amount: cryptoAmount,
    currency: cryptoCode || wallet.currency,
    status: "completed",
    description: `Coinbase purchase ${tx.id}${tx.baseCurrencyAmount ? ` (${tx.baseCurrencyAmount} ${tx.baseCurrencyCode ?? ""})` : ""}`,
    createdAt: NOW(),
  });
  if (externalTxId) moonpayPendingTx.delete(externalTxId);
  const creditedRecord = {
    userId: stored.user.id,
    outcome: "credited" as const,
    walletId: wallet.id,
    cryptoAmount,
    cryptoCode: cryptoCode || wallet.currency,
    processedAt: NOW(),
  };
  moonpayProcessedTx.set(tx.id, creditedRecord);
  if (externalTxId) moonpayProcessedTx.set(externalTxId, creditedRecord);
  markBuyVerified(stored.user.id);
  logActivity({
    actorId: null,
    actorName: "Coinbase",
    action: "coinbase.completed",
    detail: `Credited ${cryptoAmount} ${cryptoCode || wallet.currency} to ${stored.user.email} platform wallet ${wallet.label} (tx ${tx.id}).`,
  });
  return res.json({ ok: true });
});

export default router;
