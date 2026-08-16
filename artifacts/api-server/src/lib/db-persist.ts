/**
 * Database persistence layer that bridges the in-memory store to Prisma.
 * Uses any type to avoid Prisma schema mismatch errors.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db-client";
import { userSessionsTable, usersTable } from "@workspace/db/schema";
import { logger } from "./logger";

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

export function getPrismaModelDelegate(modelName: string): any | null {
  if (!prismaClient) return null;
  const singular = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
  const plural = `${singular}s`;
  return prismaClient[singular] ?? prismaClient[plural] ?? null;
}

function getPrismaUserDelegate(): any | null {
  return getPrismaModelDelegate("User");
}

function getPrismaUserSessionDelegate(): any | null {
  return getPrismaModelDelegate("UserSession");
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
  const base = {
    id: userId,
    email: userData.email,
    username: userData.username,
    password_hash: userData.passwordHash,
    full_name: userData.fullName,
    country: userData.country,
    phone: userData.phone ?? "",
  };

  return [
    { ...base },
    { ...base, full_name: userData.fullName, password_hash: userData.passwordHash },
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
  if (!isUuid(userId)) return true;

  const prismaFallback = async (): Promise<boolean> => {
    const userDelegate = getPrismaUserDelegate();
    if (!userDelegate) return true;

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
    logger.warn({ errMessage, err: lastErr, userId }, "[db-persist] persistUser failed using Prisma");
    return false;
  };

  const db = getDb();
  if (db) {
    try {
      const existingById = await retryAsync(async () => db.select().from(usersTable).where(eq(usersTable.id, userId)), 3, 200);
      if (existingById.length > 0) {
        await retryAsync(async () => db.update(usersTable)
          .set({
            email: userData.email,
            username: userData.username,
            fullName: userData.fullName,
            passwordHash: userData.passwordHash,
            country: userData.country,
            phone: userData.phone ?? "",
          })
          .where(eq(usersTable.id, userId)), 3, 200);
        return true;
      }

      // Try insert with explicit id first. Some deployments may use integer
      // serial primary keys (non-UUID). If inserting with a UUID id fails,
      // fall back to inserting without id and rely on email uniqueness.
      try {
        await retryAsync(async () => db.insert(usersTable).values({
          id: userId,
          email: userData.email,
          username: userData.username,
          fullName: userData.fullName,
          passwordHash: userData.passwordHash,
          country: userData.country,
          phone: userData.phone ?? "",
        }), 3, 200);
        return true;
      } catch (err) {
        // If insertion with explicit id fails (e.g. DB expects numeric id),
        // try finding by email and either update or insert without id.
        logger.warn({ err, userId }, '[db-persist] insert with explicit id failed, falling back to email-based upsert');
        const existingByEmail = await retryAsync(async () => db.select().from(usersTable).where(eq(usersTable.email, userData.email)), 3, 200);
        if (existingByEmail.length > 0) {
          await retryAsync(async () => db.update(usersTable)
            .set({
              username: userData.username,
              fullName: userData.fullName,
              passwordHash: userData.passwordHash,
              country: userData.country,
              phone: userData.phone ?? "",
            })
            .where(eq(usersTable.email, userData.email)), 3, 200);
          return true;
        }

        // Insert without id
        await retryAsync(async () => db.insert(usersTable).values({
          email: userData.email,
          username: userData.username,
          fullName: userData.fullName,
          passwordHash: userData.passwordHash,
          country: userData.country,
          phone: userData.phone ?? "",
        }), 3, 200);
        return true;
      }
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] persistUser failed using Drizzle");
      return await prismaFallback();
    }
  }

  return prismaFallback();
}

export async function persistResetPasswordToken(
  userId: string,
  token: string | null,
  expiresAt: Date | null,
): Promise<boolean> {
  if (!isUuid(userId)) return true;

  const db = getDb();
  if (db) {
    try {
      await db.update(usersTable)
        .set({
          resetPasswordToken: token,
          resetPasswordExpiry: expiresAt,
        })
        .where(eq(usersTable.id, userId));
      return true;
    } catch (err) {
      logger.warn({ err, userId }, "[db-persist] persistResetPasswordToken failed using Drizzle");
      return false;
    }
  }

  const userDelegate = getPrismaUserDelegate();
  if (!userDelegate) return true;
  try {
    await userDelegate.update({
      where: { id: userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry: expiresAt,
      },
    });
    return true;
  } catch {
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
    if (!sessionDelegate) return true;
    const sessionPayloadCandidates = [
      {
        id: sessionId,
        user_id: userId,
        is_admin: isAdmin,
        expires_at: expiresAt,
      },
      {
        id: sessionId,
        userId,
        expiresAt,
        isAdmin,
      },
    ];
    let lastErr: unknown = null;

    try {
      for (const data of sessionPayloadCandidates) {
        try {
          await retryAsync(async () => {
            await sessionDelegate.create({ data });
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

  const db = getDb();
  if (db) {
    try {
      await retryAsync(async () => db.insert(userSessionsTable).values({
        id: sessionId,
        userId,
        isAdmin,
        expiresAt,
      }), 3, 200);
      return true;
    } catch (err) {
      logger.warn({ err, sessionId, userId, isAdmin }, "[db-persist] persistSession failed using Drizzle");
      return await prismaFallback();
    }
  }

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
}): Promise<void> {
  if (!prismaClient || !isUuid(walletId) || !isUuid(userId)) return;
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
  } catch {
    // Silent fail
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
): Promise<void> {
  if (!prismaClient || !isUuid(transactionId) || !isUuid(walletId) || !isUuid(userId)) return;
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
  } catch (err) {
    logger.warn({ err, transactionId }, '[db-persist] persistTransaction failed; continuing without DB persistence');
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
    await prismaClient.kyc_documents.upsert({
      where: { id: kycId },
      update: {
        status: kycData.status,
        doc_url: kycData.fileUrl ?? "",
      },
      create: {
        id: kycId,
        user_id: userId,
        doc_type: kycData.documentType,
        doc_url: kycData.fileUrl ?? "",
        status: kycData.status,
      },
    });
  } catch {
    // Silent fail
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
): Promise<void> {
  if (!prismaClient || !isUuid(ticketId) || !isUuid(userId)) return;
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
  } catch {
    // Silent fail
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
): Promise<void> {
  if (!prismaClient || !isUuid(conversationId)) return;
  try {
    // Ensure conversation exists (user_id stored as the owner)
    await prismaClient.conversations.upsert({
      where: { id: conversationId },
      update: { updated_at: new Date() },
      create: { id: conversationId, user_id: senderId ?? conversationId, subject: null },
    });

    await prismaClient.chat_messages.create({
      data: {
        id: undefined, // let DB generate
        conversation_id: conversationId,
        sender_type: senderType === 'admin' ? 'admin' : senderType === 'bot' ? 'bot' : 'user',
        sender_id: senderId ?? null,
        content,
      },
    });
  } catch {
    // silent
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
