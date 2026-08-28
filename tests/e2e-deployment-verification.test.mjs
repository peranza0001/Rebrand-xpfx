/**
 * End-to-End Deployment Verification Tests
 * ==========================================
 * Tests that verify the blank page and persistence fixes work correctly
 * in actual deployment scenarios.
 *
 * Usage:
 *   node tests/e2e-deployment-verification.test.mjs [baseUrl]
 * 
 * Examples:
 *   node tests/e2e-deployment-verification.test.mjs http://localhost:5000
 *   node tests/e2e-deployment-verification.test.mjs https://rebrand-xpfx-production-1988.up.railway.app
 */

import assert from 'assert';

const DEFAULT_BASE_URL = 'http://localhost:5000';
const baseUrl = process.argv[2] || DEFAULT_BASE_URL;

console.log(`\n🔍 E2E Deployment Verification Tests`);
console.log(`📍 Testing against: ${baseUrl}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
  }
}

// Test 1: Frontend HTML loads and has React root
await test('Frontend HTML contains React root element', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert(res.ok, `Expected 200, got ${res.status}`);
  const html = await res.text();
  assert(html.includes('<div id="root"></div>'), 'HTML missing <div id="root">');
  assert(html.includes('<script type="module"'), 'HTML missing module script');
  assert(html.includes('XpressPro FX'), 'HTML missing title content');
});

// Test 2: API health endpoint responds
await test('API health endpoint /healthz responds', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert(res.ok, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert(json.status === 'ok' || json.ok === true, 'Health check did not return ok status');
});

// Test 3: Session endpoint returns guest session when not authenticated
await test('Session endpoint returns guest session by default', async () => {
  const res = await fetch(`${baseUrl}/api/auth/session`, {
    credentials: 'include'
  });
  assert(res.ok, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert(json.user === null, 'Expected user to be null for guest session');
  assert(json.role === 'guest', 'Expected role to be guest');
  assert(json.isDemo === false, 'Expected isDemo to be false');
});

// Test 4: Frontend assets are being served correctly
await test('Frontend JavaScript assets load', async () => {
  const res = await fetch(`${baseUrl}/`);
  const html = await res.text();
  const scriptMatch = html.match(/src="\/assets\/index-([A-Za-z0-9_-]+)\.js"/);
  assert(scriptMatch, 'Could not find index script src in HTML');
  const assetUrl = `/assets/${scriptMatch[0].match(/index-[A-Za-z0-9_-]+\.js/)[0]}`;
  const assetRes = await fetch(`${baseUrl}${assetUrl}`);
  assert(assetRes.ok, `Asset ${assetUrl} returned ${assetRes.status}`);
});

// Test 5: CSS is being served correctly
await test('Frontend CSS assets load', async () => {
  const res = await fetch(`${baseUrl}/`);
  const html = await res.text();
  const cssMatch = html.match(/href="\/assets\/index-([A-Za-z0-9_-]+)\.css"/);
  assert(cssMatch, 'Could not find CSS href in HTML');
  const assetUrl = `/assets/${cssMatch[0].match(/index-[A-Za-z0-9_-]+\.css/)[0]}`;
  const assetRes = await fetch(`${baseUrl}${assetUrl}`);
  assert(assetRes.ok, `CSS ${assetUrl} returned ${assetRes.status}`);
});

// Test 6: Check for Content Security Policy header (security check)
await test('Response includes security headers', async () => {
  const res = await fetch(`${baseUrl}/`);
  const csp = res.headers.get('content-security-policy');
  assert(csp, 'Missing Content-Security-Policy header');
  assert(csp.includes('default-src'), 'CSP header incomplete');
});

// Test 7: CSRF endpoint responds
await test('CSRF token endpoint responds', async () => {
  const res = await fetch(`${baseUrl}/api/csrf-token`);
  assert(res.ok, `Expected 200, got ${res.status}`);
  const json = await res.json();
  assert(json.csrfToken, 'CSRF response missing csrfToken field');
  assert(typeof json.csrfToken === 'string', 'CSRF token should be string');
  assert(json.csrfToken.length > 0, 'CSRF token should not be empty');
});

// Test 8: Not Found page doesn't return blank (404 routes show proper error page)
await test('Non-existent routes return proper 404 or SPA fallback', async () => {
  const res = await fetch(`${baseUrl}/this-route-definitely-does-not-exist-12345`);
  // Should return 200 with SPA fallback HTML
  assert(res.ok, `Expected 200 for SPA fallback, got ${res.status}`);
  const html = await res.text();
  assert(html.includes('<div id="root"></div>'), 'SPA fallback missing root element');
});

// Test 9: Static public assets (favicon, etc.) return correct status
await test('Favicon request returns proper response', async () => {
  const res = await fetch(`${baseUrl}/favicon.svg`, {
    redirect: 'follow'
  });
  // Could be 200 (found) or 404 (not found with fallback), both are acceptable
  assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
});

// Test 10: Response content-type is correct for HTML
await test('HTML response has correct content-type', async () => {
  const res = await fetch(`${baseUrl}/`);
  const contentType = res.headers.get('content-type');
  assert(contentType, 'Missing content-type header');
  assert(contentType.includes('text/html'), `Expected text/html, got ${contentType}`);
});

// Summary
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 Test Summary`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Total: ${testsPassed + testsFailed}\n`);

if (testsFailed > 0) {
  console.log(`⚠️  Some tests failed. Check the errors above.\n`);
  process.exit(1);
} else {
  console.log(`🎉 All tests passed! Deployment is working correctly.\n`);
  process.exit(0);
}
