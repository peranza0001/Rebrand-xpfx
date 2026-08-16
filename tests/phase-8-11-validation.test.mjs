import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setCacheValue,
  getCacheValue,
  deleteCacheValue,
} from '../artifacts/api-server/src/lib/cache-store.ts';
import { getRegionalStatus } from '../artifacts/api-server/src/lib/multi-region.ts';
import {
  createComplianceCheck,
  updateComplianceCheck,
  needsComplianceReview,
} from '../artifacts/api-server/src/lib/compliance-status.ts';

test('TTL cache stores and expires values', () => {
  setCacheValue('phase8:test', { passed: true }, 1000);
  assert.deepEqual(getCacheValue('phase8:test'), { passed: true });

  deleteCacheValue('phase8:test');
  assert.equal(getCacheValue('phase8:test'), undefined);
});

test('regional status reflects env failover settings', () => {
  process.env.PRIMARY_REGION = 'us-east-1';
  process.env.FAILOVER_REGION = 'eu-west-1';

  const status = getRegionalStatus();
  assert.equal(status.primaryRegion, 'us-east-1');
  assert.equal(status.failoverRegion, 'eu-west-1');
  assert.equal(status.states['us-east-1']?.region, 'us-east-1');
  assert.equal(status.states['eu-west-1']?.region, 'eu-west-1');
});

test('compliance checks escalate review when a check is rejected', () => {
  const userId = 'phase8-review-user';
  const check = createComplianceCheck(userId, 'kyc_verification', 'kyc_123');
  const updated = updateComplianceCheck(check.checkId, 'rejected', { riskScore: 88 });

  assert.ok(updated);
  assert.equal(needsComplianceReview(userId), true);
});
