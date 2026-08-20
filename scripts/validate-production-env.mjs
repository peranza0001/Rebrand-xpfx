function isRealSendGridKey(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().startsWith('sg_generated') || trimmed.toLowerCase().startsWith('sendgrid_generated') || trimmed.toLowerCase().startsWith('placeholder')) {
    return false;
  }
  return trimmed.startsWith('SG.') || trimmed.length >= 20;
}

function isRealAlchemyKey(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().startsWith('alchemy_generated') || trimmed.toLowerCase().startsWith('alchemy_placeholder') || trimmed.toLowerCase().startsWith('placeholder')) {
    return false;
  }
  return trimmed.length >= 16;
}

function resolveEnvValue(env, key, aliases = []) {
  const candidates = [key, ...aliases];
  for (const candidate of candidates) {
    const raw = env[candidate];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function isValidHexString(value, length) {
  return typeof value === 'string' && /^[0-9a-fA-F]+$/.test(value.trim()) && value.trim().length === length;
}

function isPlaceholderDatabaseUrl(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('db.example.internal')
    || trimmed.includes('example.internal')
    || trimmed.includes('change_me_secure_password')
    || trimmed.includes('example.com')
    || trimmed.includes('placeholder');
}

function validateProductionEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];

  function hasMeaningfulValue(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isStrongPassword(value) {
    if (!hasMeaningfulValue(value)) return false;
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();

    if (
      normalized === 'password' ||
      normalized === 'changeme' ||
      normalized.includes('changeme') ||
      normalized.includes('example')
    ) {
      return false;
    }

    const hasUpper = /[A-Z]/.test(trimmed);
    const hasLower = /[a-z]/.test(trimmed);
    const hasDigit = /\d/.test(trimmed);
    const hasSymbol = /[^A-Za-z0-9]/.test(trimmed);

    return trimmed.length >= 8
      && hasUpper
      && hasLower
      && hasDigit
      && (hasSymbol || trimmed.length >= 10 || normalized.includes('prod') || normalized.includes('secure'));
  }

  if (env.NODE_ENV === 'production') {
    const sessionSecret = resolveEnvValue(env, 'SESSION_SECRET', ['COOKIE_SECRET', 'COOKIE_SIGNING_KEY']);
    if (!sessionSecret || sessionSecret.length < 32) {
      errors.push('SESSION_SECRET must be set to a strong value in production.');
    }

    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      errors.push('JWT_SECRET must be set to a strong value in production.');
    }

    const databaseUrl = env.DATABASE_URL?.trim() || env.DATABASE_PUBLIC_URL?.trim() || env.DIRECT_DATABASE_URL?.trim();
    if (!databaseUrl || isPlaceholderDatabaseUrl(databaseUrl)) {
      errors.push('DATABASE_URL, DATABASE_PUBLIC_URL, or DIRECT_DATABASE_URL must be configured with a real PostgreSQL connection string. Placeholder/example values are not valid for production persistence and will lose user accounts and sessions on redeploy.');
    }

    if (!env.ALLOWED_ORIGINS && !env.REPLIT_DOMAINS) {
      errors.push('ALLOWED_ORIGINS or REPLIT_DOMAINS must be configured for production CORS.');
    }

    const adminEmail = env.ADMIN_EMAIL?.trim();
    const adminPassword = env.ADMIN_PASSWORD?.trim();
    const demoAuth = env.ENABLE_DEMO_AUTH?.trim().toLowerCase();

    if (!adminEmail || !adminEmail.includes('@') || adminEmail.includes('example.com')) {
      errors.push('ADMIN_EMAIL must be set to a real production address.');
    }

    if (!isStrongPassword(adminPassword)) {
      errors.push('ADMIN_PASSWORD must be set to a strong production credential.');
    }

    if (demoAuth === 'true' || demoAuth === '1') {
      warnings.push('ENABLE_DEMO_AUTH is enabled in production; this is a public exposure and should be disabled unless intentionally required.');
    }

    if (env.MOONPAY_API_KEY && !env.MOONPAY_SECRET_KEY) {
      errors.push('MOONPAY_SECRET_KEY must be set when MOONPAY_API_KEY is configured in production.');
    }

    if (env.COINBASE_API_KEY && !env.COINBASE_API_SECRET) {
      errors.push('COINBASE_API_SECRET must be set when COINBASE_API_KEY is configured in production.');
    }

    const hasSmtpHost = Boolean(env.SMTP_HOST && env.SMTP_HOST.trim().length > 0);
    if (!isRealSendGridKey(env.SENDGRID_API_KEY) && !hasSmtpHost) {
      warnings.push('No email provider is configured; email-dependent features will remain disabled until SENDGRID_API_KEY or SMTP_HOST is supplied.');
    } else if (!isRealSendGridKey(env.SENDGRID_API_KEY)) {
      warnings.push('SENDGRID_API_KEY is not configured with a real production credential; SendGrid email delivery will remain disabled until a real key is supplied. SMTP may still work if configured.');
    }

    const senderFrom = (env.SMTP_FROM || "").trim();
    if ((isRealSendGridKey(env.SENDGRID_API_KEY) || hasSmtpHost) && !senderFrom) {
      errors.push('SMTP_FROM must be configured when email delivery is enabled in production. Use a verified sender address for SendGrid or the desired from address for SMTP.');
    }

    const hasBlockchainProvider = isRealAlchemyKey(env.ALCHEMY_API_KEY) || Boolean(env.INFURA_API_KEY?.trim());
    if (!hasBlockchainProvider) {
      warnings.push('ALCHEMY_API_KEY or INFURA_API_KEY is not configured; live on-chain lookups will remain disabled until a provider is supplied.');
    } else if (!isRealAlchemyKey(env.ALCHEMY_API_KEY)) {
      warnings.push('ALCHEMY_API_KEY is not configured with a real production credential; Infura will be used instead. Alchemy is recommended for optimal production performance.');
    }
  }

  if (warnings.length > 0) {
    console.warn(`[validate-production-env] ${warnings.join(' ')}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return true;
}

export { validateProductionEnvironment };
