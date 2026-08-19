import test from 'node:test';
import assert from 'node:assert/strict';

import { safePercent } from '../artifacts/nextrade/src/lib/portfolio-metrics.ts';

test('safePercent returns zero rather than Infinity or NaN when the denominator is zero', () => {
  assert.equal(safePercent(0, 0), 0);
  assert.equal(safePercent(150, 0), 0);
  assert.equal(safePercent(0, 2500), 0);
  assert.equal(safePercent(250, 5000), 5);
});
