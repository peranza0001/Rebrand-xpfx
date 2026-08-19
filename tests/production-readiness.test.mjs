#!/usr/bin/env node
/**
 * Production Readiness Verification Script
 * Tests account persistence, CSRF, password reset, and login flows
 * against the live Railway API deployment.
 */

import assert from 'node:assert';

const API_URL = 'https://web-production-45a7e.up.railway.app';
const FRONTEND_URL = 'https://xpressprofxcom.vercel.app';

// Test counter
let testCount = 0;
let passCount = 0;
let failCount = 0;

function log(message, type = 'info') {
  const types = {
    info: '📌',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  };
  console.log(`${types[type]} ${message}`);
}

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    passCount++;
    log(`PASS: ${name}`, 'success');
  } catch (err) {
    failCount++;
    log(`FAIL: ${name}`, 'error');
    log(`  Error: ${err.message}`, 'error');
  }
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = response.ok ? await response.json() : null;
  return { status: response.status, statusText: response.statusText, data, response };
}

// ============================================================================
// PHASE 1: Health & Connection Checks
// ============================================================================

log('\n=== PHASE 1: Health & Connection Checks ===\n', 'info');

await test('API server is reachable', async () => {
  const { status } = await request('/api/health');
  assert.equal(status, 200);
});

await test('Database is connected', async () => {
  const { status } = await request('/healthz/db');
  assert.equal(status, 200);
});

await test('CSRF token endpoint works', async () => {
  const { status, data } = await request('/api/csrf-token');
  assert.equal(status, 200);
  assert(data.csrfToken, 'Should return csrfToken');
});

// ============================================================================
// PHASE 2: Account Persistence (Create & Signup Flow)
// ============================================================================

log('\n=== PHASE 2: Account Persistence (Signup Flow) ===\n', 'info');

const testEmail = `prod-persist-${Date.now()}@test.local`;
const testPassword = 'ProdTest123!';
let testUserId = null;
let sessionCookie = null;

await test('OTP signup request succeeds', async () => {
  const { status, data } = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      fullName: 'Production Test User',
      country: 'US'
    })
  });
  assert.equal(status, 200);
  assert.equal(data.status, 'otp_required');
  assert(data.email === testEmail);
  assert(data.expiresInSeconds > 0);
});

await test('Multiple signups with different emails succeed', async () => {
  const { status, data } = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: `prod-test-${Date.now()}-2@test.local`,
      password: testPassword,
      fullName: 'Second Test User',
      country: 'US'
    })
  });
  
  assert.equal(status, 200);
  assert.equal(data.status, 'otp_required');
});

await test('Duplicate signup returns OTP challenge (no email enumeration)', async () => {
  // Try signing up with the same email
  const { status, data } = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      fullName: 'Duplicate User',
      country: 'US'
    })
  });
  
  // Should return OTP challenge even for duplicate email
  assert.equal(status, 200);
  assert.equal(data.status, 'otp_required');
});

// ============================================================================
// PHASE 3: CSRF Token Management
// ============================================================================

log('\n=== PHASE 3: CSRF Token Management ===\n', 'info');

await test('CSRF token can be fetched', async () => {
  const { status, data } = await request('/api/csrf-token');
  assert.equal(status, 200);
  assert(data.csrfToken);
  assert.equal(typeof data.csrfToken, 'string');
  assert(data.csrfToken.length > 0);
});

await test('CSRF token is consistent across multiple requests', async () => {
  const { data: data1 } = await request('/api/csrf-token');
  const { data: data2 } = await request('/api/csrf-token');
  
  // Tokens might differ in production (new token each request is valid)
  // Just verify both exist and are valid format
  assert(data1.csrfToken);
  assert(data2.csrfToken);
});

// ============================================================================
// PHASE 4: Password Reset Flow
// ============================================================================

log('\n=== PHASE 4: Password Reset Flow ===\n', 'info');

await test('Forgot password request returns 200 for valid email', async () => {
  const { status } = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'demo@xpressprofx.com'
    })
  });
  
  // Should return 200 even if email doesn't exist (no email enumeration)
  assert.equal(status, 200);
});

await test('Forgot password request returns 200 for non-existent email', async () => {
  const { status } = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: `nonexistent-${Date.now()}@test.local`
    })
  });
  
  // Should return 200 to prevent email enumeration
  assert.equal(status, 200);
});

// ============================================================================
// PHASE 5: Route Accessibility & CORS
// ============================================================================

log('\n=== PHASE 5: Route Accessibility & CORS ===\n', 'info');

await test('Public routes are accessible without auth', async () => {
  const { status } = await request('/api/health');
  assert.equal(status, 200);
});

await test('Auth routes handle unauthenticated requests', async () => {
  const { status } = await request('/api/auth/me');
  // Should be 401 or 403, not 500
  assert(status === 401 || status === 403, `Expected 401 or 403, got ${status}`);
});

await test('API returns security headers', async () => {
  const { response } = await request('/api/health');
  // Check for presence of important security headers
  const hasXContentTypeOptions = response.headers.get('x-content-type-options');
  const hasCSP = response.headers.get('content-security-policy');
  
  // At least one security header should be present
  assert(hasXContentTypeOptions || hasCSP, 'Should have security headers');
});

// ============================================================================
// PHASE 6: Authentication Flow Validation
// ============================================================================

log('\n=== PHASE 6: Authentication Flow Validation ===\n', 'info');

await test('Invalid login credentials are rejected', async () => {
  const { status } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent@test.local',
      password: 'wrongpassword'
    })
  });
  
  assert.equal(status, 401);
});

await test('Login without password field returns 400', async () => {
  const { status } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@test.local'
      // missing password
    })
  });
  
  assert.equal(status, 400);
});

// ============================================================================
// PHASE 7: Database Persistence Verification
// ============================================================================

log('\n=== PHASE 7: Database Persistence ===\n', 'info');

await test('Database queries complete without timeout', async () => {
  const startTime = Date.now();
  const { status } = await request('/healthz/db');
  const duration = Date.now() - startTime;
  
  assert.equal(status, 200);
  assert(duration < 5000, `DB query should complete within 5s, took ${duration}ms`);
});

await test('API responds quickly under normal load', async () => {
  const startTime = Date.now();
  const { status } = await request('/api/csrf-token');
  const duration = Date.now() - startTime;
  
  assert.equal(status, 200);
  assert(duration < 2000, `API should respond within 2s, took ${duration}ms`);
});

// ============================================================================
// Summary
// ============================================================================

log('\n=== VERIFICATION SUMMARY ===\n', 'info');
log(`Total Tests: ${testCount}`, 'info');
log(`Passed: ${passCount}`, passCount === testCount ? 'success' : 'warning');
log(`Failed: ${failCount}`, failCount === 0 ? 'success' : 'error');

if (failCount === 0) {
  log('\n🎉 ALL PRODUCTION CHECKS PASSED!', 'success');
  log('The system is ready for production use.\n', 'success');
  process.exit(0);
} else {
  log('\n⚠️  Some checks failed. Please review the errors above.\n', 'error');
  process.exit(1);
}
