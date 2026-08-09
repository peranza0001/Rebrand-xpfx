process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ALLOWED_ORIGINS = 'https://example.com';
process.env.ENABLE_DEMO_AUTH = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const appModule = await import('../artifacts/api-server/src/app.ts');
const storeModule = await import('../artifacts/api-server/src/lib/store.ts');
const dbPersistModule = await import('../artifacts/api-server/src/lib/db-persist.ts');

const app = appModule.default?.default ?? appModule.default ?? appModule;
const store = storeModule.default?.default ?? storeModule.default ?? storeModule;
const { setPrismaClient } = dbPersistModule;

async function withTestServer(handler) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server did not bind to a TCP port');

  try {
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function parseCookie(setCookie) {
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) setCookie = setCookie[0];
  return setCookie.split(';')[0];
}

async function jsonRequest(baseUrl, path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  return { response, data };
}

test('session listing and revoke flows', async () => {
  await withTestServer(async (baseUrl) => {
    // Create an in-memory test user
    const email = `sess-${Date.now()}@example.com`;
    const userId = randomUUID();
    const password = 'Secret123!';
    store.users.set(userId, {
      user: {
        id: userId,
        username: 'sess-user',
        email,
        fullName: 'Session Tester',
        country: 'US',
        kycVerified: false,
        avatarUrl: undefined,
        createdAt: new Date().toISOString(),
        selectedManagerId: null,
        phone: null,
        merchant: false,
        moonpayEmail: null,
        buyVerified: false,
      },
      passwordHash: store.hashPassword(password),
      role: 'user',
      referralCode: '',
      referredBy: null,
      merchant: false,
      tradingLocked: false,
      demoMode: false,
      phone: null,
      accountFlag: null,
      suspended: false,
      disabled: false,
    });
    store.usersByEmail.set(email, userId);
    store.userData.set(userId, store.freshUserData(userId, { country: 'US' }));

    // Login twice to create two sessions
    const login1 = await jsonRequest(baseUrl, '/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(login1.response.status, 200);
    const cookie1 = parseCookie(login1.response.headers.get('set-cookie'));

    const login2 = await jsonRequest(baseUrl, '/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(login2.response.status, 200);
    const cookie2 = parseCookie(login2.response.headers.get('set-cookie'));

    // List sessions using cookie1
    const listRes = await jsonRequest(baseUrl, '/api/auth/sessions', { method: 'GET', cookie: cookie1 });
    assert.equal(listRes.response.status, 200);
    assert.ok(Array.isArray(listRes.data.sessions));
    // Expect at least 2 sessions
    assert.ok(listRes.data.sessions.length >= 2, `expected >=2 sessions, got ${listRes.data.sessions.length}`);

    // Find a non-current session id
    const currentId = listRes.data.sessions.find((s) => s.isCurrent)?.id;
    const other = listRes.data.sessions.find((s) => !s.isCurrent);
    assert.ok(currentId, 'current session should be present');
    assert.ok(other, 'another session should exist to revoke');

    // Revoke the other session
    const delRes = await jsonRequest(baseUrl, `/api/auth/sessions/${other.id}`, { method: 'DELETE', cookie: cookie1 });
    assert.equal(delRes.response.status, 200);

    // Ensure it's gone
    const listAfter = await jsonRequest(baseUrl, '/api/auth/sessions', { method: 'GET', cookie: cookie1 });
    assert.equal(listAfter.response.status, 200);
    assert.ok(!listAfter.data.sessions.find((s) => s.id === other.id));

    // Revoke all
    const revokeAll = await jsonRequest(baseUrl, '/api/auth/sessions/revoke-all', { method: 'POST', cookie: cookie1 });
    assert.equal(revokeAll.response.status, 200);

    const finalList = await jsonRequest(baseUrl, '/api/auth/sessions', { method: 'GET', cookie: cookie1 });
    // After revoking all sessions the client may be unauthenticated (401)
    if (finalList.response.status === 401) {
      // expected when session cookie was revoked server-side
      return;
    }
    assert.equal(finalList.response.status, 200);
    assert.equal(finalList.data.sessions.length, 0);
  });
});
