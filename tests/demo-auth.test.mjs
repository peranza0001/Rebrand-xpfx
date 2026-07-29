import test from 'node:test';
import assert from 'node:assert/strict';
import envModule from '../artifacts/api-server/src/lib/env.ts';
import storeModule from '../artifacts/api-server/src/lib/store.ts';

const { resolveDemoAuthEnabled } = envModule.default ?? envModule;
const { ensureDemoUser } = storeModule.default ?? storeModule;

test('demo auth is enabled by default in production unless explicitly disabled', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: undefined });
  assert.equal(enabled, true);
});

test('demo auth stays disabled when explicitly turned off', () => {
  const enabled = resolveDemoAuthEnabled({ NODE_ENV: 'production', ENABLE_DEMO_AUTH: 'false' });
  assert.equal(enabled, false);
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
