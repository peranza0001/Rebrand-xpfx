/**
 * Lazy PostgreSQL client + fire-and-forget shadow-write helper.
 *
 * The server starts and runs normally without DATABASE_URL — all calls to
 * dbRun() / dbGet() become no-ops and warnings are logged once.  When
 * DATABASE_URL is present the pool is initialised on first use.
 *
 * Rules:
 *  - Never pass in-memory IDs to insert .values() — they are not valid UUIDs.
 *    Let Drizzle auto-generate UUIDs via defaultRandom().
 *  - dbRun() is fire-and-forget: the HTTP response is sent before it completes.
 *  - dbGet() awaits and returns a typed fallback on error.
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@workspace/db/schema";
import { buildPostgresConfig, getRawDatabaseUrl } from "../../../../lib/db/src/connection-config";
import { logger } from "./logger";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbClient | null = null;
let _warned = false;
let _lastInitAttempt = 0;
const REINIT_COOLDOWN_MS = 15_000; // don't hammer a dead DB on every request

export function getDb(): DbClient | null {
  if (_db) return _db;

  const url = getRawDatabaseUrl();
  if (!url) {
    if (!_warned) {
      logger.warn("[db] DATABASE_URL not set — DB persistence disabled");
      _warned = true;
    }
    return null;
  }

  // If pool creation failed recently, don't retry on every single call —
  // wait out the cooldown so a dead DB doesn't add latency to every request.
  const now = Date.now();
  if (now - _lastInitAttempt < REINIT_COOLDOWN_MS) {
    return null;
  }
  _lastInitAttempt = now;

  try {
    const postgresConfig = buildPostgresConfig();
    const pool = new pg.Pool({
      max: 5,
      connectionString: postgresConfig.connectionString,
      ssl: postgresConfig.ssl,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 1000,
    });

    // Pool-level errors (e.g. connection dropped by the DB host) would
    // otherwise surface as an unhandled 'error' event and crash the process.
    // Log and let getDb() naturally re-create the pool on the next call.
    pool.on("error", (err) => {
      logger.error({ err: err.message }, "[db] pool error — will retry on next access");
      _db = null;
    });

    _db = drizzle(pool, { schema });
    logger.info("[db] PostgreSQL connection pool initialised");
    return _db;
  } catch (err) {
    logger.error({ err: (err as Error).message }, "[db] Failed to initialise pool");
    return null;
  }
}

/**
 * Fire-and-forget DB write. Errors are logged but never thrown.
 * The in-memory store is the source of truth for reads.
 */
export function dbRun(
  label: string,
  fn: (db: DbClient) => Promise<void>,
): void {
  const db = getDb();
  if (!db) return;
  fn(db).catch((err: Error) => {
    logger.warn({ label, err: err.message }, "[db] shadow write failed");
  });
}

/**
 * Awaited DB read with typed fallback on error or when DB is unavailable.
 * Use for startup hydration only — all runtime reads should use in-memory.
 */
export async function dbGet<T>(
  label: string,
  fn: (db: DbClient) => Promise<T>,
  fallback: T,
): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    return await fn(db);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    if (message.includes("relation") && message.includes("does not exist")) {
      return fallback;
    }
    logger.warn({ label, err: message }, "[db] read failed");
    return fallback;
  }
}
