import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { validateProductionEnvironment } from '../scripts/validate-production-env.mjs';
import { resolveEnvValue } from '../artifacts/api-server/src/lib/env.ts';
import { validateStartupEnvironment } from '../artifacts/api-server/src/lib/startup-env.ts';
import { resolveOpenAIApiKey, resolveOpenAIBaseURL, resolveOpenAIModel } from '../artifacts/api-server/src/lib/openai-client.ts';
import { issueOtp } from '../artifacts/api-server/src/lib/otp.ts';
import { initiateKYCVerification } from '../artifacts/api-server/src/lib/kyc-provider.ts';

test('resolveEnvValue strips wrapping quotes and escaped trailing quotes from production env values', () => {
  const env = {
    PUBLIC_APP_URL: '"https://xpressprofx.com\\"',
    ALLOWED_ORIGINS: '"https://web-production-94f970.up.railway.app,https://xpressprofx.com"',
  };

  assert.equal(resolveEnvValue(env, 'PUBLIC_APP_URL', ['FRONTEND_URL']), 'https://xpressprofx.com');
  assert.equal(resolveEnvValue(env, 'ALLOWED_ORIGINS'), 'https://web-production-94f970.up.railway.app,https://xpressprofx.com');
});

test('resolveEnvValue handles values ending in a backslash-escaped quote without leaving a trailing slash', () => {
  const env = {
    PUBLIC_APP_URL: '"https://xpressprofx.com\\"',
    FRONTEND_URL: '"https://web-production-94f970.up.railway.app\\"',
  };

  assert.equal(resolveEnvValue(env, 'PUBLIC_APP_URL', ['FRONTEND_URL']), 'https://xpressprofx.com');
  assert.equal(resolveEnvValue(env, 'FRONTEND_URL', ['PUBLIC_APP_URL']), 'https://web-production-94f970.up.railway.app');
});

test('startup validation allows degraded production startup when DATABASE_URL is not attached yet', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
  };

  const result = validateStartupEnvironment(env);
  assert.equal(result.ok, true);
  assert.equal(result.missing.includes('DATABASE_URL'), false);
});

test('production validation allows missing optional email provider', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production validation accepts a complete SMTP configuration', () => {
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
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@example.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production validation rejects placeholder database URLs instead of silently dropping persistence', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://postgres:change_me_secure_password@db.example.internal:5432/railway',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@acme.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.throws(() => validateProductionEnvironment(env), {
    message: /DATABASE_URL.*configured|real PostgreSQL/i,
  });
});

test('production validation accepts DATABASE_PUBLIC_URL as an alternate database connection with SMTP configured', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@example.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production validation allows missing SendGrid and SMTP provider', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
  };

  assert.doesNotThrow(() => validateProductionEnvironment({
    ...env,
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassw0rd!2026',
  }));
});

test('production validation fails when SendGrid is configured without SMTP_FROM', () => {
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
    SENDGRID_API_KEY: 'SG.1234567890abcdef0123456789abcdef',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.throws(() => validateProductionEnvironment(env), {
    message: /SMTP_FROM must be configured when email delivery is enabled in production\./,
  });
});

test('production validation allows missing optional blockchain provider', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongPassw0rd!2026',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@acme.com',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production OTP flow falls back to internal admin provider when no SMTP or SendGrid is configured', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSendgrid = process.env.SENDGRID_API_KEY;
  const previousSmtpHost = process.env.SMTP_HOST;
  const previousSmtpUser = process.env.SMTP_USER;
  const previousSmtpPass = process.env.SMTP_PASS;
  const previousSmtpFrom = process.env.SMTP_FROM;

  process.env.NODE_ENV = 'production';
  delete process.env.SENDGRID_API_KEY;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;

  try {
    await assert.doesNotReject(() => issueOtp({
      email: 'admin-fallback@test.com',
      intent: 'login',
    }));
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousSendgrid === undefined) delete process.env.SENDGRID_API_KEY; else process.env.SENDGRID_API_KEY = previousSendgrid;
    if (previousSmtpHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = previousSmtpHost;
    if (previousSmtpUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = previousSmtpUser;
    if (previousSmtpPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = previousSmtpPass;
    if (previousSmtpFrom === undefined) delete process.env.SMTP_FROM; else process.env.SMTP_FROM = previousSmtpFrom;
  }
});

test('production KYC flow falls back to internal admin handling when no provider is configured', async () => {
  const previousProvider = process.env.KYC_PROVIDER;
  const previousOnfido = process.env.ONFIDO_API_KEY;
  const previousSocure = process.env.SOCURE_API_KEY;

  delete process.env.KYC_PROVIDER;
  delete process.env.ONFIDO_API_KEY;
  delete process.env.SOCURE_API_KEY;

  try {
    const result = await initiateKYCVerification({
      userId: 'user_internal_fallback',
      email: 'fallback@example.com',
      firstName: 'Fallback',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      countryCode: 'US',
      documentType: 'passport',
    });

    assert.equal(result.status, 'pending');
    assert.equal(result.provider, 'internal_admin');
  } finally {
    if (previousProvider === undefined) delete process.env.KYC_PROVIDER; else process.env.KYC_PROVIDER = previousProvider;
    if (previousOnfido === undefined) delete process.env.ONFIDO_API_KEY; else process.env.ONFIDO_API_KEY = previousOnfido;
    if (previousSocure === undefined) delete process.env.SOCURE_API_KEY; else process.env.SOCURE_API_KEY = previousSocure;
  }
});

test('production validation fails when admin credentials are weak or missing', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'admin@acme.com',
    ADMIN_PASSWORD: 'ChangeMe123!',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@acme.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.throws(() => validateProductionEnvironment(env), {
    message: /ADMIN_PASSWORD must be set to a strong production credential/,
  });
});

test('production validation accepts a strong 8-character admin password when all other production requirements are present', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'Abcdef1!',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@acme.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production validation accepts an admin password without a symbol', () => {
  const env = {
    NODE_ENV: 'production',
    PORT: '3000',
    SESSION_SECRET: 'a-very-long-production-secret-value-1234567890',
    JWT_SECRET: 'another-very-long-production-secret-value-1234567890',
    WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app?sslmode=require',
    ALLOWED_ORIGINS: 'https://app.example.com',
    ADMIN_EMAIL: 'ops@acme.com',
    ADMIN_PASSWORD: 'StrongProdPassword2026',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'no_reply@acme.com',
    ALCHEMY_API_KEY: 'abcdefghijklmnopqrstuvwxyz',
  };

  assert.doesNotThrow(() => validateProductionEnvironment(env));
});

test('production bootstrap accepts a strong long admin password without a symbol', async () => {
  const child = spawn(process.execPath, [
    '--import', 'tsx',
    '-e',
    `
      process.env.NODE_ENV = 'production';
      process.env.PORT = '0';
      process.env.SESSION_SECRET = '4u3yafJrcV8FRVyZwor7afOiOJJFpXlgctFYCMk/ER06pAXzUsA4fuPPLn5YTd9+83ZcrS7ZJhTsmGLYR2KFiA==';
      process.env.JWT_SECRET = 'UfcyhUNAYXaNbIFOxmu95XMSBiVMVImZAvLL2D0zw723cRDO7EWpmPqyZPgtHlPTWVUtdwrOJ5BXdus0E+9hKg==';
      process.env.WALLET_ENCRYPTION_KEY = '33c72d64c2883f1f95b1c17281566b5b3163c14d9f4118c065ac6ad5ae682522';
      process.env.ADMIN_EMAIL = 'ops@acme.com';
      process.env.ADMIN_PASSWORD = 'YrZjpj2XU3iIC9RihFnNSvi9';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/app?sslmode=require';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      process.env.SMTP_FROM = 'no_reply@acme.com';
      process.env.ALCHEMY_API_KEY = 'abcdefghijklmnopqrstuvwxyz';
      await import('./artifacts/api-server/src/index.ts');
      setTimeout(() => process.exit(0), 500);
    `,
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  const exitCode = await new Promise((resolve) => child.on('exit', resolve));
  const output = `${stdout}\n${stderr}`;

  assert.equal(exitCode, 0, output);
  assert.doesNotMatch(output, /ADMIN_PASSWORD must be set to a strong production credential\./);
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

test('the livechat AI honors the configured OpenAI model from the deployment environment', () => {
  const env = {
    OPENAI_MODEL: 'gpt-4.1-mini',
    AI_INTEGRATIONS_OPENAI_MODEL: 'gpt-4o-mini',
    OPENAI_API_KEY: 'sk-test-openai-key',
  };

  assert.equal(resolveOpenAIModel(env), 'gpt-4.1-mini');
  assert.equal(resolveOpenAIModel({ OPENAI_API_KEY: 'sk-test-openai-key' }), 'gpt-4.1-mini');
});

test('the livechat AI accepts the AI integrations OpenAI key and endpoint', () => {
  assert.equal(
    resolveOpenAIApiKey({ AI_INTEGRATIONS_OPENAI_API_KEY: '  sk-integration-key  ' }),
    'sk-integration-key',
  );
  assert.equal(
    resolveOpenAIBaseURL({ AI_INTEGRATIONS_OPENAI_BASE_URL: 'https://proxy.example/v1' }),
    'https://proxy.example/v1',
  );
});
