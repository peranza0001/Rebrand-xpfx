import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

globalThis.__dirname = __dirname;

process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.WALLET_ENCRYPTION_KEY = 'test-wallet-encryption-key';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'admin-password';
process.env.ENABLE_DEMO_AUTH = 'true';

const app = (await import('../artifacts/api-server/src/app.ts')).default;

let server;
let baseUrl;

function parseCookie(setCookie) {
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) setCookie = setCookie[0];
  return setCookie.split(';')[0];
}

test.before(async () => {
  server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('GET /api/demo/market-data returns demo market data', async () => {
  const response = await fetch(`${baseUrl}/api/demo/market-data`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload));
  assert.ok(payload.length > 0);
  assert.ok(payload[0].symbol);
});

test('GET /api/assets returns the public asset catalog', async () => {
  const response = await fetch(`${baseUrl}/api/assets`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload));
  assert.ok(payload.length > 0);
});

test('GET /api/smartvest/plans returns plan metadata', async () => {
  const response = await fetch(`${baseUrl}/api/smartvest/plans`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload));
  assert.ok(payload.length > 0);
  assert.ok(payload[0].key);
});

test('public visitors can start chat and receive a bot reply', async () => {
  const demoResponse = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(demoResponse.status, 200);
  const cookie = parseCookie(demoResponse.headers.get('set-cookie'));
  assert.ok(cookie.includes('xpfx_sid='));

  const secondDemoResponse = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(secondDemoResponse.status, 200);
  const firstDemo = await demoResponse.clone().json();
  const secondDemo = await secondDemoResponse.json();
  assert.notEqual(firstDemo.user.id, secondDemo.user.id);

  const chatResponse = await fetch(`${baseUrl}/api/live-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ content: 'How do I use the demo account?' }),
  });
  assert.equal(chatResponse.status, 200);
  const chatPayload = await chatResponse.json();
  assert.ok(chatPayload.userMessage?.isFromUser);
  assert.ok(chatPayload.botReply?.content);
  assert.doesNotMatch(chatPayload.botReply.content, /our support team is reviewing your message/i);
  assert.match(chatPayload.botReply.content, /how can i help|demo trading/i);

  const topicResponse = await fetch(`${baseUrl}/api/live-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ content: 'What are leverage and margin risks?' }),
  });
  assert.equal(topicResponse.status, 200);
  const topicPayload = await topicResponse.json();
  assert.match(topicPayload.botReply.content, /leverage|margin/i);
  assert.doesNotMatch(topicPayload.botReply.content, /support team is reviewing your message/i);

  const handoffResponse = await fetch(`${baseUrl}/api/live-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ content: 'I need a human agent to help with a security issue.' }),
  });
  assert.equal(handoffResponse.status, 200);
  const handoffPayload = await handoffResponse.json();
  assert.equal(handoffPayload.escalated, true);
  assert.equal(handoffPayload.handoff.status, 'queued');
  assert.match(handoffPayload.handoff.ticketId, /^TC-/);
  assert.match(handoffPayload.botReply.content, /human support|support team/i);
  assert.doesNotMatch(handoffPayload.botReply.content, /type "agent"/i);
});

test('demo trading endpoints are available for authenticated sessions', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin-password' }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = parseCookie(loginResponse.headers.get('set-cookie'));
  assert.ok(cookie.includes('xpfx_sid='));

  const accountResponse = await fetch(`${baseUrl}/api/demo/account`, {
    headers: { Cookie: cookie },
  });
  assert.equal(accountResponse.status, 200);
  const accountPayload = await accountResponse.json();
  assert.ok(typeof accountPayload.balance === 'number');
  assert.ok(Array.isArray(accountPayload.positions));

  const instrumentsResponse = await fetch(`${baseUrl}/api/demo/instruments`, {
    headers: { Cookie: cookie },
  });
  assert.equal(instrumentsResponse.status, 200);
  const instrumentsPayload = await instrumentsResponse.json();
  assert.ok(Array.isArray(instrumentsPayload));
  assert.ok(instrumentsPayload.length > 0);

  const orderResponse = await fetch(`${baseUrl}/api/demo/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ symbol: 'BTC', type: 'market', side: 'buy', amount: 0.01, leverage: 10 }),
  });
  assert.equal(orderResponse.status, 200);
  const orderPayload = await orderResponse.json();
  assert.equal(orderPayload.success, true);

  const invalidOrderResponse = await fetch(`${baseUrl}/api/demo/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ symbol: 'EUR/USD', type: 'market', side: 'buy', amount: -1, leverage: 10 }),
  });
  assert.equal(invalidOrderResponse.status, 400);

  const unsupportedOrderResponse = await fetch(`${baseUrl}/api/demo/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ symbol: 'NOT-A-MARKET', type: 'market', side: 'buy', amount: 1000, leverage: 10 }),
  });
  assert.equal(unsupportedOrderResponse.status, 400);

  const overMarginOrderResponse = await fetch(`${baseUrl}/api/demo/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ symbol: 'BTC', type: 'market', side: 'buy', amount: 1000000, leverage: 1 }),
  });
  assert.equal(overMarginOrderResponse.status, 400);

  const resetResponse = await fetch(`${baseUrl}/api/demo/reset-balance`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  assert.equal(resetResponse.status, 403);
});
