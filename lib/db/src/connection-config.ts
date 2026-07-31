import { URL } from 'node:url';

export type PostgresConnectionConfig = {
  connectionString: string;
  ssl: { rejectUnauthorized: boolean } | undefined;
};

export function getRawDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const directUrl = env.DIRECT_DATABASE_URL?.trim();
  if (directUrl) return directUrl;

  const publicUrl = env.DATABASE_PUBLIC_URL?.trim();
  if (publicUrl) return publicUrl;

  return env.DATABASE_URL?.trim();
}

export function buildPostgresConfig(
  rawUrl?: string,
  env: Record<string, string | undefined> = process.env,
): PostgresConnectionConfig {
  const urlString = rawUrl?.trim() || getRawDatabaseUrl(env);
  if (!urlString) {
    throw new Error('DATABASE_URL or DATABASE_PUBLIC_URL must be set. Did you forget to provision a database?');
  }

  const url = new URL(urlString);
  const params = url.searchParams;
  const existingSslmode = params.get('sslmode')?.trim().toLowerCase();
  if (!existingSslmode || existingSslmode === 'disable' || existingSslmode === 'prefer') {
    params.set('sslmode', 'require');
  }

  const ssl = url.protocol === 'postgresql:' || url.protocol === 'postgres:'
    ? { rejectUnauthorized: false }
    : undefined;

  return {
    connectionString: url.toString(),
    ssl,
  };
}
