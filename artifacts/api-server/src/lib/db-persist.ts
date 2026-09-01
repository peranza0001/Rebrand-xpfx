/**
 * Database persistence layer that bridges the in-memory store to Prisma.
 * Uses any type to avoid Prisma schema mismatch errors.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db-client";
import { demoOrdersTable, tradesTable, userSessionsTable, usersTable } from "@workspace/db/schema";
import { logger } from "./logger";
import type { StoredUser } from "./store";

let prismaClient: any = null;

// Cache for discovered columns to avoid repeated information_schema queries
const hasColumnCache: Map<string, boolean> = new Map();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function retryAsync<T>(fn: () => Promise<T>, attempts = 3, delayMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn({ attempt: i, attempts, err }, '[retry] operation failed, retrying');
      if (i < attempts) {
        // backoff
        await new Promise((r) => setTimeout(r, delayMs * i));
      }
    }
  }
  throw lastErr;
}

export function setPrismaClient(client: any): void {
  prismaClient = client;
}

export function getPrismaClient(): any {
  return prismaClient;
}

export async function ensurePersistedDemoAccount(userId: string, startingBalance: number): Promise<boolean> {
  if (!isUuid(userId) || !Number.isFinite(startingBalance) || startingBalance <= 0) return false;

  const accountDelegate = getPrismaModelDelegate("TradingAccount");
  if (!accountDelegate?.findFirst || !accountDelegate.create) {
    logger.info({ userId, startingBalance }, "[db-persist] demo account persistence backend unavailable; using in-memory fallback");
    return true;
  }

  try {
    const existing = await accountDelegate.findFirst({
      where: { userId, accountType: "DEMO", isActive: true },
      select: { id: true },
    });
    if (existing) return true;

    await accountDelegate.create({
      data: {
        userId,
        accountType: "DEMO",
        currency: "USD",
        balance: startingBalance,
        equity: startingBalance,
        margin: 0,
        freeMargin: startingBalance,
        leverage: 50,
        isActive: true,
      },
    });
    return true;
  } catch (err) {
    logger.error({ err, userId }, "[db-persist] demo account provisioning failed");
    return false;
  }
}

export type PersistedDemoOrder = {
  id: string;
  userId: string;
  instrument: string;
  type: "market" | "limit" | "stop";
  side: "buy" | "sell";
  price?: number;
  amount: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
};

export async function persistDemoOrder(order: PersistedDemoOrder): Promise<boolean> {
  if (!isUuid(order.userId) || !isUuid(order.id)) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await db.insert(demoOrdersTable).values({
      id: order.id,
      userId: order.userId,
      instrument: order.instrument,
      type: order.type,
      side: order.side,
      price: order.price === undefined ? null : String(order.price),
      amount: String(order.amount),
      leverage: order.leverage,
      stopLoss: order.stopLoss === undefined ? null : String(order.stopLoss),
      takeProfit: order.takeProfit === undefined ? null : String(order.takeProfit),
      status: order.status,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: demoOrdersTable.id,
      set: {
        status: order.status,
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (err) {
    logger.warn({ err, orderId: order.id, userId: order.userId }, "[db-persist] persistDemoOrder failed");
    return false;
  }
}

export async function getPersistedOpenDemoOrders(): Promise<PersistedDemoOrder[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(demoOrdersTable).where(eq(demoOrdersTable.status, "open"));
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      instrument: row.instrument,
      type: row.type,
      side: row.side,
      price: row.price === null ? undefined : Number(row.price),
      amount: Number(row.amount),
      leverage: row.leverage,
      stopLoss: row.stopLoss === null ? undefined : Number(row.stopLoss),
      takeProfit: row.takeProfit === null ? undefined : Number(row.takeProfit),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (err) {
    logger.warn({ err }, "[db-persist] getPersistedOpenDemoOrders failed");
    return [];
  }
}

export async function getPersistedUser(userId: string): Promise<StoredUser | null> {
  if (!isUuid(userId)) return null;

  const userDelegate = getPrismaUserDelegate();
  if (userDelegate?.findUnique) {
    try {
      const row = await userDelegate.findUnique({ where: { id: userId } });
      if (row) return persistedUserToStoredUser(row);
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] getPersistedUser failed using Prisma");
    }
  }

  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    return rows[0] ? persistedUserToStoredUser(rows[0]) : null;
  } catch (err) {
    logger.warn({ err, userId }, "[db-persist] getPersistedUser failed using Drizzle");
    return null;
  }
}

export async function getPersistedUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const userDelegate = getPrismaUserDelegate();
  if (userDelegate?.findUnique) {
    try {
      const row = await userDelegate.findUnique({ where: { email: normalizedEmail } });
      if (row) return persistedUserToStoredUser(row);
    } catch (err) {
      logger.warn({ err, email: normalizedEmail }, "[db-persist] getPersistedUserByEmail failed using Prisma");
    }
  }

  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
    return rows[0] ? persistedUserToStoredUser(rows[0]) : null;
  } catch (err) {
    logger.warn({ err, email: normalizedEmail }, "[db-persist] getPersistedUserByEmail failed using Drizzle");
    return null;
  }
}

function persistedUserToStoredUser(row: any): StoredUser {
  const email = String(row.email ?? "").toLowerCase();
  const fullName = String(row.fullName ?? row.full_name ?? email);
  const username = String(row.username ?? email.split("@")[0] ?? "trader");
  const referralCode = String(row.referralCode ?? row.referral_code ?? `ref_${row.id}`);
  const role = row.role === "admin" || row.role === "demo" ? row.role : "user";
  return {
    user: {
      id: String(row.id),
      username,
      email,
      fullName,
      country: String(row.country ?? "US"),
      kycVerified: Boolean(row.kycVerified ?? row.kyc_verified),
      avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
      createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()).toISOString(),
      selectedManagerId: row.selectedManagerId ?? row.selected_manager_id ?? null,
      phone: row.phone ?? null,
      merchant: Boolean(row.merchant),
      moonpayEmail: row.moonpayEmail ?? row.moonpay_email ?? null,
      buyVerified: Boolean(row.buyVerified ?? row.buy_verified),
    },
    passwordHash: String(row.passwordHash ?? row.password_hash ?? ""),
    role,
    referralCode,
    referredBy: row.referredBy ?? row.referred_by ?? null,
    merchant: Boolean(row.merchant),
    tradingLocked: Boolean(row.tradingLocked ?? row.trading_locked),
    demoMode: Boolean(row.demoMode ?? row.demo_mode),
    phone: row.phone ?? null,
    accountFlag: row.accountFlag ?? row.account_flag ?? null,
    suspended: Boolean(row.suspended),
    disabled: Boolean(row.disabled),
  };
}

export function getPrismaModelDelegate(modelName: string): any | null {
  if (!prismaClient) return null;
  const camel = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
  const pluralCamel = `${camel}s`;
  const snake = modelName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const snakePlural = `${snake}s`;
  const candidates = new Set<string>([
    modelName,
    camel,
    pluralCamel,
    snake,
    snakePlural,
    `${snake}_s`,
    `${camel}_s`,
    `${modelName}s`,
    `${modelName.toLowerCase()}s`,
  ]);

  for (const key of candidates) {
    const value = prismaClient[key];
    if (value) return value;
  }

  return null;
}

export type PersistedInvestmentRecord = {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  principal: number;
  lockedProfit: number;
  currentDay: number;
  startDate: string;
  endDate: string;
  weeklyTopUpDue: boolean;
  weeklyTopUpAmount: number;
  weeklyTopUpDueSince?: string;
  weeklyTopUpPaidAt?: string;
  weeklyTopUpApproved: boolean;
  topUpPenaltyActive: boolean;
  pendingMarginalFee: number;
  marginalFeeDueSince?: string;
  marginalFeePaidAt?: string;
  marginalFeeApproved: boolean;
  dailyHistory: unknown[];
};

function persistedInvestmentData(record: PersistedInvestmentRecord): Record<string, unknown> {
  return {
    userId: record.userId,
    planId: record.planId,
    planName: record.planName,
    status: record.status,
    principal: record.principal,
    lockedProfit: record.lockedProfit,
    currentDay: record.currentDay,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    weeklyTopUpDue: record.weeklyTopUpDue,
    weeklyTopUpAmount: record.weeklyTopUpAmount,
    weeklyTopUpDueSince: record.weeklyTopUpDueSince ? new Date(record.weeklyTopUpDueSince) : null,
    weeklyTopUpPaidAt: record.weeklyTopUpPaidAt ? new Date(record.weeklyTopUpPaidAt) : null,
    weeklyTopUpApproved: record.weeklyTopUpApproved,
    topUpPenaltyActive: record.topUpPenaltyActive,
    pendingMarginalFee: record.pendingMarginalFee,
    marginalFeeDueSince: record.marginalFeeDueSince ? new Date(record.marginalFeeDueSince) : null,
    marginalFeePaidAt: record.marginalFeePaidAt ? new Date(record.marginalFeePaidAt) : null,
    marginalFeeApproved: record.marginalFeeApproved,
    dailyHistory: record.dailyHistory,
  };
}

export async function persistInvestmentRecord(record: PersistedInvestmentRecord): Promise<boolean> {
  if (!isUuid(record.userId) || !isUuid(record.id)) return false;
  const delegate = getPrismaModelDelegate("InvestmentRecord");
  if (!delegate?.upsert) return false;
  try {
    await delegate.upsert({ where: { id: record.id }, create: { id: record.id, ...persistedInvestmentData(record) }, update: persistedInvestmentData(record) });
    return true;
  } catch (err) {
    logger.error({ err, investmentId: record.id, userId: record.userId }, "[db-persist] investment record persistence failed");
    return false;
  }
}

function getPrismaUserDelegate(): any | null {
  return getPrismaModelDelegate("User");
}

function getPrismaUserSessionDelegate(): any | null {
  return getPrismaModelDelegate("UserSession") ?? getPrismaModelDelegate("user_session") ?? getPrismaModelDelegate("user_sessions");
}

function deriveFirstLastName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildPrismaUserPayloadCandidates(userId: string, userData: {
  email: string;
  username: string;
  passwordHash: string;
  fullName: string;
  country: string;
  phone?: string | null;
}): Array<Record<string, unknown>> {
  const { firstName, lastName } = deriveFirstLastName(userData.fullName);
  const modernBase = {
    id: userId,
    email: userData.email,
    firstName,
    lastName,
    passwordHash: userData.passwordHash,
    securityType: "password",
    emailVerified: true,
    country: userData.country,
    phone: userData.phone ?? null,
  };

  const legacyBase = {
    id: userId,
    email: userData.email,
    username: userData.username,
    fullName: userData.fullName,
    passwordHash: userData.passwordHash,
    securityType: "password",
    emailVerified: true,
    country: userData.country,
    phone: userData.phone ?? null,
  };

  const snakeBase = {
    id: userId,
    email: userData.email,
    username: userData.username,
    password_hash: userData.passwordHash,
    security_type: "password",
    email_verified: true,
    full_name: userData.fullName,
    country: userData.country,
    phone: userData.phone ?? null,
  };

  return [
    { ...modernBase },
    { ...legacyBase },
    { ...snakeBase },
    { ...snakeBase, full_name: userData.fullName, password_hash: userData.passwordHash },
  ];
}

async function tryPrismaUserUpsert(userDelegate: any, userId: string, createData: Record<string, unknown>, updateData: Record<string, unknown>): Promise<void> {
  await retryAsync(async () => {
    await userDelegate.upsert({
      where: { id: userId },
      create: createData,
      update: updateData,
    });
  }, 3, 300);
}

export async function persistUser(userId: string, userData: {
  email: string;
  username: string;
  passwordHash: string;
  fullName: string;
  country: string;
  phone?: string | null;
}): Promise<boolean> {
  if (!isUuid(userId)) return false;

  const userDelegate = getPrismaUserDelegate();
  if (userDelegate) {
    const payloadCandidates = buildPrismaUserPayloadCandidates(userId, userData);
    let lastErr: unknown = null;
    for (const payload of payloadCandidates) {
      try {
        await tryPrismaUserUpsert(userDelegate, userId, payload, payload);
        return true;
      } catch (err) {
        lastErr = err;
      }
    }
    const errMessage = lastErr instanceof Error ? lastErr.message : String(lastErr);
    logger.error({ errMessage, err: lastErr, userId }, "[db-persist] persistUser failed using Prisma");
  }

  const db = getDb();
  if (db) {
    try {
      const rows = await db.insert(usersTable).values({
        id: userId,
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone ?? "",
        country: userData.country,
        passwordHash: userData.passwordHash,
        securityType: "password",
        emailVerified: true,
      }).onConflictDoNothing({ target: usersTable.email }).returning({ id: usersTable.id });
      return rows.length > 0;
    } catch (err) {
      logger.error({ err, userId }, "[db-persist] persistUser failed using Drizzle");
    }
  }

  logger.error({ userId }, "[db-persist] no durable user persistence backend is available");
  return false;
}

export async function persistResetPasswordToken(
  userId: string,
  token: string | null,
  expiresAt: Date | null,
): Promise<boolean> {
  if (!isUuid(userId)) return true;

  const userDelegate = getPrismaUserDelegate();
  if (!userDelegate) {
    logger.warn({ userId }, "[db-persist] Prisma user delegate unavailable for reset-token persistence; using in-memory fallback");
    return true;
  }
  try {
    const isSnakeCaseDelegate = prismaClient?.users === userDelegate;
    await userDelegate.update({
      where: { id: userId },
      data: isSnakeCaseDelegate
        ? { reset_password_token: token, reset_password_expiry: expiresAt }
        : { resetPasswordToken: token, resetPasswordExpiry: expiresAt },
    });
    return true;
  } catch (err) {
    logger.error({ err, userId }, "[db-persist] persistResetPasswordToken failed using Prisma");
    return false;
  }
}

/**
 * Persists a new session to the database.
 */
export async function persistSession(
  sessionId: string,
  userId: string,
  expiresAt: Date,
  isAdmin = false,
  _metadata?: { ip?: string; userAgent?: string; createdAt?: string },
): Promise<boolean> {
  if (!isUuid(userId)) return true;

  const prismaFallback = async (): Promise<boolean> => {
    const sessionDelegate = getPrismaUserSessionDelegate();
    if (!sessionDelegate) {
      logger.warn({ sessionId, userId }, "[db-persist] Prisma session delegate unavailable; trying Drizzle");
      const db = getDb();
      if (!db) return false;
      try {
        await db.insert(userSessionsTable).values({ id: sessionId, userId, expiresAt, isAdmin });
        return true;
      } catch (err) {
        logger.error({ err, sessionId, userId }, "[db-persist] persistSession failed using Drizzle");
        return false;
      }
    }
    const sessionPayloadCandidates = [
      { id: sessionId, token: sessionId, userId, user_id: userId, expiresAt, expires_at: expiresAt, isAdmin, is_admin: isAdmin },
      { id: sessionId, userId, expiresAt, isAdmin },
      { id: sessionId, user_id: userId, is_admin: isAdmin, expires_at: expiresAt },
      { token: sessionId, userId, expiresAt, isAdmin },
      { token: sessionId, user_id: userId, expires_at: expiresAt, is_admin: isAdmin },
      { id: sessionId, userId, expires_at: expiresAt, is_admin: isAdmin },
      { token: sessionId, userId: userId, expiresAt: expiresAt, isAdmin: isAdmin },
    ];
    let lastErr: unknown = null;

    try {
      for (const data of sessionPayloadCandidates) {
        try {
          await retryAsync(async () => {
            const call = sessionDelegate.create ?? sessionDelegate.upsert ?? sessionDelegate.insert ?? null;
            if (!call) throw new Error('No session create delegate available');
            await call({ data });
          }, 3, 300);
          return true;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr;
    } catch (err) {
      logger.warn({ err, sessionId, userId, isAdmin }, "[db-persist] persistSession failed using Prisma");
      return false;
    }
  };

  return prismaFallback();
}

/**
 * Delete a persisted session record (silent fail when DB unavailable).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  if (db) {
    try {
      await db.delete(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
    } catch (err) {
      logger.warn({ err, sessionId }, "[db-persist] deleteSession failed using Drizzle");
    }
  }

  if (prismaClient) {
    try {
      await prismaClient.userSession.delete({ where: { id: sessionId } });
    } catch {
      // ignore missing or other errors — deletion is best-effort
    }
  }
}

export async function getPersistedSession(sessionId: string): Promise<{
  id: string;
  userId: string;
  expiresAt: Date;
  isAdmin: boolean;
} | null> {
  const sessionDelegate = getPrismaUserSessionDelegate();
  if (sessionDelegate?.findUnique) {
    try {
      const row = await sessionDelegate.findUnique({ where: { id: sessionId } });
      if (row) {
        const userId = String(row.userId ?? row.user_id ?? "");
        const expiresAt = new Date(row.expiresAt ?? row.expires_at);
        if (userId && !Number.isNaN(expiresAt.getTime())) {
          return {
            id: String(row.id ?? sessionId),
            userId,
            expiresAt,
            isAdmin: Boolean(row.isAdmin ?? row.is_admin),
          };
        }
      }
    } catch (err) {
      logger.warn({ err, sessionId }, "[db-persist] getPersistedSession failed using Prisma");
    }
  }

  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
      isAdmin: row.isAdmin,
    };
  } catch (err) {
    logger.warn({ err, sessionId }, "[db-persist] getPersistedSession failed using Drizzle");
    return null;
  }
}

/**
 * List persisted sessions for a user. Returns an array of { id, userId, expiresAt, isAdmin }.
 */
export async function listSessionsForUser(userId: string): Promise<Array<{ id: string; userId: string; expiresAt: Date | null; isAdmin: boolean }>> {
  const out: Array<{ id: string; userId: string; expiresAt: Date | null; isAdmin: boolean }> = [];
  const db = getDb();
  if (db) {
    try {
      const rows: any[] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.userId, userId));
      for (const r of rows) {
        out.push({ id: String(r.id), userId: String(r.userId), expiresAt: r.expiresAt ? new Date(r.expiresAt) : null, isAdmin: Boolean(r.isAdmin) });
      }
      return out;
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] listSessionsForUser failed using Drizzle");
    }
  }

  if (prismaClient && prismaClient.userSession && prismaClient.userSession.findMany) {
    try {
      const rows = await prismaClient.userSession.findMany({ where: { userId } });
      for (const r of rows) {
        out.push({ id: String(r.id), userId: String(r.userId), expiresAt: r.expiresAt ?? null, isAdmin: Boolean(r.isAdmin) });
      }
      return out;
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] listSessionsForUser failed using Prisma");
    }
  }

  return out;
}

/**
 * Delete all persisted sessions for a user (best-effort).
 */
export async function deleteSessionsForUser(userId: string): Promise<void> {
  const db = getDb();
  if (db) {
    try {
      await db.delete(userSessionsTable).where(eq(userSessionsTable.userId, userId));
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] deleteSessionsForUser failed using Drizzle");
    }
  }

  if (prismaClient && prismaClient.userSession && prismaClient.userSession.deleteMany) {
    try {
      await prismaClient.userSession.deleteMany({ where: { userId } });
    } catch {
      // ignore
    }
  }
}

export async function persistAuditEvent(input: {
  id: string;
  actorId?: string;
  action: string;
  category: string;
  detail: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}): Promise<void> {
  try {
    const data = {
      id: isUuid(input.id) ? input.id : undefined,
      userId: input.actorId && isUuid(input.actorId) ? input.actorId : null,
      action: input.action,
      entity: input.category,
      entityId: input.id,
      metadata: { detail: input.detail, timestamp: input.timestamp, ...(input.metadata ?? {}) },
      createdAt: new Date(input.timestamp),
    };
    const delegate = getPrismaModelDelegate("AuditLog");
    if (delegate?.create) {
      await delegate.create({ data });
      return;
    }
    const db = getDb();
    if (!db) throw new Error("No durable audit database backend is available");
    const { auditLogsTable } = await import("@workspace/db/schema");
    await db.insert(auditLogsTable).values({
      id: isUuid(input.id) ? input.id : undefined,
      userId: data.userId,
      adminId: data.userId,
      action: input.action,
      detail: input.detail,
      payload: data.metadata,
    });
  } catch (err) {
    logger.error({ err, auditId: input.id }, "[db-persist] persistAuditEvent failed");
    throw err;
  }
}

export async function listPersistedAuditEvents(limit = 100): Promise<unknown[]> {
  const capped = Math.max(1, Math.min(limit, 500));
  const delegate = getPrismaModelDelegate("AuditLog");
  if (delegate?.findMany) {
    const rows = await delegate.findMany({ orderBy: { createdAt: "desc" }, take: capped });
    return rows;
  }
  const db = getDb();
  if (!db) return [];
  const { auditLogsTable } = await import("@workspace/db/schema");
  return db.select().from(auditLogsTable).limit(capped);
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (!isUuid(userId)) return true;

  const db = getDb();
  let deleted = false;
  if (db) {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, userId));
      deleted = true;
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] deleteUser failed using Drizzle");
    }
  }

  if (prismaClient) {
    const userDelegate = getPrismaUserDelegate();
    if (userDelegate?.delete) {
      try {
        await userDelegate.delete({ where: { id: userId } });
        deleted = true;
      } catch (err) {
        logger.warn({ err, userId }, "[db-persist] deleteUser failed using Prisma");
      }
    }
  }

  return deleted;
}

/**
 * Persists a wallet to the database.
 */
export async function persistWallet(walletId: string, userId: string, walletData: {
  walletType: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  label: string;
  address: string;
}): Promise<boolean> {
  if (!prismaClient || !isUuid(walletId) || !isUuid(userId)) return false;
  try {
    await prismaClient.wallets.upsert({
      where: { id: walletId },
      update: {
        balance: walletData.balance,
        pending_balance: walletData.pendingBalance,
        label: walletData.label,
        currency: walletData.currency,
        address: walletData.address,
      },
      create: {
        id: walletId,
        user_id: userId,
        type: walletData.walletType,
        label: walletData.label,
        balance: walletData.balance,
        pending_balance: walletData.pendingBalance,
        currency: walletData.currency,
        address: walletData.address,
      },
    });
    return true;
  } catch (err) {
    logger.warn({ err, walletId, userId }, "[db-persist] persistWallet failed");
    return false;
  }
}

export async function persistConnectedWallet(
  walletId: string,
  userId: string,
  walletData: {
    address: string;
    walletType: string;
    balance: number;
    currency: string;
    provider: string;
    label?: string | null;
    email?: string | null;
    syncedProfile: unknown | null;
  },
): Promise<void> {
  if (!prismaClient || !isUuid(walletId) || !isUuid(userId)) return;
  try {
    await prismaClient.connected_wallets.upsert({
      where: { id: walletId },
      update: {
        address: walletData.address,
        wallet_type: walletData.walletType,
        balance: walletData.balance,
        currency: walletData.currency,
        provider: walletData.provider,
        label: walletData.label ?? null,
        email: walletData.email ?? null,
        synced_profile: walletData.syncedProfile,
      },
      create: {
        id: walletId,
        user_id: userId,
        address: walletData.address,
        wallet_type: walletData.walletType,
        balance: walletData.balance,
        currency: walletData.currency,
        import_method: 'address',
        label: walletData.label ?? null,
        provider: walletData.provider,
        email: walletData.email ?? null,
        synced_profile: walletData.syncedProfile,
      },
    });
  } catch {
    // Silent fail
  }
}

/**
 * CRITICAL FIX FOR PHASE 1: Persist wallet balance to database after every balance-affecting operation.
 * This ensures that wallet balances survive server restarts.
 * Previously, balance changes were only kept in memory and lost on redeploy.
 */
export async function persistWalletBalance(
  walletId: string,
  balance: number,
  pendingBalance: number = 0,
): Promise<boolean> {
  if (!prismaClient || !isUuid(walletId)) return false;
  try {
    await prismaClient.wallets.update({
      where: { id: walletId },
      data: {
        balance,
        pending_balance: pendingBalance,
      },
    });
    return true;
  } catch (err) {
    logger.warn({ err, walletId, balance }, '[db-persist] persistWalletBalance failed; balance may be lost on redeploy');
    return false;
  }
}

/**
 * Persists a transaction to the database.
 */
export async function persistTransaction(
  transactionId: string,
  walletId: string,
  userId: string,
  transactionData: {
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    isDemo?: boolean;
  },
): Promise<boolean> {
  if (!prismaClient || !isUuid(transactionId) || !isUuid(walletId) || !isUuid(userId)) return false;
  try {
    const columnCacheKey = 'transactions.is_demo';
    if (!hasColumnCache.has(columnCacheKey)) {
      try {
        const rows: any = await prismaClient.$queryRaw`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'transactions' AND column_name = 'is_demo'
        `;
        hasColumnCache.set(columnCacheKey, Array.isArray(rows) && rows.length > 0);
      } catch (_err) {
        void _err;
        hasColumnCache.set(columnCacheKey, false);
      }
    }

    const includeIsDemo = hasColumnCache.get(columnCacheKey) === true;

    const updateObj: any = {
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status,
      description: transactionData.description,
    };
    const createObj: any = {
      id: transactionId,
      wallet_id: walletId,
      user_id: userId,
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status,
      description: transactionData.description,
    };

    if (includeIsDemo) {
      updateObj.is_demo = transactionData.isDemo ?? false;
      createObj.is_demo = transactionData.isDemo ?? false;
    }

    await prismaClient.transactions.upsert({
      where: { id: transactionId },
      update: updateObj,
      create: createObj,
    });
    return true;
  } catch (err) {
    logger.warn({ err, transactionId }, '[db-persist] persistTransaction failed; continuing without DB persistence');
    return false;
  }
}

export async function persistDemoTrade(userId: string, trade: {
  id: string;
  pair: string;
  type: "long" | "short";
  status: "active" | "completed" | "cancelled";
  entryPrice: number;
  currentPrice: number;
  targetPrice?: number | null;
  amount: number;
  currency: string;
  profit: number;
  expectedProfit?: number;
  managerId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(trade.id)) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await db.insert(tradesTable).values({
      id: trade.id,
      userId,
      pair: trade.pair,
      type: trade.type,
      status: trade.status,
      entryPrice: String(trade.entryPrice),
      currentPrice: String(trade.currentPrice),
      targetPrice: String(trade.targetPrice ?? trade.entryPrice),
      amount: String(trade.amount),
      currency: trade.currency,
      profit: String(trade.profit),
      expectedProfit: String(trade.expectedProfit ?? 0),
      managerId: trade.managerId ?? null,
      createdAt: new Date(trade.createdAt),
      completedAt: trade.completedAt ? new Date(trade.completedAt) : null,
    }).onConflictDoUpdate({
      target: tradesTable.id,
      set: {
        status: trade.status,
        currentPrice: String(trade.currentPrice),
        profit: String(trade.profit),
        completedAt: trade.completedAt ? new Date(trade.completedAt) : null,
      },
    });
    return true;
  } catch (err) {
    logger.warn({ err, tradeId: trade.id, userId }, "[db-persist] persistDemoTrade failed");
    return false;
  }
}

export async function deletePersistedDemoTrades(userId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await db.delete(tradesTable).where(eq(tradesTable.userId, userId));
    return true;
  } catch (err) {
    logger.warn({ err, userId }, "[db-persist] deletePersistedDemoTrades failed");
    return false;
  }
}

/**
 * Persists a KYC record to the database.
 */
export async function persistKyc(kycId: string, userId: string, kycData: {
  documentType: string;
  status: string;
  fileUrl?: string;
}): Promise<void> {
  if (!prismaClient || !isUuid(kycId) || !isUuid(userId)) return;
  try {
    const legacyDelegate = prismaClient.kyc_documents;
    if (legacyDelegate?.upsert) {
      await legacyDelegate.upsert({
        where: { id: kycId },
        update: { status: kycData.status, doc_url: kycData.fileUrl ?? "" },
        create: { id: kycId, user_id: userId, doc_type: kycData.documentType, doc_url: kycData.fileUrl ?? "", status: kycData.status },
      });
      return;
    }
    const delegate = getPrismaModelDelegate("KYCDocument");
    if (!delegate) return;
    const status = kycData.status === "approved" ? "APPROVED" : kycData.status === "rejected" ? "REJECTED" : kycData.status === "in_review" ? "UNDER_REVIEW" : "PENDING";
    const type = kycData.documentType.toUpperCase();
    await delegate.upsert({
      where: { id: kycId },
      update: {
        status,
        fileUrl: kycData.fileUrl ?? "",
      },
      create: {
        id: kycId,
        userId,
        type,
        fileUrl: kycData.fileUrl ?? "",
        status,
      },
    });
  } catch (err) {
    logger.warn({ err, kycId, userId }, "[db-persist] persistKyc failed");
  }
}

export async function persistKycStatus(userId: string, status: string, reviewedBy?: string, rejectionReason?: string | null): Promise<void> {
  if (!prismaClient || !isUuid(userId)) return;
  try {
    const normalizedStatus = status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : status === "in_review" ? "UNDER_REVIEW" : "PENDING";
    const delegate = getPrismaModelDelegate("KYCDocument");
    const legacyDelegate = prismaClient.kyc_documents;
    if (legacyDelegate?.findFirst) {
      const latest = await legacyDelegate.findFirst({ where: { user_id: userId }, orderBy: { created_at: "desc" } });
      if (latest) await legacyDelegate.update({ where: { id: latest.id }, data: { status, reviewed_at: new Date(), reviewed_by: reviewedBy ?? null } });
    }
    if (delegate) {
      const latest = await delegate.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (latest) await delegate.update({ where: { id: latest.id }, data: { status: normalizedStatus, reviewedAt: new Date(), reviewedBy: reviewedBy ?? null } });
    }
    const userDelegate = getPrismaModelDelegate("User");
    await userDelegate?.update({ where: { id: userId }, data: { kycStatus: status, kycVerified: status === "approved" } });
    void rejectionReason;
  } catch (err) {
    logger.warn({ err, userId, status }, "[db-persist] persistKycStatus failed");
  }
}

export async function persistKycVerification(input: { id: string; userId: string; provider: string; providerRef?: string; status: string; rejectionReason?: string }): Promise<void> {
  if (!prismaClient || !isUuid(input.userId)) return;
  try {
    const delegate = getPrismaModelDelegate("KYCVerification");
    await delegate?.upsert({ where: { id: input.id }, update: { provider: input.provider, providerRef: input.providerRef ?? null, status: input.status, rejectionReason: input.rejectionReason ?? null }, create: { id: input.id, userId: input.userId, provider: input.provider, providerRef: input.providerRef ?? null, status: input.status, rejectionReason: input.rejectionReason ?? null } });
  } catch (err) {
    logger.warn({ err, userId: input.userId, verificationId: input.id }, "[db-persist] persistKycVerification failed");
  }
}

export async function persistAmlScreening(input: {
  id: string;
  userId: string;
  provider: string;
  status: string;
  riskLevel?: string;
  matchCount?: number;
  matches?: Array<{ listType: string; matchScore: number; entity: string }>;
}): Promise<void> {
  if (!prismaClient || !isUuid(input.userId)) return;

  try {
    const delegate =
      getPrismaModelDelegate("AMLScreening") ??
      getPrismaModelDelegate("AmlScreening") ??
      getPrismaModelDelegate("aml_screening") ??
      getPrismaModelDelegate("aml_screenings");

    if (delegate?.upsert) {
      await delegate.upsert({
        where: { id: input.id },
        update: {
          provider: input.provider,
          status: input.status,
          riskLevel: input.riskLevel ?? "low",
          matchCount: input.matchCount ?? 0,
          matches: input.matches ?? [],
        },
        create: {
          id: input.id,
          userId: input.userId,
          provider: input.provider,
          status: input.status,
          riskLevel: input.riskLevel ?? "low",
          matchCount: input.matchCount ?? 0,
          matches: input.matches ?? [],
        },
      });
      return;
    }

    if (typeof prismaClient.$queryRaw === "function") {
      const tableCheck = await prismaClient.$queryRaw`SELECT to_regclass('public.aml_screenings') AS table_name` as Array<{ table_name: string | null }>;
      if (!tableCheck.length || !tableCheck[0]?.table_name) return;

      await prismaClient.$queryRaw`
        INSERT INTO aml_screenings (id, user_id, provider, status, risk_level, match_count, matches, created_at, updated_at)
        VALUES (${input.id}, ${input.userId}, ${input.provider}, ${input.status}, ${input.riskLevel ?? "low"}, ${input.matchCount ?? 0}, ${JSON.stringify(input.matches ?? [])}::jsonb, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          status = EXCLUDED.status,
          risk_level = EXCLUDED.risk_level,
          match_count = EXCLUDED.match_count,
          matches = EXCLUDED.matches,
          updated_at = NOW()
      `;
    }
  } catch (err) {
    logger.warn({ err, userId: input.userId, screeningId: input.id }, "[db-persist] persistAmlScreening failed");
  }
}

function persistedKycVerificationToResult(row: any): {
  verificationId: string;
  status: string;
  userId: string;
  provider: string;
  createdAt: Date;
  errorMessage?: string;
} {
  return {
    verificationId: String(row.providerRef ?? row.provider_ref ?? row.id),
    status: String(row.status ?? "pending"),
    userId: String(row.userId ?? row.user_id),
    provider: String(row.provider ?? "unconfigured"),
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
    errorMessage: row.rejectionReason ?? row.rejection_reason ?? undefined,
  };
}

export async function getPersistedKycVerification(verificationId: string): Promise<ReturnType<typeof persistedKycVerificationToResult> | null> {
  const delegate = getPrismaModelDelegate("KYCVerification");
  if (!delegate?.findFirst) return null;
  try {
    const row = await delegate.findFirst({ where: { providerRef: verificationId } });
    return row ? persistedKycVerificationToResult(row) : null;
  } catch (err) {
    logger.warn({ err, verificationId }, "[db-persist] getPersistedKycVerification failed");
    return null;
  }
}

export async function getLatestPersistedKycVerification(userId: string): Promise<ReturnType<typeof persistedKycVerificationToResult> | null> {
  const delegate = getPrismaModelDelegate("KYCVerification");
  if (!delegate?.findMany) return null;
  try {
    const rows = await delegate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows[0] ? persistedKycVerificationToResult(rows[0]) : null;
  } catch (err) {
    logger.warn({ err, userId }, "[db-persist] getLatestPersistedKycVerification failed");
    return null;
  }
}

function persistedAmlScreeningToResult(row: any): {
  screeningId: string;
  userId: string;
  provider: string;
  status: string;
  riskLevel: string;
  matches: Array<{ listType: string; matchScore: number; entity: string }>;
  createdAt: Date;
} {
  let matches = row.matches ?? [];
  if (typeof matches === "string") {
    try { matches = JSON.parse(matches); } catch { matches = []; }
  }
  return {
    screeningId: String(row.screeningId ?? row.screening_id ?? row.id),
    userId: String(row.userId ?? row.user_id),
    provider: String(row.provider ?? "mock"),
    status: String(row.status ?? "review_required"),
    riskLevel: String(row.riskLevel ?? row.risk_level ?? "high"),
    matches: Array.isArray(matches) ? matches : [],
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
  };
}

function getAmlDelegate(): any | null {
  return getPrismaModelDelegate("AMLScreening") ?? getPrismaModelDelegate("AmlScreening") ?? getPrismaModelDelegate("aml_screening") ?? getPrismaModelDelegate("aml_screenings");
}

export async function getPersistedAmlScreening(screeningId: string): Promise<ReturnType<typeof persistedAmlScreeningToResult> | null> {
  const delegate = getAmlDelegate();
  if (!delegate?.findFirst) return null;
  try {
    const row = await delegate.findFirst({ where: { id: screeningId } });
    return row ? persistedAmlScreeningToResult(row) : null;
  } catch (err) {
    logger.warn({ err, screeningId }, "[db-persist] getPersistedAmlScreening failed");
    return null;
  }
}

export async function getLatestPersistedAmlScreening(userId: string): Promise<ReturnType<typeof persistedAmlScreeningToResult> | null> {
  const delegate = getAmlDelegate();
  if (!delegate?.findMany) return null;
  try {
    const rows = await delegate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows[0] ? persistedAmlScreeningToResult(rows[0]) : null;
  } catch (err) {
    logger.warn({ err, userId }, "[db-persist] getLatestPersistedAmlScreening failed");
    return null;
  }
}

export async function persistBankAccount(
  bankAccountId: string,
  userId: string,
  bankData: {
    accountName: string;
    bankName: string;
    accountNumber?: string | null;
    routingNumber?: string | null;
    iban?: string | null;
    swiftCode?: string | null;
    debitCardLast4?: string | null;
    debitCardExpiry?: string | null;
    country: string;
    currency: string;
    isDefault: boolean;
    fiatBalance: number;
    fiatCurrency: string;
  },
): Promise<void> {
  if (!prismaClient || !isUuid(bankAccountId) || !isUuid(userId)) return;
  try {
    const updateData: Record<string, unknown> = {
      account_name: bankData.accountName,
      bank_name: bankData.bankName,
      country: bankData.country,
      currency: bankData.currency,
      is_default: bankData.isDefault,
      fiat_balance: bankData.fiatBalance,
      fiat_currency: bankData.fiatCurrency,
    };

    if (bankData.accountNumber !== undefined) {
      updateData.account_number = bankData.accountNumber;
    }
    if (bankData.routingNumber !== undefined) {
      updateData.routing_number = bankData.routingNumber ?? "";
    }
    if (bankData.iban !== undefined) {
      updateData.iban = bankData.iban ?? null;
    }
    if (bankData.swiftCode !== undefined) {
      updateData.swift_code = bankData.swiftCode ?? null;
    }
    if (bankData.debitCardLast4 !== undefined) {
      updateData.debit_card_last4 = bankData.debitCardLast4 ?? "";
    }
    if (bankData.debitCardExpiry !== undefined) {
      updateData.debit_card_expiry = bankData.debitCardExpiry ?? "";
    }

    await prismaClient.bank_accounts.upsert({
      where: { id: bankAccountId },
      update: updateData,
      create: {
        id: bankAccountId,
        user_id: userId,
        account_name: bankData.accountName,
        bank_name: bankData.bankName,
        account_number: bankData.accountNumber ?? "",
        routing_number: bankData.routingNumber ?? "",
        iban: bankData.iban ?? null,
        swift_code: bankData.swiftCode ?? null,
        debit_card_last4: bankData.debitCardLast4 ?? "",
        debit_card_expiry: bankData.debitCardExpiry ?? "",
        country: bankData.country,
        currency: bankData.currency,
        is_default: bankData.isDefault,
        fiat_balance: bankData.fiatBalance,
        fiat_currency: bankData.fiatCurrency,
      },
    });
  } catch {
    // Silent fail
  }
}

export async function deleteBankAccount(bankAccountId: string): Promise<void> {
  if (!prismaClient || !isUuid(bankAccountId)) return;
  try {
    await prismaClient.bank_accounts.delete({
      where: { id: bankAccountId },
    });
  } catch {
    // Silent fail
  }
}

export async function persistNotification(
  notificationId: string,
  userId: string,
  notificationData: {
    type: string;
    title: string;
    message: string;
    read: boolean;
    link?: string | null;
    createdAt: string;
  },
): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.notifications.upsert({
      where: { id: notificationId },
      update: {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        read: notificationData.read,
        link: notificationData.link ?? null,
        created_at: new Date(notificationData.createdAt),
      },
      create: {
        id: notificationId,
        user_id: userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        read: notificationData.read,
        link: notificationData.link ?? null,
        created_at: new Date(notificationData.createdAt),
      },
    });
  } catch {
    // Silent fail
  }
}

export async function persistSupportTicket(
  ticketId: string,
  userId: string,
  ticketData: {
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<boolean> {
  if (!prismaClient || !isUuid(ticketId) || !isUuid(userId)) {
    logger.warn({ ticketId, userId, hasPrisma: Boolean(prismaClient) }, "[db-persist] support ticket persistence skipped because backend storage is unavailable; continuing in memory");
    return true;
  }
  try {
    await prismaClient.support_tickets.upsert({
      where: { id: ticketId },
      update: {
        status: ticketData.status,
        priority: ticketData.priority,
        updated_at: new Date(ticketData.updatedAt),
      },
      create: {
        id: ticketId,
        user_id: userId,
        subject: ticketData.subject,
        status: ticketData.status,
        priority: ticketData.priority,
        created_at: new Date(ticketData.createdAt),
        updated_at: new Date(ticketData.updatedAt),
      },
    });
    return true;
  } catch (err) {
    logger.error({ err, ticketId, userId }, "[db-persist] support ticket persistence failed");
    return false;
  }
}

/**
 * Persist a chat message and ensure the conversation exists.
 */
export async function persistChatMessage(
  conversationId: string,
  senderType: 'user' | 'admin' | 'bot',
  senderId: string | null,
  content: string,
): Promise<boolean> {
  if (!prismaClient || !isUuid(conversationId)) {
    logger.warn({ conversationId, senderType, hasPrisma: Boolean(prismaClient) }, "[db-persist] chat persistence skipped because storage backend is unavailable; continuing in memory");
    return true;
  }
  try {
    // Ensure conversation exists (user_id stored as the owner)
    await prismaClient.conversations.upsert({
      where: { id: conversationId },
      update: { updated_at: new Date(), last_message_at: new Date() },
      create: { id: conversationId, user_id: senderId ?? conversationId, subject: null, last_message_at: new Date() },
    });

    await prismaClient.chat_messages.create({
      data: {
        id: undefined, // let DB generate
        conversation_id: conversationId,
        sender_type: senderType === 'admin' ? 'admin' : senderType === 'bot' ? 'bot' : 'user',
        sender_id: senderId ?? null,
        content,
        delivery_status: "delivered",
      },
    });
    return true;
  } catch (err) {
    logger.error({ err, conversationId }, "[db-persist] persistChatMessage failed");
    return false;
  }
}

export async function updatePersistedChatAssignment(
  conversationId: string,
  assignedTo: string | null,
): Promise<boolean> {
  if (!prismaClient || !isUuid(conversationId) || (assignedTo !== null && !isUuid(assignedTo))) return false;
  try {
    await prismaClient.conversations.update({
      where: { id: conversationId },
      data: {
        assigned_to: assignedTo,
        claimed_at: assignedTo ? new Date() : null,
        status: assignedTo ? "claimed" : "open",
      },
    });
    return true;
  } catch (err) {
    logger.error({ err, conversationId, assignedTo }, "[db-persist] chat assignment update failed");
    return false;
  }
}

export async function getPersistedChatAssignment(conversationId: string): Promise<{
  status: string;
  assignedTo: string | null;
  claimedAt: string | null;
} | null> {
  if (!prismaClient || !isUuid(conversationId)) return null;
  try {
    const row = await prismaClient.conversations.findUnique({ where: { id: conversationId } });
    if (!row) return null;
    return {
      status: String(row.status ?? "open"),
      assignedTo: row.assigned_to ? String(row.assigned_to) : null,
      claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null,
    };
  } catch (err) {
    logger.error({ err, conversationId }, "[db-persist] chat assignment lookup failed");
    return null;
  }
}

export async function getPersistedChatMessages(conversationId: string): Promise<Array<{
  id: string;
  userId: string;
  senderName: string;
  content: string;
  isFromUser: boolean;
  isBot: boolean;
  escalated: boolean;
  deliveryStatus?: "sent" | "delivered";
  createdAt: string;
}>> {
  if (!prismaClient || !isUuid(conversationId)) return [];
  try {
    const rows = await prismaClient.chat_messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: "asc" },
    });
    return rows.map((row: any) => ({
      id: String(row.id),
      userId: conversationId,
      senderName: row.sender_type === "bot" ? "XpressPro FX AI Support" : row.sender_type === "admin" ? "XpressPro FX Support" : "User",
      content: String(row.content),
      isFromUser: row.sender_type === "user",
      isBot: row.sender_type === "bot",
      escalated: false,
      deliveryStatus: String(row.delivery_status ?? "delivered") as "sent" | "delivered",
      createdAt: new Date(row.created_at ?? Date.now()).toISOString(),
    }));
  } catch (err) {
    logger.error({ err, conversationId }, "[db-persist] getPersistedChatMessages failed");
    return [];
  }
}

export async function listPersistedChatConversations(): Promise<Array<{
  userId: string;
  messages: Array<{
    id: string;
    userId: string;
    senderName: string;
    content: string;
    isFromUser: boolean;
    isBot: boolean;
    escalated: boolean;
    deliveryStatus?: "sent" | "delivered";
    createdAt: string;
  }>;
}>> {
  if (!prismaClient?.chat_messages?.findMany) return [];
  try {
    const rows = await prismaClient.chat_messages.findMany({ orderBy: { created_at: "asc" } });
    const conversations = new Map<string, Awaited<ReturnType<typeof getPersistedChatMessages>>>();
    for (const row of rows as any[]) {
      const userId = String(row.conversation_id ?? "");
      if (!isUuid(userId)) continue;
      const messages = conversations.get(userId) ?? [];
      messages.push({
        id: String(row.id),
        userId,
        senderName: row.sender_type === "bot" ? "XpressPro FX AI Support" : row.sender_type === "admin" ? "XpressPro FX Support" : "User",
        content: String(row.content),
        isFromUser: row.sender_type === "user",
        isBot: row.sender_type === "bot",
        escalated: false,
        deliveryStatus: String(row.delivery_status ?? "delivered") as "sent" | "delivered",
        createdAt: new Date(row.created_at ?? Date.now()).toISOString(),
      });
      conversations.set(userId, messages);
    }
    return [...conversations].map(([userId, messages]) => ({ userId, messages }));
  } catch (err) {
    logger.error({ err }, "[db-persist] listPersistedChatConversations failed");
    return [];
  }
}

export async function findUserIdByLiveChatTicket(ticketId: string): Promise<string | null> {
  if (!prismaClient?.support_tickets?.findFirst) return null;
  try {
    const ticket = await prismaClient.support_tickets.findFirst({
      where: { subject: { contains: `Live chat escalation ${ticketId}` } },
      select: { user_id: true },
    });
    return ticket?.user_id && isUuid(String(ticket.user_id)) ? String(ticket.user_id) : null;
  } catch (err) {
    logger.error({ err, ticketId }, "[db-persist] findUserIdByLiveChatTicket failed");
    return null;
  }
}

export async function persistP2PMerchantApplication(
  applicationId: string,
  userId: string,
  applicationData: {
    status: string;
    displayName: string;
    legalName: string;
    contactEmail: string;
    country: string;
    paymentMethod: string;
    payoutEmail?: string | null;
    bankInfo?: string | null;
    assets: string;
    reason: string;
    rejectionReason?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    submittedAt: string;
  },
): Promise<void> {
  if (!prismaClient || !isUuid(applicationId) || !isUuid(userId)) return;
  try {
    await prismaClient.p2p_merchant_applications.upsert({
      where: { id: applicationId },
      update: {
        status: applicationData.status,
        display_name: applicationData.displayName,
        legal_name: applicationData.legalName,
        contact_email: applicationData.contactEmail,
        country: applicationData.country,
        payment_method: applicationData.paymentMethod,
        payout_email: applicationData.payoutEmail ?? null,
        bank_info: applicationData.bankInfo ?? null,
        assets: applicationData.assets,
        reason: applicationData.reason,
        rejection_reason: applicationData.rejectionReason ?? null,
        reviewed_by: applicationData.reviewedBy ?? null,
        reviewed_at: applicationData.reviewedAt ? new Date(applicationData.reviewedAt) : null,
      },
      create: {
        id: applicationId,
        user_id: userId,
        status: applicationData.status,
        display_name: applicationData.displayName,
        legal_name: applicationData.legalName,
        contact_email: applicationData.contactEmail,
        country: applicationData.country,
        payment_method: applicationData.paymentMethod,
        payout_email: applicationData.payoutEmail ?? null,
        bank_info: applicationData.bankInfo ?? null,
        assets: applicationData.assets,
        reason: applicationData.reason,
        rejection_reason: applicationData.rejectionReason ?? null,
        reviewed_by: applicationData.reviewedBy ?? null,
        reviewed_at: applicationData.reviewedAt ? new Date(applicationData.reviewedAt) : null,
        submitted_at: new Date(applicationData.submittedAt),
      },
    });
  } catch {
    // Silent fail
  }
}

export async function persistP2PNotification(
  notificationId: string,
  userId: string,
  notificationData: {
    type: string;
    title: string;
    message: string;
    orderId?: string | null;
    read: boolean;
    amount?: number | null;
    currency?: string | null;
    asset?: string | null;
    reference?: string | null;
    instructions?: string | null;
    createdAt: string;
  },
): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.p2p_notifications.upsert({
      where: { id: notificationId },
      update: {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        order_id: notificationData.orderId ?? null,
        read: notificationData.read,
        amount: notificationData.amount ?? null,
        currency: notificationData.currency ?? null,
        asset: notificationData.asset ?? null,
        reference: notificationData.reference ?? null,
        instructions: notificationData.instructions ?? null,
        created_at: new Date(notificationData.createdAt),
      },
      create: {
        id: notificationId,
        user_id: userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        order_id: notificationData.orderId ?? null,
        read: notificationData.read,
        amount: notificationData.amount ?? null,
        currency: notificationData.currency ?? null,
        asset: notificationData.asset ?? null,
        reference: notificationData.reference ?? null,
        instructions: notificationData.instructions ?? null,
        created_at: new Date(notificationData.createdAt),
      },
    });
  } catch {
    // Silent fail
  }
}
