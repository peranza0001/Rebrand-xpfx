process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ALLOWED_ORIGINS = 'https://example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'AdminPass123!';
process.env.ENABLE_DEMO_AUTH = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const appModule = await import('../artifacts/api-server/src/app.ts');
const otpModule = await import('../artifacts/api-server/src/lib/otp.ts');
const storeModule = await import('../artifacts/api-server/src/lib/store.ts');

const app = appModule.default?.default ?? appModule.default ?? appModule;
const otp = otpModule.default?.default ?? otpModule.default ?? otpModule;
const store = storeModule.default?.default ?? storeModule.default ?? storeModule;
const { _getOtpRecord } = otp;
const { sentEmails } = store;

async function withTestServer(handler) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind to a TCP port');
  }

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
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { response, data };
}

test('end-to-end signup, login, demo, and admin flow', async () => {
  await withTestServer(async (baseUrl) => {
    sentEmails.length = 0;

    const email = `user-${Date.now()}@example.com`;
    const signupPayload = {
      email,
      password: 'Secret123!',
      fullName: 'Test User',
      country: 'US',
    };

    const signupResult = await jsonRequest(baseUrl, '/api/auth/signup', {
      method: 'POST',
      body: signupPayload,
    });
    assert.equal(signupResult.response.status, 200);
    assert.equal(signupResult.data.status, 'otp_required');
    assert.equal(signupResult.data.intent, 'signup');

    const otpRecord = _getOtpRecord(email);
    assert.ok(otpRecord, 'OTP record should be created after signup');
    assert.equal(otpRecord.email, email);
    assert.equal(otpRecord.intent, 'signup');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, email);
    assert.equal(sentEmails[0].kind, 'otp.signup');

    const verifyResult = await jsonRequest(baseUrl, '/api/auth/verify-otp', {
      method: 'POST',
      body: { email, code: otpRecord.code },
    });
    assert.equal(verifyResult.response.status, 200);
    assert.equal(verifyResult.data.user.email, email);
    assert.ok(parseCookie(verifyResult.response.headers.get('set-cookie')).includes('xpfx_sid='));
    const sessionCookie = parseCookie(verifyResult.response.headers.get('set-cookie'));

    const smartVestCreate = await jsonRequest(baseUrl, '/api/smartvest', {
      method: 'POST',
      body: { plan: 'growth', disclaimerAcknowledged: true },
      cookie: sessionCookie,
    });
    assert.equal(smartVestCreate.response.status, 201);
    assert.equal(smartVestCreate.data.account.plan, 'growth');
    assert.equal(smartVestCreate.data.account.disclaimerAcknowledged, true);

    const smartVestGet = await jsonRequest(baseUrl, '/api/smartvest', {
      method: 'GET',
      cookie: sessionCookie,
    });
    assert.equal(smartVestGet.response.status, 200);
    assert.equal(smartVestGet.data.account.plan, 'growth');

    const loginResult = await jsonRequest(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email, password: signupPayload.password },
    });
    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.data.status, 'authenticated');
    assert.equal(loginResult.data.role, 'user');
    assert.equal(loginResult.data.user.email, email);
    const loginSessionCookie = parseCookie(loginResult.response.headers.get('set-cookie'));
    assert.ok(loginSessionCookie.includes('xpfx_sid='));

    const demoResponse = await jsonRequest(baseUrl, '/api/auth/demo', {
      method: 'POST',
    });
    assert.equal(demoResponse.response.status, 200);
    assert.equal(demoResponse.data.role, 'demo');

    const adminLogin = await jsonRequest(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    assert.equal(adminLogin.response.status, 200);
    assert.equal(adminLogin.data.status, 'authenticated');
    assert.equal(adminLogin.data.role, 'admin');
    const adminCookie = parseCookie(adminLogin.response.headers.get('set-cookie'));

    const managedEmail = `managed-${Date.now()}@example.com`;
    const createUserResponse = await jsonRequest(baseUrl, '/api/admin/users/create', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        email: managedEmail,
        password: 'NewUser123!',
        fullName: 'Managed User',
        username: 'managed-user',
        country: 'US',
        role: 'user',
        kycVerified: false,
      },
    });
    assert.equal(createUserResponse.response.status, 200);
    assert.equal(createUserResponse.data.email, managedEmail);
    assert.equal(createUserResponse.data.role, 'user');
  });
});
