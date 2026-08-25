import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLiveTradingEnabled } from '../artifacts/api-server/src/lib/env.ts';

test('live trading defaults on in development and requires explicit opt-in in production', () => {
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'development' }), true);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production' }), false);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production', ENABLE_LIVE_TRADING: 'true' }), true);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production', ENABLE_LIVE_TRADING: 'false' }), false);
});
