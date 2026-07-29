function validateProductionEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];

  if (env.NODE_ENV === 'production') {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.trim().length < 32) {
      if (!env.SESSION_SECRET) {
        warnings.push('SESSION_SECRET not provided; a secure runtime secret will be generated.');
      } else {
        errors.push('SESSION_SECRET must be set to a strong value in production.');
      }
    }

    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      if (!env.JWT_SECRET) {
        warnings.push('JWT_SECRET not provided; a secure runtime secret will be generated.');
      } else {
        errors.push('JWT_SECRET must be set to a strong value in production.');
      }
    }

    if (!env.WALLET_ENCRYPTION_KEY || env.WALLET_ENCRYPTION_KEY.trim().length !== 64) {
      if (!env.WALLET_ENCRYPTION_KEY) {
        warnings.push('WALLET_ENCRYPTION_KEY not provided; a secure runtime key will be generated.');
      } else {
        errors.push('WALLET_ENCRYPTION_KEY must be set to a 64-character hex key in production.');
      }
    }

    const databaseUrl = env.DATABASE_URL?.trim() || env.DATABASE_PUBLIC_URL?.trim();
    if (!databaseUrl) {
      warnings.push('DATABASE_URL or DATABASE_PUBLIC_URL not set; the API will start without database persistence.');
    }

    if (!env.ALLOWED_ORIGINS && !env.REPLIT_DOMAINS) {
      warnings.push('ALLOWED_ORIGINS or REPLIT_DOMAINS not set; CORS will use local defaults until configured.');
    }

    if (env.MOONPAY_API_KEY && !env.MOONPAY_SECRET_KEY) {
      errors.push('MOONPAY_SECRET_KEY must be set when MOONPAY_API_KEY is configured in production.');
    }

    if (env.COINBASE_API_KEY && !env.COINBASE_API_SECRET) {
      errors.push('COINBASE_API_SECRET must be set when COINBASE_API_KEY is configured in production.');
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
