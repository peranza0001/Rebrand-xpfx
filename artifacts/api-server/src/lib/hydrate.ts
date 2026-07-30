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
    const dbWallets = await dbGet(
      "hydrate.wallets",
      (db) => db.select().from(walletsTable),
      [],
    );
    const walletsByUser = new Map<string, typeof dbWallets>();
    for (const walletRow of dbWallets) {
      const list = walletsByUser.get(walletRow.userId) ?? [];
      list.push(walletRow);
      walletsByUser.set(walletRow.userId, list);
    }

    const dbTransactions = await dbGet(
      "hydrate.transactions",
      (db) => db.select().from(transactionsTable),
      [],
    );
    const transactionsByUser = new Map<string, typeof dbTransactions>();
    for (const tx of dbTransactions) {
      const list = transactionsByUser.get(tx.userId) ?? [];
      list.push(tx);
      transactionsByUser.set(tx.userId, list);
    }

    const dbConnectedWallets = await dbGet(
      "hydrate.connected_wallets",
      (db) => db.select().from(connectedWalletsTable),
      [],
    );
    const connectedWalletsByUser = new Map<string, typeof dbConnectedWallets>();
    for (const cw of dbConnectedWallets) {
      const list = connectedWalletsByUser.get(cw.userId) ?? [];
      list.push(cw);
      connectedWalletsByUser.set(cw.userId, list);
    }

    const dbBankAccounts = await dbGet(
      "hydrate.bank_accounts",
      (db) => db.select().from(bankAccountsTable),
      [],
    );
    const bankAccountsByUser = new Map<string, typeof dbBankAccounts>();
    for (const account of dbBankAccounts) {
      const list = bankAccountsByUser.get(account.userId) ?? [];
      list.push(account);
      bankAccountsByUser.set(account.userId, list);
    }

    const dbSupportTickets = await dbGet(
      "hydrate.support_tickets",
      (db) => db.select().from(supportTicketsTable),
      [],
    );
    const supportTicketsByUser = new Map<string, typeof dbSupportTickets>();
    for (const ticket of dbSupportTickets) {
      const list = supportTicketsByUser.get(ticket.userId) ?? [];
      list.push(ticket);
      supportTicketsByUser.set(ticket.userId, list);
    }

    const dbP2PMerchantApps = await dbGet(
      "hydrate.p2p_merchant_applications",
      (db) => db.select().from(p2pMerchantApplicationsTable),
      [],
    );
    const p2pMerchantApplicationsByUser = new Map<string, typeof dbP2PMerchantApps>();
    for (const app of dbP2PMerchantApps) {
      const list = p2pMerchantApplicationsByUser.get(app.userId) ?? [];
      list.push(app);
      p2pMerchantApplicationsByUser.set(app.userId, list);
    }

    const dbP2PNotifications = await dbGet(
      "hydrate.p2p_notifications",
      (db) => db.select().from(p2pNotificationsTable),
      [],
    );
    const p2pNotificationsByUser = new Map<string, typeof dbP2PNotifications>();
    for (const notif of dbP2PNotifications) {
      const list = p2pNotificationsByUser.get(notif.userId) ?? [];
      list.push(notif);
      p2pNotificationsByUser.set(notif.userId, list);
    }

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
      { usersLoaded, sessionsLoaded, elapsedMs: elapsed },
      "[hydrate] Startup hydration complete",
    );
  } catch (error) {
    logger.warn({ err: error }, "[hydrate] Startup hydration skipped due to an unexpected database error");
  }
}
