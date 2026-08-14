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

if ((process.env.NODE_ENV || '').trim() !== 'production') {
  log('Development mode detected; skipping production DB enforcement.');
  process.exit(0);
}

if (!databaseUrl) {
  fail('Production deployment is missing DATABASE_URL/DATABASE_PUBLIC_URL/DIRECT_DATABASE_URL. User accounts, sessions, and wallet activity cannot persist across redeploys. Attach a PostgreSQL database before starting the app.');
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
