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

    if (normalized === 'password' || normalized === 'changeme' || normalized.includes('example')) {
      return false;
    }

    return trimmed.length >= 12
      && /[A-Z]/.test(trimmed)
      && /[a-z]/.test(trimmed)
      && /\d/.test(trimmed);
  }

  if (env.NODE_ENV === 'production') {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.trim().length < 32) {
      if (!env.SESSION_SECRET) {
        errors.push('SESSION_SECRET must be set to a strong value in production.');
      } else {
        errors.push('SESSION_SECRET must be set to a strong value in production.');
      }
    }

    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      if (!env.JWT_SECRET) {
        errors.push('JWT_SECRET must be set to a strong value in production.');
      } else {
        errors.push('JWT_SECRET must be set to a strong value in production.');
      }
    }

    if (!env.WALLET_ENCRYPTION_KEY || env.WALLET_ENCRYPTION_KEY.trim().length !== 64) {
      if (!env.WALLET_ENCRYPTION_KEY) {
        errors.push('WALLET_ENCRYPTION_KEY must be set to a 64-character hex key in production.');
      } else {
        errors.push('WALLET_ENCRYPTION_KEY must be set to a 64-character hex key in production.');
      }
    }

    const databaseUrl = env.DATABASE_URL?.trim() || env.DATABASE_PUBLIC_URL?.trim();
    if (!databaseUrl) {
      errors.push('DATABASE_URL or DATABASE_PUBLIC_URL must be configured for production persistence.');
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

    if (demoAuth !== 'false' && demoAuth !== '0') {
      warnings.push('ENABLE_DEMO_AUTH remains enabled; consider disabling it in production to reduce public exposure.');
    }

    if (env.MOONPAY_API_KEY && !env.MOONPAY_SECRET_KEY) {
      errors.push('MOONPAY_SECRET_KEY must be set when MOONPAY_API_KEY is configured in production.');
    }

    if (env.COINBASE_API_KEY && !env.COINBASE_API_SECRET) {
      errors.push('COINBASE_API_SECRET must be set when COINBASE_API_KEY is configured in production.');
    }

    const hasSmtpHost = Boolean(env.SMTP_HOST && env.SMTP_HOST.trim().length > 0);
    if (!isRealSendGridKey(env.SENDGRID_API_KEY) && !hasSmtpHost) {
      errors.push('No email provider is configured; OTPs and transactional messages require SENDGRID_API_KEY or SMTP_HOST in production.');
    } else if (!isRealSendGridKey(env.SENDGRID_API_KEY)) {
      warnings.push('SENDGRID_API_KEY is not configured with a real production credential; SendGrid email delivery will remain disabled until a real key is supplied. SMTP may still work if configured.');
    }

    const senderFrom = (env.SMTP_FROM || "").trim();
    if (isRealSendGridKey(env.SENDGRID_API_KEY) && !senderFrom) {
      errors.push('SENDGRID_API_KEY is configured but no verified sender address is set. Set SMTP_FROM to a verified SendGrid sender email in production.');
    }

    const hasBlockchainProvider = isRealAlchemyKey(env.ALCHEMY_API_KEY) || Boolean(env.INFURA_API_KEY?.trim());
    if (!hasBlockchainProvider) {
      errors.push('ALCHEMY_API_KEY or INFURA_API_KEY is not configured with a real production credential; on-chain lookups require a blockchain provider in production.');
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
