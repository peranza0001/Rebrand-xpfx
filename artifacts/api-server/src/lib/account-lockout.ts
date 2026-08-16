// Account lockout protection - prevents brute force login attempts
import { logger } from './logger';

// In-memory store for login attempts (in production, use Redis or database)
const loginAttempts = new Map<string, { attempts: number; lockedUntil?: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Record a failed login attempt for an email.
 * Returns true if account is now locked.
 */
export function recordFailedLoginAttempt(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  const current = loginAttempts.get(lowerEmail) || { attempts: 0 };

  current.attempts += 1;

  if (current.attempts >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn(
      { email: lowerEmail, attempts: current.attempts },
      '[LOCKOUT] Account locked after max failed attempts'
    );
  }

  loginAttempts.set(lowerEmail, current);
  return current.attempts >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Check if account is currently locked.
 */
export function isAccountLocked(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  const record = loginAttempts.get(lowerEmail);

  if (!record || !record.lockedUntil) {
    return false;
  }

  if (Date.now() > record.lockedUntil) {
    // Lockout period has expired
    loginAttempts.delete(lowerEmail);
    return false;
  }

  return true;
}

/**
 * Get the time remaining until account is unlocked (in seconds).
 * Returns 0 if account is not locked.
 */
export function getUnlockTimeRemaining(email: string): number {
  const lowerEmail = email.toLowerCase();
  const record = loginAttempts.get(lowerEmail);

  if (!record || !record.lockedUntil) {
    return 0;
  }

  const remaining = Math.max(0, record.lockedUntil - Date.now());
  return Math.ceil(remaining / 1000);
}

/**
 * Clear failed login attempts for an email after successful login.
 */
export function clearFailedLoginAttempts(email: string): void {
  const lowerEmail = email.toLowerCase();
  loginAttempts.delete(lowerEmail);
  logger.info({ email: lowerEmail }, '[LOCKOUT] Login attempts cleared');
}

/**
 * Unlock an account (admin action).
 */
export function unlockAccount(email: string): void {
  const lowerEmail = email.toLowerCase();
  loginAttempts.delete(lowerEmail);
  logger.info({ email: lowerEmail }, '[LOCKOUT] Account unlocked by admin');
}

/**
 * Get current login attempt count for an email.
 */
export function getLoginAttemptCount(email: string): number {
  const lowerEmail = email.toLowerCase();
  const record = loginAttempts.get(lowerEmail);
  return record?.attempts || 0;
}
