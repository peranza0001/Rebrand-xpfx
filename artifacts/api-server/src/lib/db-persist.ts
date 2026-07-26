/**
 * Database persistence layer that bridges the in-memory store to Prisma.
 * Uses any type to avoid Prisma schema mismatch errors.
 */

let prismaClient: any = null;

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
  if (!prismaClient) return;
  try {
    await prismaClient.user.upsert({
      where: { id: userId },
      update: { email: userData.email, username: userData.username },
      create: {
        id: userId,
        email: userData.email,
        username: userData.username,
        password_hash: userData.passwordHash,
        full_name: userData.fullName,
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
export async function persistSession(sessionId: string, userId: string, expiresAt: Date): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.user_sessions.create({
      data: { id: sessionId, user_id: userId, expires_at: expiresAt },
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
  currency: string;
}): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.wallets.upsert({
      where: { id: walletId },
      update: { balance: walletData.balance },
      create: {
        id: walletId,
        user_id: userId,
        wallet_type: walletData.walletType,
        balance: walletData.balance,
        currency: walletData.currency,
      },
    });
  } catch (_err) {
    // Silent fail
  }
}

/**
 * Persists a deposit to the database.
 */
export async function persistDeposit(depositId: string, userId: string, depositData: {
  amount: number;
  currency: string;
  method: string;
  status: string;
}): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.deposits.upsert({
      where: { id: depositId },
      update: { status: depositData.status },
      create: {
        id: depositId,
        user_id: userId,
        amount: depositData.amount,
        currency: depositData.currency,
        method: depositData.method,
        status: depositData.status,
      },
    });
  } catch (_err) {
    // Silent fail
  }
}

/**
 * Persists a withdrawal to the database.
 */
export async function persistWithdrawal(withdrawalId: string, userId: string, withdrawalData: {
  amount: number;
  currency: string;
  destination: string;
  status: string;
}): Promise<void> {
  if (!prismaClient) return;
  try {
    await prismaClient.withdrawals.upsert({
      where: { id: withdrawalId },
      update: { status: withdrawalData.status },
      create: {
        id: withdrawalId,
        user_id: userId,
        amount: withdrawalData.amount,
        currency: withdrawalData.currency,
        destination: withdrawalData.destination,
        status: withdrawalData.status,
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
  if (!prismaClient) return;
  try {
    await prismaClient.kyc_documents.upsert({
      where: { id: kycId },
      update: { status: kycData.status, file_url: kycData.fileUrl },
      create: {
        id: kycId,
        user_id: userId,
        document_type: kycData.documentType,
        status: kycData.status,
        file_url: kycData.fileUrl,
      },
    });
  } catch (_err) {
    // Silent fail
  }
}
