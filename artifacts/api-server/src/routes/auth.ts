// /auth routes — signup, login, logout, session, demo, OTP verify/resend, skip-wallet.
import { Router, type IRouter } from "express";
import {
  LoginBody,
  ResendOtpBody,
  SignupBody,
  UpdateOwnProfileBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import { isDemoAuthEnabled, isDemoRouteAvailable } from "../lib/env";
import {
  ensureDemoUser,
  freshUserData,
  getUserData,
  hashPassword,
  logActivity,
  newId,
  newReferralCode,
  newSessionId,
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
  requireAuth,
  setSessionCookie,
  SESSION_COOKIE,
} from "../lib/session";
import { pushAdminAlert } from "../lib/notify";
import {
  issueOtp,
  resendOtp as resendOtpFn,
  verifyOtp as verifyOtpFn,
  OTP_TTL_MS,
} from "../lib/otp";

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

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid signup", details: parsed.error.issues });
  }
  const email = parsed.data.email.toLowerCase();
  // Do NOT reveal whether the address is already registered. Always return the
  // same OTP-challenge response. When the email is already taken we skip
  // issuing an OTP; the subsequent verify-otp call will simply time out with a
  // generic "Invalid code" error that does not confirm account existence.
  if (!usersByEmail.has(email)) {
    // Account is NOT created yet — we hold the payload in the OTP record and
    // only commit once the email has been verified.
    try {
      await issueOtp({ email, intent: "signup", signupPayload: parsed.data });
    } catch (err) {
      logger.error({ err, email }, "[auth] Failed to issue OTP for signup");
      return res.status(500).json({ error: "Unable to send verification email. Please try again later." });
    }
  }
  return res.json(otpChallenge(parsed.data.email, "signup"));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login" });
  }
  const userId = usersByEmail.get(parsed.data.email.toLowerCase());
  const stored = userId ? users.get(userId) : undefined;
  if (!stored) {
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }
  if (stored.disabled) {
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }
  if (!verifyPassword(parsed.data.password, stored.passwordHash)) {
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "invalid_credentials",
    });
  }
  // Admins authenticate directly with their seeded credentials — they do not
  // receive an OTP because their email isn't necessarily a real inbox we
  // control. Regular users still go through the OTP flow.
  if (stored.role === "admin") {
    const sid = newSessionId();
    sessions.set(sid, stored.user.id);
    setSessionCookie(res, sid);
    logActivity({
      actorId: stored.user.id,
      actorName: stored.user.fullName,
      action: "auth.login",
      detail: `Admin login (${stored.user.email})`,
    });
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
    return res.json({ ...sessionFor(stored), status: "authenticated" as const });
  }
  try {
    await issueOtp({ email: stored.user.email, intent: "login", userId: stored.user.id });
  } catch (err) {
    logger.error({ err, email: stored.user.email, userId: stored.user.id }, "[auth] Failed to issue OTP for login");
    return res.status(500).json({ error: "Unable to send verification email. Please try again later." });
  }
  return res.json(otpChallenge(stored.user.email, "login"));
});

router.post("/auth/verify-otp", (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid verification request" });
  }
  const result = verifyOtpFn(parsed.data.email, parsed.data.code);
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
    if (usersByEmail.has(email)) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    const id = newId("u");
    const referralCode = newReferralCode();
    let referredBy: string | null = null;
    if (payload.referralCode) {
      const referrerId = referralCodeIndex.get(payload.referralCode.trim());
      if (referrerId) referredBy = referrerId;
    }
    const stored: StoredUser = {
      user: {
        id,
        username: email.split("@")[0] ?? "trader",
        email: payload.email,
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
    users.set(id, stored);
    usersByEmail.set(email, id);
    referralCodeIndex.set(referralCode, id);
    referrals.set(id, []);
    userData.set(id, freshUserData(id, { country: payload.country }));

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

    const sid = newSessionId();
    sessions.set(sid, id);
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
  sessions.set(sid, stored.user.id);
  setSessionCookie(res, sid);
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
    result = await resendOtpFn(parsed.data.email);
  } catch (err) {
    logger.error({ err, email: parsed.data.email }, "[auth] Failed to resend OTP");
    return res.status(500).json({ error: "Unable to resend verification email. Please try again later." });
  }
  const intent = result.record?.intent ?? "signup";
  return res.json(otpChallenge(parsed.data.email, intent));
});

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

router.post("/auth/logout", (req, res) => {
  const sid = (req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE]) as
    | string
    | undefined;
  if (sid) sessions.delete(sid);
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/auth/session", (req, res) => {
  if (!req.storedUser) {
    return res.json({ user: null, role: "guest", isDemo: false, walletSkipped: false, isMerchant: false, merchantStatus: null });
  }
  return res.json(sessionFor(req.storedUser));
});

router.post("/auth/demo", (_req, res) => {
  if (!isDemoRouteAvailable()) {
    return res.status(403).json({ error: "Demo accounts are currently disabled." });
  }
  if (!isDemoAuthEnabled) {
    return res.status(403).json({ error: "Demo accounts are currently disabled." });
  }

  const stored = ensureDemoUser();
  const userId = stored.user.id;
  getUserData(userId);
  const sid = newSessionId();
  sessions.set(sid, userId);
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

export default router;
