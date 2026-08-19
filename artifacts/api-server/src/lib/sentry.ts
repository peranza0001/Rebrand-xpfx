import * as Sentry from '@sentry/node';

export function initServerSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN || process.env.CLIENT_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enabled: true,
  });

  return true;
}

export function getSentryEnabled() {
  return Boolean(process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN || process.env.CLIENT_SENTRY_DSN);
}
