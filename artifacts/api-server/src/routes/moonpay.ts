/**
 * /moonpay routes — buy-crypto initiate (build hosted-checkout URL) and
 * webhook (credit platform wallet on transaction completion).
 *
 * MoonPay docs: https://dev.moonpay.com/reference/initiating-purchases
 *
 * Behavior:
 * - If MOONPAY_API_KEY is set, build a live https://buy.moonpay.com URL
 *   with the configured publishable key. Otherwise fall back to the
 *   sandbox host with a clearly-marked test publishable key so the
 *   end-to-end flow remains demonstrable in development.
 * - If MOONPAY_SECRET_KEY is set, HMAC-SHA256-sign the URL query string
 *   per MoonPay's URL-signing spec and append `&signature=...`.
 * - The webhook verifies an HMAC over the raw body using
 *   MOONPAY_WEBHOOK_SECRET (when configured), then credits the matching
 *   platform wallet on `transaction_completed` / `transaction_updated`
 *   with status=completed.
 */
import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  InitiateMoonpayBuyBody,
  MoonpayWebhookBody,
  type MoonpayInitiateResponse,
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

const SANDBOX_HOST = "https://buy-sandbox.moonpay.com";
const LIVE_HOST = "https://buy.moonpay.com";
// Public sandbox key from MoonPay's published examples — safe to ship in dev.
const SANDBOX_FALLBACK_KEY = "pk_test_123";

router.post("/moonpay/initiate", requireAuth, (req, res) => {
  const parsed = InitiateMoonpayBuyBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid MoonPay request", details: parsed.error.issues });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);

  // Confirm the user actually owns at least one verified bank account —
  // Buy Crypto is gated on that requirement product-side.
  const hasVerifiedBank = data.bankAccounts.some((b) => b.verified);
  if (!hasVerifiedBank) {
    return res.status(403).json({
      error:
        "A verified bank account is required to use MoonPay buy-crypto.",
    });
  }

  const apiKeyEnv = env.MOONPAY_API_KEY;
  const secretEnv = env.MOONPAY_SECRET_KEY;
  const configured = !!apiKeyEnv;
  const apiKey = apiKeyEnv || SANDBOX_FALLBACK_KEY;
  const sandbox = !configured;
  const host = sandbox ? SANDBOX_HOST : LIVE_HOST;

  const moonpayEmail = u.moonpayEmail?.trim() || u.email;

  const externalTxId = newId("mp");
  const params = new URLSearchParams();
  params.set("apiKey", apiKey);
  params.set("currencyCode", parsed.data.assetSymbol.toLowerCase());
  params.set("baseCurrencyCode", parsed.data.fiatCurrency.toLowerCase());
  params.set("baseCurrencyAmount", String(parsed.data.fiatAmount));
  params.set("walletAddress", parsed.data.destinationAddress);
  params.set("email", moonpayEmail);
  params.set("externalCustomerId", u.id);
  params.set("externalTransactionId", externalTxId);

  // Pre-fill the customer's name on MoonPay's KYC step so the user
  // doesn't have to re-type it. MoonPay accepts firstName/lastName
  // (https://dev.moonpay.com/reference/url-parameters); split the
  // stored fullName on first whitespace.
  const trimmedName = u.fullName?.trim();
  if (trimmedName) {
    const firstSpace = trimmedName.indexOf(" ");
    const firstName =
      firstSpace === -1 ? trimmedName : trimmedName.slice(0, firstSpace);
    const lastName =
      firstSpace === -1 ? "" : trimmedName.slice(firstSpace + 1).trim();
    if (firstName) params.set("firstName", firstName);
    if (lastName) params.set("lastName", lastName);
  }

  // Resolve whether the destination address belongs to one of THIS
  // user's platform wallets. We only trust a "platform" destination
  // when the on-chain address actually matches — otherwise a malicious
  // client could send `destinationKind=platform` with an external
  // address and trick the webhook into double-crediting them
  // (external on-chain delivery + platform wallet credit).
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

  // Always derive destinationKind server-side from address ownership;
  // ignore the client value beyond the validation above.
  const resolvedDestinationKind: "platform" | "external" = matchedPlatformWallet
    ? "platform"
    : "external";

  // In production, a live API key without a secret key is a hard blocker.
  // An unsigned live checkout URL can be tampered with to redirect
  // on-chain funds to an external address while the server still credits
  // the platform wallet via the stored pending record. Fail closed here
  // so that startup-level assertRequiredEnv() and per-request guards
  // both independently enforce the invariant.
  // Guard placed BEFORE pending-tx persistence so a rejected request
  // does not leave an orphan pending entry in the store.
  if (configured && !secretEnv && isProduction) {
    logger.error(
      "[moonpay] MOONPAY_SECRET_KEY is absent in production — refusing to issue live checkout URL.",
    );
    return res.status(503).json({
      error:
        "MoonPay live checkout is not available: MOONPAY_SECRET_KEY is not configured. " +
        "Contact your administrator.",
    });
  }

  // Persist what the user picked so the webhook can credit a platform
  // wallet only when the destination was a verified platform wallet.
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
    ? "MoonPay is not configured on the server. Showing the MoonPay sandbox so you can preview the flow — no real funds will move. Add MOONPAY_API_KEY and MOONPAY_SECRET_KEY as Replit Secrets to enable live purchases."
    : !secretEnv
      ? "MOONPAY_SECRET_KEY is not set, so the URL is unsigned. Add it as a Replit Secret to enable signed checkouts."
      : null;

  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "moonpay.initiate",
    detail: `Initiated MoonPay buy of ${parsed.data.fiatAmount} ${parsed.data.fiatCurrency} → ${parsed.data.assetSymbol} into ${resolvedDestinationKind} wallet (${parsed.data.destinationAddress.slice(0, 10)}…). ${sandbox ? "[sandbox]" : "[live]"}`,
  });

  const response: MoonpayInitiateResponse = {
    url,
    sandbox,
    signed,
    configured,
    autoFilled: true,
    notice,
  };
  return res.json(response);
});

router.post("/moonpay/webhook", (req, res) => {
  // The /moonpay/webhook path is mounted with `express.raw()` in app.ts,
  // so `req.body` is a Buffer (the *exact* bytes MoonPay sent). MoonPay
  // signs that raw payload, so we must HMAC the bytes before parsing
  // JSON.
  const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer) : null;
  if (!rawBody) {
    logger.warn(
      "[moonpay] Webhook missing raw body buffer — check app.ts middleware order.",
    );
    return res.status(400).json({ error: "Webhook body not captured" });
  }
  const rawText = rawBody.toString("utf8");

  const webhookSecret = env.MOONPAY_WEBHOOK_SECRET;
  // Require a webhook secret outside development. Without it, any
  // caller could POST a fake `transaction_completed` event and credit
  // a platform wallet. In dev (NODE_ENV !== "production") we allow
  // unsigned webhooks so the flow stays demonstrable without secrets,
  // but we log a loud warning so it can't go unnoticed.
  if (!webhookSecret) {
    if (isProduction) {
      logger.error(
        "[moonpay] MOONPAY_WEBHOOK_SECRET is not set in production — refusing to process webhook.",
      );
      return res.status(503).json({
        error:
          "MoonPay webhook is not configured on this server (MOONPAY_WEBHOOK_SECRET missing).",
      });
    }
    logger.warn(
      "[moonpay] MOONPAY_WEBHOOK_SECRET is not set — accepting unsigned webhook in dev. Do NOT deploy without this secret.",
    );
  }
  // MoonPay sends signature in the `Moonpay-Signature-V2` header as
  // `t=<timestamp>,s=<hex-hmac>`. We verify when a secret is configured.
  if (webhookSecret) {
    const sigHeader = req.header("moonpay-signature-v2") ?? "";
    const parts = Object.fromEntries(
      sigHeader.split(",").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k ?? "", v ?? ""];
      }),
    );
    const timestamp = parts["t"];
    const provided = parts["s"];
    if (!timestamp || !provided) {
      return res.status(401).json({ error: "Missing webhook signature" });
    }
    const payload = `${timestamp}.${rawText}`;
    const expected = createHmac("sha256", webhookSecret)
      .update(payload)
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
      logger.warn(
        { sigHeader: sigHeader.slice(0, 24) + "…" },
        "[moonpay] Rejected webhook with bad signature.",
      );
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return res.status(400).json({ error: "Webhook body is not valid JSON" });
  }
  const parsed = MoonpayWebhookBody.safeParse(body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid webhook payload", details: parsed.error.issues });
  }

  const event = parsed.data;
  const tx = event.data;
  const isCompletion =
    (event.type === "transaction_completed" ||
      event.type === "transaction_updated") &&
    tx.status === "completed";

  if (!isCompletion) {
    // Ack non-completion events so MoonPay doesn't retry forever.
    return res.json({ ok: true });
  }

  // Idempotency guard: MoonPay may deliver both `transaction_updated`
  // and `transaction_completed` for the same purchase, and will retry
  // on any non-2xx. We must credit each MoonPay tx.id at most once.
  const alreadyProcessed = moonpayProcessedTx.get(tx.id);
  if (alreadyProcessed) {
    logger.info(
      { txId: tx.id, prior: alreadyProcessed.outcome },
      "[moonpay] Webhook ignored — transaction already settled.",
    );
    return res.json({ ok: true, idempotent: true });
  }

  const externalCustomerId = tx.externalCustomerId ?? null;
  const stored = externalCustomerId ? users.get(externalCustomerId) : null;
  if (!stored) {
    logger.warn(
      { externalCustomerId, txId: tx.id },
      "[moonpay] Webhook completion for unknown user.",
    );
    return res.json({ ok: true });
  }

  const data = getUserData(stored.user.id);
  const cryptoCode = (tx.currency?.code ?? "").toUpperCase();
  const cryptoAmount = tx.quoteCurrencyAmount ?? 0;

  // Resolve the original /initiate record so we know whether the user
  // actually directed funds to a platform wallet. We must NOT credit
  // platform wallets when the destination was an external/custom
  // address — that would double-credit funds the user already received
  // on-chain.
  const externalTxId = tx.externalTransactionId ?? null;
  const pending = externalTxId ? moonpayPendingTx.get(externalTxId) : null;

  // Authoritatively re-derive whether the on-chain destination belongs
  // to one of *this user's* platform wallets. We do NOT trust
  // `pending.destinationKind` on its own — it could be stale or, if the
  // pending record were ever populated from untrusted input, lie about
  // ownership. The only ground truth is "does the destination address
  // match a wallet we know belongs to this user?".
  const txWalletAddress = (tx.walletAddress ?? "").toLowerCase();
  const platformByAddress = txWalletAddress
    ? data.wallets.find(
        (w) => w.address && w.address.toLowerCase() === txWalletAddress,
      )
    : undefined;

  // The ONLY authoritative signal for platform wallet credit is that the
  // webhook's on-chain destination address explicitly matches one of this
  // user's platform wallets. We deliberately do NOT fall back to the
  // pending record's walletId when tx.walletAddress is absent or
  // unmatched — either case is indistinguishable from an attacker who
  // redirected the checkout URL to an external address. A missing
  // walletAddress in the webhook means MoonPay could not confirm the
  // destination, which is not a signal we can safely credit on.
  const platformWallet = platformByAddress;

  if (!platformWallet) {
    // Funds went to an external/custom wallet (or we can't prove
    // ownership) — log for audit but do NOT touch any platform wallet
    // balance. Mark the tx as settled so retries don't re-evaluate.
    if (externalTxId) moonpayPendingTx.delete(externalTxId);
    moonpayProcessedTx.set(tx.id, {
      userId: stored.user.id,
      outcome: "skipped_external",
      walletId: null,
      cryptoAmount,
      cryptoCode,
      processedAt: NOW(),
    });
    // Crypto-buy verification milestone — completion of the MoonPay
    // purchase is sufficient regardless of where the funds settled.
    markBuyVerified(stored.user.id);
    logActivity({
      actorId: null,
      actorName: "MoonPay",
      action: "moonpay.completed.external",
      detail: `MoonPay purchase ${tx.id} (${cryptoAmount} ${cryptoCode}) delivered to ${pending?.destinationKind ?? "external"} wallet ${tx.walletAddress ?? "?"} for ${stored.user.email}. Platform wallet not credited.`,
    });
    logger.info(
      {
        userId: stored.user.id,
        txId: tx.id,
        kind: pending?.destinationKind ?? "external",
      },
      "[moonpay] Skipped platform wallet credit for non-platform destination.",
    );
    return res.json({ ok: true });
  }

  const wallet = platformWallet;

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
    description: `MoonPay purchase ${tx.id}${tx.baseCurrencyAmount ? ` (${tx.baseCurrencyAmount} ${tx.baseCurrencyCode ?? ""})` : ""}`,
    createdAt: NOW(),
  });

  if (externalTxId) moonpayPendingTx.delete(externalTxId);
  moonpayProcessedTx.set(tx.id, {
    userId: stored.user.id,
    outcome: "credited",
    walletId: wallet.id,
    cryptoAmount,
    cryptoCode: cryptoCode || wallet.currency,
    processedAt: NOW(),
  });
  markBuyVerified(stored.user.id);

  logActivity({
    actorId: null,
    actorName: "MoonPay",
    action: "moonpay.completed",
    detail: `Credited ${cryptoAmount} ${cryptoCode || wallet.currency} to ${stored.user.email} platform wallet ${wallet.label} (tx ${tx.id}).`,
  });

  return res.json({ ok: true });
});

export default router;
