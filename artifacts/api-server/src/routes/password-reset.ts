// Password reset routes - request and verify reset flow
import { Router, Request, Response } from 'express';
import { validateEmail } from '../lib/email-utils';
import { generatePasswordResetToken, verifyPasswordResetToken, markResetTokenAsUsed } from '../lib/password-reset';
import { hashPassword, usersByEmail, users, logActivity } from '../lib/store';
import { persistUser, persistResetPasswordToken, getPersistedUserByEmail } from '../lib/db-persist';
import { logger } from '../lib/logger';
import { sendEmail } from '../lib/email';

function normalizeHostHeader(value?: string): string | undefined {
  if (!value) return undefined;
  const first = value.split(',')[0]?.trim();
  if (!first) return undefined;
  return first.replace(/\/+$/, '');
}

function resolveAppOriginFromRequest(req: { get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> } | undefined): string {
  const headers = req?.headers ?? {};
  const headerHost = normalizeHostHeader(req?.get?.('host') || (typeof headers.host === 'string' ? headers.host : Array.isArray(headers.host) ? headers.host[0] : undefined));
  const forwardedHost = normalizeHostHeader(req?.get?.('x-forwarded-host') || (typeof headers['x-forwarded-host'] === 'string'
    ? headers['x-forwarded-host']
    : Array.isArray(headers['x-forwarded-host'])
      ? headers['x-forwarded-host'][0]
      : undefined));
  const origin = typeof headers.origin === 'string' ? headers.origin : undefined;
  const protocolHeader = req?.get?.('x-forwarded-proto') || (typeof headers['x-forwarded-proto'] === 'string' ? headers['x-forwarded-proto'] : undefined);
  const protocol = protocolHeader?.split(',')[0]?.trim() || (origin ? new URL(origin).protocol.replace(':', '') : 'https');

  const preferredHost = forwardedHost || headerHost || (origin ? normalizeHostHeader(new URL(origin).host) : undefined);
  if (preferredHost) {
    return `${protocol}://${preferredHost}`;
  }

  return 'https://xpressprofx.com';
}

const router = Router();

interface PasswordResetRequestBody {
  email: string;
}

interface PasswordResetVerifyBody {
  token: string;
  newPassword: string;
}

/**
 * POST /auth/password-reset/request
 * Request a password reset token (send to email)
 */
router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as PasswordResetRequestBody;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required',
      });
    }

    const lowerEmail = email.toLowerCase();

    // Check if user exists
    let userId = usersByEmail.get(lowerEmail);
    if (!userId) {
      const persistedUser = await getPersistedUserByEmail(lowerEmail);
      if (persistedUser) {
        userId = persistedUser.user.id;
        users.set(userId, persistedUser);
        usersByEmail.set(lowerEmail, userId);
      }
    }
    const userExists = userId ? users.has(userId) : false;

    // For security, always respond positively even if user doesn't exist
    // This prevents email enumeration attacks
    if (!userExists) {
      logger.info({ email: lowerEmail }, '[PASSWORD_RESET] Request for non-existent user');
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      });
    }

    if (!userId) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      });
    }

    const user = users.get(userId);
    if (!user) {
      logger.warn({ email: lowerEmail }, '[PASSWORD_RESET] User missing from store after existence check');
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      });
    }

    // Generate reset token
    const token = generatePasswordResetToken(lowerEmail);

    const appBaseUrl = resolveAppOriginFromRequest(req);
    const resetLink = `${appBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await persistResetPasswordToken(userId, token, expiresAt);

    try {
      await sendEmail({
        to: lowerEmail,
        subject: 'Reset your XpressPro FX password',
        kind: 'auth.forgot_password',
        text: [
          `Hi ${user.user.fullName},`,
          '',
          'You requested a password reset for your XpressPro FX account.',
          'Click the link below to set a new password. This link expires in 30 minutes.',
          '',
          resetLink,
          '',
          'If you did not request this, you can safely ignore this email.',
        ].join('\n'),
        html: [
          `<p>Hi ${user.user.fullName},</p>`,
          '<p>You requested a password reset for your XpressPro FX account.</p>',
          '<p>Click the link below to set a new password. <strong>This link expires in 30 minutes.</strong></p>',
          `<p><a href="${resetLink}" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>`,
          `<p>Or copy this link: <code>${resetLink}</code></p>`,
          '<p>If you did not request this, you can safely ignore this email.</p>',
        ].join(''),
      });
    } catch (error) {
      logger.error({ err: error, email: lowerEmail }, '[PASSWORD_RESET] Email delivery failed');
    }

    logActivity({
      actorId: userId,
      actorName: user.user.fullName,
      action: 'auth.forgot_password',
      detail: `Password reset email queued for ${lowerEmail}.`,
    });

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: 'Password reset link generated',
        resetLink,
        token,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A password reset link has been sent to your email address.',
    });
  } catch (error) {
    logger.error({ err: error }, '[PASSWORD_RESET] Request failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
});

/**
 * POST /auth/password-reset/verify
 * Verify reset token and update password
 */
router.post('/password-reset/verify', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as PasswordResetVerifyBody;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Verify token
    const email = verifyPasswordResetToken(token);
    if (!email) {
      logger.warn({ token: token.substring(0, 8) + '...' }, '[PASSWORD_RESET] Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      });
    }

    // Find user and update password
    const userId = usersByEmail.get(email);
    if (!userId) {
      logger.warn({ email }, '[PASSWORD_RESET] User not found during reset');
      return res.status(400).json({
        success: false,
        message: 'User account not found',
      });
    }

    const user = users.get(userId);
    if (!user) {
      logger.warn({ email }, '[PASSWORD_RESET] User not found in store');
      return res.status(400).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Hash new password
    const passwordHash = hashPassword(newPassword);
    user.passwordHash = passwordHash;

    // Persist to database
    await persistUser(userId, {
      email: user.user.email,
      username: user.user.username,
      passwordHash,
      fullName: user.user.fullName,
      country: user.user.country,
      phone: user.phone,
    });
    await persistResetPasswordToken(userId, null, null);

    // Mark token as used
    markResetTokenAsUsed(token);

    logger.info({ email }, '[PASSWORD_RESET] Password successfully reset');

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error({ err: error }, '[PASSWORD_RESET] Verify failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
});

/**
 * GET /auth/password-reset/token/:token
 * Verify if a reset token is valid (for UX purposes)
 */
router.get('/password-reset/token/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    const email = verifyPasswordResetToken(token);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      email: email.split('@')[0] + '@***', // Mask email for security
    });
  } catch (error) {
    logger.error({ err: error }, '[PASSWORD_RESET] Token check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to verify token',
    });
  }
});

export { router as passwordResetRouter };
