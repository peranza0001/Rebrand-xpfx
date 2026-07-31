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

const app = (await import('../artifacts/api-server/src/app.ts')).default;

let server;
let baseUrl;

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
