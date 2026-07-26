import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { buildPostgresConfig, getRawDatabaseUrl } from '../../../lib/db/src/connection-config';
import { hydrateFromDb } from './lib/hydrate';
import { validateStartupEnvironment } from './lib/startup-env';
import { validateProductionEnvironment } from '../../../scripts/validate-production-env.mjs';
import { setPrismaClient } from './lib/db-persist';

type PrismaClientType = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

const DEFAULT_PORT = 8080;
const server = http.createServer(app);

let prisma: PrismaClientType | null = null;

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
        console.warn(`[DB] Connection attempt ${attempt} failed, retrying in ${delayMs}ms`, err);
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

async function initDatabase() {
  const rawDatabaseUrl = getRawDatabaseUrl();
  if (!rawDatabaseUrl) {
    console.warn('[DB] DATABASE_URL and DATABASE_PUBLIC_URL not set — continuing without Prisma persistence');
    return null;
  }

  try {
    process.env.PGSSLMODE = 'require';
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
    console.log('[DB] PostgreSQL connected via Prisma');
    return client;
  } catch (error) {
    console.warn('[DB] Prisma unavailable — continuing without persistence', error);
    return null;
  }
}

async function bootstrap() {
  try {
    const startupValidation = validateStartupEnvironment(process.env);
    if (!startupValidation.ok) {
      console.error('[SERVER] Missing required environment variables:', startupValidation.missing.join(', '));
      process.exit(1);
    }

    if (startupValidation.warnings.length > 0) {
      console.warn('[SERVER] Optional environment variables missing:', startupValidation.warnings.join(', '));
    }

    process.env.NODE_ENV = startupValidation.resolved.NODE_ENV;
    process.env.PORT = startupValidation.resolved.PORT;
    if (startupValidation.resolved.DATABASE_URL) {
      process.env.DATABASE_URL = startupValidation.resolved.DATABASE_URL;
    }
    if (startupValidation.resolved.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS = startupValidation.resolved.ALLOWED_ORIGINS;
    }

    validateProductionEnvironment(process.env);
    prisma = await initDatabase();
    setPrismaClient(prisma);
    await hydrateFromDb();

    const resolvedPort = normalizePort(process.env.PORT || DEFAULT_PORT);

    server.listen(resolvedPort, '0.0.0.0', () => {
      console.log(`[SERVER] XpressPro FX API running on port ${resolvedPort}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[SERVER] Health: http://0.0.0.0:${resolvedPort}/healthz`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    await prisma?.$disconnect();
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received — shutting down gracefully');
  server.close(async () => {
    await prisma?.$disconnect();
    console.log('[SERVER] Shutdown complete');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received — shutting down gracefully');
  server.close(async () => {
    await prisma?.$disconnect();
    process.exit(0);
  });
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${process.env.PORT || DEFAULT_PORT} is already in use. Please stop the existing process or change PORT.`);
    console.error('[SERVER] If this is a local or VPS restart, wait a few seconds and try again.');
  } else {
    console.error('[SERVER] Failed to bind:', error);
  }
  process.exit(1);
});

void bootstrap();
