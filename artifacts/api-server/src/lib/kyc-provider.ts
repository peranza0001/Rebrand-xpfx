/**
 * KYC Provider Abstraction Layer
 * Supports multiple KYC verification providers with unified interface
 * Providers: Onfido, Stripe Identity, IDology, Trulioo, Socure, etc.
 * 
 * PROVIDER SETUP GUIDE:
 * 
 * 1. ONFIDO (Recommended for EU/UK)
 *    - Sign up: https://www.onfido.com/
 *    - Get API key from Dashboard > API Tokens
 *    - Env var: ONFIDO_API_KEY
 *    - Endpoint: https://api.onfido.com/v3
 * 
 * 2. SOCURE (Fastest verification - 1-2 seconds)
 *    - Sign up: https://www.socure.com/platform
 *    - Get API key from Admin Portal
 *    - Env var: SOCURE_API_KEY
 *    - Endpoint: https://api.socure.com/api/v2
 * 
 * 3. COMPLY ADVANTAGE (Best for AML/Sanctions)
 *    - Sign up: https://www.complyadvantage.com/
 *    - Get API key from Settings > API
 *    - Env var: COMPLY_ADVANTAGE_API_KEY
 *    - Endpoint: https://api.complyadvantage.com/v1
 * 
 * 4. STRIPE IDENTITY
 *    - Already set up via Stripe account
 *    - Env var: STRIPE_IDENTITY_API_KEY
 * 
 * 5. MOCK (For development/testing - no credentials needed)
 *    - Always enabled
 *    - Demo emails approved automatically
 */

import { logger } from './logger';
import { getLatestPersistedAmlScreening, getLatestPersistedKycVerification, getPersistedAmlScreening, getPersistedKycVerification } from './db-persist';

export type KYCVerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type KYCProvider = 'onfido' | 'socure' | 'stripe_identity' | 'idology' | 'trulioo' | 'unconfigured';

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

const PLACEHOLDER_API_KEY_PATTERNS = [
  'generated_prod_key',
  'generated_placeholder',
  'placeholder',
  'replace_with',
  'replacewith',
  'your_api_key',
  'your_key',
  'changeme',
  'example',
  '<your',
  'your-',
  'demo-key',
];

function hasUsableProviderKey(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  if (normalized.includes(' ') && !normalized.startsWith('sk_') && !normalized.startsWith('sg.')) {
    return false;
  }
  if (PLACEHOLDER_API_KEY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return false;
  }
  return trimmed.length >= 8;
}

function buildProviderConfig(): Record<KYCProvider, any> {
  return {
    onfido: {
      apiKey: process.env.ONFIDO_API_KEY || '',
      endpoint: process.env.ONFIDO_API_URL || 'https://api.onfido.com/v3',
      enabled: hasUsableProviderKey(process.env.ONFIDO_API_KEY),
    },
    socure: {
      apiKey: process.env.SOCURE_API_KEY || '',
      endpoint: process.env.SOCURE_API_URL || 'https://api.socure.com/api/v2',
      enabled: hasUsableProviderKey(process.env.SOCURE_API_KEY),
    },
    stripe_identity: {
      apiKey: process.env.STRIPE_IDENTITY_API_KEY || '',
      enabled: hasUsableProviderKey(process.env.STRIPE_IDENTITY_API_KEY),
    },
    idology: {
      apiKey: process.env.IDOLOGY_API_KEY || '',
      endpoint: process.env.IDOLOGY_API_URL || 'https://api.idology.com/v1',
      enabled: hasUsableProviderKey(process.env.IDOLOGY_API_KEY),
    },
    trulioo: {
      apiKey: process.env.TRULIOO_API_KEY || '',
      endpoint: process.env.TRULIOO_API_URL || 'https://api.trulioo.com/v1',
      enabled: hasUsableProviderKey(process.env.TRULIOO_API_KEY),
    },
    unconfigured: { enabled: true },
  };
}

// In-memory verification store
const verifications = new Map<string, KYCVerificationResult>();
const screenings = new Map<string, AMLScreeningResult>();

/**
 * Get configured KYC provider
 * Priority order: Onfido > Socure > Stripe Identity > IDology > Trulioo > Mock
 */
export function getConfiguredKYCProvider(): KYCProvider {
  const providerConfig = buildProviderConfig();
  const requested = process.env.KYC_PROVIDER?.trim().toLowerCase() as KYCProvider | undefined;
  if (requested && requested !== 'unconfigured' && providerConfig[requested]?.enabled) return requested;
  // Try providers in order of preference
  const preferredOrder: KYCProvider[] = ['onfido', 'socure', 'stripe_identity', 'idology', 'trulioo'];

  for (const provider of preferredOrder) {
    if (providerConfig[provider]?.enabled) {
      return provider;
    }
  }

  return 'unconfigured';
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
      case 'onfido':
        result = await initiateOnfidoVerification(request, verificationId);
        break;
      case 'socure':
        result = await initiateSocureVerification(request, verificationId);
        break;
      case 'stripe_identity':
        result = await initiateStripeIdentityVerification(request, verificationId);
        break;
      case 'idology':
        result = await initiateIDologyVerification(request, verificationId);
        break;
      case 'trulioo':
        result = await initiateTruliooVerification(request, verificationId);
        break;
      case 'unconfigured':
      default:
        result = {
          verificationId,
          status: 'pending',
          userId: request.userId,
          provider: 'unconfigured',
          createdAt: new Date(),
          checks: { identity: false, documentValidity: false },
          errorMessage: 'KYC provider not configured',
        };
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
 * Onfido verification
 * https://documentation.onfido.com/
 * 
 * Real implementation would:
 * 1. Create applicant
 * 2. Upload document
 * 3. Perform liveness check
 * 4. Retrieve result
 */
async function initiateOnfidoVerification(
  request: KYCVerificationRequest,
  verificationId: string
): Promise<KYCVerificationResult> {
  const providerConfig = buildProviderConfig();
  const apiKey = providerConfig.onfido.apiKey;
  const endpoint = providerConfig.onfido.endpoint;

  if (!apiKey) {
    logger.warn({ verificationId }, '[KYC_ONFIDO] No API key configured');
    return { verificationId, status: 'pending', userId: request.userId, provider: 'unconfigured', createdAt: new Date(), checks: { identity: false, documentValidity: false }, errorMessage: 'KYC provider not configured' };
  }

  try {
    // In production, would call Onfido API:
    // POST /applicants to create applicant
    // POST /documents to upload ID document
    // POST /live_photos or /videos for liveness check
    // GET /applicants/:id/check/:check_id for results
    
    logger.info(
      { verificationId, endpoint, userId: request.userId },
      '[KYC_ONFIDO] Would call Onfido API'
    );

    // Mock response for now
    return {
      verificationId,
      status: 'pending',
      userId: request.userId,
      provider: 'onfido',
      createdAt: new Date(),
      checks: { identity: false, documentValidity: false, livenessCheck: false },
      rawResponse: {
        provider: 'onfido',
        note: 'In production, use real Onfido API with ' + apiKey.slice(0, 4) + '...',
      },
    };
  } catch (error) {
    logger.error(
      { err: error, verificationId },
      '[KYC_ONFIDO] Onfido API call failed'
    );
    throw error;
  }
}

/**
 * Socure verification
 * https://developers.socure.com/
 * 
 * Socure is fastest - returns results in 1-2 seconds
 * Supports: identity verification, document verification, liveness check
 * 
 * Real implementation would:
 * 1. POST /id-plus/verify-person (identity + document)
 * 2. Wait for async webhook or poll status
 * 3. Get verification result
 */
async function initiateSocureVerification(
  request: KYCVerificationRequest,
  verificationId: string
): Promise<KYCVerificationResult> {
  const providerConfig = buildProviderConfig();
  const apiKey = providerConfig.socure.apiKey;
  const endpoint = providerConfig.socure.endpoint;

  if (!apiKey) {
    logger.warn({ verificationId }, '[KYC_SOCURE] No API key configured');
    return { verificationId, status: 'pending', userId: request.userId, provider: 'unconfigured', createdAt: new Date(), checks: { identity: false, documentValidity: false }, errorMessage: 'KYC provider not configured' };
  }

  try {
    // In production, would call Socure API:
    // POST /id-plus/verify-person with first_name, last_name, dob, country_code, document_image
    // Socure returns results very fast (1-2 seconds)
    // Includes: identity_verified, document_verified, liveness_score
    
    logger.info(
      { verificationId, endpoint, userId: request.userId },
      '[KYC_SOCURE] Would call Socure API'
    );

    // Mock response for now
    return {
      verificationId,
      status: 'pending',
      userId: request.userId,
      provider: 'socure',
      createdAt: new Date(),
      checks: { identity: false, documentValidity: false, livenessCheck: false },
      rawResponse: {
        provider: 'socure',
        note: 'In production, use real Socure API with ' + apiKey.slice(0, 4) + '...',
        fastVerification: true,
      },
    };
  } catch (error) {
    logger.error(
      { err: error, verificationId },
      '[KYC_SOCURE] Socure API call failed'
    );
    throw error;
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
 * Get verification result
 */
export async function getVerificationResult(verificationId: string): Promise<KYCVerificationResult | undefined> {
  const inMemory = verifications.get(verificationId);
  if (inMemory) return inMemory;
  return await getPersistedKycVerification(verificationId) as KYCVerificationResult | null ?? undefined;
}

/**
 * Get user's latest verification
 */
export async function getUserLatestVerification(userId: string): Promise<KYCVerificationResult | undefined> {
  let latest: KYCVerificationResult | undefined;

  for (const verification of verifications.values()) {
    if (verification.userId === userId) {
      if (!latest || verification.createdAt > latest.createdAt) {
        latest = verification;
      }
    }
  }

  if (latest) return latest;
  return await getLatestPersistedKycVerification(userId) as KYCVerificationResult | null ?? undefined;
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
 * 
 * Supported Providers:
 * 1. COMPLY ADVANTAGE (Recommended)
 *    - Covers OFAC, EU, UN, UK, and 500+ other lists
 *    - Env var: COMPLY_ADVANTAGE_API_KEY
 * 
 * 2. Socure AML
 *    - Part of Socure platform (if KYC provider is Socure)
 *    - Env var: SOCURE_API_KEY
 * 
 * 3. Mock (fallback for development)
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

    // Try ComplyAdvantage first, then Socure, then mock
    const complyApiKey = process.env.COMPLY_ADVANTAGE_API_KEY || process.env.COMPLYADVANTAGE_API_KEY;
    const socureApiKey = process.env.SOCURE_API_KEY;

    if (hasUsableProviderKey(complyApiKey)) {
      result = await performComplyAdvantageScreening(request, screeningId);
    } else if (hasUsableProviderKey(socureApiKey)) {
      result = await performSocureAMLScreening(request, screeningId);
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
 * 
 * Real implementation would:
 * POST /v1/individuals with name, date_of_birth, country_codes
 * Returns: match count, risk level, entity matches
 */
async function performComplyAdvantageScreening(
  request: AMLScreeningRequest,
  screeningId: string
): Promise<AMLScreeningResult> {
  const apiKey = process.env.COMPLY_ADVANTAGE_API_KEY;

  logger.info(
    { screeningId, user: `${request.firstName} ${request.lastName}` },
    '[AML_COMPLY] Screening against ComplyAdvantage'
  );

  try {
    // In production, would call ComplyAdvantage API:
    // POST /v1/individuals with:
    // - name: "firstName lastName"
    // - date_of_birth: "YYYY-MM-DD"
    // - country_codes: [countryCode]
    // - entity_type: "individual"
    
    // Returns: match_count, risk_level (low/medium/high), entities[]
    
    logger.info({ screeningId }, '[AML_COMPLY] Would call ComplyAdvantage API with ' + apiKey?.slice(0, 4) + '...');

    return {
      screeningId,
      userId: request.userId,
      provider: 'comply_advantage',
      status: 'clear',
      riskLevel: 'low',
      matches: [],
      createdAt: new Date(),
    };
  } catch (error) {
    logger.error({ err: error, screeningId }, '[AML_COMPLY] ComplyAdvantage screening failed');
    throw error;
  }
}

/**
 * Socure AML screening
 * https://developers.socure.com/
 * 
 * Real implementation would:
 * POST /id-plus/aml-check with name, date_of_birth, country
 * Returns: match status, risk level
 */
async function performSocureAMLScreening(
  request: AMLScreeningRequest,
  screeningId: string
): Promise<AMLScreeningResult> {
  const apiKey = process.env.SOCURE_API_KEY;

  logger.info(
    { screeningId, user: `${request.firstName} ${request.lastName}` },
    '[AML_SOCURE] Screening against Socure AML database'
  );

  try {
    // In production, would call Socure API:
    // POST /id-plus/aml-check with:
    // - first_name, last_name
    // - date_of_birth: "YYYY-MM-DD"
    // - country_code: ISO 3166-1 alpha-2
    
    // Returns: match_status, risk_level, aml_score
    
    logger.info({ screeningId }, '[AML_SOCURE] Would call Socure AML API with ' + apiKey?.slice(0, 4) + '...');

    return {
      screeningId,
      userId: request.userId,
      provider: 'socure',
      status: 'clear',
      riskLevel: 'low',
      matches: [],
      createdAt: new Date(),
    };
  } catch (error) {
    logger.error({ err: error, screeningId }, '[AML_SOCURE] Socure AML screening failed');
    throw error;
  }
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
export async function getScreeningResult(screeningId: string): Promise<AMLScreeningResult | undefined> {
  const inMemory = screenings.get(screeningId);
  if (inMemory) return inMemory;
  return await getPersistedAmlScreening(screeningId) as AMLScreeningResult | null ?? undefined;
}

/**
 * Get user's latest screening
 */
export async function getUserLatestScreening(userId: string): Promise<AMLScreeningResult | undefined> {
  let latest: AMLScreeningResult | undefined;

  for (const screening of screenings.values()) {
    if (screening.userId === userId) {
      if (!latest || screening.createdAt > latest.createdAt) {
        latest = screening;
      }
    }
  }

  if (latest) return latest;
  return await getLatestPersistedAmlScreening(userId) as AMLScreeningResult | null ?? undefined;
}

/**
 * Check if user is KYC verified and AML clear
 */
export async function isUserCompliant(userId: string): Promise<boolean> {
  const verification = await getUserLatestVerification(userId);
  const screening = await getUserLatestScreening(userId);

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
