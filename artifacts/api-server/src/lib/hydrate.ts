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

async function loadRowsFromDb<T>(
  label: string,
  loadDrizzle: (db: any) => Promise<T[]>,
  loadPrisma: () => Promise<T[]>,
): Promise<T[]> {
  const drizzleRows = await dbGet(label, (db) => loadDrizzle(db), [] as T[]);
  if (drizzleRows.length > 0) {
    return drizzleRows;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return drizzleRows;
  }

  try {
    return await loadPrisma();
  } catch (err) {
    logger.warn({ label, err }, "[hydrate] Prisma fallback failed");
    return drizzleRows;
  }
}

export function buildStoredUserFromHydratedRow(row: Record<string, unknown>, existingEmails: Set<string>): StoredUser | null {
  const id = getHydratedRowValue<string>(row, "id");
  const email = getHydratedRowValue<string>(row, "email");
  if (!id || !email) {
    return null;
  }

  if (existingEmails.has(email.toLowerCase())) {
    return null;
  }

  const stored: StoredUser = {
    user: {
      id,
      username: getHydratedRowValue<string>(row, "username") ?? "",
      email,
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
        if (!prisma?.users) {
          return [];
        }
        return prisma.users.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            full_name: true,
            country: true,
            kyc_verified: true,
            avatar_url: true,
            created_at: true,
            selected_manager_id: true,
            phone: true,
            moonpay_email: true,
            buy_verified: true,
            password_hash: true,
            role: true,
            referral_code: true,
            referred_by: true,
            trading_locked: true,
            demo_mode: true,
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

      const referralCode = getHydratedRowValue<string>(row, "referralCode", "referral_code");
      users.set(rowId, stored);
      usersByEmail.set(rowEmail.toLowerCase(), rowId);
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
        if (!prisma?.user_sessions) {
          return [];
        }
        return prisma.user_sessions.findMany({
          where: {
            expires_at: {
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
      if (!sessionId || !userId) {
        continue;
      }

      // Only restore sessions for users we have in memory
      if (users.has(userId)) {
        sessions.set(sessionId, userId);
        sessionsLoaded++;
      }
    }

    for (const [userId, data] of userData) {
      const persistedWallets = walletsByUser.get(userId);
      if (persistedWallets) {
        data.wallets = persistedWallets.map((walletRow) => {
          const walletType = ["main", "trading", "social"].includes(walletRow.type)
            ? (walletRow.type as WalletType)
            : "main";
          return {
            id: walletRow.id,
            type: walletType,
            label: walletRow.label,
            currency: walletRow.currency,
            balance: Number(walletRow.balance),
            pendingBalance: Number(walletRow.pendingBalance),
            address: walletRow.address,
          };
        });
      }

      const persistedTransactions = transactionsByUser.get(userId);
      if (persistedTransactions) {
        data.transactions = persistedTransactions.map((txRow) => {
          const type = txRow.type === "gas_fee" || txRow.type === "maintenance_fee"
            ? "fee"
            : txRow.type;
          return {
            id: txRow.id,
            walletId: txRow.walletId,
            type: type as TransactionType,
            amount: Number(txRow.amount),
            currency: txRow.currency,
            status: txRow.status,
            description: txRow.description,
            createdAt: txRow.createdAt.toISOString(),
          };
        });
      }

      const persistedConnectedWallets = connectedWalletsByUser.get(userId);
      if (persistedConnectedWallets) {
        data.connectedWallets = persistedConnectedWallets.map((cwRow) => {
          const provider = ["self_custody", "moonpay", "coinbase"].includes(cwRow.provider)
            ? (cwRow.provider as ConnectedWalletProvider)
            : "self_custody";
          return {
            id: cwRow.id,
            address: cwRow.address,
            walletType: cwRow.walletType,
            balance: Number(cwRow.balance),
            currency: cwRow.currency,
            connectedAt: cwRow.connectedAt.toISOString(),
            provider,
            label: cwRow.label ?? null,
            email: cwRow.email ?? null,
            syncedProfile: (cwRow.syncedProfile as any) ?? null,
            connectionStatus: "public_address",
          };
        });
      }

      const persistedBankAccounts = bankAccountsByUser.get(userId);
      if (persistedBankAccounts) {
        data.bankAccounts = persistedBankAccounts.map((bankRow) => ({
          id: bankRow.id,
          userId: bankRow.userId,
          bankName: bankRow.bankName,
          accountHolder: bankRow.accountName,
          last4: bankRow.accountNumber.slice(-4).padStart(4, "0"),
          currency: bankRow.currency,
          verified: false,
          isDefault: bankRow.isDefault,
          fiatBalance: Number(bankRow.fiatBalance),
          fiatCurrency: bankRow.fiatCurrency,
          createdAt: bankRow.createdAt.toISOString(),
        }));
      }

      const persistedSupportTickets = supportTicketsByUser.get(userId);
      if (persistedSupportTickets) {
        data.supportTickets = persistedSupportTickets.map((ticketRow) => ({
          id: ticketRow.id,
          subject: ticketRow.subject,
          status: ticketRow.status as import("@workspace/api-zod").SupportTicketStatus,
          priority: ticketRow.priority as import("@workspace/api-zod").SupportTicketPriority,
          messages: [],
          createdAt: ticketRow.createdAt.toISOString(),
          updatedAt: ticketRow.updatedAt.toISOString(),
        }));
      }

      const persistedP2PMerchantApplications = p2pMerchantApplicationsByUser.get(userId);
      if (persistedP2PMerchantApplications) {
        for (const appRow of persistedP2PMerchantApplications) {
          p2pMerchantApplications.set(appRow.id, {
            id: appRow.id,
            userId: appRow.userId,
            userName: "",
            userEmail: "",
            displayName: appRow.displayName,
            legalName: appRow.legalName,
            contactEmail: appRow.contactEmail,
            country: appRow.country,
            paymentMethod: appRow.paymentMethod as "etransfer" | "bank",
            payoutEmail: appRow.payoutEmail ?? "",
            bankInfo: appRow.bankInfo ?? "",
            assets: appRow.assets,
            reason: appRow.reason,
            status: appRow.status as "pending" | "approved" | "rejected",
            rejectionReason: appRow.rejectionReason ?? null,
            submittedAt: appRow.submittedAt.toISOString(),
            decidedAt: appRow.reviewedAt?.toISOString() ?? null,
          });
        }
      }

      const persistedP2PNotifications = p2pNotificationsByUser.get(userId);
      if (persistedP2PNotifications) {
        data.p2pNotifications = persistedP2PNotifications.map((notifRow) => ({
          id: notifRow.id,
          type: notifRow.type,
          title: notifRow.title,
          message: notifRow.message,
          orderId: notifRow.orderId,
          read: notifRow.read,
          amount: notifRow.amount !== null ? Number(notifRow.amount) : undefined,
          currency: notifRow.currency ?? undefined,
          asset: notifRow.asset ?? undefined,
          reference: notifRow.reference ?? undefined,
          instructions: notifRow.instructions ?? undefined,
          createdAt: notifRow.createdAt.toISOString(),
        }));
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
