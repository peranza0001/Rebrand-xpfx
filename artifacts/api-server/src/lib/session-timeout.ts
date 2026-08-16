// Session timeout and idle tracking
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { setCacheValue, getCacheValue, deleteCacheValue } from './cache-store';

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory store for session metadata (in production, use Redis or database)
const sessionMetadata = new Map<string, { createdAt: number; lastActivityAt: number }>();

/**
 * Track session creation and activity.
 */
export function recordSessionActivity(sessionId: string) {
  if (!sessionId) return;

  const now = Date.now();
  const current = sessionMetadata.get(sessionId);
  if (current) {
    current.lastActivityAt = now;
    setCacheValue(`session:${sessionId}:activity`, current.lastActivityAt, SESSION_IDLE_TIMEOUT_MS);
    return;
  }

  const next = {
    createdAt: now,
    lastActivityAt: now,
  };
  sessionMetadata.set(sessionId, next);
  setCacheValue(`session:${sessionId}:created`, next.createdAt, SESSION_MAX_LIFETIME_MS);
  setCacheValue(`session:${sessionId}:activity`, next.lastActivityAt, SESSION_IDLE_TIMEOUT_MS);
}

/**
 * Check if session has exceeded idle timeout.
 */
export function isSessionIdleTimedOut(sessionId: string): boolean {
  if (!sessionId) return false;

  const metadata = sessionMetadata.get(sessionId);
  const lastActivityAt = metadata?.lastActivityAt ?? getCacheValue<number>(`session:${sessionId}:activity`);
  if (lastActivityAt === undefined) return false;

  const idleTime = Date.now() - lastActivityAt;
  return idleTime > SESSION_IDLE_TIMEOUT_MS;
}

/**
 * Check if session has exceeded max lifetime.
 */
export function isSessionLifetimeExpired(sessionId: string): boolean {
  if (!sessionId) return false;

  const metadata = sessionMetadata.get(sessionId);
  const createdAt = metadata?.createdAt ?? getCacheValue<number>(`session:${sessionId}:created`);
  if (createdAt === undefined) return false;

  const lifetime = Date.now() - createdAt;
  return lifetime > SESSION_MAX_LIFETIME_MS;
}

/**
 * Clear session metadata.
 */
export function clearSessionMetadata(sessionId: string) {
  if (sessionId) {
    sessionMetadata.delete(sessionId);
    deleteCacheValue(`session:${sessionId}:created`);
    deleteCacheValue(`session:${sessionId}:activity`);
  }
}

/**
 * Get session age in seconds.
 */
export function getSessionAge(sessionId: string): number {
  const metadata = sessionMetadata.get(sessionId);
  if (!metadata) return 0;
  return Math.floor((Date.now() - metadata.createdAt) / 1000);
}

/**
 * Get time since last activity in seconds.
 */
export function getIdleTime(sessionId: string): number {
  const metadata = sessionMetadata.get(sessionId);
  if (!metadata) return 0;
  return Math.floor((Date.now() - metadata.lastActivityAt) / 1000);
}

/**
 * Middleware to check session timeout and enforce idle/lifetime limits.
 */
export function sessionTimeoutMiddleware() {
  return (req: any, res: Response, next: NextFunction) => {
    const sessionId = req.sessionId || req.cookies?.session_id;
    
    if (!sessionId) {
      return next();
    }

    // Track activity
    recordSessionActivity(sessionId);

    // Check idle timeout
    if (isSessionIdleTimedOut(sessionId)) {
      clearSessionMetadata(sessionId);
      logger.info({ sessionId }, '[SESSION] Idle timeout expired');
      return res.status(401).json({
        error: 'Session expired',
        reason: 'idle_timeout',
        message: 'Your session has expired due to inactivity. Please log in again.'
      });
    }

    // Check max lifetime
    if (isSessionLifetimeExpired(sessionId)) {
      clearSessionMetadata(sessionId);
      logger.info({ sessionId }, '[SESSION] Max lifetime expired');
      return res.status(401).json({
        error: 'Session expired',
        reason: 'lifetime_exceeded',
        message: 'Your session has expired. Please log in again.'
      });
    }

    next();
  };
}

/**
 * Get session timeout info for client display.
 */
export function getSessionTimeoutInfo(sessionId: string): {
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  idleTimeRemainingSeconds: number;
  lifetimeRemainingSeconds: number;
  sessionAgeSeconds: number;
} {
  const metadata = sessionMetadata.get(sessionId);
  
  if (!metadata) {
    return {
      idleTimeoutSeconds: Math.floor(SESSION_IDLE_TIMEOUT_MS / 1000),
      maxLifetimeSeconds: Math.floor(SESSION_MAX_LIFETIME_MS / 1000),
      idleTimeRemainingSeconds: Math.floor(SESSION_IDLE_TIMEOUT_MS / 1000),
      lifetimeRemainingSeconds: Math.floor(SESSION_MAX_LIFETIME_MS / 1000),
      sessionAgeSeconds: 0,
    };
  }

  const now = Date.now();
  const idleTimeRemaining = Math.max(
    0,
    Math.floor((metadata.lastActivityAt + SESSION_IDLE_TIMEOUT_MS - now) / 1000)
  );
  const lifetimeRemaining = Math.max(
    0,
    Math.floor((metadata.createdAt + SESSION_MAX_LIFETIME_MS - now) / 1000)
  );

  return {
    idleTimeoutSeconds: Math.floor(SESSION_IDLE_TIMEOUT_MS / 1000),
    maxLifetimeSeconds: Math.floor(SESSION_MAX_LIFETIME_MS / 1000),
    idleTimeRemainingSeconds: idleTimeRemaining,
    lifetimeRemainingSeconds: lifetimeRemaining,
    sessionAgeSeconds: getSessionAge(sessionId),
  };
}
