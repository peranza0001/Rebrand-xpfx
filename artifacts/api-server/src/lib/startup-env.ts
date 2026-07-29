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

  const nodeEnv = normalizeString(env.NODE_ENV);
  resolved.NODE_ENV = nodeEnv || 'development';
  resolved.PORT = normalizeString(env.PORT) || '8080';

  const databaseUrl = normalizeString(env.DATABASE_URL) || normalizeString(env.DATABASE_PUBLIC_URL);
  if (!databaseUrl) {
    warnings.push('DATABASE_URL');
  }
  resolved.DATABASE_URL = databaseUrl;

  const sessionSecret = normalizeString(env.SESSION_SECRET);
  if (!sessionSecret) {
    warnings.push('SESSION_SECRET');
  }
  resolved.SESSION_SECRET = sessionSecret;

  const jwtSecret = normalizeString(env.JWT_SECRET);
  if (!jwtSecret) {
    warnings.push('JWT_SECRET');
  }
  resolved.JWT_SECRET = jwtSecret;

  const allowedOrigins = normalizeString(env.ALLOWED_ORIGINS) || normalizeString(env.REPLIT_DOMAINS);
  if (!allowedOrigins) {
    warnings.push('ALLOWED_ORIGINS');
  }
  resolved.ALLOWED_ORIGINS = allowedOrigins;

  const walletEncryptionKey = normalizeString(env.WALLET_ENCRYPTION_KEY);
  if (!walletEncryptionKey) {
    warnings.push('WALLET_ENCRYPTION_KEY');
  }
  resolved.WALLET_ENCRYPTION_KEY = walletEncryptionKey;

  const adminEmail = normalizeString(env.ADMIN_EMAIL);
  if (!adminEmail) {
    warnings.push('ADMIN_EMAIL');
  }
  resolved.ADMIN_EMAIL = adminEmail;

  const adminPassword = normalizeString(env.ADMIN_PASSWORD);
  if (!adminPassword) {
    warnings.push('ADMIN_PASSWORD');
  }
  resolved.ADMIN_PASSWORD = adminPassword;

  if (normalizeString(env.MOONPAY_API_KEY) && !normalizeString(env.MOONPAY_SECRET_KEY)) {
    warnings.push('MOONPAY_SECRET_KEY');
  }
  if (normalizeString(env.MOONPAY_API_KEY) && !normalizeString(env.MOONPAY_WEBHOOK_SECRET)) {
    warnings.push('MOONPAY_WEBHOOK_SECRET');
  }

  const optionalWarnings = [
    ['MOONPAY_API_KEY', env.MOONPAY_API_KEY],
    ['COINBASE_WEBHOOK_SECRET', env.COINBASE_WEBHOOK_SECRET],
    ['AI_INTEGRATIONS_OPENAI_API_KEY', env.AI_INTEGRATIONS_OPENAI_API_KEY],
    ['ALCHEMY_API_KEY', env.ALCHEMY_API_KEY],
  ] as Array<[string, string | undefined]>;

  const missingOptionalWarnings = optionalWarnings.filter(
    (entry): entry is [string, string | undefined] => {
      const value = entry[1];
      return !normalizeString(value);
    }
  );

  if (resolved.NODE_ENV === 'development') {
    warnings.push(...missingOptionalWarnings.map(([key]) => key));
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    resolved,
  };
}

export { validateStartupEnvironment };
