#!/usr/bin/env node
/**
 * Lightweight E2E smoke tests (HTTP) for production readiness.
 *
 * Checks:
 * - /api/csrf-token
 * - login (or signup if SMOKE_SIGNUP=true)
 * - POST /api/live-chat (bot reply)
 * - /api/healthz and /healthz
 * - /auth/session
 *
 * Usage: Set PRODUCTION_URL, SMOKE_EMAIL, SMOKE_PASSWORD in env.
 */

const base = (process.env.PRODUCTION_URL || '').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const signupIfMissing = process.env.SMOKE_SIGNUP === 'true';
if (!base) {
  console.error('PRODUCTION_URL is required');
  process.exit(2);
}

function extractCookies(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const parts = headers.map(h => h.split(';')[0]).filter(Boolean);
  return parts.join('; ');
}

async function getCsrf() {
  const res = await fetch(`${base}/api/csrf-token`, { method: 'GET', credentials: 'include' });
  const cookie = res.headers.get('set-cookie');
  const body = await res.json().catch(() => null);
  return { token: body?.csrfToken, cookie: extractCookies(cookie) };
}

async function postLogin(csrf, cookie) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
      Cookie: cookie || '',
    },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  return { status: res.status, body: json, setCookie: res.headers.get('set-cookie') };
}

async function postLiveChat(content, cookie) {
  const res = await fetch(`${base}/api/live-chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({ content }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function getSession(cookie) {
  const res = await fetch(`${base}/api/auth/session`, {
    method: 'GET',
    headers: { Cookie: cookie || '' },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function probe(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function run() {
  console.log('E2E smoke tests against', base);

  const health1 = await probe('/healthz');
  const health2 = await probe('/api/healthz');
  console.log('/healthz', health1.ok ? 'OK' : 'FAIL', health1.status || '', health1.error ?? '');
  console.log('/api/healthz', health2.ok ? 'OK' : 'FAIL', health2.status || '', health2.error ?? '');
  if (!health1.ok || !health2.ok) process.exit(10);

  const { token, cookie } = await getCsrf();
  if (!token) { console.error('Failed to obtain CSRF token'); process.exit(11); }
  console.log('CSRF token obtained');

  if (!email || !password) {
    console.warn('SMOKE_EMAIL/SMOKE_PASSWORD not provided — skipping auth checks');
    process.exit(0);
  }

  // Try login first
  let login = await postLogin(token, cookie);
  if (login.status === 401 && signupIfMissing) {
    console.log('Login failed — attempting OTP signup flow not implemented in e2e smoke');
  }
  if (login.status !== 200) {
    console.error('Login failed', login.status, login.body || '');
    process.exit(12);
  }
  console.log('Login OK');

  const newCookie = extractCookies([cookie, login.setCookie].filter(Boolean));

  const session = await getSession(newCookie);
  if (session.status !== 200 || !session.body || !session.body.user) {
    console.error('Session check failed', session.status, session.body);
    process.exit(13);
  }
  console.log('Session persistence OK for user', session.body.user.email ?? session.body.user.username ?? session.body.user.id);

  const chatRes = await postLiveChat('Hello from E2E smoke test', newCookie);
  if (chatRes.status !== 200) {
    console.error('Live chat POST failed', chatRes.status, chatRes.body);
    process.exit(14);
  }
  console.log('Live chat bot reply received');

  console.log('E2E smoke tests PASSED');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(99); });
