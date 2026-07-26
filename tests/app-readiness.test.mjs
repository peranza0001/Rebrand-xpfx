import test from 'node:test';
import assert from 'node:assert/strict';
import appModule from '../artifacts/api-server/src/app.ts';

// Handle both direct export and ES module wrapper
const app = appModule.default ?? appModule;

test('health endpoints are registered and app imports cleanly', async () => {
  // Verify the app imports without errors
  assert(app, 'app should exist');
  
  // Check that health routes are registered
  const stack = (app._router?.stack ?? []);
  const routePaths = [];
  for (const layer of stack) {
    if (layer.route) {
      routePaths.push(layer.route.path);
    }
  }

  // Assert required health endpoints exist
  assert(routePaths.includes('/healthz'), '/healthz route should be registered');
  assert(routePaths.includes('/livez'), '/livez route should be registered');
  assert(routePaths.includes('/readyz'), '/readyz route should be registered');
  assert(routePaths.includes('/healthz/db'), '/healthz/db route should be registered');
  assert(routePaths.includes('/api/healthz'), '/api/healthz route should be registered');
  assert(routePaths.includes('/api/livez'), '/api/livez route should be registered');
  assert(routePaths.includes('/api/readyz'), '/api/readyz route should be registered');
});
