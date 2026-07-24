import { URL } from 'node:url';

export type PostgresConnectionConfig = {
  connectionString: string;
  ssl: { rejectUnauthorized: boolean } | undefined;
};

export function getRawDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return env.DATABASE_URL?.trim() || env.DATABASE_PUBLIC_URL?.trim();
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
  params.set('sslmode', 'require');

  const ssl = {
    rejectUnauthorized: false,
  };

  return {
    connectionString: url.toString(),
    ssl,
  };
}
