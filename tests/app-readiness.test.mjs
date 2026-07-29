import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ALLOWED_ORIGINS = 'https://example.com';

import appModule from '../artifacts/api-server/src/app.ts';

// Handle both direct export and ES module wrapper
const app = appModule.default ?? appModule;

async function withTestServer(handler) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind to a TCP port');
  }

  try {
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoints are registered and app imports cleanly', async () => {
  assert(app, 'app should exist');

  const stack = (app._router?.stack ?? []);
  const routePaths = [];
  for (const layer of stack) {
    if (layer.route) {
      routePaths.push(layer.route.path);
    }
  }

  assert(routePaths.includes('/healthz'), '/healthz route should be registered');
  assert(routePaths.includes('/livez'), '/livez route should be registered');
  assert(routePaths.includes('/readyz'), '/readyz route should be registered');
  assert(routePaths.includes('/healthz/db'), '/healthz/db route should be registered');
  assert(routePaths.includes('/api/healthz'), '/api/healthz route should be registered');
  assert(routePaths.includes('/api/livez'), '/api/livez route should be registered');
  assert(routePaths.includes('/api/readyz'), '/api/readyz route should be registered');
});

test('production health endpoints remain reachable over http for platform probes', async () => {
  await withTestServer(async (baseUrl) => {
    for (const path of ['/healthz', '/livez', '/readyz', '/api/healthz', '/api/livez', '/api/readyz']) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'x-forwarded-proto': 'http' },
      });

      assert.equal(response.status, 200, `${path} should remain available to platform health checks`);
      assert.equal(response.headers.get('location'), null, `${path} should not redirect`);
    }
  });
});
