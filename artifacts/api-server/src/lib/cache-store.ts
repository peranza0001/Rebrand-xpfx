/**
 * Small in-memory cache with TTL support for transient app state.
 * This keeps session metadata, compliance snapshots, and regional health data
 * from rehydrating on every request without introducing a hard dependency on
 * Redis or a database during early production deployment.
 */

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function setCacheValue<T>(key: string, value: T, ttlMs: number): T {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
  return value;
}

export function getCacheValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function deleteCacheValue(key: string): void {
  cache.delete(key);
}

export function clearExpiredCacheValues(): number {
  let removed = 0;
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      removed += 1;
    }
  }

  return removed;
}

export function getCacheSize(): number {
  return cache.size;
}
