/* eslint-disable no-console */
const fetch = require('node-fetch');
(async () => {
  const base = 'http://127.0.0.1:3000';
  const email = `e2e-test-${Date.now()}@example.com`;
  console.log('email', email);
  let r = await fetch(base + '/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, fullName: 'E2E Test', password: 'Password123!', country: 'US' }) });
  console.log('signup', r.status, await r.text());
  r = await fetch(base + '/auth/dev-otp?email=' + encodeURIComponent(email));
  console.log('dev-otp', r.status, await r.text());
  const body = await r.json();
  const code = body.code;
  r = await fetch(base + '/auth/verify-otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code }) });
  console.log('verify', r.status, await r.text());
})();
