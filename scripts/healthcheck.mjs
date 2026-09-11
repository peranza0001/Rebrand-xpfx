#!/usr/bin/env node

import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const endpoints = [
  '/healthz',
  '/api/healthz',
  '/readyz',
  '/api/readyz',
];

export function resolveHealthcheckBaseUrl(env = process.env) {
  const explicitBase = env.PRODUCTION_URL || env.APP_URL || env.SERVER_URL || env.PUBLIC_APP_URL || env.FRONTEND_URL;
  if (explicitBase) {
    return explicitBase.replace(/\/+$/, '');
  }

  const port = env.PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

function normalizeUrl(base, path) {
  try {
    return new URL(path, base).toString();
  } catch (err) {
    console.error('Invalid URL:', base, path, err?.message || err);
    process.exit(2);
  }
}

async function checkEndpoint(baseUrl, endpoint) {
  const url = normalizeUrl(baseUrl, endpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    const body = await res.text();
    return {
      endpoint,
      url,
      status: res.status,
      ok: res.ok,
      body: body.slice(0, 1000),
    };
  } catch (error) {
    return {
      endpoint,
      url,
      status: null,
      ok: false,
      error: error?.message || String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function run() {
  const baseUrl = resolveHealthcheckBaseUrl();
  const strict = process.argv.includes('--strict');

  if (!process.env.PRODUCTION_URL && !process.env.APP_URL && !process.env.SERVER_URL && !strict && process.env.NODE_ENV !== 'production') {
    console.warn(`No production base URL configured; skipping healthcheck for ${baseUrl}. Set PRODUCTION_URL/APP_URL/SERVER_URL to enforce a real check.`);
    process.exit(0);
  }

  console.log(`Checking health endpoints for ${baseUrl}`);
  const results = await Promise.all(endpoints.map((endpoint) => checkEndpoint(baseUrl, endpoint)));
  let allOk = true;

  for (const result of results) {
    if (result.ok) {
      console.log(`✅ ${result.endpoint} -> ${result.status}`);
    } else {
      allOk = false;
      console.error(`❌ ${result.endpoint} -> ${result.status ?? 'ERROR'}`);
      if (result.error) {
        console.error(`   error: ${result.error}`);
      } else if (result.body) {
        console.error(`   body: ${result.body.replace(/\s+/g, ' ').trim()}`);
      }
    }
  }

  process.exit(allOk ? 0 : 1);
}

const isDirectExecution = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === resolvePath(entry);
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  run().catch((err) => {
    console.error('Unexpected error during healthcheck:', err?.message || err);
    process.exit(99);
  });
}
