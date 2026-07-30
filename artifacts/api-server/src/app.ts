import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { doubleCsrf } from 'csrf-csrf';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import client from 'prom-client';
import { sql } from 'drizzle-orm';
import { attachSession, SESSION_COOKIE } from './lib/session';
import { getDb } from './lib/db-client';

const app = express();
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
  return {
    status: 'ok',
    service: 'XpressPro FX API',
    version: '1.0.0',
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
  const rawDatabaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
  if (!rawDatabaseUrl) {
    return res.status(200).json({ ready: true, reason: 'no-db-config' });
  }

  try {
    const db = getDb();
    if (!db) {
      return res.status(200).json({ ready: true, reason: 'no-db-client' });
    }

    await db.execute(sql`select 1`);
    return res.status(200).json({ ready: true, reason: 'database-ok' });
  } catch (err) {
    return res.status(503).json({ ready: false, error: String(err) });
  }
}

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/livez', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/livez', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/healthz/db', async (_req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(200).json({ db: 'connected' });
  }

  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ db: 'connected' });
  } catch (err) {
    return res.status(503).json({ db: 'disconnected', error: (err as Error).message });
  }
});
app.get('/readyz', async (_req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return res.status(503).json({ status: 'error', error: (err as Error).message });
  }
});
app.get('/api/readyz', async (_req: Request, res: Response) => {
  const db = getDb();
  if (!db) {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    await db.execute(sql`select 1`);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return res.status(503).json({ status: 'error', error: (err as Error).message });
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('x-request-id') || randomBytes(8).toString('hex');
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// ─── LOGGING ──────────────────────────────────────────────────────────────────
app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  transport: undefined,
}));

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.REPLIT_DOMAINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isPreviewHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase();
  return ['localhost', '127.0.0.1', '::1'].includes(normalized)
    || normalized.endsWith('.replit.app')
    || normalized.endsWith('.replit.dev')
    || normalized.endsWith('.github.dev')
    || normalized.endsWith('.railway.app')
    || normalized.endsWith('.render.com')
    || normalized.endsWith('.vercel.app');
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

    if (allowedOrigins.includes(origin) || isPreviewHost(hostname)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
}));

// ─── CORS REJECTION HANDLER ───────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  const hostname = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return undefined;
    }
  })();

  if (!allowedOrigins.includes(origin) && !isPreviewHost(hostname)) {
    return res.status(403).json({ success: false, message: 'CORS policy: origin not allowed' });
  }
  next();
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const sessionSecret = process.env.SESSION_SECRET?.trim() || (process.env.NODE_ENV === 'production' ? undefined : randomBytes(32).toString('hex'));
if (!sessionSecret) {
  throw new Error(
    'SESSION_SECRET must be set in production. Signed cookies and sessions cannot use a hardcoded fallback secret.'
  );
}
app.use(cookieParser(sessionSecret));

// ─── SESSION ──────────────────────────────────────────────────────────────────
app.use(attachSession);

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'dev-csrf-secret',
  getSessionIdentifier: (req) =>
    req.signedCookies?.[SESSION_COOKIE] || req.cookies?.[SESSION_COOKIE] || req.ip || 'anonymous',
  cookieName: 'xcsrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 32,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

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

app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks') || req.path.startsWith('/api/auth/')) {
    return next();
  }

  if (process.env.NODE_ENV !== 'production' || (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && isTrustedSameOriginRequest(req))) {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
});

// ─── GLOBAL RATE LIMITER ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// ─── AUTH RATE LIMITER ────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts.' }
});

// ─── LIVE CHAT RATE LIMITER ───────────────────────────────────────────────────
const liveChatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Live chat rate limit reached.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/live-chat/', liveChatLimiter);

// ─── STATIC FILE SERVING ──────────────────────────────────────────────────────
const candidateRoots = [
  process.cwd(),
  path.resolve(__dirname, '../../..'),
  path.resolve(__dirname, '../../../../../'),
  path.resolve(__dirname, '..'),
  path.resolve(__dirname)
].filter((value, index, array) => array.indexOf(value) === index);

const candidateStaticPaths = candidateRoots
  .flatMap((root) => [
    path.join(root, 'artifacts', 'nextrade', 'dist', 'public'),
    path.join(root, 'artifacts', 'nextrade', 'public'),
    path.join(root, 'public')
  ])
  .filter((value, index, array) => array.indexOf(value) === index);

const frontendStaticPath = candidateStaticPaths.find((candidate) => fs.existsSync(candidate)) || candidateStaticPaths[0];
const frontendIndexPath = path.join(frontendStaticPath, 'index.html');

app.use(express.static(frontendStaticPath, { index: false }));

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

  if (isProd && !platform && !previewRequest) {
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
let apiRoutesHandler: ((req: Request, res: Response, next: NextFunction) => void) | null = null;

function mountApiRoutes(req: Request, res: Response, next: NextFunction) {
  if (apiRoutesHandler) {
    return apiRoutesHandler(req, res, next);
  }

  import('./routes/index')
    .then(({ default: loadedApiRoutes }) => {
      apiRoutesHandler = loadedApiRoutes as unknown as (req: Request, res: Response, next: NextFunction) => void;
      return apiRoutesHandler(req, res, next);
    })
    .catch((err) => next(err));
}

app.get('/api/csrf-token', doubleCsrfProtection, (req, res) => {
  const csrfToken = (req as any).csrfToken?.();
  if (!csrfToken) {
    return res.status(500).json({ success: false, message: 'CSRF token unavailable' });
  }

  return res.json({ csrfToken });
});

app.use('/api', mountApiRoutes);

// Ensure any unmatched API request (all methods) returns a JSON 404 instead
// of Express's default HTML error page. This makes errors consistent for
// frontend clients and helps debugging missing routes like POST /api/auth/signup.
app.use('/api', (_req, res) => {
  return res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found.' });
  }

  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  return res.status(404).send('Frontend build not found. Build the website app first.');
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any).status || 500;
  console.error(`[ERROR] ${err.message}`);
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message
  });
});

export default app;
