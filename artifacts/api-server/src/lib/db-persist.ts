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
        doc_url: kycData.fileUrl,
      },
      create: {
        id: kycId,
        user_id: userId,
        doc_type: kycData.documentType,
        doc_url: kycData.fileUrl,
        status: kycData.status,
      },
    });
  } catch (_err) {
    // Silent fail
  }
}
