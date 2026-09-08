import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import { getPrismaModelDelegate } from "./db-persist";
import { getUserData, newUuid } from "./store";
import { persistWallet } from "./db-persist";
import { recordLedgerEntry } from "./wallet-ledger";

export type DigitalPaymentMethod = "apple_pay" | "google_pay";

function stripeSecret(): string { return process.env.STRIPE_SECRET_KEY?.trim() ?? ""; }

export function digitalPaymentAvailability() {
  const stripeConfigured = Boolean(stripeSecret());
  return {
    applePay: stripeConfigured && Boolean(process.env.APPLE_PAY_MERCHANT_ID?.trim()),
    googlePay: stripeConfigured && Boolean(process.env.GOOGLE_PAY_MERCHANT_ID?.trim()),
    processor: stripeConfigured ? "stripe" : null,
  };
}

export function assertPaymentConfigured(method: DigitalPaymentMethod): void {
  const available = digitalPaymentAvailability();
  if (!available[method === "apple_pay" ? "applePay" : "googlePay"]) throw new Error(`${method} is not configured for live settlement`);
}

export async function validateApplePayMerchant(validationUrl: string): Promise<unknown> {
  assertPaymentConfigured("apple_pay");
  const certificatePath = process.env.APPLE_PAY_CERTIFICATE_PATH?.trim();
  const keyPath = process.env.APPLE_PAY_PRIVATE_KEY_PATH?.trim();
  const merchantValidationUrl = process.env.APPLE_PAY_MERCHANT_VALIDATION_URL?.trim();
  if (!certificatePath || !keyPath || !merchantValidationUrl) throw new Error("Apple Pay merchant validation is not configured");
  const agent = new https.Agent({ cert: fs.readFileSync(certificatePath), key: fs.readFileSync(keyPath) });
  const payload = JSON.stringify({ merchantIdentifier: process.env.APPLE_PAY_MERCHANT_ID, displayName: process.env.APPLE_PAY_DISPLAY_NAME ?? "XpressPro FX", initiative: "web", initiativeContext: merchantValidationUrl });
  return new Promise((resolve, reject) => {
    const request = https.request(validationUrl, { method: "POST", agent, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if ((response.statusCode ?? 500) < 200 || (response.statusCode ?? 500) >= 300) return reject(new Error(`Apple merchant validation failed (${response.statusCode})`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error("Apple merchant validation returned invalid JSON")); }
      });
    });
    request.on("error", reject);
    request.end(payload);
  });
}

export async function createStripePaymentIntent(input: { userId: string; amount: number; currency: string; method: DigitalPaymentMethod; paymentMethodId?: string; token?: string }) {
  assertPaymentConfigured(input.method);
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid payment amount");
  if (!input.paymentMethodId && !input.token) throw new Error("A payment token or payment method is required");
  const form = new URLSearchParams({ amount: String(Math.round(input.amount * 100)), currency: input.currency.toLowerCase(), confirm: "true", "metadata[user_id]": input.userId, "metadata[payment_method]": input.method });
  if (input.paymentMethodId) form.set("payment_method", input.paymentMethodId);
  if (input.token) { form.set("payment_method_data[type]", "card"); form.set("payment_method_data[card][token]", input.token); }
  const response = await fetch("https://api.stripe.com/v1/payment_intents", { method: "POST", headers: { authorization: `Bearer ${stripeSecret()}`, "content-type": "application/x-www-form-urlencoded" }, body: form });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "object" && body.error ? String((body.error as Record<string, unknown>).message) : "Payment processor rejected the payment");
  const delegate = getPrismaModelDelegate("PaymentIntent");
  await delegate?.upsert({ where: { processorId: String(body.id) }, update: { status: String(body.status), updatedAt: new Date() }, create: { id: newUuid(), processorId: String(body.id), userId: input.userId, amount: input.amount, currency: input.currency, method: input.method, status: String(body.status) } });
  return { id: String(body.id), status: String(body.status), clientSecret: body.client_secret ?? null };
}

export function verifyStripeWebhook(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
  const received = signature.match(/(?:^|,)v1=([^,]+)/)?.[1];
  if (!timestamp || !received || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString()}`).digest("hex");
  return expected.length === received.length && timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function settlePaymentIntent(processorId: string): Promise<boolean> {
  const delegate = getPrismaModelDelegate("PaymentIntent");
  const payment = await delegate?.findUnique({ where: { processorId } });
  if (!payment || payment.status === "succeeded") return Boolean(payment);
  const claim = await delegate.updateMany({ where: { processorId, status: { not: "succeeded" } }, data: { status: "settling", updatedAt: new Date() } });
  if (claim.count !== 1) return false;
  const data = getUserData(String(payment.userId));
  const wallet = data.wallets.find((candidate) => candidate.type === "main");
  if (!wallet) return false;
  wallet.balance = Math.round((wallet.balance + Number(payment.amount)) * 100) / 100;
  await persistWallet(wallet.id, String(payment.userId), { walletType: wallet.type, balance: wallet.balance, pendingBalance: wallet.pendingBalance, currency: wallet.currency, label: wallet.label, address: wallet.address });
  await recordLedgerEntry({ userId: String(payment.userId), walletId: wallet.id, entryType: "deposit_approved", amount: Number(payment.amount), assetSymbol: String(payment.currency), sourceType: "stripe_payment_intent", sourceId: processorId, description: "Confirmed digital wallet payment" });
  await delegate.update({ where: { processorId }, data: { status: "succeeded", updatedAt: new Date() } });
  return true;
}