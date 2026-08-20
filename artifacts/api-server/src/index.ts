import 'express-async-errors';
import http from 'http';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPostgresConfig, getRawDatabaseUrl } from '../../../lib/db/src/connection-config';
import { logger } from './lib/logger';
import { restoreOtpCodesFromStorage } from './lib/otp';

type PrismaClientType = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

const DEFAULT_PORT = 8080;
let server: http.Server | null = null;
let prisma: PrismaClientType | null = null;
let hydrateFromDb: typeof import('./lib/hydrate').hydrateFromDb | null = null;
let validateStartupEnvironment: typeof import('./lib/startup-env').validateStartupEnvironment | null = null;
let setPrismaClient: typeof import('./lib/db-persist').setPrismaClient | null = null;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function loadRuntimeDependencies() {
  const [{ hydrateFromDb: hydrateModule }, { validateStartupEnvironment: startupEnvValidator }, { setPrismaClient: setClient }] = await Promise.all([
    import('./lib/hydrate'),
    import('./lib/startup-env'),
    import('./lib/db-persist'),
  ]);

  hydrateFromDb = hydrateModule;
  validateStartupEnvironment = startupEnvValidator;
  setPrismaClient = setClient;
}

function normalizePort(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryAsync<T>(fn: () => Promise<T>, attempts = 5, delayMs = 3000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        logger.warn({ attempt, delayMs, err }, '[DB] Connection attempt failed, retrying');
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

async function initDatabase() {
  const rawDatabaseUrl = getRawDatabaseUrl();
  if (!rawDatabaseUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[DB] DATABASE_URL is not configured — aborting startup');
      throw new Error('DATABASE_URL is not configured');
    }
    logger.warn('[DB] DATABASE_URL is not configured — running without DB persistence');
    return null;
  }

  try {
    if (process.env.NODE_ENV === 'production') {
      process.env.PGSSLMODE = 'require';
    }
    const { PrismaClient } = await import('@prisma/client');
    const postgresConfig = buildPostgresConfig(rawDatabaseUrl);
    process.env.DATABASE_URL = postgresConfig.connectionString;

    async function createClient() {
      const client = new PrismaClient();
      try {
        await client.$connect();
        return client;
      } catch (err) {
        await client.$disconnect().catch(() => undefined);
        throw err;
      }
    }

    const client = await retryAsync(createClient, 5, 3000);
    logger.info('[DB] PostgreSQL connected via Prisma');
    return client;
  } catch (error) {
    const msg = (error && (error as any).message) || '';
    const code = (error && (error as any).code) || '';
    const isPrismaNotGenerated = typeof msg === 'string' && msg.includes('did not initialize yet');
    const isDevConnectionFailure = process.env.NODE_ENV !== 'production' && (code === 'P1001' || code === 'P1008' || (typeof msg === 'string' && msg.includes("Can't reach database server")));

    if (process.env.NODE_ENV === 'production') {
      logger.error({ err: error }, '[DB] Prisma failed to connect in production — aborting startup so auth data is never silently lost');
      throw error;
    }

    if (isPrismaNotGenerated || isDevConnectionFailure) {
      logger.warn({ err: error }, '[DB] Starting without DB persistence due to DB initialization issue (development mode only)');
      return null;
    }

    logger.error({ err: error }, '[DB] Prisma failed to connect — aborting startup');
    throw error;
  }
}

function ensureRuntimeSecrets() {
  if (process.env.NODE_ENV === 'production') {
    const repoEnvPath = path.resolve(repoRoot, '.env');
    if (fs.existsSync(repoEnvPath)) {
      const repoEnv = fs.readFileSync(repoEnvPath, 'utf8');
      if (/DATABASE_URL=.*(db\.example\.internal|example\.internal|change_me_secure_password|placeholder)/i.test(repoEnv)) {
        logger.warn('[SERVER] Ignoring repo .env placeholder values in production. Railway runtime variables are the source of truth.');
      }
    }
    return;
  }

  const possibleScriptPaths = [
    path.resolve(process.cwd(), 'scripts/generate-secrets.mjs'),
    path.resolve(process.cwd(), '../../scripts/generate-secrets.mjs'),
    path.resolve(repoRoot, 'scripts/generate-secrets.mjs'),
  ];

  const scriptPath = possibleScriptPaths.find((candidate) => candidate && fs.existsSync(candidate));

  try {
    if (!scriptPath) {
      throw new Error('Unable to locate generate-secrets.mjs');
    }

    execSync(`node "${scriptPath}"`, { stdio: 'inherit', env: process.env });
    dotenv.config({ path: path.resolve(repoRoot, '.env'), override: false });
  } catch (error) {
    logger.warn({ err: error }, '[SERVER] Runtime secret bootstrap skipped');
  }
}

function attachServerHandlers() {
  if (!server) {
    return;
  }

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error({ port: process.env.PORT || DEFAULT_PORT }, '[SERVER] Port is already in use');
      logger.error('[SERVER] If this is a local or VPS restart, wait a few seconds and try again.');
    } else {
      logger.error({ err: error }, '[SERVER] Failed to bind');
    }
    process.exit(1);
  });
}

async function bootstrap() {
  try {
    ensureRuntimeSecrets();
    await loadRuntimeDependencies();

    const startupValidation = validateStartupEnvironment?.(process.env);
    if (!startupValidation) {
      throw new Error('[SERVER] Startup validation module failed to initialize');
    }
    if (!startupValidation.ok) {
      logger.error({ missing: startupValidation.missing }, '[SERVER] Missing required environment variables');
      process.exit(1);
    }

    if (startupValidation.warnings.length > 0) {
      logger.warn({ warnings: startupValidation.warnings }, '[SERVER] Optional environment variables not configured; using resilient defaults');
    }

    if (!process.env.NODE_ENV?.trim()) {
      process.env.NODE_ENV = startupValidation.resolved.NODE_ENV || 'production';
    }
    if (!process.env.PORT?.trim()) {
      process.env.PORT = startupValidation.resolved.PORT;
    }
    if (startupValidation.resolved.DATABASE_URL) {
      process.env.DATABASE_URL = startupValidation.resolved.DATABASE_URL;
    }
    if (startupValidation.resolved.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS = startupValidation.resolved.ALLOWED_ORIGINS;
    }

    if (process.env.NODE_ENV === 'production') {
      const resolvedSessionSecret = process.env.SESSION_SECRET?.trim()
        || process.env.COOKIE_SECRET?.trim()
        || process.env.COOKIE_SIGNING_KEY?.trim();
      if (!resolvedSessionSecret) {
        const generatedSessionSecret = randomBytes(32).toString('hex');
        process.env.SESSION_SECRET = generatedSessionSecret;
        logger.warn('[SERVER] SESSION_SECRET is not configured; generated an ephemeral secret. Configure SESSION_SECRET to preserve sessions across redeploys.');
      } else {
        process.env.SESSION_SECRET = resolvedSessionSecret;
      }

      if (!process.env.JWT_SECRET?.trim()) {
        process.env.JWT_SECRET = randomBytes(32).toString('hex');
        logger.warn('[SERVER] JWT_SECRET is not configured; generated an ephemeral secret.');
      }
      if (!process.env.CSRF_SECRET?.trim()) {
        logger.warn('[SERVER] CSRF_SECRET is not set in production. SESSION_SECRET will be used as a fallback for CSRF protection.');
      }
      if (!process.env.ALLOWED_ORIGINS?.trim() && !process.env.REPLIT_DOMAINS?.trim()) {
        throw new Error('ALLOWED_ORIGINS or REPLIT_DOMAINS must be configured for production CORS.');
      }
      if (!process.env.ADMIN_EMAIL?.trim() || !process.env.ADMIN_EMAIL.includes('@') || process.env.ADMIN_EMAIL.includes('example.com')) {
        logger.warn('[SERVER] ADMIN_EMAIL is not configured; admin provisioning is disabled.');
      }
      const adminPassword = process.env.ADMIN_PASSWORD?.trim() ?? '';
      const normalizedAdminPassword = adminPassword?.toLowerCase();
      const hasUpper = /[A-Z]/.test(adminPassword ?? '');
      const hasLower = /[a-z]/.test(adminPassword ?? '');
      const hasDigit = /\d/.test(adminPassword ?? '');
      const hasSymbol = /[^A-Za-z0-9]/.test(adminPassword ?? '');
      const isWeakReservedValue = normalizedAdminPassword === 'password' || normalizedAdminPassword === 'changeme' || normalizedAdminPassword?.includes('changeme') || normalizedAdminPassword?.includes('example');
      const isStrongEnough = Boolean(adminPassword)
        && adminPassword.length >= 8
        && hasUpper
        && hasLower
        && hasDigit
        && (hasSymbol || adminPassword.length >= 10 || normalizedAdminPassword?.includes('prod') || normalizedAdminPassword?.includes('secure'))
        && !isWeakReservedValue;

      if (adminPassword && !isStrongEnough) {
        throw new Error('ADMIN_PASSWORD must be set to a strong production credential when provided.');
      }
      if (!adminPassword) {
        logger.warn('[SERVER] ADMIN_PASSWORD is not configured; admin provisioning is disabled.');
      }
    } else {
      if (!process.env.SESSION_SECRET?.trim()) {
        process.env.SESSION_SECRET = randomBytes(32).toString('hex');
      }
      if (!process.env.JWT_SECRET?.trim()) {
        process.env.JWT_SECRET = randomBytes(32).toString('hex');
      }
      if (!process.env.WALLET_ENCRYPTION_KEY?.trim()) {
        process.env.WALLET_ENCRYPTION_KEY = randomBytes(32).toString('hex');
      }
      if (!process.env.ALLOWED_ORIGINS?.trim() && !process.env.REPLIT_DOMAINS?.trim()) {
        process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173';
      }
    }

    const { default: app } = await import('./app');
    const { validateProductionEnvironment } = (await import('../../../' + 'scripts/validate-production-env.mjs')) as { validateProductionEnvironment: (env?: NodeJS.ProcessEnv) => boolean };
    validateProductionEnvironment(process.env);
    server = http.createServer(app);
    attachServerHandlers();

    try {
      const { initRealtime } = await import('./lib/realtime');
      await initRealtime(server);
    } catch (err) {
      logger.warn({ err }, '[SERVER] Failed to initialize realtime server; continuing without WebSocket support');
    }
    prisma = await initDatabase();
    setPrismaClient?.(prisma);
    await hydrateFromDb?.();
    await restoreOtpCodesFromStorage();

    const resolvedPort = normalizePort(process.env.PORT || DEFAULT_PORT);

    server.listen(resolvedPort, '0.0.0.0', () => {
      logger.info({ port: resolvedPort }, 'Server is running');
    });
  } catch (error) {
    logger.error({ err: error }, '[SERVER] Failed to start');
    await prisma?.$disconnect();
    process.exit(1);
  }
}

let shuttingDown = false;

async function gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[SERVER] ${signal} received — shutting down gracefully`);

  const forceExitTimer = setTimeout(() => {
    logger.error('[SERVER] Graceful shutdown timed out after 15 seconds');
    process.exit(1);
  }, 15_000);
  forceExitTimer.unref();

  if (!server) {
    clearTimeout(forceExitTimer);
    process.exit(0);
    return;
  }

  server.close(async () => {
    try {
      await prisma?.$disconnect();
      logger.info('[SERVER] Shutdown complete');
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, '[SERVER] Shutdown cleanup failed');
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

void bootstrap();
