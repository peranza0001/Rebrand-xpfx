// Password reset flow - secure token generation and verification
import { randomBytes } from 'crypto';
import { logger } from './logger';

const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_TOKEN_LENGTH = 32;

// In-memory store for password reset tokens (in production, use database)
const resetTokens = new Map<string, { email: string; expiresAt: number; used: boolean }>();

/**
 * Generate a password reset token for an email.
 */
export function generatePasswordResetToken(email: string): string {
  const lowerEmail = email.toLowerCase();
  const token = randomBytes(PASSWORD_RESET_TOKEN_LENGTH).toString('hex');
  const expiresAt = Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS;

  resetTokens.set(token, {
    email: lowerEmail,
    expiresAt,
    used: false,
  });

  logger.info({ email: lowerEmail }, '[PASSWORD_RESET] Token generated');

  return token;
}

/**
 * Verify a password reset token.
 * Returns email if valid, null otherwise.
 */
export function verifyPasswordResetToken(token: string): string | null {
  const record = resetTokens.get(token);

  if (!record) {
    logger.warn({ token: token.substring(0, 8) + '...' }, '[PASSWORD_RESET] Token not found');
    return null;
  }

  if (Date.now() > record.expiresAt) {
    resetTokens.delete(token);
    logger.warn({ email: record.email }, '[PASSWORD_RESET] Token expired');
    return null;
  }

  if (record.used) {
    logger.warn({ email: record.email }, '[PASSWORD_RESET] Token already used');
    return null;
  }

  return record.email;
}

/**
 * Mark a password reset token as used.
 */
export function markResetTokenAsUsed(token: string): void {
  const record = resetTokens.get(token);
  if (record) {
    record.used = true;
    logger.info({ email: record.email }, '[PASSWORD_RESET] Token marked as used');
  }
}

/**
 * Revoke a password reset token (before it's used).
 */
export function revokeResetToken(token: string): void {
  resetTokens.delete(token);
  logger.info('[PASSWORD_RESET] Token revoked');
}

/**
 * Clear all expired reset tokens (maintenance).
 */
export function clearExpiredResetTokens(): number {
  let cleared = 0;
  for (const [token, record] of resetTokens.entries()) {
    if (Date.now() > record.expiresAt) {
      resetTokens.delete(token);
      cleared += 1;
    }
  }
  if (cleared > 0) {
    logger.info({ cleared }, '[PASSWORD_RESET] Expired tokens cleared');
  }
  return cleared;
}

/**
 * Get reset token info.
 */
export function getResetTokenInfo(token: string): { email: string; expiresInSeconds: number } | null {
  const record = resetTokens.get(token);
  if (!record) return null;

  const expiresInMs = Math.max(0, record.expiresAt - Date.now());
  return {
    email: record.email,
    expiresInSeconds: Math.floor(expiresInMs / 1000),
  };
}
