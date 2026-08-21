import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPostgresConfig, getRawDatabaseUrl } from '../lib/db/src/connection-config.ts';

test('adds Railway SSL settings for plain postgres URLs', () => {
  const config = buildPostgresConfig('postgresql://user:pass@db.internal:5432/app', {
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });

  assert.equal(config.connectionString.includes('sslmode='), false);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test('removes sslmode from URLs and relies on explicit SSL settings', () => {
  const config = buildPostgresConfig('postgresql://user:pass@db.internal:5432/app?sslmode=disable', {
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });

  assert.equal(config.connectionString.includes('sslmode='), false);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test('strips verify-full sslmode from the connection string', () => {
  const config = buildPostgresConfig('postgresql://user:pass@db.internal:5432/app?sslmode=verify-full', {
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });

  assert.equal(config.connectionString.includes('sslmode='), false);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test('prefers private DATABASE_URL over DATABASE_PUBLIC_URL', () => {
  const config = buildPostgresConfig(undefined, {
    DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/app',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
  });

  assert.equal(config.connectionString.includes('postgres.railway.internal'), true);
  assert.equal(config.connectionString.includes('public.railway.app'), false);
});

test('getRawDatabaseUrl prefers DATABASE_URL over DATABASE_PUBLIC_URL when both values are present', () => {
  const url = getRawDatabaseUrl({
    DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/app',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
  });

  assert.equal(url, 'postgresql://user:pass@postgres.railway.internal:5432/app');
});

test('getRawDatabaseUrl prefers pooled DATABASE_URL over DIRECT_DATABASE_URL at runtime', () => {
  const url = getRawDatabaseUrl({
    DATABASE_URL: 'postgresql://user:pass@ep-pooled.neon.tech/app?sslmode=require',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
    DIRECT_DATABASE_URL: 'postgresql://user:pass@ep-direct.neon.tech/app?sslmode=require',
  });

  assert.equal(url, 'postgresql://user:pass@ep-pooled.neon.tech/app?sslmode=require');
});

test('getRawDatabaseUrl ignores placeholder example.internal database URLs', () => {
  const url = getRawDatabaseUrl({
    DATABASE_URL: 'postgresql://postgres:change_me_secure_password@db.example.internal:5432/railway',
    DIRECT_DATABASE_URL: 'postgresql://postgres:change_me_secure_password@db.example.internal:5432/railway',
  });

  assert.equal(url, undefined);
});
