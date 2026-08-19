import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/session";
import { assertPaymentConfigured, createStripePaymentIntent, digitalPaymentAvailability, settlePaymentIntent, validateApplePayMerchant, verifyStripeWebhook } from "../lib/digital-payments";

const router: IRouter = Router();
router.get("/payments/digital-methods", (_req, res) => res.json(digitalPaymentAvailability()));
router.post("/payments/apple-pay/merchant-validation", requireAuth, async (req, res) => {
  try {
    assertPaymentConfigured("apple_pay");
    const validationUrl = typeof req.body?.validationUrl === "string" ? req.body.validationUrl : "";
    if (!validationUrl.startsWith("https://")) return res.status(400).json({ error: "A valid Apple Pay validation URL is required" });
    return res.json(await validateApplePayMerchant(validationUrl));
  } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : "Apple Pay unavailable" }); }
});
router.post("/payments/:method/intent", requireAuth, async (req, res) => {
  const method = req.params.method === "apple-pay" ? "apple_pay" : req.params.method === "google-pay" ? "google_pay" : null;
  if (!method) return res.status(404).json({ error: "Unsupported digital payment method" });
  try {
    const result = await createStripePaymentIntent({ userId: req.userId!, amount: Number(req.body?.amount), currency: String(req.body?.currency ?? "USD"), method, paymentMethodId: typeof req.body?.paymentMethodId === "string" ? req.body.paymentMethodId : undefined, token: typeof req.body?.token === "string" ? req.body.token : undefined });
    return res.status(201).json(result);
  } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : "Payment unavailable" }); }
});
router.post("/webhooks/stripe", async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  if (!verifyStripeWebhook(rawBody, req.get("stripe-signature") ?? "")) return res.status(400).json({ error: "Invalid webhook signature" });
  const event = JSON.parse(rawBody.toString()) as { type?: string; data?: { object?: { id?: string } } };
  if (["payment_intent.succeeded", "charge.succeeded"].includes(event.type ?? "") && event.data?.object?.id) await settlePaymentIntent(event.data.object.id);
  return res.json({ received: true });
});
export default router;