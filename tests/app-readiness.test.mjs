import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import appModule from '../artifacts/api-server/src/app.ts';
import { resolveAppOriginFromRequest } from '../artifacts/api-server/src/routes/auth-password.ts';

process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ALLOWED_ORIGINS = 'https://example.com,http://127.0.0.1';

const app = appModule && typeof appModule === 'object' && 'default' in appModule ? appModule.default : appModule;

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

  assert(routePaths.includes('/health'), '/health route should be registered');
  assert(routePaths.includes('/healthz'), '/healthz route should be registered');
  assert(routePaths.includes('/livez'), '/livez route should be registered');
  assert(routePaths.includes('/readyz'), '/readyz route should be registered');
  assert(routePaths.includes('/healthz/db'), '/healthz/db route should be registered');
  assert(routePaths.includes('/api/health'), '/api/health route should be registered');
  assert(routePaths.includes('/api/healthz'), '/api/healthz route should be registered');
  assert(routePaths.includes('/api/livez'), '/api/livez route should be registered');
  assert(routePaths.includes('/api/readyz'), '/api/readyz route should be registered');

  const appSource = await fs.promises.readFile(new URL('../artifacts/api-server/src/app.ts', import.meta.url), 'utf8');
  assert.match(appSource, /database-not-configured/);
  assert.match(appSource, /\$queryRaw`select 1`/);
  assert(routePaths.includes('/metrics'), '/metrics route should be registered');
});

test('monitoring and admin portal routes are registered', () => {
  const stack = (app._router?.stack ?? []);
  const hasMetricsRoute = stack.some((layer) => layer.route?.path === '/metrics');
  const hasXpAdminRoute = stack.some(
    (layer) => layer.route?.path === '/xpadmin*' || String(layer.regexp).includes('\\/xpadmin'),
  );

  assert.ok(hasMetricsRoute, '/metrics route should be registered');
  assert.ok(hasXpAdminRoute, 'XP Admin static route or fallback should be registered');
});

test('GET /metrics returns Prometheus exposition format', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/metrics`, {
      method: 'GET',
      redirect: 'manual',
    });

    assert.equal(response.status, 200, '/metrics should return successfully');
    assert.equal(
      response.headers.get('content-type'),
      'text/plain; version=0.0.4; charset=utf-8',
      'metrics endpoint should return Prometheus content type',
    );
    const body = await response.text();
    assert.ok(
      body.includes('# HELP') || body.includes('# TYPE'),
      'metrics endpoint should return Prometheus formatted text',
    );
  });
});

test('production health endpoints remain reachable over http for platform probes', async () => {
  await withTestServer(async (baseUrl) => {
    for (const path of ['/health', '/healthz', '/livez', '/api/health', '/api/healthz', '/api/livez']) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'x-forwarded-proto': 'http' },
      });

      assert.equal(response.status, 200, `${path} should remain available to platform health checks`);
      assert.equal(response.headers.get('location'), null, `${path} should not redirect`);
    }

    for (const path of ['/readyz', '/api/readyz']) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'x-forwarded-proto': 'http' },
      });

      assert.equal(response.status, 503, `${path} should report missing production dependencies`);
      assert.equal(response.headers.get('location'), null, `${path} should not redirect`);
    }
  });
});

test('health endpoints expose the deployed commit when the platform provides it', async () => {
  const previousSha = process.env.GIT_COMMIT_SHA;
  process.env.GIT_COMMIT_SHA = 'test-commit-sha';
  try {
    await withTestServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`, { redirect: 'manual' });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.commitSha, 'test-commit-sha');
    });
  } finally {
    if (previousSha === undefined) delete process.env.GIT_COMMIT_SHA;
    else process.env.GIT_COMMIT_SHA = previousSha;
  }
});

test('same-origin POST requests are not blocked by CSRF middleware before auth checks', async () => {
  await withTestServer(async (baseUrl) => {
    process.env.ALLOWED_ORIGINS = `${baseUrl},https://example.com`;
    const response = await fetch(`${baseUrl}/api/live-chat`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/json',
        origin: baseUrl,
        'x-forwarded-host': new URL(baseUrl).host,
        'x-forwarded-proto': 'https',
      },
      body: JSON.stringify({ content: 'hello' }),
    });

    assert.equal(response.status, 401, 'same-origin authenticated requests should reach auth middleware instead of failing CSRF');
    const body = await response.json();
    assert.equal(body.error, 'Not authenticated');
  });
});

test('preview-host POST requests are not blocked by CSRF middleware before auth checks', async () => {
  await withTestServer(async (baseUrl) => {
    const previewOrigin = 'https://rebrand-xpfx-production-1988.up.railway.app';
    const response = await fetch(`${baseUrl}/api/live-chat`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/json',
        origin: previewOrigin,
        'x-forwarded-host': 'rebrand-xpfx-production-1988.up.railway.app',
        'x-forwarded-proto': 'https',
      },
      body: JSON.stringify({ content: 'hello' }),
    });

    assert.equal(response.status, 401, 'trusted preview-host requests should reach auth middleware instead of failing CSRF');
    const body = await response.json();
    assert.equal(body.error, 'Not authenticated');
  });
});

test('first-party live chat is the only chat widget loaded in the frontend', async () => {
  const html = await fs.promises.readFile(new URL('../artifacts/nextrade/index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /chatway|cdn\.chatway\.app|widget\.js\?id=/i, 'Chatway script should not be embedded alongside the first-party live chat stack');
  assert.match(html, /src="\/src\/main\.tsx"/i, 'Frontend entry should still load normally');
});

test('visitor chat captures explicit support consent before starting', async () => {
  const widget = await fs.promises.readFile(new URL('../artifacts/nextrade/src/components/live-chat-widget.tsx', import.meta.url), 'utf8');
  assert.match(widget, /consentAccepted/);
  assert.match(widget, /support may process this conversation/);
});

test('live chat widget contains open-close, unread, and durable-history behaviors', async () => {
  const widget = await fs.promises.readFile(new URL('../artifacts/nextrade/src/components/live-chat-widget.tsx', import.meta.url), 'utf8');
  assert.match(widget, /setOpen\(\(v\) => !v\)/, 'bubble must toggle open and closed');
  assert.match(widget, /setUnreadCount\(\(count\) => count \+ 1\)/, 'incoming messages must increment unread state');
  assert.match(widget, /fetch\(apiPath\("\/api\/live-chat"\)/, 'history must be loaded from the durable API');
  assert.match(widget, /localStorage\.setItem\("xpfx_live_chat_profile"/, 'visitor identity must survive reloads');
});

test('copy trading route, nav, and page are wired into the authenticated app', async () => {
  const appSource = await fs.promises.readFile(new URL('../artifacts/nextrade/src/App.tsx', import.meta.url), 'utf8');
  assert.match(appSource, /path="\/copy-trading"/i, 'authenticated app should expose the copy trading route');

  const shellSource = await fs.promises.readFile(new URL('../artifacts/nextrade/src/components/layout/Shell.tsx', import.meta.url), 'utf8');
  assert.match(shellSource, /Copy Trading/i, 'sidebar should include the copy trading navigation item');

  const copyPageExists = fs.existsSync(new URL('../artifacts/nextrade/src/pages/copy-trading.tsx', import.meta.url));
  assert.ok(copyPageExists, 'copy trading page should exist');

  if (copyPageExists) {
    const copyPageSource = await fs.promises.readFile(new URL('../artifacts/nextrade/src/pages/copy-trading.tsx', import.meta.url), 'utf8');
    assert.match(copyPageSource, /\/api\/copy-trading\/leaders|\/api\/copy-trading\/history/i, 'copy trading page should connect to the real backend API');
  }
});

test('live-domain public route aliases are merged into the app shell', async () => {
  const appSource = await fs.promises.readFile(new URL('../artifacts/nextrade/src/App.tsx', import.meta.url), 'utf8');

  for (const route of ['/buy', '/sell', '/stocks', '/shares', '/commodities', '/signals', '/trade', '/register', '/dashboard/markets', '/dashboard/support', '/legal/privacy', '/legal/terms']) {
    assert.match(appSource, new RegExp(`path="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i'), `app should expose the live-domain route alias ${route}`);
  }
});

test('GET /api/csrf-token returns a CSRF token and sets the csrf cookie', async () => {
  await withTestServer(async (baseUrl) => {
    process.env.ALLOWED_ORIGINS = baseUrl;
    const response = await fetch(`${baseUrl}/api/csrf-token`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        origin: baseUrl,
        'x-forwarded-host': new URL(baseUrl).host,
        'x-forwarded-proto': 'https',
      },
    });

    assert.equal(response.status, 200, '/api/csrf-token should return successfully');
    const body = await response.json();
    assert.equal(typeof body.csrfToken, 'string', 'response should include csrfToken');
    assert.ok(body.csrfToken.length > 0, 'csrfToken should not be empty');
  });
});

test('sensitive financial endpoints enforce no-store browser safety headers', async () => {
  await withTestServer(async (baseUrl) => {
    process.env.ALLOWED_ORIGINS = baseUrl;
    const response = await fetch(`${baseUrl}/api/readyz`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        origin: baseUrl,
        'x-forwarded-host': new URL(baseUrl).host,
        'x-forwarded-proto': 'https',
      },
    });

    assert.equal(response.status, 503, '/api/readyz should report missing production dependencies');
    assert.match(response.headers.get('cache-control') ?? '', /no-store/i, 'financial readiness responses should not be cached');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', 'financial responses should disable MIME sniffing');
    assert.equal(response.headers.get('x-frame-options'), 'DENY', 'financial responses should prevent framing');
  });
});

test('GET /api/csrf-token accepts an origin with a trailing slash when ALLOWED_ORIGINS is configured without one', async () => {
  await withTestServer(async (baseUrl) => {
    process.env.ALLOWED_ORIGINS = `${baseUrl},https://example.com`;
    const response = await fetch(`${baseUrl}/api/csrf-token`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        origin: 'https://example.com/',
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https',
      },
    });

    assert.equal(response.status, 200, 'Origin with trailing slash should be accepted when normalized');
    const body = await response.json();
    assert.equal(typeof body.csrfToken, 'string', 'response should include csrfToken');
  });
});

test('GET /api/csrf-token issues a fresh token on each request even when the previous cookie is present', async () => {
  await withTestServer(async (baseUrl) => {
    process.env.ALLOWED_ORIGINS = baseUrl;
    const first = await fetch(`${baseUrl}/api/csrf-token`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        origin: baseUrl,
        'x-forwarded-host': new URL(baseUrl).host,
        'x-forwarded-proto': 'https',
      },
    });

    assert.equal(first.status, 200, 'first CSRF request should succeed');
    const firstCookie = first.headers.get('set-cookie');
    const firstBody = await first.json();
    assert.equal(typeof firstBody.csrfToken, 'string');

    const cookieHeader = firstCookie?.split(';')[0] ?? '';

    const second = await fetch(`${baseUrl}/api/csrf-token`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        origin: baseUrl,
        'x-forwarded-host': new URL(baseUrl).host,
        'x-forwarded-proto': 'https',
        cookie: cookieHeader,
      },
    });

    assert.equal(second.status, 200, 'second CSRF request should succeed');
    const secondBody = await second.json();
    assert.equal(typeof secondBody.csrfToken, 'string');
    assert.notEqual(secondBody.csrfToken, firstBody.csrfToken, 'CSRF token should be refreshed on each GET issuance');
  });
});

test('resolveAppOriginFromRequest prefers the live custom-domain host over the default Railway origin', () => {
  const req = {
    headers: {
      host: 'xpressprofx.com',
      origin: 'https://xpressprofx.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'xpressprofx.com',
    },
    get(name) {
      return this.headers[name] ?? undefined;
    },
  };

  assert.equal(resolveAppOriginFromRequest(req), 'https://xpressprofx.com');
});

test('resolveAppOriginFromRequest uses the first forwarded host when a proxy provides a comma-separated host list', () => {
  const req = {
    headers: {
      host: 'internal-service:3000',
      origin: 'https://xpressprofx.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'xpressprofx.com, internal-service:3000',
    },
    get(name) {
      return this.headers[name] ?? undefined;
    },
  };

  assert.equal(resolveAppOriginFromRequest(req), 'https://xpressprofx.com');
});
