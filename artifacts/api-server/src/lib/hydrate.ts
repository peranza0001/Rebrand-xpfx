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
import {
  bankAccountsTable,
  connectedWalletsTable,
  p2pMerchantApplicationsTable,
  p2pNotificationsTable,
  supportTicketsTable,
  transactionsTable,
  usersTable,
  userSessionsTable,
  walletsTable,
} from "@workspace/db/schema";
import { dbGet } from "./db-client";
import { getPrismaClient } from "./db-persist";
import {
  freshUserData,
  referralCodeIndex,
  referrals,
  sessions,
  userData,
  users,
  usersByEmail,
  p2pMerchantApplications,
  type Role,
  type StoredUser,
} from "./store";
import type { WalletType } from "@workspace/api-zod";
import type { TransactionType } from "@workspace/api-zod";
import type { ConnectedWalletProvider } from "@workspace/api-zod";
import { logger } from "./logger";

function getHydratedRowValue<T>(row: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      if (value !== undefined) {
        return value as T;
      }
    }
  }
  return undefined;
}

function coerceString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function coerceDate(value: unknown): string {
  if (typeof value === "string" || value instanceof Date) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

async function loadRowsFromDb<T>(
  label: string,
  loadDrizzle: (db: any) => Promise<T[]>,
  loadPrisma: () => Promise<T[]>,
): Promise<T[]> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const prismaRows = await loadPrisma();
      if (prismaRows.length > 0) {
        return prismaRows;
      }
    } catch (err) {
      logger.warn({ label, err }, "[hydrate] Prisma load failed; trying compatibility reader");
    }
  }

  return dbGet(label, (db) => loadDrizzle(db), [] as T[]);
}

export function buildStoredUserFromHydratedRow(row: Record<string, unknown>, existingEmails: Map<string, string>): StoredUser | null {
  const id = getHydratedRowValue<string>(row, "id");
  const email = getHydratedRowValue<string>(row, "email");
  if (!id || !email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (existingEmails.has(normalizedEmail)) {
    return null;
  }

  const stored: StoredUser = {
    user: {
      id,
      username: getHydratedRowValue<string>(row, "username") ?? "",
      email: normalizedEmail,
      fullName: getHydratedRowValue<string>(row, "fullName", "full_name") ?? "",
      country: getHydratedRowValue<string>(row, "country") ?? "US",
      kycVerified: Boolean(getHydratedRowValue<boolean>(row, "kycVerified", "kyc_verified")),
      avatarUrl: getHydratedRowValue<string>(row, "avatarUrl", "avatar_url") ?? undefined,
      createdAt: new Date(getHydratedRowValue<string | Date>(row, "createdAt", "created_at") ?? new Date()).toISOString(),
      selectedManagerId: getHydratedRowValue<string>(row, "selectedManagerId", "selected_manager_id") ?? null,
      phone: getHydratedRowValue<string>(row, "phone") ?? null,
      merchant: false,
      moonpayEmail: getHydratedRowValue<string>(row, "moonpayEmail", "moonpay_email") ?? null,
      buyVerified: Boolean(getHydratedRowValue<boolean>(row, "buyVerified", "buy_verified")),
    },
    passwordHash: getHydratedRowValue<string>(row, "passwordHash", "password_hash") ?? "",
    role: getHydratedRowValue<string>(row, "role") as Role,
    referralCode: getHydratedRowValue<string>(row, "referralCode", "referral_code") ?? "",
    referredBy: getHydratedRowValue<string>(row, "referredBy", "referred_by") ?? null,
    merchant: false,
    tradingLocked: Boolean(getHydratedRowValue<boolean>(row, "tradingLocked", "trading_locked")),
    demoMode: Boolean(getHydratedRowValue<boolean>(row, "demoMode", "demo_mode")),
    phone: getHydratedRowValue<string>(row, "phone") ?? null,
    accountFlag: null,
    suspended: false,
    disabled: false,
  };

  return stored;
}

export async function hydrateFromDb(): Promise<void> {
  const start = Date.now();

  try {
    // 1. Load users from DB
    const dbUsers = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.users",
      (db) => db.select().from(usersTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.user) {
          return [];
        }
        return prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            country: true,
            kycVerified: true,
            avatarUrl: true,
            createdAt: true,
            selectedManagerId: true,
            phone: true,
            moonpayEmail: true,
            buyVerified: true,
            passwordHash: true,
            role: true,
            referralCode: true,
            referredBy: true,
            tradingLocked: true,
            demoMode: true,
          },
        });
      },
    );

    let usersLoaded = 0;
    for (const row of dbUsers) {
      const rowId = getHydratedRowValue<string>(row, "id");
      const rowEmail = getHydratedRowValue<string>(row, "email");
      if (!rowId || !rowEmail) {
        continue;
      }

      const stored = buildStoredUserFromHydratedRow(row, usersByEmail);
      if (!stored) {
        continue;
      }

      const normalizedEmail = rowEmail.trim().toLowerCase();
      const referralCode = getHydratedRowValue<string>(row, "referralCode", "referral_code");
      users.set(rowId, stored);
      usersByEmail.set(normalizedEmail, rowId);
      if (referralCode) referralCodeIndex.set(referralCode, rowId);
      if (!referrals.has(rowId)) referrals.set(rowId, []);
      if (!userData.has(rowId)) {
        userData.set(rowId, freshUserData(rowId, { country: stored.user.country }));
      }
      usersLoaded++;
    }

    // 2. Load active sessions from DB
    logger.info({ label: "hydrate.users", rowsLoaded: usersLoaded }, "[hydrate] loaded users from database");

    const dbWallets = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.wallets",
      (db) => db.select().from(walletsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.wallets) {
          return [];
        }
        return prisma.wallets.findMany({});
      },
    );
    const walletsByUser = new Map<string, typeof dbWallets>();
    for (const walletRow of dbWallets) {
      const userId = getHydratedRowValue<string>(walletRow, "userId", "user_id");
      if (!userId) continue;
      const list = walletsByUser.get(userId) ?? [];
      list.push(walletRow);
      walletsByUser.set(userId, list);
    }

    const dbTransactions = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.transactions",
      (db) => db.select().from(transactionsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.transactions) {
          return [];
        }
        return prisma.transactions.findMany({});
      },
    );
    const transactionsByUser = new Map<string, typeof dbTransactions>();
    for (const tx of dbTransactions) {
      const userId = getHydratedRowValue<string>(tx, "userId", "user_id");
      if (!userId) continue;
      const list = transactionsByUser.get(userId) ?? [];
      list.push(tx);
      transactionsByUser.set(userId, list);
    }

    const dbConnectedWallets = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.connected_wallets",
      (db) => db.select().from(connectedWalletsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.connected_wallets) {
          return [];
        }
        return prisma.connected_wallets.findMany({});
      },
    );
    const connectedWalletsByUser = new Map<string, typeof dbConnectedWallets>();
    for (const cw of dbConnectedWallets) {
      const userId = getHydratedRowValue<string>(cw, "userId", "user_id");
      if (!userId) continue;
      const list = connectedWalletsByUser.get(userId) ?? [];
      list.push(cw);
      connectedWalletsByUser.set(userId, list);
    }

    const dbBankAccounts = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.bank_accounts",
      (db) => db.select().from(bankAccountsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.bank_accounts) {
          return [];
        }
        return prisma.bank_accounts.findMany({});
      },
    );
    const bankAccountsByUser = new Map<string, typeof dbBankAccounts>();
    for (const account of dbBankAccounts) {
      const userId = getHydratedRowValue<string>(account, "userId", "user_id");
      if (!userId) continue;
      const list = bankAccountsByUser.get(userId) ?? [];
      list.push(account);
      bankAccountsByUser.set(userId, list);
    }

    const dbSupportTickets = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.support_tickets",
      (db) => db.select().from(supportTicketsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.support_tickets) {
          return [];
        }
        return prisma.support_tickets.findMany({});
      },
    );
    const supportTicketsByUser = new Map<string, typeof dbSupportTickets>();
    for (const ticket of dbSupportTickets) {
      const userId = getHydratedRowValue<string>(ticket, "userId", "user_id");
      if (!userId) continue;
      const list = supportTicketsByUser.get(userId) ?? [];
      list.push(ticket);
      supportTicketsByUser.set(userId, list);
    }

    const dbChatMessages = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.chat_messages",
      async () => [],
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.chat_messages) return [];
        return prisma.chat_messages.findMany({ orderBy: { created_at: "asc" } });
      },
    );
    const chatMessagesByUser = new Map<string, typeof dbChatMessages>();
    for (const message of dbChatMessages) {
      const userId = getHydratedRowValue<string>(message, "conversation_id", "conversationId");
      if (!userId || !users.has(userId)) continue;
      const list = chatMessagesByUser.get(userId) ?? [];
      list.push(message);
      chatMessagesByUser.set(userId, list);
    }

    const dbP2PMerchantApplications = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.p2p_merchant_applications",
      (db) => db.select().from(p2pMerchantApplicationsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.p2p_merchant_applications) {
          return [];
        }
        return prisma.p2p_merchant_applications.findMany({});
      },
    );
    const p2pMerchantApplicationsByUser = new Map<string, typeof dbP2PMerchantApplications>();
    for (const app of dbP2PMerchantApplications) {
      const userId = getHydratedRowValue<string>(app, "userId", "user_id");
      if (!userId) continue;
      const list = p2pMerchantApplicationsByUser.get(userId) ?? [];
      list.push(app);
      p2pMerchantApplicationsByUser.set(userId, list);
    }

    const dbP2PNotifications = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.p2p_notifications",
      (db) => db.select().from(p2pNotificationsTable),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.p2p_notifications) {
          return [];
        }
        return prisma.p2p_notifications.findMany({});
      },
    );
    const p2pNotificationsByUser = new Map<string, typeof dbP2PNotifications>();
    for (const notif of dbP2PNotifications) {
      const userId = getHydratedRowValue<string>(notif, "userId", "user_id");
      if (!userId) continue;
      const list = p2pNotificationsByUser.get(userId) ?? [];
      list.push(notif);
      p2pNotificationsByUser.set(userId, list);
    }

    const dbSessions = await loadRowsFromDb<Record<string, unknown>>(
      "hydrate.sessions",
      (db) =>
        db
          .select()
          .from(userSessionsTable)
          .where(gt(userSessionsTable.expiresAt, new Date())),
      async () => {
        const prisma = getPrismaClient();
        if (!prisma?.userSession) {
          return [];
        }
        return prisma.userSession.findMany({
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
        });
      },
    );

    let sessionsLoaded = 0;
    for (const s of dbSessions) {
      const sessionId = getHydratedRowValue<string>(s, "id");
      const userId = getHydratedRowValue<string>(s, "userId", "user_id");
      const expiresAtRaw = getHydratedRowValue<string | Date>(s, "expiresAt", "expires_at");
      const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : undefined;
      if (!sessionId || !userId) {
        continue;
      }

      // Only restore sessions for users we have in memory
      if (users.has(userId)) {
        sessions.set(sessionId, { userId, expiresAt });
        sessionsLoaded++;
      }
    }

    for (const [userId, data] of userData) {
      const persistedWallets = walletsByUser.get(userId);
      if (persistedWallets) {
        data.wallets = persistedWallets.map((walletRow) => {
          const walletType = ["main", "trading", "social"].includes(
            coerceString(walletRow.type),
          )
            ? (coerceString(walletRow.type) as WalletType)
            : "main";
          return {
            id: coerceString(walletRow.id),
            type: walletType,
            label: coerceString(walletRow.label),
            currency: coerceString(walletRow.currency, "USD"),
            balance: coerceNumber(walletRow.balance),
            pendingBalance: coerceNumber(walletRow.pendingBalance ?? walletRow.pending_balance),
            address: coerceString(walletRow.address),
          };
        });
      }

      const persistedTransactions = transactionsByUser.get(userId);
      if (persistedTransactions) {
        data.transactions = persistedTransactions.map((txRow) => {
          const txType = coerceString(txRow.type);
          const type = txType === "gas_fee" || txType === "maintenance_fee"
            ? "fee"
            : txType;
          return {
            id: coerceString(txRow.id),
            walletId: coerceString(txRow.walletId ?? txRow.wallet_id),
            type: type as TransactionType,
            amount: coerceNumber(txRow.amount),
            currency: coerceString(txRow.currency, "USD"),
            status: coerceString(txRow.status ?? txRow.status, "pending") as import("@workspace/api-zod").TransactionStatus,
            description: coerceString(txRow.description, ""),
            createdAt: coerceDate(txRow.createdAt ?? txRow.created_at),
          };
        }) as any;
      }

      const persistedConnectedWallets = connectedWalletsByUser.get(userId);
      if (persistedConnectedWallets) {
        data.connectedWallets = persistedConnectedWallets.map((cwRow) => {
          const providerValue = coerceString(cwRow.provider, "self_custody");
          const provider = ["self_custody", "moonpay", "coinbase"].includes(providerValue)
            ? (providerValue as ConnectedWalletProvider)
            : "self_custody";
          return {
            id: coerceString(cwRow.id),
            address: coerceString(cwRow.address),
            walletType: coerceString(cwRow.walletType, coerceString(cwRow.wallet_type)),
            balance: coerceNumber(cwRow.balance),
            currency: coerceString(cwRow.currency, "USD"),
            connectedAt: coerceDate(cwRow.connectedAt ?? cwRow.connected_at),
            provider,
            label: getHydratedRowValue<string>(cwRow, "label") ?? null,
            email: getHydratedRowValue<string>(cwRow, "email") ?? null,
            syncedProfile: (getHydratedRowValue<any>(cwRow, "syncedProfile") as any) ?? null,
            connectionStatus: "public_address",
          };
        }) as any;
      }

      const persistedBankAccounts = bankAccountsByUser.get(userId);
      if (persistedBankAccounts) {
        data.bankAccounts = persistedBankAccounts.map((bankRow) => ({
          id: coerceString(bankRow.id),
          userId: coerceString(bankRow.userId),
          bankName: coerceString(bankRow.bankName),
          accountHolder: coerceString(bankRow.accountName),
          last4: coerceString(bankRow.accountNumber).slice(-4).padStart(4, "0"),
          currency: coerceString(bankRow.currency),
          verified: false,
          isDefault: Boolean(bankRow.isDefault),
          fiatBalance: coerceNumber(bankRow.fiatBalance),
          fiatCurrency: coerceString(bankRow.fiatCurrency),
          createdAt: coerceDate(bankRow.createdAt),
        })) as any;
      }

      const persistedSupportTickets = supportTicketsByUser.get(userId);
      if (persistedSupportTickets) {
        data.supportTickets = persistedSupportTickets.map((ticketRow) => ({
          id: coerceString(ticketRow.id),
          subject: coerceString(ticketRow.subject),
          status: coerceString(ticketRow.status) as import("@workspace/api-zod").SupportTicketStatus,
          priority: coerceString(ticketRow.priority) as import("@workspace/api-zod").SupportTicketPriority,
          messages: [],
          createdAt: coerceDate(ticketRow.createdAt),
          updatedAt: coerceDate(ticketRow.updatedAt),
        })) as any;
      }

      const persistedChatMessages = chatMessagesByUser.get(userId);
      if (persistedChatMessages) {
        data.liveChat = persistedChatMessages.map((message) => {
          const senderType = coerceString(message.sender_type ?? message.senderType, "user");
          const isFromUser = senderType === "user";
          return {
            id: coerceString(message.id),
            userId,
            senderName: isFromUser
              ? stored.user.fullName
              : senderType === "admin"
                ? "XpressPro FX Support"
                : "XpressPro FX AI Support",
            content: coerceString(message.content),
            isFromUser,
            isBot: senderType === "bot",
            escalated: false,
            createdAt: coerceDate(message.created_at ?? message.createdAt),
          };
        });
      }

      const persistedP2PMerchantApplications = p2pMerchantApplicationsByUser.get(userId);
      if (persistedP2PMerchantApplications) {
        for (const appRow of persistedP2PMerchantApplications) {
          const appId = coerceString(appRow.id);
          p2pMerchantApplications.set(appId, {
            id: appId,
            userId: coerceString(appRow.userId),
            userName: "",
            userEmail: "",
            displayName: coerceString(appRow.displayName),
            legalName: coerceString(appRow.legalName),
            contactEmail: coerceString(appRow.contactEmail),
            country: coerceString(appRow.country),
            paymentMethod: coerceString(appRow.paymentMethod) as "etransfer" | "bank",
            payoutEmail: coerceString(appRow.payoutEmail) ?? "",
            bankInfo: appRow.bankInfo ?? "",
            assets: appRow.assets,
            reason: appRow.reason,
            status: coerceString(appRow.status) as "pending" | "approved" | "rejected",
            rejectionReason: appRow.rejectionReason ?? null,
            submittedAt: coerceDate(appRow.submittedAt),
            decidedAt: appRow.reviewedAt ? coerceDate(appRow.reviewedAt) : null,
          } as any);
        }
      }

      const persistedP2PNotifications = p2pNotificationsByUser.get(userId);
      if (persistedP2PNotifications) {
        data.p2pNotifications = persistedP2PNotifications.map((notifRow) => ({
          id: coerceString(notifRow.id),
          type: coerceString(notifRow.type),
          title: coerceString(notifRow.title),
          message: coerceString(notifRow.message),
          orderId: coerceString(notifRow.orderId),
          read: Boolean(notifRow.read),
          amount: notifRow.amount !== null ? Number(notifRow.amount) : undefined,
          currency: notifRow.currency ?? undefined,
          asset: notifRow.asset ?? undefined,
          reference: notifRow.reference ?? undefined,
          instructions: notifRow.instructions ?? undefined,
          createdAt: coerceDate(notifRow.createdAt),
        })) as any;
      }
    }

    const elapsed = Date.now() - start;
    logger.info(
      {
        usersLoaded,
        sessionsLoaded,
        walletRowsLoaded: dbWallets.length,
        transactionRowsLoaded: dbTransactions.length,
        connectedWalletRowsLoaded: dbConnectedWallets.length,
        bankAccountRowsLoaded: dbBankAccounts.length,
        supportTicketRowsLoaded: dbSupportTickets.length,
        p2pMerchantApplicationRowsLoaded: dbP2PMerchantApplications.length,
        p2pNotificationRowsLoaded: dbP2PNotifications.length,
        elapsedMs: elapsed,
      },
      "[hydrate] Startup hydration complete",
    );
  } catch (error) {
    logger.warn({ err: error }, "[hydrate] Startup hydration skipped due to an unexpected database error");
  }
}
