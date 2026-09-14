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

function normalizeOriginPattern(pattern: string): string | null {
  const trimmed = pattern.trim().replace(/\/+$/, '');
  if (trimmed.includes('*')) {
    const wildcardIndex = trimmed.indexOf('*');
    if (wildcardIndex !== trimmed.indexOf('*.') || trimmed.indexOf('*', wildcardIndex + 1) !== -1) {
      return null;
    }
    const suffix = trimmed.slice(wildcardIndex + 1).replace(/^\./, '');
    const normalizedSuffix = normalizeOrigin(`https://${suffix}`);
    if (!normalizedSuffix || !trimmed.startsWith('https://*.')) return null;
    return `https://*.${normalizedSuffix.slice('https://'.length)}`;
  }
  return normalizeOrigin(trimmed);
}

export function normalizeAllowedOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map(normalizeOriginPattern)
    .filter((origin): origin is string => Boolean(origin));

  const deduped = new Set<string>();
  for (const origin of origins) {
    deduped.add(origin);
  }

  return [...deduped];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  return getAllowedOrigins().some((allowedOrigin) => {
    if (allowedOrigin === normalizedOrigin) return true;
    if (!allowedOrigin.startsWith('https://*.')) return false;
    if (!normalizedOrigin.startsWith('https://')) return false;

    const suffix = allowedOrigin.slice('https://*.'.length);
    const hostname = normalizedOrigin.slice('https://'.length);
    return hostname.endsWith(`.${suffix}`) && hostname.slice(0, -(suffix.length + 1)).length > 0;
  });
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim() || process.env.CORS_ORIGINS?.trim() || process.env.REPLIT_DOMAINS?.trim() || '';
  const fallbackOrigins = [
    'https://web-production-94f970.up.railway.app',
    'https://rebrand-xpfx-production-1988.up.railway.app',
    'https://web-production-45a7e.up.railway.app',
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
