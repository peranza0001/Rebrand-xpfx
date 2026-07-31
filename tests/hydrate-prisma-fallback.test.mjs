import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStoredUserFromHydratedRow } from '../artifacts/api-server/src/lib/hydrate.ts';

test('buildStoredUserFromHydratedRow maps snake_case Prisma fields into the in-memory store format', () => {
  const row = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'alice',
    email: 'alice@example.com',
    full_name: 'Alice Example',
    country: 'US',
    kyc_verified: true,
    avatar_url: 'https://example.com/avatar.png',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    selected_manager_id: 'manager-1',
    phone: '1234567890',
    moonpay_email: 'moonpay@example.com',
    buy_verified: true,
    password_hash: 'hash-value',
    role: 'admin',
    referral_code: 'ABC123',
    referred_by: 'referrer-1',
    trading_locked: true,
    demo_mode: false,
  };

  const stored = buildStoredUserFromHydratedRow(row, new Set());

  assert.ok(stored);
  assert.equal(stored.user.fullName, 'Alice Example');
  assert.equal(stored.user.country, 'US');
  assert.equal(stored.user.kycVerified, true);
  assert.equal(stored.user.avatarUrl, 'https://example.com/avatar.png');
  assert.equal(stored.user.createdAt, '2024-01-01T00:00:00.000Z');
  assert.equal(stored.user.selectedManagerId, 'manager-1');
  assert.equal(stored.user.phone, '1234567890');
  assert.equal(stored.user.moonpayEmail, 'moonpay@example.com');
  assert.equal(stored.user.buyVerified, true);
  assert.equal(stored.passwordHash, 'hash-value');
  assert.equal(stored.role, 'admin');
  assert.equal(stored.referralCode, 'ABC123');
  assert.equal(stored.referredBy, 'referrer-1');
  assert.equal(stored.tradingLocked, true);
  assert.equal(stored.demoMode, false);
});
