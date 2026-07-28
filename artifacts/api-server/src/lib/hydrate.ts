/**
 * Startup hydration: loads persisted users and active sessions from
 * PostgreSQL into the in-memory store so state survives server restarts.
 *
 * Called once at boot before the HTTP server starts accepting requests.
 * Errors are non-fatal — the server continues with in-memory-only mode.
 *
 * Hydration rules:
 *  - Skips any DB row whose email is already in usersByEmail (protects
 *    seeded demo/admin accounts that run before hydration).
 *  - Only restores sessions whose expiresAt is in the future.
 *  - Wallet balances and transactions are NOT yet hydrated here (next phase).
 *    Users will log in successfully and see empty wallets until wallet
 *    persistence is added; existing in-memory wallets from freshUserData()
 *    will be generated for each restored user.
 */
import { gt } from "drizzle-orm";
import { usersTable, userSessionsTable } from "@workspace/db/schema";
import { dbGet } from "./db-client";
import {
  freshUserData,
  referralCodeIndex,
  referrals,
  sessions,
  userData,
  users,
  usersByEmail,
  type Role,
  type StoredUser,
} from "./store";
import { logger } from "./logger";

export async function hydrateFromDb(): Promise<void> {
  const start = Date.now();

  try {
    // 1. Load users from DB
    const dbUsers = await dbGet(
      "hydrate.users",
      (db) => db.select().from(usersTable),
      [],
    );

  let usersLoaded = 0;
  for (const row of dbUsers) {
    // Skip if already in memory (seeded demo/admin user takes precedence)
    if (usersByEmail.has(row.email.toLowerCase())) continue;

    const stored: StoredUser = {
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.fullName,
        country: row.country,
        kycVerified: row.kycVerified,
        avatarUrl: row.avatarUrl ?? undefined,
        createdAt: row.createdAt.toISOString(),
        selectedManagerId: row.selectedManagerId ?? null,
        phone: row.phone ?? null,
        merchant: false,
        moonpayEmail: row.moonpayEmail ?? null,
        buyVerified: row.buyVerified,
      },
      passwordHash: row.passwordHash,
      role: row.role as Role,
      referralCode: row.referralCode ?? "",
      referredBy: row.referredBy ?? null,
      merchant: false,
      tradingLocked: row.tradingLocked,
      demoMode: row.demoMode,
      phone: row.phone ?? null,
      accountFlag: null,
      suspended: false,
      disabled: false,
    };

    users.set(row.id, stored);
    usersByEmail.set(row.email.toLowerCase(), row.id);
    if (row.referralCode) referralCodeIndex.set(row.referralCode, row.id);
    if (!referrals.has(row.id)) referrals.set(row.id, []);
    if (!userData.has(row.id)) {
      userData.set(row.id, freshUserData(row.id, { country: row.country }));
    }
    usersLoaded++;
  }

  // 2. Load active sessions from DB
  const dbSessions = await dbGet(
    "hydrate.sessions",
    (db) =>
      db
        .select()
        .from(userSessionsTable)
        .where(gt(userSessionsTable.expiresAt, new Date())),
    [],
  );

  let sessionsLoaded = 0;
  for (const s of dbSessions) {
    // Only restore sessions for users we have in memory
    if (users.has(s.userId)) {
      sessions.set(s.id, s.userId);
      sessionsLoaded++;
    }
  }

    const elapsed = Date.now() - start;
    logger.info(
      { usersLoaded, sessionsLoaded, elapsedMs: elapsed },
      "[hydrate] Startup hydration complete",
    );
  } catch (error) {
    logger.warn({ err: error }, "[hydrate] Startup hydration skipped due to an unexpected database error");
  }
}
