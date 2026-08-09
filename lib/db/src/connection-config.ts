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

  // Prefer the private service connection string when both are available.
  // Railway exposes the internal service URL via DATABASE_URL and a public
  // proxy URL via DATABASE_PUBLIC_URL. The private URL is the correct one
  // for server-side connections and avoids proxy certificate issues.
  const privateUrl = env.DATABASE_URL?.trim();
  if (privateUrl) return privateUrl;

  return env.DATABASE_PUBLIC_URL?.trim();
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
  if (existingSslmode) {
    params.delete('sslmode');
  }

  const ssl = url.protocol === 'postgresql:' || url.protocol === 'postgres:'
    ? { rejectUnauthorized: false }
    : undefined;

  return {
    connectionString: url.toString(),
    ssl,
  };
}
