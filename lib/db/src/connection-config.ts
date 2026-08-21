import { URL } from 'node:url';

export type PostgresConnectionConfig = {
  connectionString: string;
  ssl: { rejectUnauthorized: boolean } | undefined;
};

function hasPlaceholderDatabaseHost(url?: string): boolean {
  if (!url) return false;
  const normalized = url.trim().toLowerCase();
  return normalized.includes('db.example.internal')
    || normalized.includes('example.internal')
    || normalized.includes('change_me_secure_password')
    || normalized.includes('placeholder')
    || normalized.includes('example.com');
}

export function getRawDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  // DATABASE_URL is the runtime URL. DIRECT_DATABASE_URL is reserved for
  // migrations and may be a non-pooled Neon connection.
  const privateUrl = env.DATABASE_URL?.trim();
  if (privateUrl && !hasPlaceholderDatabaseHost(privateUrl)) return privateUrl;

  const publicUrl = env.DATABASE_PUBLIC_URL?.trim();
  if (publicUrl && !hasPlaceholderDatabaseHost(publicUrl)) return publicUrl;

  const directUrl = env.DIRECT_DATABASE_URL?.trim();
  if (directUrl && !hasPlaceholderDatabaseHost(directUrl)) return directUrl;

  return undefined;
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
