import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDemoAuthEnabled } from '../artifacts/api-server/src/lib/env.ts';

test('demo auth is enabled by default in production unless explicitly disabled', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: undefined });
  assert.equal(enabled, true);
});

test('demo auth stays disabled when explicitly turned off', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: 'false' });
  assert.equal(enabled, false);
});
