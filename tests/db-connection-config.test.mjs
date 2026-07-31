import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPostgresConfig, getRawDatabaseUrl } from '../lib/db/src/connection-config.ts';

test('adds Railway SSL settings for plain postgres URLs', () => {
  const config = buildPostgresConfig('postgresql://user:pass@db.internal:5432/app', {
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });

  assert.equal(config.connectionString.includes('sslmode=verify-full'), true);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test('overrides a disabled sslmode with Railway-compatible SSL', () => {
  const config = buildPostgresConfig('postgresql://user:pass@db.internal:5432/app?sslmode=disable', {
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });

  assert.equal(config.connectionString.includes('sslmode=verify-full'), true);
  assert.equal(config.connectionString.includes('sslmode=disable'), false);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test('prefers the public DATABASE_PUBLIC_URL over the private DATABASE_URL', () => {
  const config = buildPostgresConfig(undefined, {
    DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/app',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
  });

  assert.equal(config.connectionString.includes('public.railway.app'), true);
  assert.equal(config.connectionString.includes('postgres.railway.internal'), false);
});

test('getRawDatabaseUrl prefers DATABASE_PUBLIC_URL when both values are present', () => {
  const url = getRawDatabaseUrl({
    DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/app',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
  });

  assert.equal(url, 'postgresql://user:pass@public.railway.app:5432/app');
});

test('getRawDatabaseUrl prefers DIRECT_DATABASE_URL when present', () => {
  const url = getRawDatabaseUrl({
    DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/app',
    DATABASE_PUBLIC_URL: 'postgresql://user:pass@public.railway.app:5432/app',
    DIRECT_DATABASE_URL: 'postgresql://user:pass@direct.railway.app:5432/app',
  });

  assert.equal(url, 'postgresql://user:pass@direct.railway.app:5432/app');
});
