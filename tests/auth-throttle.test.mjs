process.env.NODE_ENV = 'development';

import test from 'node:test';
import assert from 'node:assert/strict';

const throttle = await import('../artifacts/api-server/src/lib/auth-throttle.ts');

const email = `throttle-test@example.com`;
const ip = `127.0.0.1`;

test('login failure lockout after max attempts', async () => {
  throttle._debugResetAll();
  throttle.resetLoginFailures(email);

  // Record max attempts
  let last = null;
  for (let i = 0; i < 5; i++) {
    last = throttle.recordLoginFailure(email);
  }

  assert.equal(throttle.isLoginLocked(email), true, 'email should be locked after max failures');
  assert.equal(last.locked, true, 'recordLoginFailure should indicate locked after threshold');

  // Reset and ensure unlocked
  throttle.resetLoginFailures(email);
  assert.equal(throttle.isLoginLocked(email), false, 'email should be unlocked after reset');
});

test('otp per-email limit enforced', async () => {
  throttle._debugResetAll();

  // send OTP 9 times -> allowed
  for (let i = 0; i < 9; i++) throttle.recordOtpSent(email);
  assert.equal(throttle.canSendOtp(email), true, 'should allow up to 9 sends');

  // 10th send -> still records, but next check should disallow
  throttle.recordOtpSent(email);
  assert.equal(throttle.canSendOtp(email), false, 'should disallow after 10 sends');
});

test('otp per-ip relaxed limit enforced', async () => {
  throttle._debugResetAll();

  // send OTP from IP up to 50 (10 * 5)
  for (let i = 0; i < 49; i++) throttle.recordOtpSentFromIp(ip);
  assert.equal(throttle.canSendOtpFromIp(ip), true, 'should allow up to 49 sends from IP');

  throttle.recordOtpSentFromIp(ip);
  assert.equal(throttle.canSendOtpFromIp(ip), false, 'should disallow after 50 sends from IP');
});
