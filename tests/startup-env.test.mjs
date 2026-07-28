import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStartupEnvironment } from '../artifacts/api-server/src/lib/startup-env.ts';

test('startup validation reports missing required variables', () => {
  const result = validateStartupEnvironment({
    NODE_ENV: 'production',
    PORT: '8080',
    DATABASE_URL: '',
    SESSION_SECRET: '',
    JWT_SECRET: '',
    WALLET_ENCRYPTION_KEY: '',
    ALLOWED_ORIGINS: '',
  });

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('DATABASE_URL'));
  assert.ok(result.missing.includes('SESSION_SECRET'));
  assert.ok(result.missing.includes('JWT_SECRET'));
  assert.ok(result.missing.includes('WALLET_ENCRYPTION_KEY'));
  assert.ok(result.missing.includes('ALLOWED_ORIGINS'));
});

test('startup validation resolves defaults and warns for optional secrets', () => {
  const result = validateStartupEnvironment({
    NODE_ENV: 'development',
    PORT: '',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef',
    JWT_SECRET: 'fedcba9876543210fedcba9876543210',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  });

  assert.equal(result.ok, true);
  assert.equal(result.resolved.PORT, '8080');
  assert.equal(result.resolved.NODE_ENV, 'development');
  assert.ok(result.warnings.includes('MOONPAY_API_KEY'));
  assert.ok(result.warnings.includes('COINBASE_WEBHOOK_SECRET'));
  assert.ok(result.warnings.includes('AI_INTEGRATIONS_OPENAI_API_KEY'));
});

test('startup validation requires admin provisioning secrets in production', () => {
  const result = validateStartupEnvironment({
    NODE_ENV: 'production',
    PORT: '8080',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef',
    JWT_SECRET: 'fedcba9876543210fedcba9876543210',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ALLOWED_ORIGINS: 'https://example.com',
    ADMIN_EMAIL: '',
    ADMIN_PASSWORD: '',
  });

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('ADMIN_EMAIL'));
  assert.ok(result.missing.includes('ADMIN_PASSWORD'));
});

test('startup validation allows development without a database URL', () => {
  const result = validateStartupEnvironment({
    NODE_ENV: 'development',
    PORT: '8080',
    DATABASE_URL: '',
    SESSION_SECRET: '0123456789abcdef0123456789abcdef',
    JWT_SECRET: 'fedcba9876543210fedcba9876543210',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ALLOWED_ORIGINS: 'http://localhost',
  });

  assert.equal(result.ok, true);
  assert.ok(result.warnings.includes('DATABASE_URL'));
  assert.equal(result.resolved.DATABASE_URL, '');
});
