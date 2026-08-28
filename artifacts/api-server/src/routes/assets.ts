import { Router, type IRouter } from "express";
import { PurchaseAssetBody } from "@workspace/api-zod";
import { assetCatalog, claimTxHash, getUserData, logActivity, newId, NOW } from "../lib/store";
import { requireAuth, requireVerifiedIdentity } from "../lib/session";
import { enforceGasFee } from "../lib/gas-fee-gate";
import { multiplyMoney, subtractMoney } from "../lib/money";
import {
  getPlatformReceivingAddress,
  verifyOnChainPayment,
} from "../lib/blockchain";

const router: IRouter = Router();

router.get("/assets", (_req, res) => {
  res.json(assetCatalog);
});

router.get("/assets/catalog", requireAuth, (_req, res) => {
  res.json(assetCatalog);
});

router.post("/assets/purchase", requireAuth, requireVerifiedIdentity, async (req, res) => {
  const parsed = PurchaseAssetBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      transactionId: "",
      assetSymbol: "",
      amountPurchased: 0,
      totalCost: 0,
      message: "Invalid purchase request.",
    });
  }
  const asset = assetCatalog.find((a) => a.id === parsed.data.assetId);
  if (!asset || !asset.available) {
    return res.json({
      success: false,
      transactionId: "",
      assetSymbol: parsed.data.assetId,
      amountPurchased: 0,
      totalCost: 0,
      message: "Asset is not available for purchase.",
    });
  }
  if (parsed.data.amount <= 0) {
    return res.json({
      success: false,
      transactionId: "",
      assetSymbol: asset.symbol,
      amountPurchased: 0,
      totalCost: 0,
      message: "Purchase amount must be greater than zero.",
    });
  }
  const data = getUserData(req.userId!);
  if (!enforceGasFee(req, res, "asset_purchase")) return;
  const totalCost = multiplyMoney(asset.price, parsed.data.amount);
  const main = data.wallets.find((w) => w.type === "main");
  if (parsed.data.paymentMethod === "main_wallet") {
    if (!main || main.balance < totalCost) {
      return res.json({
        success: false,
        transactionId: "",
        assetSymbol: asset.symbol,
        amountPurchased: 0,
        totalCost,
        message: "Insufficient balance in main wallet.",
      });
    }
    main.balance = subtractMoney(main.balance, totalCost);
  }
  if (parsed.data.paymentMethod === "external_wallet") {
    if (!parsed.data.externalWalletId || !parsed.data.txHash) {
      return res.status(400).json({
        success: false,
        transactionId: "",
        assetSymbol: asset.symbol,
        amountPurchased: 0,
        totalCost,
        message:
          "External-wallet purchases require both a connected wallet id and the on-chain transaction hash.",
      });
    }
    const wallet = data.connectedWallets.find(
      (w) => w.id === parsed.data.externalWalletId,
    );
    if (!wallet) {
      return res.status(400).json({
        success: false,
        transactionId: "",
        assetSymbol: asset.symbol,
        amountPurchased: 0,
        totalCost,
        message: "The external wallet referenced is not connected to this account.",
      });
    }
    const platformAddress = getPlatformReceivingAddress();
    const settlementAsset = (parsed.data.settlementAsset ?? "USDT").toUpperCase();
    const verification = await verifyOnChainPayment({
      txHash: parsed.data.txHash,
      expectedFrom: wallet.address,
      expectedTo: platformAddress,
      asset: settlementAsset,
      expectedAmount: totalCost,
    });
    if (!verification.ok) {
      req.log.warn(
        {
          txHash: parsed.data.txHash,
          walletId: wallet.id,
          reason: verification.reason,
        },
        "asset.purchase: rejected unverified on-chain payment",
      );
      return res.status(400).json({
        success: false,
        transactionId: "",
        assetSymbol: asset.symbol,
        amountPurchased: 0,
        totalCost,
        message: `On-chain payment could not be verified: ${verification.reason}`,
      });
    }
  }
  const txId = newId("tx");
  if (parsed.data.paymentMethod === "external_wallet" && parsed.data.txHash) {
    const claim = claimTxHash(parsed.data.txHash, {
      userId: req.userId!,
      purpose: "asset_purchase",
      recordId: txId,
    });
    if (!claim.ok) {
      return res.status(409).json({
        success: false,
        transactionId: "",
        assetSymbol: asset.symbol,
        amountPurchased: 0,
        totalCost,
        message: `On-chain payment ${parsed.data.txHash} has already been used to settle ${claim.existing.purpose} ${claim.existing.recordId}.`,
      });
    }
  }
  const settlement =
    parsed.data.paymentMethod === "external_wallet"
      ? ` (on-chain tx ${parsed.data.txHash!.slice(0, 10)}…)`
      : "";
  data.transactions.unshift({
    id: txId,
    walletId: main?.id ?? "w_main",
    type: "p2p_buy",
    amount: -totalCost,
    currency: asset.currency,
    status: "completed",
    description: `Purchased ${parsed.data.amount} ${asset.symbol}${settlement}`,
    createdAt: NOW(),
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "asset.purchase",
    detail: `Purchased ${parsed.data.amount} ${asset.symbol} ($${totalCost}) via ${parsed.data.paymentMethod}${settlement}`,
  });
  return res.json({
    success: true,
    transactionId: txId,
    assetSymbol: asset.symbol,
    amountPurchased: parsed.data.amount,
    totalCost,
    message: `Successfully purchased ${parsed.data.amount} ${asset.symbol}.`,
  });
});

export default router;
