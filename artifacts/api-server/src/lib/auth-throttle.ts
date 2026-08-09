/**
 * Simple in-memory throttling and lockout utilities for auth flows.
 * Keeps counters short-lived and best-effort; suitable for early Phase-2
 * protections. Persistent storage and distributed rate-limiting are
 * recommended for production.
 */

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const OTP_MAX_PER_HOUR = 10;
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type FailureRecord = { count: number; firstAt: number; lockedUntil?: number };

const failedLogins = new Map<string, FailureRecord>();
const otpRequestsByEmail = new Map<string, { count: number; windowStart: number }>();

export function isLoginLocked(email: string): boolean {
  const rec = failedLogins.get(email);
  if (!rec) return false;
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return true;
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) {
    failedLogins.delete(email);
    return false;
  }
  return false;
}

export function recordLoginFailure(email: string): { locked: boolean; attempts: number } {
  const now = Date.now();
  const rec = failedLogins.get(email) ?? { count: 0, firstAt: now };
  // reset window if it's been a while
  if (now - rec.firstAt > LOGIN_LOCKOUT_MS) {
    rec.count = 0;
    rec.firstAt = now;
    rec.lockedUntil = undefined;
  }
  rec.count += 1;
  if (rec.count >= LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOGIN_LOCKOUT_MS;
    rec.count = 0;
  }
  failedLogins.set(email, rec);
  return { locked: Boolean(rec.lockedUntil && rec.lockedUntil > now), attempts: rec.count };
}

export function resetLoginFailures(email: string): void {
  failedLogins.delete(email);
}

export function canSendOtp(email: string): boolean {
  const lower = email.toLowerCase();
  const now = Date.now();
  const rec = otpRequestsByEmail.get(lower);
  if (!rec) return true;
  if (now - rec.windowStart > OTP_WINDOW_MS) return true;
  return rec.count < OTP_MAX_PER_HOUR;
}

export function recordOtpSent(email: string): void {
  const lower = email.toLowerCase();
  const now = Date.now();
  const rec = otpRequestsByEmail.get(lower);
  if (!rec || now - rec.windowStart > OTP_WINDOW_MS) {
    otpRequestsByEmail.set(lower, { count: 1, windowStart: now });
    return;
  }
  rec.count += 1;
  otpRequestsByEmail.set(lower, rec);
}

export function _debugResetAll(): void {
  failedLogins.clear();
  otpRequestsByEmail.clear();
}
