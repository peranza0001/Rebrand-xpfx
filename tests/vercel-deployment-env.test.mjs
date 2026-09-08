import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllowedOrigins } from '../artifacts/api-server/src/lib/cors.ts';
import { resolveApiBaseUrl } from '../artifacts/nextrade/src/lib/api-url.ts';

test('frontend API base URL prefers explicit Vercel env value and strips trailing slashes', () => {
  assert.equal(resolveApiBaseUrl('https://api.example.com/'), 'https://api.example.com');
  assert.equal(resolveApiBaseUrl('', 'https://app.example.vercel.app/'), 'https://app.example.vercel.app');
});

test('production CORS fallback allows Vercel and Railway origins without requiring manual env edits', () => {
  const allowed = getAllowedOrigins();
  assert.ok(allowed.some((origin) => origin === 'https://*.vercel.app' || origin === 'https://*.railway.app'));
});
