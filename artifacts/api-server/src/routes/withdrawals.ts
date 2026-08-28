import { Router, type IRouter } from "express";
import { RequestWithdrawalBody, type Withdrawal } from "@workspace/api-zod";
import { getGasFeePolicy, getUserData, logActivity, newId, newUuid, NOW } from "../lib/store";
import { requireAuth } from "../lib/session";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import { persistTransaction, persistWallet } from "../lib/db-persist";
import { addMoney, moneyToNumber, subtractMoney } from "../lib/money";

const router: IRouter = Router();

router.get("/withdrawals", requireAuth, (req, res) => {
  return res.json(getUserData(req.userId!).withdrawals);
});

router.post("/withdrawals", requireAuth, async (req, res) => {
  const parsed = RequestWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid withdrawal request.",
      details: parsed.error.issues,
    });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  if (!u.kycVerified && data.kyc.status !== "approved") {
    return res.status(400).json({
      success: false,
      message: "Complete KYC verification before requesting withdrawals.",
    });
  }

  const amount = parsed.data.sourceWalletId
    ? parsed.data.amount
    : moneyToNumber(parsed.data.amount);
  if (amount < 0.01) {
    return res.status(400).json({
      success: false,
      message: "Withdrawal amount must be at least $0.01.",
    });
  }

  // Self-service on-chain withdrawals are disabled. Every withdrawal must
  // go through the universal admin gas-fee gate so admins can set the fee,
  // verify the user funded it, and approve before any movement happens.
  if (parsed.data.sourceWalletId) {
    return res.status(400).json({
      success: false,
      message:
        "Direct on-chain withdrawals from a connected wallet are not allowed. All withdrawals must go through the admin gas-fee approval flow.",
    });
  }

  // Standard pending withdrawal against the platform main wallet.
  if (parsed.data.method === "crypto_wallet") {
    const connectedWallets = data.connectedWallets;

    if (connectedWallets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You must connect a wallet before submitting a crypto withdrawal.",
      });
    }

    const destinationAllowed = connectedWallets.some(
      (w) => w.address.toLowerCase() === parsed.data.destination.toLowerCase(),
    );
    if (!destinationAllowed) {
      return res.status(400).json({
        success: false,
        message:
          "Destination address must be one of your verified connected wallets.",
      });
    }

    const wdPolicy = getGasFeePolicy("withdrawal");
    if (wdPolicy.enabled) {
      const ethWallet = connectedWallets.find(
        (w) =>
          w.currency?.toUpperCase() === "ETH" ||
          w.walletType?.toUpperCase().includes("ETH"),
      );
      const userEthBalance = ethWallet?.balance ?? 0;
      if (userEthBalance < wdPolicy.requiredEthAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ETH for the withdrawal gas fee. You need at least ${wdPolicy.requiredEthAmount} ETH in a connected wallet to withdraw.`,
        });
      }
    }
  }

  const main = data.wallets.find((w) => w.type === "main");
  if (!main || main.balance < amount) {
    return res.status(400).json({
      success: false,
      message: "Insufficient balance in your main wallet.",
    });
  }

  // Always use the server-determined currency from the main wallet so that
  // clients cannot create misleading records by supplying an arbitrary currency.
  const walletCurrency = main.currency ?? "USD";

  // Hold funds: subtract from balance, add to pendingBalance until decision.
  main.balance = subtractMoney(main.balance, amount);
  main.pendingBalance = addMoney(main.pendingBalance, amount);

  void persistWallet(main.id, req.userId!, {
    walletType: main.type,
    balance: main.balance,
    pendingBalance: main.pendingBalance,
    currency: main.currency,
    label: main.label,
    address: main.address,
  });

  const withdrawal: Withdrawal = {
    id: newId("wd"),
    userId: u.id,
    userName: u.fullName,
    amount,
    currency: walletCurrency,
    method: parsed.data.method,
    destination: parsed.data.destination,
    status: "awaiting_gas_fee",
    rejectionReason: null,
    createdAt: NOW(),
    decidedAt: null,
  };
  data.withdrawals.unshift(withdrawal);
  const transactionId = newUuid();
  data.transactions.unshift({
    id: transactionId,
    walletId: main.id,
    type: "withdrawal",
    amount: -amount,
    currency: walletCurrency,
    status: "pending",
    description: `Withdrawal to ${parsed.data.destination}`,
    createdAt: NOW(),
  });
  void persistTransaction(transactionId, main.id, u.id, {
    type: "withdrawal",
    amount: -amount,
    currency: walletCurrency,
    status: "pending",
    description: `Withdrawal to ${parsed.data.destination}`,
  });
  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "withdrawal.request",
    detail: `Requested ${amount} ${walletCurrency} via ${parsed.data.method}`,
  });

  // Confirm to the user (in-app notification + email if toggle on) and
  // immediately surface the new pending request on the admin alert
  // tray with a deep-link to the user detail page.
  notifyUser({
    userId: u.id,
    kind: "withdrawal_submitted",
    emailToggle: "withdrawalSubmitted",
    title: "Withdrawal submitted",
    body: `Your withdrawal of ${amount} ${walletCurrency} via ${parsed.data.method.replace("_", " ")} is awaiting admin review.`,
    link: "/withdrawals",
  });
  pushAdminAlert({
    kind: "withdrawal.requested",
    severity: "info",
    title: "New withdrawal request",
    body: `${u.fullName} requested ${amount} ${walletCurrency} via ${parsed.data.method.replace("_", " ")}.`,
    userId: u.id,
    userEmail: u.email,
    linkUrl: `/users/${u.id}`,
    email: true,
  });

  return res.json({ success: true, withdrawal, message: "Withdrawal submitted for review." });
});

export default router;
