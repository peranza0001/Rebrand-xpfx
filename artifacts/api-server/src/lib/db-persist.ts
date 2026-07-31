/**
 * Database persistence layer that bridges the in-memory store to Prisma.
 * Uses any type to avoid Prisma schema mismatch errors.
 */

let prismaClient: any = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function setPrismaClient(client: any): void {
  prismaClient = client;
}

export function getPrismaClient(): any {
  return prismaClient;
}

/**
 * Persists a new user to the database. Silent fail if DB unavailable.
 */
export async function persistUser(userId: string, userData: {
  email: string;
  username: string;
  passwordHash: string;
  fullName: string;
  country: string;
  phone?: string | null;
}): Promise<void> {
  if (!prismaClient || !isUuid(userId)) return;
  try {
    await prismaClient.users.upsert({
      where: { id: userId },
      update: {
        email: userData.email,
        username: userData.username,
        full_name: userData.fullName,
        password_hash: userData.passwordHash,
        country: userData.country,
        phone: userData.phone,
      },
      create: {
        id: userId,
        email: userData.email,
        username: userData.username,
        full_name: userData.fullName,
        password_hash: userData.passwordHash,
        country: userData.country,
        phone: userData.phone,
      },
    });
  } catch (_err) {
    // Silent fail
  }
}

export async function persistResetPasswordToken(
  userId: string,
  token: string | null,
  expiresAt: Date | null,
): Promise<void> {
  if (!prismaClient || !isUuid(userId)) return;
  try {
    await prismaClient.users.update({
      where: { id: userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry: expiresAt,
      },
    });
  } catch (_err) {
    // Silent fail
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
): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.user_sessions.create({
      data: {
        id: sessionId,
        user_id: userId,
        expires_at: expiresAt,
        is_admin: isAdmin,
      },
    });
  } catch (_err) {
    // Silent fail
  }
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
  } catch (_err) {
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
  } catch (_err) {
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
  },
): Promise<void> {
  if (!prismaClient || !isUuid(transactionId) || !isUuid(walletId) || !isUuid(userId)) return;
  try {
    await prismaClient.transactions.upsert({
      where: { id: transactionId },
      update: {
        type: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        description: transactionData.description,
      },
      create: {
        id: transactionId,
        wallet_id: walletId,
        user_id: userId,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        description: transactionData.description,
      },
    });
  } catch (_err) {
    // Silent fail
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
  } catch (_err) {
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
  } catch (_err) {
    // Silent fail
  }
}

export async function deleteBankAccount(bankAccountId: string): Promise<void> {
  if (!prismaClient || !isUuid(bankAccountId)) return;
  try {
    await prismaClient.bank_accounts.delete({
      where: { id: bankAccountId },
    });
  } catch (_err) {
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
  } catch (_err) {
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
  } catch (_err) {
    // Silent fail
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
  } catch (_err) {
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
  } catch (_err) {
    // Silent fail
  }
}
