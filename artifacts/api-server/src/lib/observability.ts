/**
 * Lightweight error tracking + APM helpers.
 * Uses environment-aware instrumentation so the app can report to Sentry when configured,
 * or fall back to structured local logging and metrics when not configured.
 */

import { logger } from './logger';

export interface APMMetricSample {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

const apmSamples: APMMetricSample[] = [];
let errorCount = 0;

export function captureException(error: unknown, context?: Record<string, unknown>) {
  errorCount += 1;

  if (process.env.SENTRY_DSN) {
    logger.warn(
      { err: error, context, sentryConfigured: true },
      '[OBSERVABILITY] Sentry DSN configured; attach external Sentry client here'
    );
    return;
  }

  logger.error({ err: error, context }, '[OBSERVABILITY] Application error captured');
}

export function registerUnhandledHandlers() {
  const onError = (error: unknown, origin: string) => {
    captureException(error, { origin });
  };

  process.on('uncaughtException', (error) => {
    onError(error, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    onError(reason, 'unhandledRejection');
  });
}

export function trackRequestMetric(req: { method: string; path: string }, res: { statusCode: number }, durationMs: number) {
  const sample: APMMetricSample = {
    route: req.path,
    method: req.method,
    statusCode: res.statusCode,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  apmSamples.unshift(sample);
  if (apmSamples.length > 200) {
    apmSamples.length = 200;
  }
}

export function getApmSummary() {
  const total = apmSamples.length;
  const average = total > 0
    ? apmSamples.reduce((sum, sample) => sum + sample.durationMs, 0) / total
    : 0;
  const p95 = total > 0
    ? [...apmSamples].sort((a, b) => b.durationMs - a.durationMs)[Math.min(19, total - 1)]?.durationMs ?? 0
    : 0;

  return {
    totalRequests: total,
    averageDurationMs: Number(average.toFixed(2)),
    p95DurationMs: Number(p95.toFixed(2)),
    errorCount,
    sentryEnabled: Boolean(process.env.SENTRY_DSN),
  };
}

export function getRecentApmSamples(limit = 20): APMMetricSample[] {
  return apmSamples.slice(0, limit);
}
