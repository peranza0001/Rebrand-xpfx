import { getRawDatabaseUrl } from '../../../../lib/db/src/connection-config';

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
  if (!nodeEnv) {
    missing.push('NODE_ENV');
  }
  resolved.NODE_ENV = nodeEnv || 'development';

  const port = normalizeString(env.PORT);
  if (!port) {
    if (resolved.NODE_ENV === 'production') {
      missing.push('PORT');
    } else {
      warnings.push('PORT');
    }
  }
  resolved.PORT = port || '8080';

  const databaseUrl = normalizeString(getRawDatabaseUrl(env as Record<string, string | undefined>));
  if (!databaseUrl || /db\.example\.internal|example\.internal|change_me_secure_password|placeholder/i.test(databaseUrl)) {
    if (resolved.NODE_ENV === 'production') {
      missing.push('DATABASE_URL');
    } else {
      warnings.push('DATABASE_URL');
    }
  }
  resolved.DATABASE_URL = databaseUrl;

  const sessionSecret =
    normalizeString(env.SESSION_SECRET) ||
    normalizeString(env.COOKIE_SECRET) ||
    normalizeString(env.COOKIE_SIGNING_KEY);
  if (!sessionSecret) {
    if (resolved.NODE_ENV === 'production') {
      missing.push('SESSION_SECRET');
    } else {
      warnings.push('SESSION_SECRET');
    }
  }
  resolved.SESSION_SECRET = sessionSecret;

  const jwtSecret = normalizeString(env.JWT_SECRET);
  if (!jwtSecret) {
    if (resolved.NODE_ENV === 'production') {
      missing.push('JWT_SECRET');
    } else {
      warnings.push('JWT_SECRET');
    }
  }
  resolved.JWT_SECRET = jwtSecret;

  const allowedOrigins = normalizeString(env.ALLOWED_ORIGINS) || normalizeString(env.REPLIT_DOMAINS);
  if (!allowedOrigins) {
    if (resolved.NODE_ENV === 'production') {
      missing.push('ALLOWED_ORIGINS');
    } else {
      warnings.push('ALLOWED_ORIGINS');
    }
  }
  resolved.ALLOWED_ORIGINS = allowedOrigins;

  const moonpayApiKey = normalizeString(env.MOONPAY_API_KEY);
  if (!moonpayApiKey) {
    // MoonPay is optional — app will use sandbox mode if not configured
    warnings.push('MOONPAY_API_KEY');
  }
  resolved.MOONPAY_API_KEY = moonpayApiKey;

  const coinbaseWebhookSecret = normalizeString(env.COINBASE_WEBHOOK_SECRET);
  if (!coinbaseWebhookSecret) {
    // Coinbase webhook is optional — webhooks will be in permissive mode if not configured
    warnings.push('COINBASE_WEBHOOK_SECRET');
  }
  resolved.COINBASE_WEBHOOK_SECRET = coinbaseWebhookSecret;

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

  if (moonpayApiKey && !normalizeString(env.MOONPAY_SECRET_KEY)) {
    warnings.push('MOONPAY_SECRET_KEY');
  }
  if (moonpayApiKey && !normalizeString(env.MOONPAY_WEBHOOK_SECRET)) {
    warnings.push('MOONPAY_WEBHOOK_SECRET');
  }

  if (normalizeString(env.COINBASE_API_KEY) && !normalizeString(env.COINBASE_API_SECRET)) {
    warnings.push('COINBASE_API_SECRET');
  }
  if (normalizeString(env.COINBASE_API_KEY) && !coinbaseWebhookSecret) {
    warnings.push('COINBASE_WEBHOOK_SECRET');
  }

  const optionalWarnings = [
    ['AI_INTEGRATIONS_OPENAI_API_KEY', env.AI_INTEGRATIONS_OPENAI_API_KEY],
    ['ALCHEMY_API_KEY', env.ALCHEMY_API_KEY],
    ['MOONPAY_API_KEY', env.MOONPAY_API_KEY],
    ['COINBASE_WEBHOOK_SECRET', env.COINBASE_WEBHOOK_SECRET],
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
