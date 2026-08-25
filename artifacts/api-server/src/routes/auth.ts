// /auth routes — signup, login, logout, session, demo, OTP verify/resend, skip-wallet.
import { randomBytes } from "crypto";
import { Router, type IRouter } from "express";
import {
  LoginBody,
  ResendOtpBody,
  SignupBody,
  UpdateOwnProfileBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import { isDemoAuthEnabled, isDemoRouteAvailable, isProduction } from "../lib/env";
import {
  createIsolatedDemoUser,
  ensureDemoUser,
  freshUserData,
  getUserData,
  hashPassword,
  logActivity,
  newReferralCode,
  newSessionId,
  newUuid,
  NOW,
  p2pMerchantApplications,
  referralCodeIndex,
  referrals,
  sessions,
  userData,
  users,
  usersByEmail,
  verifyPassword,
  type StoredUser,
} from "../lib/store";
import { logger } from "../lib/logger";
import {
  clearSessionCookie,
  getSessionId,
  requireAuth,
  setSessionCookie,
  requireAdmin,
} from "../lib/session";
import { getDb } from "../lib/db-client";
import * as dbSchema from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { persistSession, persistUser, getPrismaClient, deleteSession, listSessionsForUser, deleteSessionsForUser } from "../lib/db-persist";
import { pushAdminAlert } from "../lib/notify";
import { isLoginLocked, recordLoginFailure, resetLoginFailures, canSendOtp, recordOtpSent, canSendOtpFromIp, recordOtpSentFromIp } from "../lib/auth-throttle";
import { passwordResetRouter } from "./password-reset";
import {
  issueOtp,
  resendOtp as resendOtpFn,
  verifyOtp as verifyOtpFn,
  _getOtpRecord,
  OTP_TTL_MS,
} from "../lib/otp";
import { validatePasswordStrength } from "../lib/password-validation";

const router: IRouter = Router();

function sessionFor(stored: StoredUser, isDemo = false) {
  const data = userData.get(stored.user.id);
  const app = [...p2pMerchantApplications.values()]
    .filter((a) => a.userId === stored.user.id)
    .sort((a, b) => (b.submittedAt > a.submittedAt ? 1 : -1))[0];
  const merchantStatus: "pending" | "approved" | "rejected" | null =
    app?.status ?? null;
  return {
    user: stored.user,
    role: stored.role,
    isDemo,
    walletSkipped: data?.walletSkipped ?? false,
    isMerchant: stored.merchant === true,
    merchantStatus,
  };
}

function otpChallenge(email: string, intent: "signup" | "login") {
  return {
    status: "otp_required" as const,
    email,
    intent,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    message: `We sent a 6-digit verification code to ${email}. Enter it to continue.`,
  };
}

async function isUsernameTaken(username: string): Promise<boolean> {
  for (const stored of users.values()) {
    if (stored.user.username === username) {
      return true;
    }
  }

  const db = getDb();
  if (db) {
    try {
      const rows = await db.select().from(dbSchema.usersTable).where(eq(dbSchema.usersTable.username, username));
      if (rows.length > 0) {
        return true;
      }
    } catch (err) {
      logger.warn({ err, username }, "[auth] username uniqueness db lookup failed");
    }
  }

  const prisma = getPrismaClient();
  const prismaUserDelegate = prisma?.user?.findUnique ? prisma.user : prisma?.users?.findUnique ? prisma.users : null;
  if (prismaUserDelegate?.findUnique) {
    try {
      const row = await prismaUserDelegate.findUnique({ where: { username } });
      if (row) {
        return true;
      }
    } catch (err) {
      logger.warn({ err, username }, "[auth] username uniqueness prisma lookup failed");
    }
  }

  return false;
}

async function deriveUniqueUsername(email: string): Promise<string> {
  const base = (email.split("@")[0] || "trader").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "trader";
  let candidate = base;
  let suffix = 1;

  while (await isUsernameTaken(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
    if (suffix > 100) {
      candidate = `${base}-${randomBytes(3).toString("hex")}`;
      break;
    }
  }

  return candidate;
}

async function resolvePersistedUserIdByEmail(email: string): Promise<string | undefined> {
  const lowerEmail = email.toLowerCase();
  const existing = usersByEmail.get(lowerEmail);
  if (existing) return existing;

  const db = getDb();
  if (db) {
    try {
      const rows = await db.select().from(dbSchema.usersTable).where(eq(dbSchema.usersTable.email, lowerEmail));
      if (rows.length > 0) {
        const row: any = rows[0];
        const id = String(row.id);
        const stored: StoredUser = {
          user: {
            id,
            username: (row.username as string) ?? lowerEmail.split("@")[0],
            email: row.email,
            fullName: (row.fullName as string) ?? row.email,
            country: (row.country as string) ?? "US",
            kycVerified: Boolean(row.kycVerified),
            avatarUrl: row.avatarUrl ?? undefined,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            selectedManagerId: row.selectedManagerId ?? null,
            phone: row.phone ?? null,
            merchant: false,
            moonpayEmail: row.moonpayEmail ?? null,
            buyVerified: Boolean(row.buyVerified),
          },
          passwordHash: row.passwordHash ?? row.password_hash ?? row.password ?? "",
          role: (row.role as any) ?? "user",
          referralCode: (row.referralCode as string) ?? "",
          referredBy: row.referredBy ?? null,
          merchant: false,
          tradingLocked: Boolean(row.tradingLocked),
          demoMode: Boolean(row.demoMode),
          phone: row.phone ?? null,
          accountFlag: null,
          suspended: false,
          disabled: false,
        } as StoredUser;
        users.set(id, stored);
        usersByEmail.set(lowerEmail, id);
        if (!userData.has(id)) {
          userData.set(id, freshUserData(id, { country: stored.user.country }));
        }
        return id;
      }
    } catch (err) {
      logger.warn({ err, email: lowerEmail }, "[auth] resolvePersistedUserIdByEmail db lookup failed");
    }
  }

  const prisma = getPrismaClient();
  const userDelegate = prisma?.user?.findUnique ? prisma.user : prisma?.users?.findUnique ? prisma.users : null;
  if (userDelegate?.findUnique) {
    try {
      const row = await userDelegate.findUnique({ where: { email: lowerEmail } });
      if (row) {
        const id = String(row.id);
        const stored: StoredUser = {
          user: {
            id,
            username: row.username ?? lowerEmail.split("@")[0],
            email: row.email,
            fullName: row.fullName ?? row.email,
            country: row.country ?? "US",
            kycVerified: Boolean(row.kycVerified ?? false),
            avatarUrl: row.avatarUrl ?? undefined,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            selectedManagerId: row.selectedManagerId ?? null,
            phone: row.phone ?? null,
            merchant: false,
            moonpayEmail: row.moonpayEmail ?? null,
            buyVerified: Boolean(row.buyVerified ?? false),
          },
          passwordHash: row.passwordHash ?? "",
          role: (row.role as any) ?? "user",
          referralCode: row.referralCode ?? "",
          referredBy: row.referredBy ?? null,
          merchant: false,
          tradingLocked: Boolean(row.tradingLocked ?? false),
          demoMode: Boolean(row.demoMode ?? false),
          phone: row.phone ?? null,
          accountFlag: null,
          suspended: false,
          disabled: false,
        } as StoredUser;
        users.set(id, stored);
        usersByEmail.set(lowerEmail, id);
        if (!userData.has(id)) {
          userData.set(id, freshUserData(id, { country: stored.user.country }));
        }
        return id;
      }
    } catch (err) {
      logger.warn({ err, email: lowerEmail }, "[auth] resolvePersistedUserIdByEmail prisma lookup failed");
    }
  }

  return undefined;
}

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid signup", details: parsed.error.issues });
  }

  // Validate password strength before creating account
  const passwordValidation = validatePasswordStrength(parsed.data.password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: "Password does not meet security requirements",
      code: "weak_password",
      details: passwordValidation.errors,
      strength: passwordValidation.strength,
    });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUserId = await resolvePersistedUserIdByEmail(email);

  if (existingUserId) {
    logger.warn({ email, existingUserId }, "[auth] signup.email_already_registered");
    return res.json(otpChallenge(parsed.data.email, "signup"));
  }

  // Account is NOT created yet — we hold the payload in the OTP record and
  // only commit once the email has been verified.
  try {
    // Throttle OTP sends per-email and per-IP to reduce abuse
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    if (!canSendOtp(email) || !canSendOtpFromIp(ip)) {
      logger.warn({ email, ip }, "[auth] signup.otp_throttled");
      return res.json(otpChallenge(parsed.data.email, "signup"));
    }

    await issueOtp({ email, intent: "signup", signupPayload: parsed.data });
    recordOtpSent(email);
    recordOtpSentFromIp(ip);
  } catch (err) {
    logger.error({ err, email }, "[auth] Failed to issue OTP for signup");
    return res.status(503).json({ error: "Email verification is temporarily unavailable. Configure SMTP or SendGrid to enable signup." });
  }
  return res.json(otpChallenge(parsed.data.email, "signup"));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login" });
  }
  const emailLower = parsed.data.email.toLowerCase();
  if (isLoginLocked(emailLower)) {
    logger.warn({ email: emailLower }, "[auth] login.locked_out");
    return res.status(429).json({ error: "Too many attempts. Try again later.", code: "too_many_requests" });
  }
  // Ensure demo user is seeded for the direct login flow when demo auth is enabled.
  if (isDemoAuthEnabled && emailLower === "demo@xpressprofx.com") {
    ensureDemoUser();
    logger.info({
      email: emailLower,
      isDemoAuthEnabled,
      usersByEmailHas: usersByEmail.has(emailLower),
      usersSize: users.size,
    }, "[auth] login.demo_seed_check");
  }

  let userId = usersByEmail.get(emailLower);
  if (!userId) {
    userId = await resolvePersistedUserIdByEmail(emailLower);
  }
  logger.info({ email: emailLower, userId: userId ?? null }, "[auth] login.attempt");
  let stored = userId ? users.get(userId) : undefined;
  if (!stored) {
    logger.warn({ email: emailLower }, "[auth] login.no_user");
    recordLoginFailure(emailLower);
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }
  if (stored.disabled) {
    logger.warn({ email: emailLower, userId: stored.user.id }, "[auth] login.disabled");
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }
  if (!verifyPassword(parsed.data.password, stored.passwordHash)) {
    logger.warn({ email: emailLower, userId: stored.user.id }, "[auth] login.invalid_password");
    recordLoginFailure(emailLower);
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }

  const sid = newSessionId();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // capture lightweight metadata for the session
  const meta = { ip: req.ip || (req.headers['x-forwarded-for'] as string) || '', userAgent: req.headers['user-agent'] ?? '', createdAt: new Date().toISOString() };
  const sessionPersisted = await persistSession(sid, stored.user.id, sessionExpiresAt, stored.role === "admin", meta);
  logger.info({ userId: stored.user.id, email: stored.user.email, role: stored.role, sessionPersisted }, "[auth] login.session_persist_outcome");
  if (!sessionPersisted) {
    logger.warn({ userId: stored.user.id, email: stored.user.email }, "[auth] login.session_persist_failed_fallback_to_memory");
  }
  sessions.set(sid, { userId: stored.user.id, expiresAt: sessionExpiresAt, metadata: meta });
  setSessionCookie(res, sid);
  // Successful login — reset any failure counters
  try { resetLoginFailures(emailLower); } catch { /* best-effort */ }
  logActivity({
    actorId: stored.user.id,
    actorName: stored.user.fullName,
    action: "auth.login",
    detail: stored.role === "admin"
      ? `Admin login (${stored.user.email})`
      : `User login (${stored.user.email})`,
  });

  if (stored.role === "admin") {
    pushAdminAlert({
      kind: "auth.admin_login",
      title: "Admin signed in",
      body: `${stored.user.email} signed into the admin portal.`,
      userId: stored.user.id,
      userEmail: stored.user.email,
      severity: "info",
      linkUrl: `/users/${stored.user.id}`,
      email: true,
    });
  }

  return res.json({ ...sessionFor(stored), status: "authenticated" as const });
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid verification request" });
  }
  const result = await verifyOtpFn(parsed.data.email, parsed.data.code);
  if (!result.ok || !result.record) {
    // Always return the same generic message regardless of internal reason
    // (missing record, wrong code, expired, too many attempts). Exposing
    // distinct reason strings would let callers probe whether an OTP record
    // exists and therefore infer account registration status.
    return res.status(400).json({ error: "Invalid code." });
  }
  const record = result.record;

  if (record.intent === "signup") {
    const payload = record.signupPayload;
    if (!payload) {
      return res.status(500).json({ error: "Signup payload missing — please retry signup." });
    }
    const email = payload.email.toLowerCase();
    const existingUserId = await resolvePersistedUserIdByEmail(email);
    if (existingUserId) {
      // Do not reveal whether an account exists. Return a generic error so
      // callers cannot infer account registration status.
      logger.warn({ email }, "[auth] signup.verify_otp_account_exists");
      return res.status(400).json({ error: "Invalid code." });
    }
    const id = newUuid();
    const referralCode = newReferralCode();
    let referredBy: string | null = null;
    if (payload.referralCode) {
      const referrerId = referralCodeIndex.get(payload.referralCode.trim());
      if (referrerId) referredBy = referrerId;
    }
    const username = await deriveUniqueUsername(email);
    const stored: StoredUser = {
      user: {
        id,
        username,
        email,
        fullName: payload.fullName,
        country: payload.country,
        kycVerified: false,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}&backgroundColor=b6e3f4`,
        createdAt: NOW(),
        selectedManagerId: null,
        buyVerified: false,
      },
      passwordHash: hashPassword(payload.password),
      role: "user",
      referralCode,
      referredBy,
      merchant: false,
      tradingLocked: false,
      demoMode: false,
      phone: null,
      accountFlag: null,
      suspended: false,
      disabled: false,
    };
    if (referredBy) {
      const list = referrals.get(referredBy) ?? [];
      list.push({
        referrerId: referredBy,
        referredId: id,
        referredName: payload.fullName,
        joinedAt: NOW(),
        status: "pending",
        earned: 0,
      });
      referrals.set(referredBy, list);
    }

    const userPersisted = await persistUser(id, {
      email,
      username: stored.user.username,
      passwordHash: stored.passwordHash,
      fullName: payload.fullName,
      country: payload.country,
      phone: null,
    });
    if (!userPersisted) {
      logger.error({ userId: id, email: payload.email }, "[auth] signup.user_persist_failed");
      return res.status(503).json({ error: "Account storage is temporarily unavailable. Please try again." });
    }

    users.set(id, stored);
    usersByEmail.set(email, id);
    referralCodeIndex.set(referralCode, id);
    referrals.set(id, []);
    userData.set(id, freshUserData(id, { country: payload.country }));

    const sid = newSessionId();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const meta = { ip: req.ip || (req.headers['x-forwarded-for'] as string) || '', userAgent: req.headers['user-agent'] ?? '', createdAt: new Date().toISOString() };
    const sessionPersisted = await persistSession(sid, id, sessionExpiresAt, false, meta);
    if (!sessionPersisted) {
      logger.error({ userId: id, email: payload.email }, "[auth] signup.session_persist_failed");
      return res.status(503).json({ error: "Session storage is temporarily unavailable. Please try again." });
    }
    sessions.set(sid, { userId: id, expiresAt: sessionExpiresAt, metadata: meta });
    setSessionCookie(res, sid);
    logActivity({
      actorId: id,
      actorName: payload.fullName,
      action: "auth.signup",
      detail: `New user signup verified via OTP (${payload.email})`,
    });
    pushAdminAlert({
      kind: "auth.signup",
      title: "New user signed up",
      body: `${payload.email} (${payload.fullName}) created an account${referredBy ? " via referral" : ""}.`,
      userId: id,
      userEmail: payload.email,
      severity: "info",
      linkUrl: `/users/${id}`,
      email: true,
    });
    return res.json(sessionFor(stored));
  }

  // intent === "login"
  const userId = record.userId;
  if (!userId) {
    return res.status(500).json({ error: "Session payload missing — please log in again." });
  }
  const stored = users.get(userId);
  if (!stored) {
    return res.status(404).json({ error: "User no longer exists." });
  }
  const sid = newSessionId();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const meta = { ip: req.ip || (req.headers['x-forwarded-for'] as string) || '', userAgent: req.headers['user-agent'] ?? '', createdAt: new Date().toISOString() };
  const sessionPersisted = await persistSession(sid, stored.user.id, sessionExpiresAt, stored.role === "admin", meta);
  logger.info({ userId: stored.user.id, email: stored.user.email, role: stored.role, sessionPersisted }, "[auth] verify-otp.login.session_persist_outcome");
  if (!sessionPersisted) {
    logger.warn({ userId: stored.user.id, email: stored.user.email }, "[auth] verify-otp.login.session_persist_failed_fallback_to_memory");
  }
  sessions.set(sid, { userId: stored.user.id, expiresAt: sessionExpiresAt, metadata: meta });
  setSessionCookie(res, sid);
  try { resetLoginFailures(stored.user.email.toLowerCase()); } catch { /* best-effort */ }
  logActivity({
    actorId: stored.user.id,
    actorName: stored.user.fullName,
    action: "auth.login",
    detail: `Login verified via OTP (${stored.user.email})`,
  });
  pushAdminAlert({
    kind: "auth.login",
    title: "User signed in",
    body: `${stored.user.email} signed in (OTP-verified).`,
    userId: stored.user.id,
    userEmail: stored.user.email,
    severity: "info",
    linkUrl: `/users/${stored.user.id}`,
  });
  return res.json(sessionFor(stored));
});

router.post("/auth/resend-otp", async (req, res) => {
  const parsed = ResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid resend request" });
  }
  // Always return the same 200 OTP-challenge response regardless of the internal
  // resend outcome. Returning 400 only when a pending record exists would let
  // callers distinguish registered emails from unregistered ones by response code
  // or by throttle vs. "no pending verification" messages.
  let result;
  try {
    // Throttle per-email and per-IP resend to reduce abuse
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    if (!canSendOtp(parsed.data.email) || !canSendOtpFromIp(ip)) {
      logger.warn({ email: parsed.data.email, ip }, "[auth] resend_otp.throttled");
      return res.json(otpChallenge(parsed.data.email, "signup"));
    }
    result = await resendOtpFn(parsed.data.email);
    if (result.ok) {
      recordOtpSent(parsed.data.email);
      recordOtpSentFromIp(ip);
    }
  } catch (err) {
    logger.error({ err, email: parsed.data.email }, "[auth] Failed to resend OTP");
    return res.status(500).json({ error: "Unable to resend verification email. Please try again later." });
  }
  const intent = result.record?.intent ?? "signup";
  return res.json(otpChallenge(parsed.data.email, intent));
});

if (!isProduction) {
  router.get("/auth/dev-otp", (req, res) => {
    const email = String(req.query.email ?? "").toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email query parameter is required." });
    }
    const record = _getOtpRecord(email);
    if (!record) {
      return res.status(404).json({ error: "OTP record not found." });
    }
    return res.json({ email: record.email, code: record.code, intent: record.intent });
  });
}

router.post("/auth/skip-wallet", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  data.walletSkipped = true;
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "wallet.skip",
    detail: "User dismissed the connect-wallet interstitial",
  });
  return res.json(sessionFor(req.storedUser!));
});

router.post("/auth/logout", async (req, res) => {
  const sid = getSessionId(req);
  if (sid) {
    sessions.delete(sid);
    // best-effort remove persisted session if present
    try {
      await deleteSession(sid);
    } catch {
      // ignore
    }
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/auth/session", (req, res) => {
  if (!req.storedUser) {
    return res.json({ user: null, role: "guest", isDemo: false, walletSkipped: false, isMerchant: false, merchantStatus: null });
  }
  return res.json(sessionFor(req.storedUser));
});

router.get("/auth/sessions", requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    const persisted = await listSessionsForUser(userId);
    const sid = getSessionId(req);
    const inMemory = [...sessions.entries()].filter(([, rec]) => rec.userId === userId).map(([id]) => id);
    const combined = persisted.map((p) => ({ id: p.id, expiresAt: p.expiresAt, isAdmin: p.isAdmin, isCurrent: sid === p.id || inMemory.includes(p.id), metadata: (p as any).metadata ?? undefined }));
    // Include any in-memory-only sessions not present in persisted rows
    for (const id of inMemory) {
      if (!combined.find((c) => c.id === id)) combined.push({ id, expiresAt: null, isAdmin: false, isCurrent: sid === id, metadata: sessions.get(id)?.metadata });
    }
    return res.json({ sessions: combined });
  } catch (err) {
    logger.error({ err, userId }, "[auth] sessions.list_failed");
    return res.status(500).json({ error: "Unable to list sessions" });
  }
});

router.delete("/auth/sessions/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const target = String(req.params.id || "");
  // Ensure the session belongs to the user (or is current)
  const ownerInMemory = sessions.get(target);
  const ownerInMemoryUserId = ownerInMemory?.userId ?? undefined;
  if (ownerInMemoryUserId && ownerInMemoryUserId !== userId) {
    return res.status(403).json({ error: "Not authorized to revoke that session." });
  }
  try {
    // Best-effort delete persisted session
    await deleteSession(target);
  } catch {}
  // Remove in-memory mapping
  sessions.delete(target);
  logActivity({ actorId: userId, actorName: req.storedUser!.user.fullName, action: "auth.session.revoke", detail: `Revoked session ${target}` });
  return res.json({ success: true });
});

router.post("/auth/sessions/revoke-all", requireAuth, async (req, res) => {
  const userId = req.userId!;
  try {
    // Delete persisted sessions
    await deleteSessionsForUser(userId);
    // Delete in-memory sessions
    for (const [sid, rec] of sessions.entries()) {
      if (rec.userId === userId) sessions.delete(sid);
    }
    logActivity({ actorId: userId, actorName: req.storedUser!.user.fullName, action: "auth.session.revoke_all", detail: `Revoked all sessions for user` });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, "[auth] sessions.revoke_all_failed");
    return res.status(500).json({ error: "Unable to revoke sessions" });
  }
});

// Admin session management
router.get("/admin/users/:id/sessions", requireAuth, requireAdmin, async (req, res) => {
  const targetUser = String(req.params.id || "");
  try {
    const persisted = await listSessionsForUser(targetUser);
    const inMemory = [...sessions.entries()].filter(([, rec]) => rec.userId === targetUser).map(([id]) => id);
    const combined = persisted.map((p) => ({ id: p.id, expiresAt: p.expiresAt, isAdmin: p.isAdmin, inMemory: inMemory.includes(p.id), metadata: (p as any).metadata ?? undefined }));
    for (const id of inMemory) {
      if (!combined.find((c) => c.id === id)) combined.push({ id, expiresAt: null, isAdmin: false, inMemory: true, metadata: sessions.get(id)?.metadata });
    }
    return res.json({ sessions: combined });
  } catch (err) {
    logger.error({ err, targetUser }, "[admin] sessions.list_failed");
    return res.status(500).json({ error: "Unable to list sessions" });
  }
});

router.delete("/admin/users/:id/sessions/:sid", requireAuth, requireAdmin, async (req, res) => {
  const targetUser = String(req.params.id || "");
  const sid = String(req.params.sid || "");
  try {
    // best-effort persisted delete
    await deleteSession(sid);
  } catch {}
  sessions.delete(sid);
  logActivity({ actorId: req.userId!, actorName: req.storedUser!.user.fullName, action: "admin.session.revoke", detail: `Admin revoked session ${sid} for user ${targetUser}` });
  pushAdminAlert({ kind: "auth.session.revoked", title: "Session revoked", body: `Admin ${req.storedUser!.user.email} revoked session ${sid} for user ${targetUser}`, userId: targetUser, userEmail: "", severity: "info", linkUrl: `/users/${targetUser}`, email: false });
  return res.json({ success: true });
});

router.post("/admin/users/:id/sessions/revoke-all", requireAuth, requireAdmin, async (req, res) => {
  const targetUser = String(req.params.id || "");
  try {
    await deleteSessionsForUser(targetUser);
    for (const [s, rec] of sessions.entries()) {
      if (rec.userId === targetUser) sessions.delete(s);
    }
    logActivity({ actorId: req.userId!, actorName: req.storedUser!.user.fullName, action: "admin.session.revoke_all", detail: `Admin revoked all sessions for user ${targetUser}` });
    pushAdminAlert({ kind: "auth.session.revoked_all", title: "All sessions revoked", body: `Admin ${req.storedUser!.user.email} revoked all sessions for user ${targetUser}`, userId: targetUser, userEmail: "", severity: "warning", linkUrl: `/users/${targetUser}`, email: false });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err, targetUser }, "[admin] sessions.revoke_all_failed");
    return res.status(500).json({ error: "Unable to revoke sessions" });
  }
});

router.post("/auth/demo", async (req, res) => {
  if (!isDemoRouteAvailable()) {
    return res.status(403).json({ error: "Demo accounts are currently disabled." });
  }

  const stored = createIsolatedDemoUser();
  const userId = stored.user.id;
  getUserData(userId);
  const sid = newSessionId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const meta = { ip: req.ip || (req.headers['x-forwarded-for'] as string) || '', userAgent: req.headers['user-agent'] ?? '', createdAt: new Date().toISOString() };
  const sessionPersisted = await persistSession(sid, userId, expiresAt, false, meta);
  if (!sessionPersisted) {
    logger.warn({ userId, sid }, "[auth] demo.session_persist_failed_fallback_to_memory");
  }
  sessions.set(sid, { userId, expiresAt, metadata: meta });
  setSessionCookie(res, sid);

  logActivity({
    actorId: userId,
    actorName: stored.user.fullName,
    action: "auth.demo",
    detail: "Started reusable demo session",
  });

  return res.json(sessionFor(stored, true));
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(sessionFor(req.storedUser!));
});

router.patch("/auth/profile", requireAuth, (req, res) => {
  const parsed = UpdateOwnProfileBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid profile update", details: parsed.error.issues });
  }
  const stored = req.storedUser!;
  if (parsed.data.moonpayEmail !== undefined) {
    const raw = parsed.data.moonpayEmail;
    if (raw === null || raw.trim() === "") {
      stored.user.moonpayEmail = null;
    } else {
      const trimmed = raw.trim();
      // Light validation — full RFC validation is overkill, MoonPay will
      // re-validate at checkout. Reject only obvious garbage.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return res
          .status(400)
          .json({ error: "moonpayEmail is not a valid email address." });
      }
      stored.user.moonpayEmail = trimmed;
    }
  }
  logActivity({
    actorId: stored.user.id,
    actorName: stored.user.fullName,
    action: "profile.update",
    detail: `Updated own profile fields: ${Object.keys(parsed.data).join(", ") || "(none)"}.`,
  });
  return res.json(stored.user);
});

// Include password reset routes under the authenticated API namespace.
router.use('/auth', passwordResetRouter);

export default router;
