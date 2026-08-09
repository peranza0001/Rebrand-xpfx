import http from 'http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const appModule = await import('../artifacts/api-server/src/app.js');
const storeModule = await import('../artifacts/api-server/src/lib/store.js');

const app = appModule.default?.default ?? appModule.default ?? appModule;
const {
  users,
  usersByEmail,
  userData,
  freshUserData,
  hashPassword,
  sessions,
  newSessionId,
} = storeModule;

async function startServer() {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('bad bind');
  const url = `http://127.0.0.1:${addr.port}`;
  return { server, url };
}

async function jsonRequest(baseUrl, path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: Object.fromEntries(res.headers.entries()) };
}

async function run() {
  const { server, url } = await startServer();
  console.log('server at', url);

  // Create a new user and session (acts as visitor).
  const userId = randomUUID();
  const email = `visitor-${Date.now()}@example.com`;
  users.set(userId, {
    user: {
      id: userId,
      username: 'visitor',
      email,
      fullName: 'Visitor User',
      country: 'US',
      kycVerified: false,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      selectedManagerId: null,
      phone: null,
      merchant: false,
      moonpayEmail: null,
      buyVerified: false,
    },
    passwordHash: hashPassword('irrelevant'),
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
  usersByEmail.set(email, userId);
  userData.set(userId, freshUserData(userId, { country: 'US' }));
  const sid = newSessionId();
  sessions.set(sid, userId);
  const userCookie = `xpfx_sid=${sid}`;

  console.log('visitor sending message...');
  const send = await jsonRequest(url, '/api/live-chat', { method: 'POST', cookie: userCookie, body: { content: 'Hello support, I need help with my account.' } });
  console.log('POST /api/live-chat =>', send.status, JSON.stringify(send.data));

  // Check user's conversation
  const conv = await jsonRequest(url, '/api/live-chat', { method: 'GET', cookie: userCookie });
  console.log('GET /api/live-chat =>', conv.status, JSON.stringify(conv.data));

  // Prepare admin session
  const adminSid = newSessionId();
  sessions.set(adminSid, 'u_admin');
  const adminCookie = `xpfx_sid=${adminSid}`;

  // List admin live chats
  const list = await jsonRequest(url, '/api/admin/live-chats', { method: 'GET', cookie: adminCookie });
  console.log('GET /api/admin/live-chats =>', list.status, JSON.stringify(list.data));

  // Admin reply to user's session (the route uses :userId param)
  const adminReply = await jsonRequest(url, `/api/admin/live-chats/${userId}/reply`, { method: 'POST', cookie: adminCookie, body: { content: 'Hi, I can help — what device are you using?' } });
  console.log('POST /api/admin/live-chats/:userId/reply =>', adminReply.status, JSON.stringify(adminReply.data));

  // User fetch again to see admin reply
  const conv2 = await jsonRequest(url, '/api/live-chat', { method: 'GET', cookie: userCookie });
  console.log('POST-REPLY GET /api/live-chat =>', conv2.status, JSON.stringify(conv2.data));

  server.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
