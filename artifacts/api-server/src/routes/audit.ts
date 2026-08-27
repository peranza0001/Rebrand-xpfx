/**
 * Audit logging endpoints for compliance review.
 */

import { Router, Request, Response } from 'express';
import { getAuditEvents, recordAuditEvent, verifyAuditChain, getAuditStats, persistAuditEvent } from '../lib/audit-log';
import { requireAdmin } from '../lib/session';
import { listPersistedAuditEvents } from '../lib/db-persist';
import { logger } from '../lib/logger';

const router = Router();

router.use(requireAdmin);

router.get('/audit/events', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit || 100);
    const capped = Number.isFinite(limit) ? Math.min(limit, 500) : 100;
    const events = await listPersistedAuditEvents(capped);
    return res.status(200).json({
      success: true,
      events: events.length > 0 ? events : getAuditEvents(capped),
      chainValid: verifyAuditChain(),
      stats: getAuditStats(),
    });
  } catch (error) {
    logger.error({ err: error }, '[AUDIT] Failed to list events');
    return res.status(500).json({ success: false, message: 'Failed to list audit events' });
  }
});

router.post('/audit/event', async (req: Request, res: Response) => {
  try {
    const { action, category, detail, metadata } = req.body || {};

    if (!action || !detail) {
      return res.status(400).json({ success: false, message: 'action and detail are required' });
    }

    const event = recordAuditEvent({
      actorId: (req as any).userId,
      actorName: (req as any).storedUser?.user?.fullName,
      action,
      category: category || 'system',
      detail,
      metadata,
    });

    if (!event) return res.status(500).json({ success: false, message: 'Failed to create audit event' });
    await persistAuditEvent(event);
    return res.status(201).json({
      success: true,
      event,
      chainValid: verifyAuditChain(),
    });
  } catch (error) {
    logger.error({ err: error }, '[AUDIT] Failed to create audit event');
    return res.status(500).json({ success: false, message: 'Failed to create audit event' });
  }
});

export default router;
