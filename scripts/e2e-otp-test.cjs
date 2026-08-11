const fetch = require('node-fetch');
(async () => {
  const base = 'http://127.0.0.1:3000/api';
  const email = `e2e-test-${Date.now()}@example.com`;
  console.log('email', email);
  let r = await fetch(base + '/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, fullName: 'E2E Test', password: 'Password123!', country: 'US' }) });
  const signupBody = await r.json();
  console.log('signup', r.status, JSON.stringify(signupBody));
  r = await fetch(base + '/auth/dev-otp?email=' + encodeURIComponent(email));
  const devBody = await r.json();
  console.log('dev-otp', r.status, JSON.stringify(devBody));
  const body = devBody;
  const code = body.code;
  r = await fetch(base + '/auth/verify-otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code }) });
  console.log('verify', r.status, await r.text());
})();
