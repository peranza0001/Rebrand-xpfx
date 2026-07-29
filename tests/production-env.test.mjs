import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionEnvironment } from '../scripts/validate-production-env.mjs';
import { resolveEnvValue } from '../artifacts/api-server/src/lib/env.ts';

test('production validation warns and stays resilient when secrets are missing', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: '',
    WALLET_ENCRYPTION_KEY: '',
    DATABASE_URL: '',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
  assert.equal(validateProductionEnvironment(env), true);
});

test('production validation accepts a complete configuration', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production validation accepts DATABASE_PUBLIC_URL as an alternate database connection', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('environment aliases resolve the production secret names used by deployment platforms', () => {
  const env = {
    OPENAI_API_KEY: 'sk-test-openai-key',
    COOKIE_SIGNING_KEY: 'cookie-signing-secret',
    MOONPAY_SECRET: 'moonpay-secret',
    PAYSTACK_PUBLIC: 'pk-test-paystack-key',
  };

  assert.equal(resolveEnvValue(env, 'AI_INTEGRATIONS_OPENAI_API_KEY', ['OPENAI_API_KEY']), 'sk-test-openai-key');
  assert.equal(resolveEnvValue(env, 'SESSION_SECRET', ['COOKIE_SIGNING_KEY']), 'cookie-signing-secret');
  assert.equal(resolveEnvValue(env, 'MOONPAY_SECRET_KEY', ['MOONPAY_SECRET']), 'moonpay-secret');
  assert.equal(resolveEnvValue(env, 'PAYSTACK_PUBLIC', ['PAYSTACK_PUBLIC_KEY']), 'pk-test-paystack-key');
});
