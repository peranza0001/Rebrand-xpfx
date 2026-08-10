process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ALLOWED_ORIGINS = 'https://example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'AdminPass123!';
process.env.ENABLE_DEMO_AUTH = 'true';

import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const appModule = await import('../artifacts/api-server/src/app.ts');
const otpModule = await import('../artifacts/api-server/src/lib/otp.ts');
const storeModule = await import('../artifacts/api-server/src/lib/store.ts');
const dbPersistModule = await import('../artifacts/api-server/src/lib/db-persist.ts');

const app = appModule.default?.default ?? appModule.default ?? appModule;
const otp = otpModule.default?.default ?? otpModule.default ?? otpModule;
const store = storeModule.default?.default ?? storeModule.default ?? storeModule;
const { _getOtpRecord } = otp;
const { sentEmails } = store;
const { setPrismaClient, persistUser, persistSession } = dbPersistModule;

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

test('seeded demo users can sign in directly without first starting demo auth', async () => {
  await withTestServer(async (baseUrl) => {
    const loginResult = await jsonRequest(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'demo@xpressprofx.com', password: 'demo-password' },
    });

    assert.equal(loginResult.response.status, 200);
    assert.equal(loginResult.data.status, 'authenticated');
    assert.equal(loginResult.data.role, 'demo');
    assert.equal(loginResult.data.user.email, 'demo@xpressprofx.com');
  });
});

test('signup persistence uses Prisma-compatible user and session field names', async () => {
  const calls = [];
  const compatiblePrismaClient = {
    user: {
      upsert: async ({ create, update }) => {
        if (create?.fullName || update?.fullName || create?.username || update?.username) {
          throw new Error('unsupported legacy fields');
        }
        if (!create?.firstName || !create?.lastName || !create?.passwordHash) {
          throw new Error('missing expected user fields');
        }
        calls.push({ kind: 'user', create, update });
        return true;
      },
    },
    userSession: {
      create: async ({ data }) => {
        if (!data?.token) {
          throw new Error('missing session token');
        }
        calls.push({ kind: 'session', data });
        return true;
      },
    },
  };

  setPrismaClient(compatiblePrismaClient);

  try {
    const userId = randomUUID();
    const userPersisted = await persistUser(userId, {
      email: 'prisma-shape@example.com',
      username: 'prisma-shape',
      passwordHash: 'hash',
      fullName: 'Prisma Shape User',
      country: 'US',
      phone: null,
    });
    assert.equal(userPersisted, true);

    const sessionPersisted = await persistSession('session-token-123', userId, new Date('2030-01-01T00:00:00Z'), false);
    assert.equal(sessionPersisted, true);
    assert.equal(calls[0].kind, 'user');
    assert.deepEqual(calls[0].create, {
      id: userId,
      email: 'prisma-shape@example.com',
      firstName: 'Prisma',
      lastName: 'Shape User',
      passwordHash: 'hash',
      country: 'US',
      phone: null,
    });
    assert.equal(calls[1].data.token, 'session-token-123');
  } finally {
    setPrismaClient(null);
  }
});

test('signup verification fails when durable user persistence cannot be completed', async () => {
  const failingPrismaClient = {
    users: {
      upsert: async () => {
        throw new Error('db write failed');
      },
    },
    userSession: {
      create: async () => {
        throw new Error('db write failed');
      },
    },
  };

  setPrismaClient(failingPrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const email = `persistence-${Date.now()}@example.com`;
      const signupPayload = {
        email,
        password: 'Secret123!',
        fullName: 'Persistence User',
        country: 'US',
      };

      const signupResult = await jsonRequest(baseUrl, '/api/auth/signup', {
        method: 'POST',
        body: signupPayload,
      });
      assert.equal(signupResult.response.status, 200);

      const otpRecord = _getOtpRecord(email);
      assert.ok(otpRecord, 'OTP record should exist after signup');

      const verifyResult = await jsonRequest(baseUrl, '/api/auth/verify-otp', {
        method: 'POST',
        body: { email, code: otpRecord.code },
      });

      assert.equal(verifyResult.response.status, 500);
      assert.match(verifyResult.data.error, /Unable to create account/i);
    });
  } finally {
    setPrismaClient(null);
  }
});

test('login fails when durable session persistence cannot complete', async () => {
  const failingPrismaClient = {
    users: {
      upsert: async () => true,
    },
    userSession: {
      create: async () => {
        throw new Error('db write failed');
      },
    },
  };

  setPrismaClient(failingPrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const email = `uuid-login-${Date.now()}@example.com`;
      const userId = randomUUID();
      store.users.set(userId, {
        user: {
          id: userId,
          username: 'uuid-login',
          email,
          fullName: 'UUID Login User',
          country: 'US',
          kycVerified: true,
          avatarUrl: undefined,
          createdAt: new Date().toISOString(),
          selectedManagerId: null,
          phone: null,
          merchant: false,
          moonpayEmail: null,
          buyVerified: false,
        },
        passwordHash: store.hashPassword('Secret123!'),
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

      const loginResult = await jsonRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email, password: 'Secret123!' },
      });

      assert.equal(loginResult.response.status, 500);
      assert.match(loginResult.data.error, /Unable to create authenticated session/i);
    });

    await withTestServer(async (baseUrl) => {
      const email = `otp-login-${Date.now()}@example.com`;
      const userId = randomUUID();
      store.users.set(userId, {
        user: {
          id: userId,
          username: 'otp-login',
          email,
          fullName: 'OTP Login User',
          country: 'US',
          kycVerified: true,
          avatarUrl: undefined,
          createdAt: new Date().toISOString(),
          selectedManagerId: null,
          phone: null,
          merchant: false,
          moonpayEmail: null,
          buyVerified: false,
        },
        passwordHash: store.hashPassword('Secret123!'),
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

      const otpRecord = await otp.issueOtp({ email, intent: 'login', userId });
      const verifyResult = await jsonRequest(baseUrl, '/api/auth/verify-otp', {
        method: 'POST',
        body: { email, code: otpRecord.code },
      });

      assert.equal(verifyResult.response.status, 500);
      assert.match(verifyResult.data.error, /Unable to create authenticated session/i);
    });
  } finally {
    setPrismaClient(null);
  }
});

test('signup with an already-persisted email returns an OTP challenge without creating a new record', async () => {
  const existingEmail = `existing-${Date.now()}@example.com`;
  const existingId = randomUUID();
  const password = 'Secret123!';
  const passwordHash = store.hashPassword(password);

  const fakePrismaClient = {
    users: {
      findUnique: async ({ where }) => {
        if (where?.email === existingEmail) {
          return {
            id: existingId,
            username: 'existing-user',
            email: existingEmail,
            firstName: 'Existing',
            lastName: 'User',
            country: 'US',
            kycVerified: false,
            avatarUrl: null,
            createdAt: new Date(),
            selectedManagerId: null,
            phone: null,
            moonpayEmail: null,
            buyVerified: false,
            passwordHash,
            role: 'user',
            referralCode: '',
            referredBy: null,
            tradingLocked: false,
            demoMode: false,
          };
        }
        return null;
      },
    },
    userSession: {
      create: async () => ({}),
    },
  };
  setPrismaClient(fakePrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const signupPayload = {
        email: existingEmail,
        password,
        fullName: 'Existing User',
        country: 'US',
      };

      const signupResult = await jsonRequest(baseUrl, '/api/auth/signup', {
        method: 'POST',
        body: signupPayload,
      });

      assert.equal(signupResult.response.status, 200);
      assert.equal(signupResult.data.status, 'otp_required');
      assert.equal(signupResult.data.intent, 'signup');
      assert.equal(_getOtpRecord(existingEmail), undefined);
    });
  } finally {
    setPrismaClient(null);
  }
});

test('login loads a persisted user via Prisma when the user is not in memory', async () => {
  const persistedEmail = `persisted-${Date.now()}@example.com`;
  const persistedId = randomUUID();
  const password = 'Secret123!';
  const passwordHash = store.hashPassword(password);

  const fakePrismaClient = {
    users: {
      findUnique: async ({ where }) => {
        if (where?.email === persistedEmail) {
          return {
            id: persistedId,
            username: 'persisted-user',
            email: persistedEmail,
            firstName: 'Persisted',
            lastName: 'User',
            country: 'US',
            kycVerified: false,
            avatarUrl: null,
            createdAt: new Date(),
            selectedManagerId: null,
            phone: null,
            moonpayEmail: null,
            buyVerified: false,
            passwordHash,
            role: 'user',
            referralCode: '',
            referredBy: null,
            tradingLocked: false,
            demoMode: false,
          };
        }
        return null;
      },
    },
    userSession: {
      create: async () => ({}),
  },
  };
  setPrismaClient(fakePrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const loginResult = await jsonRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: persistedEmail, password },
      });

      assert.equal(loginResult.response.status, 200);
      assert.equal(loginResult.data.status, 'authenticated');
      assert.equal(loginResult.data.user.email, persistedEmail);
    });
  } finally {
    setPrismaClient(null);
  }
});

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

test('admin-created users persist through Prisma fallback on create', async () => {
  const persisted = [];
  const fakePrismaClient = {
    users: {
      upsert: async (params) => {
        persisted.push(params);
        return { id: params.create.id, email: params.create.email };
      },
    },
    user_sessions: {
      create: async () => ({})
    },
  };

  setPrismaClient(fakePrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const adminLogin = await jsonRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      });
      assert.equal(adminLogin.response.status, 200);
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
      assert.equal(persisted.length, 1, 'User should be persisted to Prisma fallback');
      assert.equal(persisted[0].create.email, managedEmail);
      assert.match(persisted[0].create.id, /^[0-9a-fA-F-]{36}$/);
    });
  } finally {
    setPrismaClient(null);
  }
});

test('admin reregister endpoint persists existing user without OTP', async () => {
  const persisted = [];
  const fakePrismaClient = {
    users: {
      upsert: async (params) => {
        persisted.push(params);
        return { id: params.create.id, email: params.create.email };
      },
    },
    user_sessions: {
      create: async () => ({})
    },
  };

  setPrismaClient(fakePrismaClient);

  try {
    await withTestServer(async (baseUrl) => {
      const email = `reregister-${Date.now()}@example.com`;
      const userId = randomUUID();
      store.users.set(userId, {
        user: {
          id: userId,
          username: 'reregister-user',
          email,
          fullName: 'Reregister User',
          country: 'US',
          kycVerified: true,
          avatarUrl: undefined,
          createdAt: new Date().toISOString(),
          selectedManagerId: null,
          phone: null,
          merchant: false,
          moonpayEmail: null,
          buyVerified: false,
        },
        passwordHash: store.hashPassword('Restore123!'),
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

      const adminLogin = await jsonRequest(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      });
      assert.equal(adminLogin.response.status, 200);
      const adminCookie = parseCookie(adminLogin.response.headers.get('set-cookie'));

      const response = await jsonRequest(baseUrl, `/api/admin/users/${userId}/reregister`, {
        method: 'POST',
        cookie: adminCookie,
      });
      assert.equal(response.response.status, 200);
      assert.equal(response.data.ok, true);
      assert.equal(persisted.length, 1);
      assert.equal(persisted[0].create.email, email);
      assert.equal(persisted[0].create.id, userId);
    });
  } finally {
    setPrismaClient(null);
  }
});
