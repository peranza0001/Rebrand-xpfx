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
import { getPrismaClient } from "./db-persist";
import { getDb } from "./db-client";
import { eq } from "drizzle-orm";
import { otpCodesTable } from "@workspace/db/schema";

interface SignupPayload {
  email: string;
  passwordHash: string;
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

function toDbOtpRecord(record: OtpRecord, userId?: string) {
  return {
    email: record.email,
    userId: userId ?? "00000000-0000-0000-0000-000000000000",
    code: record.code,
    type: record.intent,
    expiresAt: new Date(record.expiresAt),
    used: false,
    signupPayload: record.signupPayload ?? null,
    createdAt: new Date(),
  };
}

function toPrismaOtpRecord(record: OtpRecord) {
  return {
    email: record.email,
    user_id: record.userId ?? "00000000-0000-0000-0000-000000000000",
    code: record.code,
    type: record.intent,
    expires_at: new Date(record.expiresAt),
    used: false,
    signup_payload: record.signupPayload ?? null,
    created_at: new Date(),
  };
}

async function persistOtpRecord(record: OtpRecord): Promise<void> {
  const db = getDb();
  if (db) {
    try {
      await db.insert(otpCodesTable).values(toDbOtpRecord(record));
      return;
    } catch (err) {
      logger.warn({ err, email: record.email }, "[otp] failed to persist OTP to Drizzle");
    }
  }

  const prisma = getPrismaClient();
  const prismaOtpDelegate = prisma?.otpCode ?? prisma?.otp_codes ?? prisma?.OtpCode ?? prisma?.OtpCode;
  if (prismaOtpDelegate?.create) {
    try {
      await prismaOtpDelegate.create({ data: toPrismaOtpRecord(record) });
    } catch (err) {
      logger.warn({ err, email: record.email }, "[otp] failed to persist OTP to Prisma");
    }
  }
}

async function markOtpUsed(emailRaw: string, code: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  const db = getDb();
  if (db) {
    try {
      await db.update(otpCodesTable)
        .set({ used: true })
        .where(
          eq(otpCodesTable.email, email),
          eq(otpCodesTable.code, code),
          eq(otpCodesTable.used, false),
        );
    } catch (err) {
      logger.warn({ err, email, code }, "[otp] failed to mark OTP record as used in Drizzle");
    }
  }

  const prisma = getPrismaClient();
  if (prisma?.otpCode?.updateMany) {
    try {
      await prisma.otpCode.updateMany({
        where: { email, code, used: false },
        data: { used: true },
      });
    } catch (err) {
      logger.warn({ err, email, code }, "[otp] failed to mark OTP record as used in Prisma");
    }
  }
}

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
      { to: maskEmail(email), subject, smtpConfigured: false, intent },
      "[otp] Verification code generated (stub send — no email provider configured)",
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
    await persistOtpRecord(record);
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

export async function restoreOtpCodesFromStorage(): Promise<OtpRecord[]> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(otpCodesTable)
        .where(eq(otpCodesTable.used, false))
        .orderBy(otpCodesTable.createdAt, 'desc');
      const restored: OtpRecord[] = [];
      const restoredEmails = new Set<string>();
      for (const row of rows) {
        const email = (row as any).email ?? "";
        if (!email || !row.code || !row.type) continue;
        if (restoredEmails.has(email)) continue;
        const normalized = {
          email,
          code: row.code,
          intent: row.type as OtpIntent,
          expiresAt: new Date(row.expiresAt).getTime(),
          attempts: 0,
          signupPayload: (row as any).signupPayload ?? undefined,
          userId: row.userId ?? undefined,
        };
        restoredEmails.add(email);
        if (!otpCodes.has(email)) {
          otpCodes.set(email, normalized);
        }
        restored.push(normalized);
      }
      return restored;
    } catch (err) {
      logger.warn({ err }, "[otp] failed to restore OTPs from Drizzle");
    }
  }

  const prisma = getPrismaClient();
  const prismaOtpDelegate = prisma?.otpCode ?? prisma?.otp_codes ?? prisma?.OtpCode ?? prisma?.OtpCode;
  if (prismaOtpDelegate?.findMany) {
    try {
      const rows = await prismaOtpDelegate.findMany({ where: { used: false }, orderBy: { created_at: 'desc' } });
      logger.info({ rowCount: rows.length, sample: rows[0] }, '[otp] restoring OTPs from Prisma');
      const restored: OtpRecord[] = [];
      for (const row of rows) {
        const email = (row as any).email ?? "";
        if (!email || !row?.code || !row?.type) continue;
        if (otpCodes.has(email)) continue;
        const normalized = {
          email,
          code: row.code,
          intent: row.type as OtpIntent,
          expiresAt: new Date((row as any).expires_at ?? (row as any).expiresAt).getTime(),
          attempts: 0,
          signupPayload: (row as any).signup_payload ?? (row as any).signupPayload ?? undefined,
          userId: (row as any).user_id ?? (row as any).userId ?? undefined,
        };
        logger.info({ normalized, row }, '[otp] restored OTP row');
        if (!otpCodes.has(email)) {
          otpCodes.set(email, normalized);
        }
        restored.push(normalized);
      }
      return restored;
    } catch (err) {
      logger.warn({ err }, "[otp] failed to restore OTPs from Prisma");
    }
  }

  return [];
}

export function _otpStoreSize(): number {
  return otpCodes.size;
}

export function _clearOtpStore(): void {
  otpCodes.clear();
  lastSentAt.clear();
}

export function _getOtpRecord(email: string): OtpRecord | undefined {
  return otpCodes.get(email.toLowerCase());
}
