/**
 * Centralized environment-variable access for the API server.
 *
 * All optional secrets are read once at module load and exposed as typed,
 * already-defaulted values. Required secrets are validated explicitly
 * and surfaced through `assertRequiredEnv()` at startup.
 *
 * Adding a new env var? Add it here so callers never touch process.env
 * directly — that way missing optional secrets never crash startup.
 */

const get = (key: string): string | undefined => {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const env = {
  // Required
  PORT: get("PORT"),

  // Runtime mode
  NODE_ENV: get("NODE_ENV") ?? "development",
  LOG_LEVEL: get("LOG_LEVEL") ?? "info",

  // Demo auth
    // Demo auth: allow explicit true/false via env; if unset, default to true in
    // non-production and false in production so demo endpoints work for local dev.
    ENABLE_DEMO_AUTH: (() => {
      const raw = process.env["ENABLE_DEMO_AUTH"];
      if (raw === undefined) return undefined;
      const val = raw.trim().toLowerCase();
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    })(),

  // Admin provisioning
  ADMIN_EMAIL: get("ADMIN_EMAIL"),
  ADMIN_PASSWORD: get("ADMIN_PASSWORD"),
  ADMIN_NOTIFY_EMAIL: get("ADMIN_NOTIFY_EMAIL"),

  // SMTP (optional — falls back to logged-only OTPs when missing)
  SMTP_HOST: get("SMTP_HOST"),
  SMTP_PORT: get("SMTP_PORT"),
  SMTP_USER: get("SMTP_USER"),
  SMTP_PASS: get("SMTP_PASS"),
  SMTP_FROM: get("SMTP_FROM"),

  // Blockchain providers (optional — falls back to ethers public provider)
  ALCHEMY_API_KEY: get("ALCHEMY_API_KEY"),
  INFURA_API_KEY: get("INFURA_API_KEY"),

  // MoonPay (optional — falls back to sandbox)
  MOONPAY_API_KEY: get("MOONPAY_API_KEY"),
  MOONPAY_SECRET_KEY: get("MOONPAY_SECRET_KEY"),
  MOONPAY_WEBHOOK_SECRET: get("MOONPAY_WEBHOOK_SECRET"),

  // Coinbase Commerce / On-ramp (optional — falls back to sandbox/test URL)
  COINBASE_API_KEY: get("COINBASE_API_KEY"),
  COINBASE_API_SECRET: get("COINBASE_API_SECRET"),
  COINBASE_WEBHOOK_SECRET: get("COINBASE_WEBHOOK_SECRET"),

  /**
   * JSON array of ISO-3166-1 alpha-2 country codes where MoonPay is
   * unavailable (sanctions / regulatory). Override with the
   * MOONPAY_UNSUPPORTED_COUNTRIES env var to widen or narrow the list.
   */
  MOONPAY_UNSUPPORTED_COUNTRIES: get("MOONPAY_UNSUPPORTED_COUNTRIES"),

  // Express session signing
  SESSION_SECRET: get("SESSION_SECRET"),

  // OpenAI integration (optional — chat features degrade without it)
  AI_INTEGRATIONS_OPENAI_API_KEY: get("AI_INTEGRATIONS_OPENAI_API_KEY"),
  AI_INTEGRATIONS_OPENAI_BASE_URL: get("AI_INTEGRATIONS_OPENAI_BASE_URL"),

  // SendGrid (optional — email.ts falls back to SMTP, then to logged-only)
  SENDGRID_API_KEY: get("SENDGRID_API_KEY"),

  // Platform on-chain receiving address override
  PLATFORM_RECEIVING_ADDRESS: get("PLATFORM_RECEIVING_ADDRESS"),

  // CORS allowlist — comma-separated list of allowed frontend origins.
  // Use this on Railway, Render, VPS, and any non-Replit deployment:
  //   ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
  // In production, if neither ALLOWED_ORIGINS nor REPLIT_DOMAINS is set,
  // all credentialed cross-origin requests will be denied (fail-closed).
  ALLOWED_ORIGINS: get("ALLOWED_ORIGINS"),

  // Replit platform — comma-separated list of public hostnames for this deployment.
  // Set automatically by Replit; ALLOWED_ORIGINS takes precedence when set.
  REPLIT_DOMAINS: get("REPLIT_DOMAINS"),

  /**
   * AES-256-GCM key for encrypting wallet credential material (seed phrases
   * and private keys) at rest. Must be 64 hex characters (32 bytes).
   *
   * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   *
   * REQUIRED in production. Optional in development (credentials stored plain-text
   * in the in-memory store which is not persisted across restarts).
   */
  WALLET_ENCRYPTION_KEY: get("WALLET_ENCRYPTION_KEY"),

  /**
   * Fixed USD amount credited to a referrer when their referred user completes
   * their first qualifying trade. Defaults to 500.
   */
  REFERRAL_REWARD_USD: get("REFERRAL_REWARD_USD"),
} as const;

export const isProduction = env.NODE_ENV === "production";

export function resolveDemoAuthEnabled(rawEnv: Record<string, string | undefined> = process.env) {
  const explicitValue = rawEnv["ENABLE_DEMO_AUTH"]?.trim().toLowerCase();
  if (explicitValue === "true") return true;
  if (explicitValue === "false") return false;
  return true;
}

export const isDemoAuthEnabled = resolveDemoAuthEnabled();
export const hasSmtpCredentials = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS,
);

export function assertRequiredEnv(): { port: number } {
  if (!env.PORT) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }
  const port = Number(env.PORT);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${env.PORT}"`);
  }

  // In production, a live MoonPay API key without a secret key is a
  // security misconfiguration: unsigned checkout URLs can be tampered
  // with by an attacker to redirect funds while still triggering a
  // platform wallet credit via the pending-record fallback.
  if (isProduction && env.MOONPAY_API_KEY && !env.MOONPAY_SECRET_KEY) {
    throw new Error(
      "MOONPAY_SECRET_KEY must be set when MOONPAY_API_KEY is configured in production. " +
        "Unsigned live MoonPay checkout URLs are a critical security vulnerability.",
    );
  }

  // In production, wallet credentials must be encrypted at rest.
  if (isProduction && !env.WALLET_ENCRYPTION_KEY) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY must be set in production. " +
        "Wallet seed phrases and private keys cannot be stored in plain text. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  return { port };
}
