/**
 * KYC/AML Verification API Routes
 * Endpoints for initiating, checking, and managing compliance verification
 */

import { Router, Request, Response } from 'express';
import {
  initiateKYCVerification,
  getVerificationResult,
  getUserLatestVerification,
  performAMLScreening,
  getScreeningResult,
  isUserCompliant,
} from '../lib/kyc-provider';
import {
  createComplianceCheck,
  updateComplianceCheck,
  getUserComplianceStatus,
  isUserComplianApproved,
  needsComplianceReview,
  addHighRiskFlag,
  setComplianceNote,
} from '../lib/compliance-status';
import { requireAuth } from '../lib/session';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /kyc/verify/start
 * Initiate KYC verification for authenticated user
 */
router.post('/kyc/verify/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      countryCode,
      documentType,
      documentUrl,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !countryCode || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, dateOfBirth, countryCode, documentType',
      });
    }

    // Validate date of birth format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dateOfBirth format. Use YYYY-MM-DD',
      });
    }

    // Validate country code (ISO 3166-1 alpha-2)
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid countryCode. Must be ISO 3166-1 alpha-2 (e.g., US, GB, DE)',
      });
    }

    // Get user email from session/context
    const userEmail = (req as any).userEmail || 'unknown@example.com';

    // Initiate KYC verification
    const verificationResult = await initiateKYCVerification({
      userId,
      email: userEmail,
      firstName,
      lastName,
      dateOfBirth,
      countryCode,
      documentType,
      documentUrl,
      idempotencyKey: req.get('Idempotency-Key'),
    });

    // Create compliance check record
    createComplianceCheck(userId, 'kyc_verification', verificationResult.verificationId);

    // Log activity
    logger.info(
      { userId, verificationId: verificationResult.verificationId },
      '[KYC_API] Verification initiated'
    );

    return res.status(202).json({
      success: true,
      message: 'KYC verification initiated',
      verificationId: verificationResult.verificationId,
      status: verificationResult.status,
    });
  } catch (error) {
    logger.error({ err: error }, '[KYC_API] Start verification failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate KYC verification',
    });
  }
});

/**
 * GET /kyc/verify/status/:verificationId
 * Check KYC verification status
 */
router.get('/kyc/verify/status/:verificationId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { verificationId } = req.params;

    if (!verificationId) {
      return res.status(400).json({
        success: false,
        message: 'verificationId is required',
      });
    }

    const verification = getVerificationResult(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found',
      });
    }

    // Only allow users to check their own verifications
    if (verification.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    return res.status(200).json({
      success: true,
      verificationId: verification.verificationId,
      status: verification.status,
      riskScore: verification.riskScore,
      checks: verification.checks,
      completedAt: verification.completedAt,
      errorMessage: verification.errorMessage,
    });
  } catch (error) {
    logger.error({ err: error }, '[KYC_API] Status check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to check KYC status',
    });
  }
});

/**
 * GET /kyc/verify/latest
 * Get authenticated user's latest verification status
 */
router.get('/kyc/verify/latest', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const verification = getUserLatestVerification(userId);

    if (!verification) {
      return res.status(200).json({
        success: true,
        verification: null,
        message: 'No verification found',
      });
    }

    return res.status(200).json({
      success: true,
      verification: {
        verificationId: verification.verificationId,
        status: verification.status,
        riskScore: verification.riskScore,
        checks: verification.checks,
        completedAt: verification.completedAt,
        createdAt: verification.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[KYC_API] Latest check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to check latest KYC status',
    });
  }
});

/**
 * POST /aml/screen
 * Initiate AML screening for authenticated user
 */
router.post('/aml/screen', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, dateOfBirth, countryCode, documentNumber } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, dateOfBirth, countryCode',
      });
    }

    // Perform AML screening
    const screeningResult = await performAMLScreening({
      userId,
      firstName,
      lastName,
      dateOfBirth,
      countryCode,
      documentNumber,
    });

    // Create compliance check record
    createComplianceCheck(userId, 'aml_screening', screeningResult.screeningId);

    logger.info(
      { userId, screeningId: screeningResult.screeningId, status: screeningResult.status },
      '[AML_API] Screening completed'
    );

    return res.status(200).json({
      success: true,
      message: 'AML screening completed',
      screeningId: screeningResult.screeningId,
      status: screeningResult.status,
      riskLevel: screeningResult.riskLevel,
      matchCount: screeningResult.matches.length,
    });
  } catch (error) {
    logger.error({ err: error }, '[AML_API] Screening failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to perform AML screening',
    });
  }
});

/**
 * GET /aml/screen/status/:screeningId
 * Check AML screening status
 */
router.get('/aml/screen/status/:screeningId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { screeningId } = req.params;

    if (!screeningId) {
      return res.status(400).json({
        success: false,
        message: 'screeningId is required',
      });
    }

    const screening = getScreeningResult(screeningId);
    if (!screening) {
      return res.status(404).json({
        success: false,
        message: 'Screening not found',
      });
    }

    // Only allow users to check their own screenings
    if (screening.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    return res.status(200).json({
      success: true,
      screeningId: screening.screeningId,
      status: screening.status,
      riskLevel: screening.riskLevel,
      matchCount: screening.matches.length,
      matches: screening.matches.map((m) => ({
        listType: m.listType,
        matchScore: m.matchScore,
        entity: m.entity,
      })),
      createdAt: screening.createdAt,
    });
  } catch (error) {
    logger.error({ err: error }, '[AML_API] Status check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to check AML status',
    });
  }
});

/**
 * GET /compliance/status
 * Get authenticated user's overall compliance status
 */
router.get('/compliance/status', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const status = getUserComplianceStatus(userId);
    const isApproved = isUserComplianApproved(userId);
    const needsReview = needsComplianceReview(userId);

    return res.status(200).json({
      success: true,
      compliance: {
        userId,
        kycStatus: status.kycStatus,
        amlStatus: status.amlStatus,
        documentStatus: status.documentStatus,
        overallStatus: status.overallStatus,
        isApproved,
        needsReview,
        highRiskFlags: status.highRiskFlags,
        kycExpiresAt: status.kycExpiresAt,
        amlExpiresAt: status.amlExpiresAt,
        updatedAt: status.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[COMPLIANCE_API] Status check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to check compliance status',
    });
  }
});

/**
 * GET /compliance/can-trade
 * Check if user is compliant and can trade
 */
router.get('/compliance/can-trade', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const isCompliant = isUserCompliant(userId);

    return res.status(200).json({
      success: true,
      canTrade: isCompliant,
      message: isCompliant
        ? 'User is compliant and can trade'
        : 'User must complete compliance verification to trade',
    });
  } catch (error) {
    logger.error({ err: error }, '[COMPLIANCE_API] Can-trade check failed');
    return res.status(500).json({
      success: false,
      message: 'Failed to check trading eligibility',
    });
  }
});

export default router;
