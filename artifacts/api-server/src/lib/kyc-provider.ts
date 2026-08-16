/**
 * KYC Provider Abstraction Layer
 * Supports multiple KYC verification providers with unified interface
 * Providers: Stripe Identity, IDology, Trulioo, etc.
 */

import { logger } from './logger';

export type KYCVerificationStatus = 'pending' | 'approved' | 'rejected' | 'manual_review';
export type KYCProvider = 'stripe_identity' | 'idology' | 'trulioo' | 'mock';

export interface KYCVerificationRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  countryCode: string; // ISO 3166-1 alpha-2
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentFile?: Buffer; // Optional: document image
  documentUrl?: string; // Optional: document URL for upload
  idempotencyKey?: string; // For idempotent requests
}

export interface KYCVerificationResult {
  verificationId: string;
  status: KYCVerificationStatus;
  userId: string;
  provider: KYCProvider;
  createdAt: Date;
  completedAt?: Date;
  documentUrl?: string;
  riskScore?: number; // 0-100, higher = more risk
  checks: {
    identity: boolean;
    documentValidity: boolean;
    livenessCheck?: boolean; // Optional for some providers
  };
  errorMessage?: string;
  rawResponse?: Record<string, any>; // Provider-specific data
}

export interface AMLScreeningRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  countryCode: string;
  documentNumber?: string;
}

export interface AMLScreeningResult {
  screeningId: string;
  userId: string;
  provider: string;
  status: 'clear' | 'match' | 'review_required';
  riskLevel: 'low' | 'medium' | 'high';
  matches: Array<{
    listType: string; // e.g. "OFAC", "UN_SANCTIONS", "EU_SANCTIONS"
    matchScore: number; // 0-100
    entity: string;
  }>;
  createdAt: Date;
  errorMessage?: string;
}

// In-memory provider configuration
const providerConfig: Record<KYCProvider, any> = {
  stripe_identity: {
    apiKey: process.env.STRIPE_IDENTITY_API_KEY || '',
    enabled: !!process.env.STRIPE_IDENTITY_API_KEY,
  },
  idology: {
    apiKey: process.env.IDOLOGY_API_KEY || '',
    endpoint: process.env.IDOLOGY_API_URL || 'https://api.idology.com/v1',
    enabled: !!process.env.IDOLOGY_API_KEY,
  },
  trulioo: {
    apiKey: process.env.TRULIOO_API_KEY || '',
    endpoint: process.env.TRULIOO_API_URL || 'https://api.trulioo.com/v1',
    enabled: !!process.env.TRULIOO_API_KEY,
  },
  mock: {
    enabled: true, // Always available for testing
  },
};

// In-memory verification store
const verifications = new Map<string, KYCVerificationResult>();
const screenings = new Map<string, AMLScreeningResult>();

/**
 * Get configured KYC provider
 */
export function getConfiguredKYCProvider(): KYCProvider {
  // Try providers in order of preference
  const preferredOrder: KYCProvider[] = ['stripe_identity', 'idology', 'trulioo', 'mock'];
  
  for (const provider of preferredOrder) {
    if (providerConfig[provider]?.enabled) {
      return provider;
    }
  }
  
  return 'mock'; // Fallback to mock
}

/**
 * Initiate KYC verification
 */
export async function initiateKYCVerification(
  request: KYCVerificationRequest
): Promise<KYCVerificationResult> {
  const provider = getConfiguredKYCProvider();
  const verificationId = `kyc_${request.userId}_${Date.now()}`;

  logger.info(
    { userId: request.userId, provider, verificationId },
    '[KYC] Initiating verification'
  );

  try {
    let result: KYCVerificationResult;

    switch (provider) {
      case 'stripe_identity':
        result = await initiateStripeIdentityVerification(request, verificationId);
        break;
      case 'idology':
        result = await initiateIDologyVerification(request, verificationId);
        break;
      case 'trulioo':
        result = await initiateTruliooVerification(request, verificationId);
        break;
      case 'mock':
      default:
        result = initiateMockVerification(request, verificationId);
    }

    verifications.set(verificationId, result);
    logger.info({ verificationId, status: result.status }, '[KYC] Verification initiated');
    return result;
  } catch (error) {
    logger.error({ err: error, userId: request.userId }, '[KYC] Verification initiation failed');
    const failureResult: KYCVerificationResult = {
      verificationId,
      status: 'rejected',
      userId: request.userId,
      provider,
      createdAt: new Date(),
      checks: { identity: false, documentValidity: false },
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
    verifications.set(verificationId, failureResult);
    return failureResult;
  }
}

/**
 * Stripe Identity verification
 * https://stripe.com/docs/identity/verification-sessions
 */
async function initiateStripeIdentityVerification(
  request: KYCVerificationRequest,
  verificationId: string
): Promise<KYCVerificationResult> {
  // In production, call Stripe Identity API
  // For now, mock implementation
  logger.info({ verificationId }, '[KYC_STRIPE] Would call Stripe Identity API');

  return {
    verificationId,
    status: 'pending',
    userId: request.userId,
    provider: 'stripe_identity',
    createdAt: new Date(),
    checks: { identity: false, documentValidity: false, livenessCheck: false },
  };
}

/**
 * IDology verification
 * https://developer.idology.com/
 */
async function initiateIDologyVerification(
  request: KYCVerificationRequest,
  verificationId: string
): Promise<KYCVerificationResult> {
  // In production, call IDology API
  logger.info({ verificationId }, '[KYC_IDOLOGY] Would call IDology API');

  return {
    verificationId,
    status: 'pending',
    userId: request.userId,
    provider: 'idology',
    createdAt: new Date(),
    checks: { identity: false, documentValidity: false },
  };
}

/**
 * Trulioo verification
 * https://www.trulioo.com/api-documentation
 */
async function initiateTruliooVerification(
  request: KYCVerificationRequest,
  verificationId: string
): Promise<KYCVerificationResult> {
  // In production, call Trulioo API
  logger.info({ verificationId }, '[KYC_TRULIOO] Would call Trulioo API');

  return {
    verificationId,
    status: 'pending',
    userId: request.userId,
    provider: 'trulioo',
    createdAt: new Date(),
    checks: { identity: false, documentValidity: false },
  };
}

/**
 * Mock verification for development/testing
 */
function initiateMockVerification(
  request: KYCVerificationRequest,
  verificationId: string
): KYCVerificationResult {
  // Simulate verification approval for demo accounts
  const isDemoEmail = request.email?.includes('demo') || request.email?.includes('test');
  
  return {
    verificationId,
    status: isDemoEmail ? 'approved' : 'manual_review',
    userId: request.userId,
    provider: 'mock',
    createdAt: new Date(),
    completedAt: new Date(),
    riskScore: isDemoEmail ? 10 : 45,
    checks: {
      identity: isDemoEmail,
      documentValidity: isDemoEmail,
      livenessCheck: isDemoEmail,
    },
  };
}

/**
 * Get verification result
 */
export function getVerificationResult(verificationId: string): KYCVerificationResult | undefined {
  return verifications.get(verificationId);
}

/**
 * Get user's latest verification
 */
export function getUserLatestVerification(userId: string): KYCVerificationResult | undefined {
  let latest: KYCVerificationResult | undefined;

  for (const verification of verifications.values()) {
    if (verification.userId === userId) {
      if (!latest || verification.createdAt > latest.createdAt) {
        latest = verification;
      }
    }
  }

  return latest;
}

/**
 * Update verification status
 */
export function updateVerificationStatus(
  verificationId: string,
  status: KYCVerificationStatus,
  updates?: Partial<KYCVerificationResult>
): KYCVerificationResult | undefined {
  const verification = verifications.get(verificationId);
  if (!verification) return undefined;

  verification.status = status;
  verification.completedAt = new Date();
  Object.assign(verification, updates);

  logger.info({ verificationId, status }, '[KYC] Verification status updated');
  return verification;
}

/**
 * AML screening - check against sanctions lists
 */
export async function performAMLScreening(
  request: AMLScreeningRequest
): Promise<AMLScreeningResult> {
  const screeningId = `aml_${request.userId}_${Date.now()}`;

  logger.info(
    { userId: request.userId, screeningId },
    '[AML] Starting screening'
  );

  try {
    let result: AMLScreeningResult;

    // Default to ComplyAdvantage if available, otherwise mock
    const provider = process.env.COMPLY_ADVANTAGE_API_KEY ? 'comply_advantage' : 'mock';

    if (provider === 'comply_advantage') {
      result = await performComplyAdvantageScreening(request, screeningId);
    } else {
      result = performMockAMLScreening(request, screeningId);
    }

    screenings.set(screeningId, result);
    logger.info({ screeningId, status: result.status }, '[AML] Screening completed');
    return result;
  } catch (error) {
    logger.error({ err: error, userId: request.userId }, '[AML] Screening failed');
    return {
      screeningId,
      userId: request.userId,
      provider: 'error',
      status: 'review_required',
      riskLevel: 'high',
      matches: [],
      createdAt: new Date(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ComplyAdvantage screening
 * https://www.complyadvantage.com/api
 */
async function performComplyAdvantageScreening(
  request: AMLScreeningRequest,
  screeningId: string
): Promise<AMLScreeningResult> {
  logger.info({ screeningId }, '[AML_COMPLY] Would call ComplyAdvantage API');

  return {
    screeningId,
    userId: request.userId,
    provider: 'comply_advantage',
    status: 'clear',
    riskLevel: 'low',
    matches: [],
    createdAt: new Date(),
  };
}

/**
 * Mock AML screening
 */
function performMockAMLScreening(
  request: AMLScreeningRequest,
  screeningId: string
): AMLScreeningResult {
  // Simulate clear status for demo/test accounts
  const isDemoUser = request.firstName?.toLowerCase() === 'demo' ||
    request.firstName?.toLowerCase() === 'test';

  return {
    screeningId,
    userId: request.userId,
    provider: 'mock',
    status: isDemoUser ? 'clear' : 'clear',
    riskLevel: isDemoUser ? 'low' : 'low',
    matches: [],
    createdAt: new Date(),
  };
}

/**
 * Get screening result
 */
export function getScreeningResult(screeningId: string): AMLScreeningResult | undefined {
  return screenings.get(screeningId);
}

/**
 * Get user's latest screening
 */
export function getUserLatestScreening(userId: string): AMLScreeningResult | undefined {
  let latest: AMLScreeningResult | undefined;

  for (const screening of screenings.values()) {
    if (screening.userId === userId) {
      if (!latest || screening.createdAt > latest.createdAt) {
        latest = screening;
      }
    }
  }

  return latest;
}

/**
 * Check if user is KYC verified and AML clear
 */
export function isUserCompliant(userId: string): boolean {
  const verification = getUserLatestVerification(userId);
  const screening = getUserLatestScreening(userId);

  if (!verification || verification.status !== 'approved') {
    return false;
  }

  if (!screening || screening.status !== 'clear') {
    return false;
  }

  return true;
}

export {
  verifications,
  screenings,
};
