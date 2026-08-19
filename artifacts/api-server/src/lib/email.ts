/**
 * Transactional email layer.
 *
 * Delivery providers (in priority order):
 *   1. SendGrid HTTP API — when `SENDGRID_API_KEY` is set. (We hit
 *      api.sendgrid.com directly via fetch so the server has no extra
 *      runtime dependency.) Preferred provider; the workspace has a
 *      first-class SendGrid integration that drops `SENDGRID_API_KEY`
 *      into the environment when the user connects it.
 *   2. Generic SMTP via `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` /
 *      `SMTP_PASS` — used when SendGrid is not configured but generic
 *      SMTP credentials are present. Implemented through `nodemailer`,
 *      which is loaded lazily so the dependency is optional in dev.
 *   3. Stub log fallback — when neither provider is configured we still
 *      record the message in `sentEmails` and log it. This keeps local
 *      dev usable but is NOT how production deliveries should run.
 *
 * Every email is also appended to `sentEmails` (capped at MAX_LOG) so
 * admins can audit every notification from /admin/sent-emails regardless
 * of provider.
 *
 * The mailbox feature (separate from this) treats `no_reply@xpressprofx.com`
 * as a one-way platform address — see lib/notify and routes/mailbox.
 */
import { newId, NOW, sentEmails, type SentEmailData } from "./store";
import { logger } from "./logger";
import { env } from "./env";
import { isSendGridConfigured } from "./integration-config";

export function normalizeSmtpHost(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.replace(/\/$/, '');
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
}

const NO_REPLY = "no_reply@xpressprofx.com";
const MAX_LOG = 500;

export interface SendEmailInput {
  to: string;
  subject: string;
  body?: string;
  text?: string;
  html?: string;
  kind: string;
  /** Optional override; defaults to no_reply@xpressprofx.com. */
  from?: string;
}

export interface SendEmailOptions {
  requireProvider?: boolean;
}

interface ProviderResult {
  ok: boolean;
  provider: "sendgrid" | "smtp" | "stub";
  error?: string;
}

async function deliverViaSendGrid(input: SendEmailInput, from: string): Promise<ProviderResult> {
  const apiKey = env.SENDGRID_API_KEY;
  if (!isSendGridConfigured(apiKey)) {
    return { ok: false, provider: "sendgrid", error: "SENDGRID_API_KEY is not configured for production delivery" };
  }
  try {
    const textBody = input.text ?? input.body ?? "";
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: from, name: "XpressPro FX" },
        subject: input.subject,
        content: [
          { type: "text/plain", value: textBody },
          {
            type: "text/html",
            value: input.html ?? `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">${textBody
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br/>")}</div>`,
          },
        ],
      }),
    });
    if (response.ok || response.status === 202) {
      return { ok: true, provider: "sendgrid" };
    }
    const text = await response.text().catch(() => "<no body>");
    return { ok: false, provider: "sendgrid", error: `${response.status} ${text.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, provider: "sendgrid", error: (err as Error).message };
  }
}

async function deliverViaSmtp(input: SendEmailInput, from: string): Promise<ProviderResult> {
  const host = normalizeSmtpHost(env.SMTP_HOST);
  if (!host) return { ok: false, provider: "smtp", error: "SMTP_HOST not set" };
  try {
    // Lazy import — nodemailer is an optional peer dep. We use a Function
    // wrapper so TypeScript doesn't try to resolve its types at compile
    // time; the runtime requirement is documented in the README.
    const dynImport = new Function("m", "return import(m)") as (
      m: string,
    ) => Promise<unknown>;
    type NodemailerLike = {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const mod = (await dynImport("nodemailer").catch(() => null)) as
      | { default?: NodemailerLike }
      | NodemailerLike
      | null;
    const nodemailer: NodemailerLike | null = mod
      ? "createTransport" in mod
        ? mod
        : (mod.default ?? null)
      : null;
    if (!nodemailer) {
      return { ok: false, provider: "smtp", error: "nodemailer not installed" };
    }
    const port = Number(env.SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: env.SMTP_SECURE === true || env.SMTP_SECURE === false ? env.SMTP_SECURE : port === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text ?? input.body ?? "",
      html: input.html,
    });
    return { ok: true, provider: "smtp" };
  } catch (err) {
    return { ok: false, provider: "smtp", error: (err as Error).message };
  }
}

export async function sendEmail(
  input: SendEmailInput,
  options: SendEmailOptions = {},
): Promise<SentEmailData> {
  const from = input.from ?? env.SMTP_FROM ?? NO_REPLY;
  const body = input.body ?? input.text ?? "";
  const record: SentEmailData = {
    id: newId("email"),
    to: input.to,
    from,
    subject: input.subject,
    body,
    kind: input.kind,
    sentAt: NOW(),
  };
  sentEmails.unshift(record);
  if (sentEmails.length > MAX_LOG) sentEmails.length = MAX_LOG;

  // Try real providers in order; fall back to stub log.
  let result: ProviderResult = await deliverViaSendGrid(input, from);
  if (!result.ok) {
    const sg = result;
    result = await deliverViaSmtp(input, from);
    if (!result.ok) {
      logger.warn(
        { to: record.to, kind: record.kind, sendgrid: sg.error, smtp: result.error },
        "email.send: no provider configured — falling back to stub log",
      );
      result = { ok: true, provider: "stub" };
    }
  }

  if (result.provider === "stub" && options.requireProvider) {
    const errorMessage = `Email delivery failed for ${record.kind}; no configured provider available.`;
    logger.error({ to: record.to, kind: record.kind }, errorMessage);
    throw new Error(errorMessage);
  }

  logger.info(
    { to: record.to, kind: record.kind, subject: record.subject, provider: result.provider },
    "email.send",
  );
  return record;
}

export function adminNotifyEmail(): string {
  return env.ADMIN_NOTIFY_EMAIL ?? "alerts@xpressprofx.com";
}
