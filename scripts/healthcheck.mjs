#!/usr/bin/env node

const baseUrl = process.env.PRODUCTION_URL || process.env.APP_URL || process.env.SERVER_URL;
if (!baseUrl) {
  console.error('ERROR: PRODUCTION_URL (or APP_URL / SERVER_URL) must be set.');
  process.exit(2);
}

const endpoints = [
  '/healthz',
  '/api/healthz',
  '/readyz',
  '/api/readyz',
];

function normalizeUrl(base, path) {
  try {
    return new URL(path, base).toString();
  } catch (err) {
    console.error('Invalid URL:', base, path, err?.message || err);
    process.exit(2);
  }
}

async function checkEndpoint(endpoint) {
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
  console.log(`Checking health endpoints for ${baseUrl}`);
  const results = await Promise.all(endpoints.map(checkEndpoint));
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

run().catch((err) => {
  console.error('Unexpected error during healthcheck:', err?.message || err);
  process.exit(99);
});
