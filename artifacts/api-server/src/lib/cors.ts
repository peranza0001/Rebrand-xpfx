export function normalizeOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin.trim());
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    const trimmed = origin.trim().replace(/\/+$|^\s+|\s+$/g, '');
    try {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
    } catch {
      return null;
    }
  }
}

export function normalizeAllowedOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  const deduped = new Set<string>();
  for (const origin of origins) {
    deduped.add(origin);
  }

  return [...deduped];
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim() || process.env.CORS_ORIGINS?.trim() || process.env.REPLIT_DOMAINS?.trim() || '';
  const fallbackOrigins = [
    'https://xpressprofx.com',
    'https://www.xpressprofx.com',
  ];
  const merged = [...fallbackOrigins, ...normalizeAllowedOrigins(raw)];
  const deduped = new Set<string>();
  for (const origin of merged) {
    deduped.add(origin);
  }
  return [...deduped];
}
