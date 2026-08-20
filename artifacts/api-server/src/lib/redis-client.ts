/**
 * Optional Redis cache client for Phase 8 persistence upgrades.
 *
 * The API can run fully without Redis: all helpers fail closed and fall back
 * to the existing in-memory cache/store implementations. When REDIS_URL is
 * configured, this client provides a shared cache layer for session metadata,
 * compliance snapshots, and other transient state.
 */
import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";

let redisClient: RedisClientType | null = null;
let redisConnectionAttempted = false;

export function getRedisUrl(): string | undefined {
  const candidates = [process.env.REDIS_URL, process.env.REDIS_URI];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return undefined;
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (redisConnectionAttempted) {
    return null;
  }

  try {
    redisConnectionAttempted = true;
    redisClient = createClient({ url });
    redisClient.on("error", (err) => {
      logger.warn({ err }, "[redis] Redis client error");
    });
    await redisClient.connect();
    logger.info("[redis] Redis connection established");
    return redisClient;
  } catch (err) {
    logger.warn({ err }, "[redis] Redis connection failed; using in-memory fallbacks");
    redisClient = null;
    return null;
  }
}

export async function setRedisCacheValue<T>(key: string, value: T, ttlMs: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const payload = JSON.stringify(value);
    await client.set(key, payload, { PX: ttlMs });
    return true;
  } catch (err) {
    logger.warn({ err, key }, "[redis] setCacheValue failed");
    return false;
  }
}

export async function getRedisCacheValue<T>(key: string): Promise<T | undefined> {
  const client = await getRedisClient();
  if (!client) return undefined;

  try {
    const raw = await client.get(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ err, key }, "[redis] getCacheValue failed");
    return undefined;
  }
}

export async function deleteRedisCacheValue(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.warn({ err, key }, "[redis] deleteCacheValue failed");
    return false;
  }
}
