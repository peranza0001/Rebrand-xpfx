import { Router, type IRouter } from "express";
import { CreateDepositBody, type Deposit } from "@workspace/api-zod";
import { claimTxHash, getUserData, logActivity, newId, NOW } from "../lib/store";
import { requireAuth } from "../lib/session";
import {
  getPlatformReceivingAddress,
  verifyOnChainPayment,
} from "../lib/blockchain";
import { enforceGasFee } from "../lib/gas-fee-gate";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import { determineAccountTier, canPerformAction } from "../lib/account-tiers";

const router: IRouter = Router();

router.get("/deposits", requireAuth, (req, res) => {
  return res.json(getUserData(req.userId!).deposits);
});

router.post("/deposits", requireAuth, async (req, res) => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid deposit request.",
      details: parsed.error.issues,
    });
  }
  if (!enforceGasFee(req, res, "deposit")) return;
  
  // Check tier permissions for fiat deposits
  const userTier = determineAccountTier({
    emailVerified: req.storedUser!.user.emailVerified,
    kycVerified: req.storedUser!.user.kycVerified,
    bankAccountsCount: 0,
    role: req.storedUser!.role,
  });
  
  if (parsed.data.method === "fiat" && !canPerformAction(userTier, 'fiatDepositsEnabled')) {
    return res.status(403).json({
      success: false,
      message: "Your account tier does not support fiat deposits",
      hint: "Verify your email to enable fiat deposits",
    });
  }
  
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  const mainWallet = data.wallets.find((w) => w.type === "main");

  if (parsed.data.externalWalletId) {
    const wallet = data.connectedWallets.find(
      (w) => w.id === parsed.data.externalWalletId,
    );
    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "The external wallet referenced is not connected to this account.",
      });
    }
    if (parsed.data.method !== "crypto_wallet") {
      return res.status(400).json({
        success: false,
        message:
          "External wallet deposits must use the crypto_wallet method.",
      });
    }
    if (!parsed.data.txHash) {
      return res.status(400).json({
        success: false,
        message:
          "Crypto deposits from a connected wallet require the on-chain transaction hash.",
      });
    }
    const platformAddress = getPlatformReceivingAddress();
    const settlementAsset = (parsed.data.currency ?? "USDT").toUpperCase();
    const verification = await verifyOnChainPayment({
      txHash: parsed.data.txHash,
      expectedFrom: wallet.address,
      expectedTo: platformAddress,
      asset: settlementAsset,
      expectedAmount: parsed.data.amount,
    });
    if (!verification.ok) {
      req.log.warn(
        {
          txHash: parsed.data.txHash,
          walletId: wallet.id,
          reason: verification.reason,
        },
        "deposit.create: rejected unverified on-chain deposit",
      );
      return res.status(400).json({
        success: false,
        message: `On-chain deposit could not be verified: ${verification.reason}`,
      });
    }
  }
  const depositId = newId("dep");
  if (parsed.data.externalWalletId && parsed.data.txHash) {
    const claim = claimTxHash(parsed.data.txHash, {
      userId: req.userId!,
      purpose: "deposit",
      recordId: depositId,
    });
    if (!claim.ok) {
      return res.status(409).json({
        success: false,
        message: `On-chain payment ${parsed.data.txHash} has already been used to settle ${claim.existing.purpose} ${claim.existing.recordId}.`,
      });
    }
  }
  const settlement = parsed.data.txHash
    ? ` (on-chain tx ${parsed.data.txHash.slice(0, 10)}…)`
    : "";
  const referenceParts: string[] = [];
  if (parsed.data.reference) referenceParts.push(parsed.data.reference);
  if (parsed.data.txHash) referenceParts.push(`tx:${parsed.data.txHash}`);
  const deposit: Deposit = {
    id: depositId,
    userId: u.id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    method: parsed.data.method,
    status: "pending",
    reference: referenceParts.length ? referenceParts.join(" | ") : null,
    createdAt: NOW(),
  };
  data.deposits.unshift(deposit);
  data.transactions.unshift({
    id: newId("tx"),
    walletId: mainWallet?.id ?? "w_main",
    type: "deposit",
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    status: "pending",
    description: `Deposit via ${parsed.data.method}${settlement} (pending verification)`,
    createdAt: NOW(),
  });
  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "deposit.create",
    detail: `Deposit of ${parsed.data.amount} ${parsed.data.currency} via ${parsed.data.method}${settlement} submitted for verification`,
  });
  pushAdminAlert({
    kind: "deposit.attempted",
    title: "New deposit submitted",
    body: `${u.email} submitted a ${parsed.data.amount} ${parsed.data.currency} deposit via ${parsed.data.method}.`,
    userId: u.id,
    userEmail: u.email,
    severity: "info",
    linkUrl: `/users/${u.id}`,
    email: true,
  });
  notifyUser({
    userId: u.id,
    kind: "deposit_received",
    emailToggle: "depositReceived",
    title: "Deposit received",
    body: `Your ${parsed.data.amount} ${parsed.data.currency} deposit via ${parsed.data.method} is pending verification. We'll notify you once funds settle.`,
    link: "/deposits",
  });
  return res.json({
    success: true,
    deposit,
    message: "Deposit submitted. Funds will be credited after settlement verification.",
  });
});

export default router;
