/**
 * Signed audit log for immutable compliance tracking.
 * Records auth, admin, KYC/AML, and financial actions with chain hashing.
 */

import crypto from 'crypto';
import { logger } from './logger';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  action: string;
  category: 'auth' | 'admin' | 'kyc' | 'aml' | 'financial' | 'system';
  detail: string;
  metadata?: Record<string, unknown>;
  previousHash?: string;
  hash: string;
}

const AUDIT_SECRET = process.env.AUDIT_LOG_SECRET || process.env.SESSION_SECRET || 'dev-audit-secret';
const auditEvents: AuditEvent[] = [];
let lastHash = 'genesis';

function computeHash(payload: Record<string, unknown>): string {
  return crypto
    .createHmac('sha256', AUDIT_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function recordAuditEvent(input: {
  actorId?: string;
  actorName?: string;
  action: string;
  category?: AuditEvent['category'];
  detail: string;
  metadata?: Record<string, unknown>;
}): AuditEvent | null {
  try {
    const timestamp = new Date().toISOString();
    const previousHash = lastHash;
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp,
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      category: input.category || 'system',
      detail: input.detail,
      metadata: input.metadata || {},
      previousHash,
      hash: '',
    };

    event.hash = computeHash({
      id: event.id,
      timestamp: event.timestamp,
      actorId: event.actorId,
      actorName: event.actorName,
      action: event.action,
      category: event.category,
      detail: event.detail,
      metadata: event.metadata,
      previousHash: event.previousHash,
    });

    lastHash = event.hash;
    auditEvents.unshift(event);

    if (auditEvents.length > 2000) {
      auditEvents.length = 2000;
    }

    return event;
  } catch (error) {
    logger.error({ err: error }, '[AUDIT] Failed to record audit event');
    return null;
  }
}

export function getAuditEvents(limit = 100): AuditEvent[] {
  return auditEvents.slice(0, limit);
}

export function verifyAuditChain(events: AuditEvent[] = auditEvents): boolean {
  let expectedPreviousHash = 'genesis';

  for (const event of [...events].reverse()) {
    if (event.previousHash !== expectedPreviousHash) {
      return false;
    }

    const payload = {
      id: event.id,
      timestamp: event.timestamp,
      actorId: event.actorId,
      actorName: event.actorName,
      action: event.action,
      category: event.category,
      detail: event.detail,
      metadata: event.metadata,
      previousHash: event.previousHash,
    };

    if (event.hash !== computeHash(payload)) {
      return false;
    }

    expectedPreviousHash = event.hash;
  }

  return true;
}

export function getAuditStats() {
  return {
    totalEvents: auditEvents.length,
    lastHash,
    chainValid: verifyAuditChain(),
  };
}

export { auditEvents };
