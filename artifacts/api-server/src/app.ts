import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import client from 'prom-client';
import { sql } from 'drizzle-orm';
import { getRawDatabaseUrl } from '../../../lib/db/src/connection-config';
import { attachSession } from './lib/session';
import { getDb } from './lib/db-client';
import { getPrismaClient } from './lib/db-persist';
import { logger } from './lib/logger';
import { getAllowedOrigins, isAllowedOrigin, normalizeOrigin } from './lib/cors';
import { sessionTimeoutMiddleware, recordSessionActivity } from './lib/session-timeout';
import { registerUnhandledHandlers, trackRequestMetric, captureException } from './lib/observability';
import { initServerSentry } from './lib/sentry';
import apiRoutes from './routes/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
export { app };
initServerSentry();
registerUnhandledHandlers();
app.disable('x-powered-by');
app.set('trust proxy', 1);

function shouldBypassHttpsRedirect(req: Request) {
  const pathname = req.path || '/';
  return [
    '/health',
    '/healthz',
    '/livez',
    '/readyz',
    '/healthz/db',
    '/api/health',
    '/api/healthz',
    '/api/livez',
    '/api/readyz',
    '/api/healthz/db',
    '/metrics',
  ].includes(pathname);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const forwardedProto = req.get('x-forwarded-proto');
  const isHttpsRequest = req.secure || (forwardedProto && forwardedProto.split(',')[0].trim() === 'https');

  if (process.env.NODE_ENV === 'production' && !shouldBypassHttpsRedirect(req) && !isHttpsRequest) {
    const host = req.get('host');
    const redirectTarget = host ? `https://${host}${req.originalUrl}` : `https://${req.hostname}${req.originalUrl}`;
    return res.redirect(301, redirectTarget);
  }

  next();
});

function buildHealthPayload(extra: Record<string, unknown> = {}) {
  const commitSha = process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || process.env.SOURCE_VERSION
    || null;
  return {
    status: 'ok',
    service: 'XpressPro FX API',
    version: '1.0.0',
    commitSha,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ...extra
  };
}

async function _dbHealthHandler(_req: Request, res: Response) {
  const db = getDb();
  if (!db) {
    return res.status(200).json({ status: 'ok', database: 'disabled' });
  }

  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      database: 'unreachable',
      error: (err as Error).message,
    });
  }
}

async function _readinessHandler(_req: Request, res: Response) {
  const rawDatabaseUrl = getRawDatabaseUrl();
  if (!rawDatabaseUrl) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ready: false, reason: 'database-not-configured' });
    }
    return res.status(200).json({ ready: true, reason: 'no-db-config' });
  }

  const prisma = getPrismaClient();
  if (prisma?.$queryRaw) {
    try {
      await prisma.$queryRaw`select 1`;
      return res.status(200).json({ ready: true, reason: 'database-ready' });
    } catch {
      return res.status(503).json({ ready: false, reason: 'database-unavailable' });
    }
  }

  const db = getDb();
  if (!db) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ready: false, reason: 'database-client-unavailable' });
    }
    return res.status(200).json({ ready: true, reason: 'no-db-client' });
  }

  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ ready: true, reason: 'database-ready' });
  } catch {
    return res.status(503).json({ ready: false, reason: 'database-unavailable' });
  }
}

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

  const sensitivePath = req.path.startsWith('/api/auth/')
    || req.path.startsWith('/api/account/')
    || req.path.startsWith('/api/admin/')
    || req.path.startsWith('/api/transactions/')
    || req.path.startsWith('/api/wallets/')
    || req.path.startsWith('/api/live-chat')
    || req.path === '/api/csrf-token'
    || req.path === '/api/readyz'
    || req.path === '/api/healthz'
    || req.path.startsWith('/xpadmin');

  if (sensitivePath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/livez', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/api/healthz', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/api/livez', (_req: Request, res: Response) => {
  res.status(200).json(buildHealthPayload());
});

app.get('/healthz/db', _dbHealthHandler);
app.get('/readyz', _readinessHandler);
app.get('/api/readyz', _readinessHandler);

// ─── LOGGING ──────────────────────────────────────────────────────────────────
app.use((pinoHttp as unknown as any)({
  level: process.env.LOG_LEVEL || 'info',
  transport: undefined,
}));

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https:"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'", 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────

function isPreviewHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase();
  return normalized.endsWith('.replit.app')
    || normalized.endsWith('.replit.dev')
    || normalized.endsWith('.github.dev')
    || normalized.endsWith('.railway.app')
    || normalized.endsWith('.render.com')
    || normalized.endsWith('.vercel.app');
}

function isDevelopmentHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase();
  return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(normalized) || normalized.endsWith('.localhost');
}

function isPreviewModeEnabled(): boolean {
  return process.env.PREVIEW_MODE === 'true'
    || process.env.PREVIEW_MODE === '1'
    || Boolean(process.env.CODESPACE_NAME)
    || Boolean(process.env.REPLIT_DOMAINS);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const hostname = (() => {
      try {
        return new URL(origin).hostname;
      } catch {
        return undefined;
      }
    })();

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV !== 'production' && isDevelopmentHost(hostname)) {
      callback(null, true);
      return;
    }

    if (isPreviewModeEnabled() && isPreviewHost(hostname)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'Set-Cookie'],
  exposedHeaders: ['X-Request-Id'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ─── CORS REJECTION HANDLER ───────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const hostname = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return undefined;
    }
  })();

  const allowedOrigins = getAllowedOrigins();
  if (isAllowedOrigin(origin)) {
    return next();
  }

  if (process.env.NODE_ENV !== 'production' && isDevelopmentHost(hostname)) {
    return next();
  }

  if (isPreviewModeEnabled() && isPreviewHost(hostname)) {
    return next();
  }

  logger.warn({ origin, normalizedOrigin, allowedOrigins, hostname }, '[CORS] origin not allowed');
  return res.status(403).json({ success: false, message: 'CORS policy: origin not allowed' });
});

// ─── METRICS (Prometheus) ───────────────────────────────────────────────────
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch {
    res.status(500).send('Failed to collect metrics');
  }
});

// ─── COMPRESSION ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── WEBHOOK RAW BODY ─────────────────────────────────────────────────────────
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
const cookieSecret = process.env.COOKIE_SECRET?.trim()
  || process.env.COOKIE_SIGNING_KEY?.trim()
  || process.env.SESSION_SECRET?.trim()
  || (process.env.NODE_ENV === 'production' ? undefined : randomBytes(32).toString('hex'));
if (!cookieSecret) {
  throw new Error(
    'COOKIE_SECRET or SESSION_SECRET must be set in production. Signed cookies and sessions cannot use a hardcoded fallback secret.'
  );
}
app.use(cookieParser(cookieSecret));

// ─── SESSION ──────────────────────────────────────────────────────────────────
app.use(attachSession);

// Track session activity for timeout enforcement
app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req as any).sessionId) {
    recordSessionActivity((req as any).sessionId);
  }
  next();
});

// Enforce session timeout (idle and lifetime)
app.use(sessionTimeoutMiddleware());

function isTrustedSameOriginRequest(req: Request): boolean {
  const extractHostname = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.split(',')[0].trim();
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      const withoutProtocol = trimmed.replace(/^https?:\/\//i, '').split('/')[0];
      return withoutProtocol.split(':')[0].toLowerCase();
    }
  };

  const host = extractHostname(req.hostname || req.get('host'));
  const forwardedHost = extractHostname(req.get('x-forwarded-host'));
  const originHost = extractHostname(req.get('origin'));
  const refererHost = extractHostname(req.get('referer'));
  const candidates = [host, forwardedHost, originHost, refererHost].filter(Boolean) as string[];

  if (!host) {
    return false;
  }

  if ([forwardedHost, originHost, refererHost].some((candidate) => candidate === host)) {
    return true;
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
  if (candidates.some((candidate) => localHosts.has(candidate) || candidate.startsWith('127.') || candidate.endsWith('.localhost'))) {
    return true;
  }

  if (candidates.some(isPreviewHost)) {
    return true;
  }

  return false;
}

function shouldSkipCsrf(req: Request): boolean {
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/api/auth/') || req.path === '/api/csrf-token') {
    return true;
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  return isTrustedSameOriginRequest(req);
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a || '');
  const bBuffer = Buffer.from(b || '');
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < aBuffer.length; i += 1) {
    diff |= aBuffer[i] ^ bBuffer[i];
  }
  return diff === 0;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (shouldSkipCsrf(req)) {
    return next();
  }

  const cookieToken = req.cookies?.xcsrf || req.signedCookies?.xcsrf;
  const headerToken = req.get('x-csrf-token') || req.get('x-csrftoken') || req.get('csrf-token');

  if (!cookieToken || !headerToken || !timingSafeEqual(String(cookieToken), String(headerToken))) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
  }

  return next();
});

// ─── GLOBAL RATE LIMITER ──────────────────────────────────────────────────────
function positiveRateLimitEnv(name: string, fallback: number, aliases: string[] = []): number {
  const raw = [name, ...aliases].map((key) => process.env[key]).find((value) => value?.trim());
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const rateLimitResponse = { error: 'Too many requests', code: 'rate_limited' };
const skipHealthRateLimit = (req: Request) => req.path === '/healthz' || req.path === '/healthz/db' || req.path === '/readyz' || req.path === '/livez';

const globalLimiter = rateLimit({
  windowMs: positiveRateLimitEnv('GENERAL_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, ['RATE_LIMIT_WINDOW_MS']),
  max: positiveRateLimitEnv('GENERAL_RATE_LIMIT_MAX', 400, ['RATE_LIMIT_MAX']),
  skip: skipHealthRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

// ─── AUTH RATE LIMITER ────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: positiveRateLimitEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: positiveRateLimitEnv('AUTH_RATE_LIMIT_MAX', 20),
  skip: (req) => req.path === '/session' || skipHealthRateLimit(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse,
});

// ─── LIVE CHAT RATE LIMITER ───────────────────────────────────────────────────
const liveChatLimiter = rateLimit({
  windowMs: positiveRateLimitEnv('LIVE_CHAT_RATE_LIMIT_WINDOW_MS', 1 * 60 * 1000),
  max: positiveRateLimitEnv('LIVE_CHAT_RATE_LIMIT_MAX', 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ...rateLimitResponse, message: 'Live chat rate limit reached.' }
});

const financialActionLimiter = rateLimit({
  windowMs: positiveRateLimitEnv('FINANCIAL_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000),
  max: positiveRateLimitEnv('FINANCIAL_RATE_LIMIT_MAX', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Financial action rate limit reached' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/live-chat/', liveChatLimiter);
app.use([
  '/api/deposits',
  '/api/withdrawals',
  '/api/wallets',
  '/api/p2p',
  '/api/moonpay/initiate',
], financialActionLimiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('x-request-id') || randomBytes(8).toString('hex');
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// ─── STATIC FILE SERVING ──────────────────────────────────────────────────────
const candidateRoots = [
  process.cwd(),
  path.resolve(__dirname, '../../..'),
  path.resolve(__dirname, '../../../../../'),
  path.resolve(__dirname, '..'),
  path.resolve(__dirname)
].filter((value, index, array) => array.indexOf(value) === index);

const nextradeStaticPath = candidateRoots
  .map((root) => path.join(root, 'artifacts', 'nextrade', 'dist', 'public'))
  .find((candidate) => fs.existsSync(candidate));

const adminPortalStaticPath = candidateRoots
  .map((root) => path.join(root, 'artifacts', 'admin-portal', 'dist', 'public'))
  .find((candidate) => fs.existsSync(candidate));

const frontendStaticPath = nextradeStaticPath || path.join(process.cwd(), 'artifacts', 'nextrade', 'dist', 'public');
const frontendIndexPath = path.join(frontendStaticPath, 'index.html');
const fallbackFrontendIndexPath = candidateRoots
  .map((root) => path.join(root, 'artifacts', 'nextrade', 'index.html'))
  .find((candidate) => fs.existsSync(candidate));
const adminPortalIndexPath = adminPortalStaticPath && path.join(adminPortalStaticPath, 'index.html');
const fallbackAdminIndexPath = adminPortalStaticPath
  ? undefined
  : candidateRoots
      .map((root) => path.join(root, 'artifacts', 'admin-portal', 'index.html'))
      .find((candidate) => fs.existsSync(candidate));
const hasFrontendBuild = fs.existsSync(frontendIndexPath) || Boolean(fallbackFrontendIndexPath);

if (adminPortalStaticPath) {
  app.use('/xpadmin', express.static(adminPortalStaticPath, { index: false }));
}

if (hasFrontendBuild) {
  app.use(express.static(frontendStaticPath, { index: false }));
}

// ─── PLATFORM GATE ────────────────────────────────────────────────────────────
app.use('/api/*', (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const platformHeader = req.headers['x-platform'];
  const platform = Array.isArray(platformHeader)
    ? platformHeader[0]
    : platformHeader;

  const previewRequest = Boolean(
    process.env.PREVIEW_MODE === 'true' ||
    process.env.PREVIEW_MODE === '1' ||
    process.env.CODESPACE_NAME ||
    process.env.REPLIT_DOMAINS ||
    isPreviewHost(req.hostname) ||
    isPreviewHost(req.headers['x-forwarded-host'] as string | undefined)
  );

  const localRequest = isDevelopmentHost(req.hostname);
  const approvedOrigin = isAllowedOrigin(req.get('origin'));
  if (isProd && !platform && !previewRequest && !localRequest && !approvedOrigin) {
    res.status(400).json({
      success: false,
      message: 'Missing platform identifier.'
    });
    return;
  }

  if (!platform) {
    req.headers['x-platform'] = 'preview';
  }

  next();
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
function mountApiRoutes(req: Request, res: Response, next: NextFunction) {
  return apiRoutes(req, res, next);
}

app.get('/api/csrf-token', (req, res) => {
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie('xcsrf', csrfToken, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  (req as any).csrfToken = () => csrfToken;
  return res.json({ csrfToken });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const finish = () => {
    trackRequestMetric(req, res, Date.now() - startedAt);
  };
  res.on('finish', finish);
  res.on('close', finish);
  next();
});

app.use('/api/live-chat', (req: Request, res: Response, next: NextFunction) => {
  // Inbound support mail is authenticated by the webhook secret/signature,
  // not by a browser session.
  if (req.path === '/email-reply') return next();
  if (req.path === '/identify') return next();
  if (!req.storedUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return next();
});

app.use('/api', mountApiRoutes);

// Ensure any unmatched API request (all methods) returns a JSON 404 instead
// of Express's default HTML error page. This makes errors consistent for
// frontend clients and helps debugging missing routes like POST /api/auth/signup.
app.use('/api', (_req, res) => {
  return res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────
app.get('/xpadmin*', (_req: Request, res: Response) => {
  const adminIndex = adminPortalIndexPath && fs.existsSync(adminPortalIndexPath)
    ? adminPortalIndexPath
    : fallbackAdminIndexPath;

  if (adminIndex) {
    return res.sendFile(adminIndex);
  }

  return res.status(404).send('Admin portal build not found. Build the admin portal first.');
});

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found.' });
  }

  const frontendIndex = fs.existsSync(frontendIndexPath)
    ? frontendIndexPath
    : fallbackFrontendIndexPath;

  if (frontendIndex) {
    return res.sendFile(frontendIndex);
  }

  return res.status(404).send('Frontend build not found. Build the website app first.');
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status || 500;
  captureException(err, { route: _req.path, method: _req.method });
  logger.error({ err }, '[ERROR] Global middleware error');
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message
  });
});

export default app;
