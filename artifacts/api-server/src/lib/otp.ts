/**
 * OTP module for email verification on signup and login.
 * Codes are 6-digit, expire in 10 min, max 5 attempts, in-memory store.
 * In development, the code is printed to stdout so the stub flow works without
 * real SMTP. In production, codes are never logged — wire a real email
 * transport via sendOtpEmail() before going live.
 */
import { randomInt } from "node:crypto";
import { logger } from "./logger";
import { env, hasSmtpCredentials, isProduction } from "./env";
import { isSendGridConfigured } from "./integration-config";
import { sendEmail } from "./email";

interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  country: string;
  referralCode?: string | null;
}

export type OtpIntent = "signup" | "login";

export interface OtpRecord {
  email: string;
  code: string;
  intent: OtpIntent;
  expiresAt: number;
  attempts: number;
  signupPayload?: SignupPayload;
  userId?: string;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_THROTTLE_MS = 15 * 1000;

const otpCodes = new Map<string, OtpRecord>();
const lastSentAt = new Map<string, number>();

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const visible = user.length <= 2 ? user[0] : user.slice(0, 2);
  return `${visible}***@${domain}`;
}

async function sendOtpEmail(email: string, code: string, intent: OtpIntent): Promise<void> {
  const subject =
    intent === "signup"
      ? "Your XpressPro FX signup verification code"
      : "Your XpressPro FX login verification code";
  const body = `Your verification code is ${code}. Enter this code in the app to complete your ${
    intent === "signup" ? "signup" : "login"
  } process. The code expires in 10 minutes.`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111">Your verification code is <strong>${code}</strong>.<br/>Enter this code in the app to complete your ${
    intent === "signup" ? "signup" : "login"
  } process. The code expires in 10 minutes.</div>`;

  const hasEmailProvider = isSendGridConfigured(env.SENDGRID_API_KEY) || hasSmtpCredentials;

  try {
    await sendEmail(
      {
        to: email,
        subject,
        body,
        html,
        kind: `otp.${intent}`,
      },
      { requireProvider: isProduction },
    );
  } catch (err) {
    logger.error({ err, email, intent }, "[otp] Failed to send OTP email");
    throw err;
  }

  if (!hasEmailProvider && !isProduction) {
    logger.info(
      { to: maskEmail(email), subject, smtpConfigured: false },
      "[otp] Verification code generated (stub send — no email provider configured)",
    );
    // eslint-disable-next-line no-console
    console.log(
      `\n[OTP] To: ${email}  Code: ${code}  (intent=${intent}, valid 10min)\n`,
    );
  }
}

export async function issueOtp(args: {
  email: string;
  intent: OtpIntent;
  signupPayload?: SignupPayload;
  userId?: string;
}): Promise<OtpRecord> {
  const email = args.email.toLowerCase();
  const code = generateCode();
  const record: OtpRecord = {
    email,
    code,
    intent: args.intent,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    signupPayload: args.signupPayload,
    userId: args.userId,
  };
  otpCodes.set(email, record);
  lastSentAt.set(email, Date.now());

  try {
    await sendOtpEmail(email, code, args.intent);
  } catch (err) {
    otpCodes.delete(email);
    lastSentAt.delete(email);
    throw err;
  }

  return record;
}

export interface ResendResult {
  ok: boolean;
  reason?: string;
  record?: OtpRecord;
}

export async function resendOtp(emailRaw: string): Promise<ResendResult> {
  const email = emailRaw.toLowerCase();
  const existing = otpCodes.get(email);
  if (!existing) {
    return { ok: false, reason: "No pending verification for that email." };
  }
  const last = lastSentAt.get(email) ?? 0;
  if (Date.now() - last < RESEND_THROTTLE_MS) {
    return {
      ok: false,
      reason: "Please wait a few seconds before requesting another code.",
    };
  }

  try {
    const record = await issueOtp({
      email,
      intent: existing.intent,
      signupPayload: existing.signupPayload,
      userId: existing.userId,
    });
    return { ok: true, record };
  } catch (err) {
    logger.error({ err, email }, "[otp] Failed to resend OTP");
    return { ok: false, reason: "Unable to resend verification email. Please try again later." };
  }
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  record?: OtpRecord;
}

export function verifyOtp(emailRaw: string, code: string): VerifyResult {
  const email = emailRaw.toLowerCase();
  const record = otpCodes.get(email);
  if (!record) {
    // Return the same generic message as an incorrect code to prevent callers
    // from probing whether an OTP record (and therefore an account) exists.
    return { ok: false, reason: "Invalid code. Please try again." };
  }
  if (Date.now() > record.expiresAt) {
    otpCodes.delete(email);
    return { ok: false, reason: "This code has expired. Please request a new one." };
  }
  record.attempts += 1;
  if (record.attempts > OTP_MAX_ATTEMPTS) {
    otpCodes.delete(email);
    return {
      ok: false,
      reason: "Too many incorrect attempts. Please start over and request a new code.",
    };
  }
  if (record.code !== code) {
    return { ok: false, reason: "Incorrect code. Please try again." };
  }
  otpCodes.delete(email);
  lastSentAt.delete(email);
  return { ok: true, record };
}

export function _otpStoreSize(): number {
  return otpCodes.size;
}

export function _getOtpRecord(email: string): OtpRecord | undefined {
  return otpCodes.get(email.toLowerCase());
}
