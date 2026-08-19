/**
 * Multi-region / failover health endpoints.
 */

import { Router, Request, Response } from 'express';
import { getRegionalStatus, promoteFailoverRegion, demoteFailoverRegion } from '../lib/multi-region';
import { logger } from '../lib/logger';

const router = Router();

router.get('/region/status', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    region: getRegionalStatus(),
  });
});

router.post('/region/failover/promote', (_req: Request, res: Response) => {
  try {
    const status = promoteFailoverRegion();
    logger.warn({ status }, '[REGION] Failover promoted');
    return res.status(200).json({
      success: true,
      message: 'Failover region promoted',
      status,
    });
  } catch (error) {
    logger.error({ err: error }, '[REGION] Failover promotion failed');
    return res.status(500).json({ success: false, message: 'Failover promotion failed' });
  }
});

router.post('/region/failover/demote', (_req: Request, res: Response) => {
  try {
    const status = demoteFailoverRegion();
    logger.info({ status }, '[REGION] Failover demoted');
    return res.status(200).json({
      success: true,
      message: 'Primary region restored',
      status,
    });
  } catch (error) {
    logger.error({ err: error }, '[REGION] Failover demotion failed');
    return res.status(500).json({ success: false, message: 'Failover demotion failed' });
  }
});

export default router;
