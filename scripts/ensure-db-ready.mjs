import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const repoRoot = existsSync(path.join(root, 'prisma')) ? root : path.resolve(root, '..');
const envPath = path.join(repoRoot, '.env');
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DIRECT_DATABASE_URL;

function log(message) {
  console.log(`[db-ready] ${message}`);
}

function fail(message) {
  console.error(`[db-ready] ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[db-ready] ${message}`);
}

// Skip DB checks during build/install phases unless explicitly required.
// Railway runs these scripts during install and postinstall while the build
// container does not yet have the production database attached, so we must not
// try to run Prisma migrations during package installation.
const installLifecycleEvents = new Set(['install', 'postinstall']);
const isBuildPhase = installLifecycleEvents.has(process.env.npm_lifecycle_event || '') && !process.env.FORCE_DB_CHECK;
if (isBuildPhase) {
  log(`Install-time lifecycle (${process.env.npm_lifecycle_event || 'unknown'}) detected; deferring database checks to runtime. Migrations will run at app startup.`);
  process.exit(0);
}

if ((process.env.NODE_ENV || '').trim() !== 'production') {
  log('Development mode detected; skipping production DB enforcement.');
  process.exit(0);
}

if (!databaseUrl) {
  fail('Production deployment is missing DATABASE_URL/DATABASE_PUBLIC_URL/DIRECT_DATABASE_URL. User accounts, sessions, and wallet activity cannot persist across redeploys. Attach a PostgreSQL database before starting the app.');
}

if (/db\.example\.internal|example\.internal|change_me_secure_password|placeholder/i.test(databaseUrl)) {
  fail('Production database configuration is still using a placeholder/example PostgreSQL URL. Replace it with the real Railway Postgres connection string before starting the app or user data will be lost on restart/redeploy.');
}

try {
  const prismaSchema = path.join(repoRoot, 'prisma', 'schema.prisma');
  if (!existsSync(prismaSchema)) {
    fail('Prisma schema not found. Cannot verify database state.');
  }

  const envFile = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const directUrl = process.env.DIRECT_DATABASE_URL || (envFile.match(/^DIRECT_DATABASE_URL=(.*)$/m)?.[1]?.trim());
  const migrationTarget = directUrl || databaseUrl;

  log('Applying Prisma migrations before startup to keep auth data persistent across restarts.');
  execSync(`DATABASE_URL="${migrationTarget}" npx prisma migrate deploy`, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: migrationTarget,
      DIRECT_DATABASE_URL: migrationTarget,
    },
  });

  log('Database is ready and schema is up to date.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Database migration failed. User accounts and sessions will be lost on redeploy unless the database is properly provisioned. Details: ${message}`);
}
