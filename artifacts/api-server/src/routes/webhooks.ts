import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "node:crypto";
import { getChatNamespace } from "../lib/realtime";
import { getUserData, newId, NOW, users, usersByEmail } from "../lib/store";
import { findUserIdByLiveChatTicket, persistChatMessage } from "../lib/db-persist";
import { logger } from "../lib/logger";
import { pushAdminAlert } from "../lib/notify";
import type { LiveChatMsg } from "../lib/store";

const router = Router();
const stubLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: "Webhook stub rate limit exceeded." } });
const inboundEmailUpload = multer({ limits: { fields: 30, fieldSize: 200_000 } }).none();
type WebhookBody = Record<string, unknown>;
type StubChannel = "whatsapp" | "telegram" | "twitter";

function parseBody(req: Request): WebhookBody {
  const raw = req.body;
  if (Buffer.isBuffer(raw)) {
    const text = raw.toString("utf8").trim();
    if (!text) return {};
    try { const parsed = JSON.parse(text); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return { text }; }
  }
  if (typeof raw === "string") {
    try { const parsed = JSON.parse(raw); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { text: raw }; } catch { return { text: raw }; }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as WebhookBody : {};
}

function textFrom(body: WebhookBody): string {
  for (const key of ["text", "message", "dm_text"]) if (typeof body[key] === "string" && body[key].trim()) return body[key].trim().slice(0, 10_000);
  return "";
}

function emailAddress(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return raw.match(/<([^>]+)>/)?.[1]?.trim() || raw;
}

function timingSafeSecret(expected: string, supplied: string | undefined): boolean {
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireStubSecret(req: Request, res: Response): boolean {
  const expected = process.env.STUB_WEBHOOK_SECRET?.trim();
  if (!expected || timingSafeSecret(expected, req.get("x-stub-secret"))) return true;
  res.status(401).json({ error: "Invalid webhook secret." });
  return false;
}

function escalationRequested(text: string): boolean {
  return /\b(agent|human|support|supervisor|manager|real person|escalat|fraud|hacked|stolen|emergency)\b/i.test(text);
}

function faqReply(text: string): string {
  const value = text.toLowerCase();
  if (/(deposit|fund|add money)/.test(value)) return "You can open Deposit from your dashboard, choose an available asset, and follow the displayed instructions. A support agent can help with a pending deposit.";
  if (/(withdraw|cash out|payout)/.test(value)) return "Open Withdraw from your dashboard to submit a request. Withdrawals may require account verification and admin approval.";
  if (/(password|login|sign in|otp)/.test(value)) return "Use Forgot password on the sign-in screen or request a new OTP. Never share a password, PIN, seed phrase, or private key.";
  if (/(trade|order|demo|forex|crypto)/.test(value)) return "Demo trading is available from the Demo Trading desk with simulated funds. Live orders and balances are shown only when enabled for your account.";
  return "Thanks for contacting XpressPro FX. I can help with deposits, withdrawals, login, demo trading, and account support. Type agent to request a human specialist.";
}

function resolveUser(body: WebhookBody): { userId: string; email: string; name: string } | null {
  const explicitId = typeof body.userId === "string" ? body.userId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userId = explicitId || (email ? usersByEmail.get(email) ?? "" : "");
  const stored = userId ? users.get(userId) : undefined;
  return stored ? { userId, email: stored.user.email, name: stored.user.fullName } : null;
}

function emitMessage(userId: string, message: LiveChatMsg): void {
  try { getChatNamespace()?.to(`conv:${userId}`).emit("message", message); } catch (err) { logger.warn({ err, userId }, "[webhook] Socket.IO message emit failed"); }
}

function appendChatMessage(userId: string, message: LiveChatMsg): void {
  getUserData(userId).liveChat.push(message);
  emitMessage(userId, message);
}

async function handleStub(channel: StubChannel, body: WebhookBody) {
  const text = textFrom(body) || "Hello";
  const user = resolveUser(body);
  const escalated = escalationRequested(text);
  let userMessage: LiveChatMsg | undefined;
  let botMessage: LiveChatMsg | undefined;
  if (user) {
    userMessage = { id: newId("chat"), userId: user.userId, senderName: `${channel} contact`, content: text, isFromUser: true, isBot: false, escalated, createdAt: NOW() };
    appendChatMessage(user.userId, userMessage);
    botMessage = { id: newId("chat"), userId: user.userId, senderName: "XpressPro FX AI Support", content: faqReply(text), isFromUser: false, isBot: true, escalated, createdAt: NOW() };
    appendChatMessage(user.userId, botMessage);
    if (escalated) pushAdminAlert({ kind: `webhook.${channel}.handoff`, title: `${channel} support handoff requested`, body: `${user.name} (${user.email}) requested support through ${channel}: ${text.slice(0, 300)}`, userId: user.userId, userEmail: user.email, severity: "warning", linkUrl: `/live-chat/${user.userId}`, email: true });
  }
  return { ok: true, stub: true, channel, matchedUser: Boolean(user), escalated, botReply: faqReply(text), userMessage, botMessage };
}

function stubHandler(channel: StubChannel) {
  return async (req: Request, res: Response) => { if (!requireStubSecret(req, res)) return; return res.json(await handleStub(channel, parseBody(req))); };
}

router.get("/webhooks/stub/status", (_req, res) => res.json({ ok: true, stub: true, channels: {
  whatsapp: { configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN), endpoint: "/api/webhooks/stub/whatsapp" },
  telegram: { configured: Boolean(process.env.TELEGRAM_BOT_TOKEN), endpoint: "/api/webhooks/stub/telegram" },
  twitter: { configured: Boolean(process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN), endpoint: "/api/webhooks/stub/twitter" },
  inboundEmail: { configured: Boolean(process.env.SENDGRID_SIGNING_KEY), endpoint: "/api/webhooks/inbound-email" },
} }));
router.post("/webhooks/stub/whatsapp", stubLimiter, stubHandler("whatsapp"));
router.post("/webhooks/stub/telegram", stubLimiter, stubHandler("telegram"));
router.post("/webhooks/stub/twitter", stubLimiter, stubHandler("twitter"));
router.post("/webhooks/stub/inbound", stubLimiter, async (req, res) => {
  if (!requireStubSecret(req, res)) return;
  const body = parseBody(req);
  const channel = body.channel === "telegram" || body.channel === "twitter" ? body.channel : "whatsapp";
  return res.json(await handleStub(channel, body));
});

function verifyInboundEmailSignature(req: Request, raw: Buffer | string): boolean {
  const signingKey = process.env.SENDGRID_SIGNING_KEY?.trim();
  const webhookSecret = process.env.WEBHOOK_SECRET_GLOBAL?.trim();
  const suppliedWebhookSecret = req.get("x-webhook-secret")?.trim();
  if (webhookSecret && suppliedWebhookSecret && timingSafeSecret(webhookSecret, suppliedWebhookSecret)) return true;
  const timestamp = req.get("x-twilio-email-event-webhook-timestamp") || req.get("x-sendgrid-timestamp") || "";
  const supplied = req.get("x-twilio-email-event-webhook-signature") || req.get("x-sendgrid-signature") || "";
  if (!signingKey) {
    if (process.env.NODE_ENV === "production") logger.error("[webhook] Inbound email rejected because no signature key is configured");
    return process.env.NODE_ENV !== "production";
  }
  if (!timestamp || !supplied) return false;
  const expected = crypto.createHmac("sha256", signingKey).update(timestamp + (Buffer.isBuffer(raw) ? raw : Buffer.from(raw))).digest("base64");
  return timingSafeSecret(expected, supplied);
}

router.post("/webhooks/inbound-email", inboundEmailUpload, async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  if (!verifyInboundEmailSignature(req, raw)) return res.status(401).json({ error: "Invalid signature." });
  let parsed: unknown; try { parsed = JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw); } catch { parsed = null; }
  const events = Array.isArray(parsed) ? parsed : [parsed ?? { text: Buffer.isBuffer(raw) ? raw.toString("utf8") : raw }];
  let processed = 0;
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const value = event as Record<string, any>;
    const from = emailAddress(value.from || value.envelope?.from || value.sender || value.mail?.from);
    const subject = String(value.subject || value.headers?.subject || "");
    const content = String(value.text || value.plain || value.mail?.text || value.html || "").trim().slice(0, 10_000);
    if (!content) continue;
    const ticketMatch = subject.match(/\b(XPFX-[A-Z0-9-]+)\b/i);
    const ticketId = ticketMatch?.[1]?.toUpperCase();
    const conversationUserId = ticketId
      ? usersByEmail.get(from) ?? await findUserIdByLiveChatTicket(ticketId)
      : usersByEmail.get(from);
    if (!conversationUserId) continue;
    const msg: LiveChatMsg = { id: newId("chat"), userId: conversationUserId, senderName: ticketId ? `Email: ${from || "Support"}` : `Email: ${from}`, content: ticketId ? content : `${subject ? `${subject}\n\n` : ""}${content}`, isFromUser: !ticketId, isBot: false, escalated: Boolean(ticketId), createdAt: NOW() };
    appendChatMessage(conversationUserId, msg);
    void persistChatMessage(conversationUserId, ticketId ? "admin" : "user", null, msg.content);
    processed += 1;
  }
  return res.json({ ok: true, processed });
});

export default router;
