/**
 * Password recovery routes — forgot password (email reset link),
 * reset password (token validation + update), and change password
 * (logged-in user, requires current password confirmation).
 *
 * These are NEW additive routes; no existing auth logic is modified.
 */
import { Router } from "express";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { requireAuth } from "../lib/session";
import { users, usersByEmail, hashPassword, logActivity } from "../lib/store";
import { persistUser, persistResetPasswordToken, getPersistedUserByEmail, getPrismaClient } from "../lib/db-persist";
import { sendEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { env } from "../lib/env";
import {
  generatePasswordResetToken,
  getResetTokenInfo,
  markResetTokenAsUsed,
} from "../lib/password-reset";

const router = Router();

interface ResetRecord {
  userId: string;
  expiresAt: number;
}

const resetTokens = new Map<string, ResetRecord>();

function verifyPassword(supplied: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const suppliedBuf = scryptSync(supplied, salt, 64);
    const storedBuf = Buffer.from(hash, "hex");
    return timingSafeEqual(suppliedBuf, storedBuf);
  } catch {
    return false;
  }
}

async function getTokenRecord(token: string): Promise<ResetRecord | null> {
  const record = resetTokens.get(token);
  if (record) return record;

  const tokenInfo = getResetTokenInfo(token);
  if (tokenInfo) {
    const userId = usersByEmail.get(tokenInfo.email.toLowerCase());
    if (!userId) return null;
    return {
      userId,
      expiresAt: Date.now() + tokenInfo.expiresInSeconds * 1000,
    };
  }

  const prisma = getPrismaClient();
  if (!prisma?.user) return null;

  try {
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token },
      select: { id: true, resetPasswordExpiry: true },
    });
    if (!user || !user.resetPasswordExpiry) return null;
    const expiresAt = user.resetPasswordExpiry instanceof Date
      ? user.resetPasswordExpiry.getTime()
      : new Date(user.resetPasswordExpiry).getTime();
    return { userId: user.id, expiresAt };
  } catch {
    return null;
  }
}

function clearResetTokensForUser(userId: string): void {
  for (const [tok, data] of resetTokens) {
    if (data.userId === userId) {
      resetTokens.delete(tok);
    }
  }
}

function normalizeHostHeader(value?: string): string | undefined {
  if (!value) return undefined;
  const first = value.split(",")[0]?.trim();
  if (!first) return undefined;
  return first.replace(/\/+$/, "");
}

export function resolveAppOriginFromRequest(req: { get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> } | undefined): string {
  const headers = req?.headers ?? {};
  const headerHost = normalizeHostHeader(req?.get?.("host") || (typeof headers.host === "string" ? headers.host : Array.isArray(headers.host) ? headers.host[0] : undefined));
  const forwardedHost = normalizeHostHeader(req?.get?.("x-forwarded-host") || (typeof headers["x-forwarded-host"] === "string"
    ? headers["x-forwarded-host"]
    : Array.isArray(headers["x-forwarded-host"])
      ? headers["x-forwarded-host"][0]
      : undefined));
  const origin = typeof headers.origin === "string" ? headers.origin : undefined;
  const protocolHeader = req?.get?.("x-forwarded-proto") || (typeof headers["x-forwarded-proto"] === "string" ? headers["x-forwarded-proto"] : undefined);
  const protocol = protocolHeader?.split(",")[0]?.trim() || (origin ? new URL(origin).protocol.replace(":", "") : "https");

  const preferredHost = forwardedHost || headerHost || (origin ? normalizeHostHeader(new URL(origin).host) : undefined);
  if (preferredHost) {
    return `${protocol}://${preferredHost}`;
  }

  const allowed = env.ALLOWED_ORIGINS?.split(",").map((candidate) => candidate.trim()).find(Boolean);
  if (allowed) return allowed.replace(/\/+$/, "");
  const replit = env.REPLIT_DOMAINS?.split(",").map((candidate) => candidate.trim()).find(Boolean);
  if (replit) return `https://${replit.replace(/\/+$/, "")}`;
  return "https://xpressprofx.com";
}

/**
 * POST /auth/forgot-password
 * Accepts an email. Sends a reset link if the address is registered.
 * Always returns 200 (no email enumeration).
 */
router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: unknown };
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  const normalized = email.toLowerCase().trim();
  let userId = usersByEmail.get(normalized);
  if (!userId) {
    const persistedUser = await getPersistedUserByEmail(normalized);
    if (persistedUser) {
      userId = persistedUser.user.id;
      users.set(userId, persistedUser);
      usersByEmail.set(normalized, userId);
    }
  }

  if (userId) {
    const stored = users.get(userId);
    if (stored && !stored.disabled && stored.role !== "demo") {
      clearResetTokensForUser(userId);
      const token = generatePasswordResetToken(normalized);
      const expiresAt = Date.now() + 30 * 60 * 1000;
      resetTokens.set(token, {
        userId,
        expiresAt,
      });
      const tokenPersisted = await persistResetPasswordToken(userId, token, new Date(expiresAt));
      if (!tokenPersisted) {
        resetTokens.delete(token);
        logger.error({ userId }, "[auth-password] Reset token persistence failed");
        return res.json({
          ok: true,
          message: "If that email address is registered, a reset link has been sent.",
        });
      }
      const resetUrl = `${resolveAppOriginFromRequest(req)}/reset-password?token=${token}`;
      try {
        await sendEmail({
          to: normalized,
          subject: "Reset your XpressPro FX password",
          kind: "auth.forgot_password",
          text: [
            `Hi ${stored.user.fullName},`,
            "",
            "You requested a password reset for your XpressPro FX account.",
            "Click the link below to set a new password. This link expires in 30 minutes.",
            "",
            resetUrl,
            "",
            "If you did not request this, you can safely ignore this email.",
          ].join("\n"),
          html: [
            `<p>Hi ${stored.user.fullName},</p>`,
            "<p>You requested a password reset for your XpressPro FX account.</p>",
            "<p>Click the link below to set a new password. <strong>This link expires in 30 minutes.</strong></p>",
            `<p><a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>`,
            `<p>Or copy this link: <code>${resetUrl}</code></p>`,
            "<p>If you did not request this, you can safely ignore this email.</p>",
          ].join(""),
        });
      } catch (err) {
        logger.error({ err }, "[auth] Failed to send password reset email");
      }
      logActivity({
        actorId: userId,
        actorName: stored.user.fullName,
        action: "auth.forgot_password",
        detail: `Password reset email sent to ${normalized}.`,
      });
    }
  }

  return res.json({
    ok: true,
    message: "If that email address is registered, a reset link has been sent.",
  });
});

/**
 * POST /auth/reset-password
 * Verifies the token (single-use, 30-min TTL) and sets the new password.
 */
router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body as { token?: unknown; newPassword?: unknown };

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Reset token is required." });
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const record = await getTokenRecord(token);
  if (!record || Date.now() > record.expiresAt) {
    if (record) {
      clearResetTokensForUser(record.userId);
      void persistResetPasswordToken(record.userId, null, null);
    }
    resetTokens.delete(token);
    markResetTokenAsUsed(token);
    return res.status(400).json({
      error: "This reset link is invalid or has expired. Please request a new one.",
    });
  }

  const stored = users.get(record.userId);
  if (!stored) {
    // If the user exists in DB but is not loaded into memory, we still
    // want the reset operation to succeed for the persisted account.
    const prisma = getPrismaClient();
    const userDelegate = prisma?.user?.findUnique
      ? prisma.user
      : prisma?.users?.findUnique
        ? prisma.users
        : null;
    if (userDelegate) {
      try {
        const dbUser = await userDelegate.findUnique({
          where: { id: record.userId },
        });
        if (dbUser) {
          // We don't have a fully hydrated in-memory user, but the reset
          // can still proceed by clearing the persistent token and letting
          // future login use the updated hashed password from the DB.
          const newHash = hashPassword(newPassword);
          const isSnakeCaseDelegate = userDelegate === prisma.users;
          await userDelegate.update({
            where: { id: record.userId },
            data: isSnakeCaseDelegate
              ? {
                password_hash: newHash,
                reset_password_token: null,
                reset_password_expiry: null,
              }
              : {
                passwordHash: newHash,
                resetPasswordToken: null,
                resetPasswordExpiry: null,
              },
          });
          clearResetTokensForUser(record.userId);
          return res.json({ ok: true, message: "Password updated successfully. You can now log in." });
        }
      } catch {
        // Fall through to generic not found handler.
      }
    }
    resetTokens.delete(token);
    return res.status(404).json({ error: "Account not found." });
  }

  stored.passwordHash = hashPassword(newPassword);
  clearResetTokensForUser(record.userId);
  resetTokens.delete(token);
  markResetTokenAsUsed(token);
  const userPersisted = await persistUser(record.userId, {
    email: stored.user.email,
    username: stored.user.username,
    passwordHash: stored.passwordHash,
    fullName: stored.user.fullName,
    country: stored.user.country,
    phone: stored.phone,
  });
  const tokenCleared = await persistResetPasswordToken(record.userId, null, null);
  if (!userPersisted || !tokenCleared) {
    logger.warn({ userId: record.userId }, "[auth-password] reset persistence failed; continuing with in-memory password update");
  }

  logActivity({
    actorId: record.userId,
    actorName: stored.user.fullName,
    action: "auth.reset_password",
    detail: "Password reset via email link.",
  });

  return res.json({ ok: true, message: "Password updated successfully. You can now log in." });
});

/**
 * PATCH /auth/password
 * Change password for a logged-in user. Requires the current password.
 */
router.patch("/auth/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({ error: "Current password is required." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must differ from your current password." });
  }

  const stored = users.get(req.userId!);
  if (!stored) return res.status(404).json({ error: "User not found." });
  if (stored.role === "demo") {
    return res.status(403).json({ error: "Demo accounts cannot change passwords." });
  }

  if (!verifyPassword(currentPassword, stored.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  stored.passwordHash = hashPassword(newPassword);

  logActivity({
    actorId: req.userId!,
    actorName: stored.user.fullName,
    action: "auth.change_password",
    detail: "Password changed by user.",
  });

  return res.json({ ok: true, message: "Password changed successfully." });
});

export default router;
