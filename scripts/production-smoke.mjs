#!/usr/bin/env node
import fetch from 'node-fetch';

const base = process.env.PRODUCTION_URL;
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;

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
  const res = await fetch(`${base}/api/csrf-token`, { method: 'GET' });
  const cookie = res.headers.get('set-cookie');
  const body = await res.json();
  return { token: body.csrfToken, cookie: extractCookies(cookie) };
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

async function getSession(cookie) {
  const res = await fetch(`${base}/api/auth/session`, {
    method: 'GET',
    headers: { Cookie: cookie || '' },
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  console.log('Running production smoke tests against', base);
  const { token, cookie } = await getCsrf();
  if (!token) { console.error('Failed to obtain CSRF token'); process.exit(3); }
  console.log('CSRF token obtained');

  if (!email || !password) {
    console.warn('SMOKE_EMAIL/SMOKE_PASSWORD not provided — skipping login checks');
    process.exit(0);
  }

  const login = await postLogin(token, cookie);
  if (login.status !== 200) {
    console.error('Login failed', login.status, login.body || (login.body===null ? 'non-json' : ''));
    process.exit(4);
  }
  console.log('Login OK');

  const newCookie = extractCookies([cookie, login.setCookie].filter(Boolean));
  const session = await getSession(newCookie);
  if (session.status !== 200 || !session.body || !session.body.user) {
    console.error('Session check failed', session.status, session.body);
    process.exit(5);
  }
  console.log('Session persistence OK for user', session.body.user.email || session.body.user.username);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(99); });
