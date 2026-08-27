import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLiveTradingEnabled } from '../artifacts/api-server/src/lib/env.ts';
import { isBrokerExecutionConfiguredForRuntime } from '../artifacts/api-server/src/lib/broker-client.ts';

test('live trading defaults on in development and requires explicit opt-in in production', () => {
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'development' }), true);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production' }), false);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production', ENABLE_LIVE_TRADING: 'true' }), true);
  assert.equal(resolveLiveTradingEnabled({ NODE_ENV: 'production', ENABLE_LIVE_TRADING: 'false' }), false);
});

test('real broker execution is only considered ready when URL and credentials are supplied', () => {
  assert.equal(isBrokerExecutionConfiguredForRuntime({
    NODE_ENV: 'production',
    ENABLE_LIVE_TRADING: 'true',
    BROKER_API_URL: 'https://api.example.com',
    BROKER_API_KEY: 'abc123',
    BROKER_ACCOUNT_ID: 'acct_123',
    BROKER_EXECUTION_PROVIDER: 'custom',
  }), true);

  assert.equal(isBrokerExecutionConfiguredForRuntime({
    NODE_ENV: 'production',
    ENABLE_LIVE_TRADING: 'true',
    BROKER_API_URL: '',
    BROKER_API_KEY: '',
    BROKER_ACCOUNT_ID: '',
  }), false);
});

test('production validation refuses live trading if the broker credentials are not configured', async () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
    ENABLE_LIVE_TRADING: 'true',
  };

  const { validateProductionEnvironment } = await import('../scripts/validate-production-env.mjs');

  assert.throws(() => validateProductionEnvironment(env), {
    message: /ENABLE_LIVE_TRADING=true.*BROKER_API_URL|BROKER_API_URL.*BROKER_ACCOUNT_ID/i,
  });
});
