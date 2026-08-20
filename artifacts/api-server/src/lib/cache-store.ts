/**
 * Small in-memory cache with TTL support for transient app state.
 * This keeps session metadata, compliance snapshots, and regional health data
 * from rehydrating on every request without introducing a hard dependency on
 * Redis or a database during early production deployment.
 *
 * The public API remains synchronous so the rest of the app keeps working as-is,
 * while optional async Redis-backed helpers are available for the Phase 8
 * persistence upgrade without breaking the current code paths.
 */
import { getRedisCacheValue, setRedisCacheValue, deleteRedisCacheValue } from "./redis-client";

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function setCacheValue<T>(key: string, value: T, ttlMs: number): T {
  void setRedisCacheValue(key, value, ttlMs);

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
  void deleteRedisCacheValue(key);
  cache.delete(key);
}

export async function setCacheValueAsync<T>(key: string, value: T, ttlMs: number): Promise<T> {
  const redisWritten = await setRedisCacheValue(key, value, ttlMs);
  if (redisWritten) {
    return value;
  }

  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
  return value;
}

export async function getCacheValueAsync<T>(key: string): Promise<T | undefined> {
  const redisValue = await getRedisCacheValue<T>(key);
  if (redisValue !== undefined) {
    return redisValue;
  }

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

export async function deleteCacheValueAsync(key: string): Promise<void> {
  await deleteRedisCacheValue(key);
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
