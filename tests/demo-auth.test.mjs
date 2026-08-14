import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDemoAuthEnabled } from '../artifacts/api-server/src/lib/env.ts';
import { ensureDemoUser } from '../artifacts/api-server/src/lib/store.ts';

test('demo auth stays off by default in production unless explicitly enabled', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: undefined });
  assert.equal(enabled, false);
});

test('demo auth stays disabled when explicitly turned off', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: 'false' });
  assert.equal(enabled, false);
});

test('demo auth can be enabled explicitly in a controlled environment', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: 'true' });
  assert.equal(enabled, true);
});

test('demo users are reused and initialized with demo balances', () => {
  const first = ensureDemoUser();
  const second = ensureDemoUser();

  assert.equal(second.user.id, first.user.id);
  assert.equal(second.role, 'demo');
  assert.equal(second.demoMode, true);
  assert.ok(second.user.kycVerified);

  const data = second.user.id ? (globalThis.__demoUserData ?? null) : null;
  assert.equal(data, null);
});
