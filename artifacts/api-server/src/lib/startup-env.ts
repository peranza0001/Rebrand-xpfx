export interface StartupEnvResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
  resolved: Record<string, string>;
}

function normalizeString(value: string | undefined): string {
  return (value ?? '').trim();
}

function validateStartupEnvironment(env: Record<string, string | undefined> = process.env): StartupEnvResult {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];
  const warnings: string[] = [];

  resolved.NODE_ENV = normalizeString(env.NODE_ENV) || 'development';
  resolved.PORT = normalizeString(env.PORT) || '8080';

  const databaseUrl = normalizeString(env.DATABASE_URL) || normalizeString(env.DATABASE_PUBLIC_URL);
  if (!databaseUrl && resolved.NODE_ENV === 'production') {
    missing.push('DATABASE_URL');
  } else if (!databaseUrl) {
    warnings.push('DATABASE_URL');
  }
  resolved.DATABASE_URL = databaseUrl;

  const sessionSecret = normalizeString(env.SESSION_SECRET);
  if (!sessionSecret) {
    missing.push('SESSION_SECRET');
  }
  resolved.SESSION_SECRET = sessionSecret;

  const jwtSecret = normalizeString(env.JWT_SECRET);
  if (!jwtSecret) {
    missing.push('JWT_SECRET');
  }
  resolved.JWT_SECRET = jwtSecret;

  const allowedOrigins = normalizeString(env.ALLOWED_ORIGINS);
  if (resolved.NODE_ENV === 'production' && !allowedOrigins) {
    missing.push('ALLOWED_ORIGINS');
  }
  resolved.ALLOWED_ORIGINS = allowedOrigins;

  const walletEncryptionKey = normalizeString(env.WALLET_ENCRYPTION_KEY);
  if (!walletEncryptionKey) {
    missing.push('WALLET_ENCRYPTION_KEY');
  }
  resolved.WALLET_ENCRYPTION_KEY = walletEncryptionKey;

  if (normalizeString(env.MOONPAY_API_KEY) && !normalizeString(env.MOONPAY_SECRET_KEY)) {
    missing.push('MOONPAY_SECRET_KEY');
  }
  if (normalizeString(env.MOONPAY_API_KEY) && !normalizeString(env.MOONPAY_WEBHOOK_SECRET)) {
    missing.push('MOONPAY_WEBHOOK_SECRET');
  }

  const optionalWarnings = [
    ['MOONPAY_API_KEY', env.MOONPAY_API_KEY],
    ['COINBASE_WEBHOOK_SECRET', env.COINBASE_WEBHOOK_SECRET],
    ['AI_INTEGRATIONS_OPENAI_API_KEY', env.AI_INTEGRATIONS_OPENAI_API_KEY],
    ['ALCHEMY_API_KEY', env.ALCHEMY_API_KEY],
  ].filter(([, value]) => !normalizeString(value));

  if (resolved.NODE_ENV === 'development') {
    warnings.push(...optionalWarnings.map(([key]) => key));
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    resolved,
  };
}

export { validateStartupEnvironment };
