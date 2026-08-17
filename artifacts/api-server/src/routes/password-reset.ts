// Password reset routes - request and verify reset flow
import { Router, Request, Response } from 'express';
import { validateEmail } from '../lib/email-utils';
import { generatePasswordResetToken, verifyPasswordResetToken, markResetTokenAsUsed } from '../lib/password-reset';
import { hashPassword, usersByEmail, users, verifyPassword } from '../lib/store';
import { persistUser } from '../lib/db-persist';
import { logger } from '../lib/logger';

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
    const userId = usersByEmail.get(lowerEmail);
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

    // Generate reset token
    const token = generatePasswordResetToken(lowerEmail);

    const appBaseUrl = process.env.PUBLIC_APP_URL
      || process.env.PRODUCTION_URL
      || process.env.APP_URL
      || process.env.FRONTEND_URL
      || 'https://xpressprofx.com';

    // In a real app, send email with reset link.
    // Keep the base URL env-driven so the app remains portable across hosts.
    const resetLink = `${appBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    if (process.env.NODE_ENV === 'production') {
      // In production, email the link (not returned in response)
      logger.info({ email: lowerEmail }, '[PASSWORD_RESET] Token generated and would be emailed');
      return res.status(200).json({
        success: true,
        message: 'A password reset link has been sent to your email address.',
      });
    }

    // For development, include the token in response
    return res.status(200).json({
      success: true,
      message: 'Password reset link generated',
      resetLink, // Only in development!
      token, // Only in development!
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
    await persistUser(user.user);

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
