/**
 * User Compliance Status Tracking
 * Tracks KYC, AML, and other compliance statuses for users
 */

import { logger } from './logger';

export type ComplianceCheckType = 'kyc_verification' | 'aml_screening' | 'document_verification';
export type ComplianceStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface ComplianceCheck {
  checkId: string;
  userId: string;
  checkType: ComplianceCheckType;
  status: ComplianceStatus;
  verificationId?: string; // Reference to KYC/AML verification
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  riskScore?: number;
  notes?: string;
  errorMessage?: string;
}

export interface UserComplianceStatus {
  userId: string;
  kycStatus: ComplianceStatus;
  amlStatus: ComplianceStatus;
  documentStatus: ComplianceStatus;
  overallStatus: ComplianceStatus;
  lastKYCCheckId?: string;
  lastAMLCheckId?: string;
  kycExpiresAt?: Date;
  amlExpiresAt?: Date;
  highRiskFlags: string[];
  complianceNotes?: string;
  updatedAt: Date;
}

// In-memory compliance store
const complianceChecks = new Map<string, ComplianceCheck>();
const userCompliance = new Map<string, UserComplianceStatus>();

/**
 * Create compliance check
 */
export function createComplianceCheck(
  userId: string,
  checkType: ComplianceCheckType,
  verificationId?: string
): ComplianceCheck {
  const checkId = `comp_${userId}_${checkType}_${Date.now()}`;

  const check: ComplianceCheck = {
    checkId,
    userId,
    checkType,
    status: 'pending',
    verificationId,
    createdAt: new Date(),
  };

  complianceChecks.set(checkId, check);

  logger.info({ checkId, userId, checkType }, '[COMPLIANCE] Check created');

  // Initialize or update user compliance status
  if (!userCompliance.has(userId)) {
    userCompliance.set(userId, {
      userId,
      kycStatus: 'not_started',
      amlStatus: 'not_started',
      documentStatus: 'not_started',
      overallStatus: 'not_started',
      highRiskFlags: [],
      updatedAt: new Date(),
    });
  }

  updateUserComplianceStatus(userId);

  return check;
}

/**
 * Update compliance check status
 */
export function updateComplianceCheck(
  checkId: string,
  status: ComplianceStatus,
  updates?: Partial<ComplianceCheck>
): ComplianceCheck | undefined {
  const check = complianceChecks.get(checkId);
  if (!check) return undefined;

  check.status = status;
  if (status !== 'pending') {
    check.completedAt = new Date();
  }

  Object.assign(check, updates);

  logger.info({ checkId, status }, '[COMPLIANCE] Check updated');

  // Update user compliance
  updateUserComplianceStatus(check.userId);

  return check;
}

/**
 * Get compliance check
 */
export function getComplianceCheck(checkId: string): ComplianceCheck | undefined {
  return complianceChecks.get(checkId);
}

/**
 * Get user's compliance checks
 */
export function getUserComplianceChecks(
  userId: string,
  checkType?: ComplianceCheckType
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  for (const check of complianceChecks.values()) {
    if (check.userId === userId && (!checkType || check.checkType === checkType)) {
      checks.push(check);
    }
  }

  return checks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get user compliance status
 */
export function getUserComplianceStatus(userId: string): UserComplianceStatus {
  let status = userCompliance.get(userId);

  if (!status) {
    status = {
      userId,
      kycStatus: 'not_started',
      amlStatus: 'not_started',
      documentStatus: 'not_started',
      overallStatus: 'not_started',
      highRiskFlags: [],
      updatedAt: new Date(),
    };
    userCompliance.set(userId, status);
  }

  return status;
}

/**
 * Update user compliance status based on checks
 */
export function updateUserComplianceStatus(userId: string): UserComplianceStatus {
  const status = getUserComplianceStatus(userId);
  const checks = getUserComplianceChecks(userId);

  // Get latest check for each type
  const latestKYC = checks.find((c) => c.checkType === 'kyc_verification');
  const latestAML = checks.find((c) => c.checkType === 'aml_screening');
  const latestDoc = checks.find((c) => c.checkType === 'document_verification');

  // Update statuses
  status.kycStatus = latestKYC?.status || 'not_started';
  status.amlStatus = latestAML?.status || 'not_started';
  status.documentStatus = latestDoc?.status || 'not_started';

  // Store verification IDs
  if (latestKYC?.verificationId) status.lastKYCCheckId = latestKYC.verificationId;
  if (latestAML?.verificationId) status.lastAMLCheckId = latestAML.verificationId;

  // Check expiry dates
  if (latestKYC?.expiresAt) {
    status.kycExpiresAt = latestKYC.expiresAt;
    if (new Date() > latestKYC.expiresAt) {
      status.kycStatus = 'expired';
    }
  }

  if (latestAML?.expiresAt) {
    status.amlExpiresAt = latestAML.expiresAt;
    if (new Date() > latestAML.expiresAt) {
      status.amlStatus = 'expired';
    }
  }

  // Determine overall status
  if (
    status.kycStatus === 'approved' &&
    status.amlStatus === 'approved' &&
    status.documentStatus === 'approved'
  ) {
    status.overallStatus = 'approved';
  } else if (
    status.kycStatus === 'rejected' ||
    status.amlStatus === 'rejected' ||
    status.documentStatus === 'rejected'
  ) {
    status.overallStatus = 'rejected';
  } else if (
    status.kycStatus === 'expired' ||
    status.amlStatus === 'expired' ||
    status.documentStatus === 'expired'
  ) {
    status.overallStatus = 'expired';
  } else if (
    status.kycStatus === 'pending' ||
    status.amlStatus === 'pending' ||
    status.documentStatus === 'pending'
  ) {
    status.overallStatus = 'pending';
  } else {
    status.overallStatus = 'not_started';
  }

  // Collect high-risk flags
  status.highRiskFlags = [];

  if (latestKYC?.riskScore && latestKYC.riskScore > 70) {
    status.highRiskFlags.push(`High KYC risk: ${latestKYC.riskScore}`);
  }

  if (latestAML && latestAML.status === 'match') {
    status.highRiskFlags.push('AML match detected');
  }

  status.updatedAt = new Date();

  return status;
}

/**
 * Check if user is compliance approved (KYC + AML)
 */
export function isUserComplianApproved(userId: string): boolean {
  const status = getUserComplianceStatus(userId);
  return status.kycStatus === 'approved' && status.amlStatus === 'approved';
}

/**
 * Check if user needs compliance review
 */
export function needsComplianceReview(userId: string): boolean {
  const status = getUserComplianceStatus(userId);

  // Needs review if:
  // 1. Any check is rejected
  // 2. Any check is expired
  // 3. High-risk flags present
  // 4. Not yet started or pending

  if (status.overallStatus === 'rejected' || status.overallStatus === 'expired') {
    return true;
  }

  if (status.highRiskFlags.length > 0) {
    return true;
  }

  if (status.overallStatus === 'pending' || status.overallStatus === 'not_started') {
    return true;
  }

  return false;
}

/**
 * Add high-risk flag
 */
export function addHighRiskFlag(userId: string, flag: string): void {
  const status = getUserComplianceStatus(userId);

  if (!status.highRiskFlags.includes(flag)) {
    status.highRiskFlags.push(flag);
    status.updatedAt = new Date();

    logger.warn(
      { userId, flag, totalFlags: status.highRiskFlags.length },
      '[COMPLIANCE] High-risk flag added'
    );
  }
}

/**
 * Clear high-risk flag
 */
export function clearHighRiskFlag(userId: string, flag: string): void {
  const status = getUserComplianceStatus(userId);

  const index = status.highRiskFlags.indexOf(flag);
  if (index > -1) {
    status.highRiskFlags.splice(index, 1);
    status.updatedAt = new Date();

    logger.info({ userId, flag }, '[COMPLIANCE] High-risk flag cleared');
  }
}

/**
 * Set compliance note
 */
export function setComplianceNote(userId: string, note: string): void {
  const status = getUserComplianceStatus(userId);
  status.complianceNotes = note;
  status.updatedAt = new Date();

  logger.info({ userId, note }, '[COMPLIANCE] Note added');
}

/**
 * Get all non-compliant users
 */
export function getNonCompliantUsers(): UserComplianceStatus[] {
  const nonCompliant: UserComplianceStatus[] = [];

  for (const status of userCompliance.values()) {
    if (!isUserComplianApproved(status.userId)) {
      nonCompliant.push(status);
    }
  }

  return nonCompliant;
}

/**
 * Get users requiring compliance review
 */
export function getUsersRequiringReview(): UserComplianceStatus[] {
  const requiresReview: UserComplianceStatus[] = [];

  for (const status of userCompliance.values()) {
    if (needsComplianceReview(status.userId)) {
      requiresReview.push(status);
    }
  }

  return requiresReview.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Get users with high-risk flags
 */
export function getHighRiskUsers(): UserComplianceStatus[] {
  const highRisk: UserComplianceStatus[] = [];

  for (const status of userCompliance.values()) {
    if (status.highRiskFlags.length > 0) {
      highRisk.push(status);
    }
  }

  return highRisk.sort((a, b) => b.highRiskFlags.length - a.highRiskFlags.length);
}

export {
  complianceChecks,
  userCompliance,
};
