/**
 * /p2p routes — listings, orders, notifications, merchant application,
 * merchant ↔ platform-admin chat (built on the existing messages thread store).
 */
import { Router, type IRouter } from "express";
import {
  CreateP2PListingBody,
  CreateP2POrderBody,
  GetP2PListingsQueryParams,
  SubmitP2PMerchantApplicationBody,
  SendMyP2PMerchantChatBody,
  type Message,
  type P2PListing,
  type P2PMerchantApplicationOrNull,
  type P2POrder,
} from "@workspace/api-zod";
import {
  claimTxHash,
  getUserData,
  newId,
  NOW,
  p2pListings,
  p2pMerchantApplications,
  type P2PMerchantApplicationData,
} from "../lib/store";
import {
  persistP2PMerchantApplication,
  persistP2PNotification,
} from "../lib/db-persist";
import { merchantAdminThread } from "../lib/p2p-chat";
import { requireAuth, requireFullAuth } from "../lib/session";
import { enforceGasFee } from "../lib/gas-fee-gate";
import { notifyUser } from "../lib/notify";
import {
  getPlatformReceivingAddress,
  verifyOnChainPayment,
} from "../lib/blockchain";

const router: IRouter = Router();

router.get("/p2p/listings", requireAuth, (req, res) => {
  const parsed = GetP2PListingsQueryParams.safeParse(req.query);
  let result = p2pListings.filter((l) => l.status === "active");
  if (parsed.success) {
    if (parsed.data.type) result = result.filter((l) => l.type === parsed.data.type);
    if (parsed.data.asset) {
      const asset = parsed.data.asset.toUpperCase();
      result = result.filter((l) => l.asset.toUpperCase() === asset);
    }
  }
  res.json(result);
});

router.post("/p2p/listings", requireFullAuth, (req, res) => {
  const stored = req.storedUser!;
  if (!stored.merchant) {
    return res.status(403).json({
      error: "Only approved P2P merchants can create listings.",
      code: "merchant_required",
    });
  }
  const parsed = CreateP2PListingBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid listing", details: parsed.error.issues });
  }
  const u = stored.user;
  const listing: P2PListing = {
    id: newId("l"),
    userId: u.id,
    userName: u.fullName,
    userAvatarUrl: u.avatarUrl ?? null,
    type: parsed.data.type,
    asset: parsed.data.asset.toUpperCase(),
    amount: parsed.data.amount,
    price: parsed.data.price,
    currency: parsed.data.currency,
    minOrder: parsed.data.minOrder,
    maxOrder: parsed.data.maxOrder,
    paymentMethods: parsed.data.paymentMethods,
    completionRate: 100,
    totalTrades: 0,
    status: "active",
    createdAt: NOW(),
  };
  p2pListings.unshift(listing);
  return res.json(listing);
});

router.get("/p2p/orders", requireAuth, (req, res) => {
  res.json(getUserData(req.userId!).p2pOrders);
});

router.post("/p2p/orders", requireAuth, async (req, res) => {
  const parsed = CreateP2POrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order", details: parsed.error.issues });
  }
  const listing = p2pListings.find((l) => l.id === parsed.data.listingId);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (listing.status !== "active") {
    return res.status(400).json({ error: "This listing is no longer active." });
  }
  if (listing.userId === req.userId!) {
    return res.status(400).json({ error: "You cannot place an order on your own listing." });
  }
  if (listing.price <= 0) {
    return res.status(400).json({ error: "This listing has an invalid price and cannot be ordered." });
  }
  if (parsed.data.amount < listing.minOrder || parsed.data.amount > listing.maxOrder) {
    return res.status(400).json({
      error: `Order amount ${parsed.data.amount} is outside the listing's allowed range of ${listing.minOrder}–${listing.maxOrder}.`,
    });
  }
  if (parsed.data.amount > listing.amount) {
    return res.status(400).json({
      error: `Order amount ${parsed.data.amount} exceeds the listing's available amount of ${listing.amount}.`,
    });
  }
  // Access control: only approved merchants may take the seller side of a
  // trade. A "buy" listing means the listing owner wants to BUY, so the
  // counterparty (the order creator) is selling — restrict that to merchants.
  if (listing.type === "buy" && req.storedUser!.merchant !== true) {
    return res.status(403).json({
      error: "Only approved P2P merchants can sell. Apply to become a merchant to take buy listings.",
    });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  // Universal gas-fee gate — applies to any P2P order that moves money
  // (buyer side debits funds; seller side will receive funds on release).
  if (!enforceGasFee(req, res, "p2p_order")) return;
  const orderTotalUsd = Math.round(parsed.data.amount * listing.price * 100) / 100;
  const main = data.wallets.find((w) => w.type === "main");
  // Determine whether the current user is funding (buyer side) or
  // receiving (seller side). For sell-listings the current user buys; for
  // buy-listings the current user sells. Only the buyer side debits a
  // payment source; the seller side records the source as payout metadata.
  const userIsBuyer = listing.type === "sell";
  const paymentSource = parsed.data.paymentSource
    ?? (parsed.data.externalWalletId ? "external_wallet" : "platform_wallet");
  // Seller-side selection is payout-destination metadata only — never a
  // debit or on-chain verification. Validate ownership of the connected
  // wallet when one is supplied, but skip the buyer-only branches below.
  if (!userIsBuyer && paymentSource === "external_wallet") {
    if (parsed.data.externalWalletId) {
      const owns = data.connectedWallets.some(
        (w) => w.id === parsed.data.externalWalletId,
      );
      if (!owns) {
        return res.status(400).json({
          error: "The external wallet referenced is not connected to this account.",
        });
      }
    }
  } else if (paymentSource === "external_wallet") {
    const wallet = data.connectedWallets.find(
      (w) => w.id === parsed.data.externalWalletId,
    );
    if (!wallet) {
      return res
        .status(400)
        .json({ error: "The external wallet referenced is not connected to this account." });
    }
    if (!parsed.data.txHash) {
      return res
        .status(400)
        .json({ error: "External-wallet P2P orders require the on-chain tx hash." });
    }
    const totalValue = parsed.data.amount * listing.price;
    const platformAddress = getPlatformReceivingAddress();
    const settlementAsset = (parsed.data.settlementAsset ?? "USDT").toUpperCase();
    const verification = await verifyOnChainPayment({
      txHash: parsed.data.txHash,
      expectedFrom: wallet.address,
      expectedTo: platformAddress,
      asset: settlementAsset,
      expectedAmount: totalValue,
    });
    if (!verification.ok) {
      req.log.warn(
        {
          txHash: parsed.data.txHash,
          walletId: wallet.id,
          reason: verification.reason,
        },
        "p2p.order.create: rejected unverified on-chain settlement",
      );
      return res.status(400).json({
        error: `On-chain settlement could not be verified: ${verification.reason}`,
      });
    }
  } else if (paymentSource === "platform_wallet") {
    if (userIsBuyer) {
      if (!main || main.balance < orderTotalUsd) {
        return res.status(400).json({
          error: `Insufficient platform main wallet balance ($${main?.balance ?? 0}) to fund this $${orderTotalUsd} order.`,
        });
      }
      main.balance = Math.round((main.balance - orderTotalUsd) * 100) / 100;
      main.pendingBalance =
        Math.round((main.pendingBalance + orderTotalUsd) * 100) / 100;
      data.transactions.unshift({
        id: newId("tx"),
        walletId: main.id,
        type: "p2p_buy",
        amount: -orderTotalUsd,
        currency: listing.currency,
        status: "pending",
        description: `P2P order escrow: ${parsed.data.amount} ${listing.asset} from ${listing.userName}`,
        createdAt: NOW(),
      });
    }
    // Seller side: no debit. Source is payout-destination metadata only.
  }
  // bank_transfer: no immediate debit on either side; settlement is offline.
  const orderId = newId("o");
  if (
    userIsBuyer
    && paymentSource === "external_wallet"
    && parsed.data.txHash
  ) {
    const claim = claimTxHash(parsed.data.txHash, {
      userId: req.userId!,
      purpose: "p2p_order",
      recordId: orderId,
    });
    if (!claim.ok) {
      return res.status(409).json({
        error: `On-chain payment ${parsed.data.txHash} has already been used to settle ${claim.existing.purpose} ${claim.existing.recordId}.`,
      });
    }
  }
  const order: P2POrder = {
    id: orderId,
    listingId: listing.id,
    buyerId: listing.type === "sell" ? u.id : listing.userId,
    sellerId: listing.type === "sell" ? listing.userId : u.id,
    asset: listing.asset,
    amount: parsed.data.amount,
    price: listing.price,
    currency: listing.currency,
    status: parsed.data.txHash ? "payment_sent" : "pending",
    createdAt: NOW(),
  };
  data.p2pOrders.unshift(order);
  const settleNote = parsed.data.txHash
    ? ` Settlement tx ${parsed.data.txHash.slice(0, 10)}…`
    : "";
  const notification: import("@workspace/api-zod").P2PNotification = {
    id: newId("n"),
    type: "order_update",
    title: `Order opened with ${listing.userName}`,
    message: `Your order for ${parsed.data.amount} ${listing.asset} is ${parsed.data.txHash ? "in progress" : "awaiting payment"}.${settleNote}`,
    orderId: order.id,
    read: false,
    createdAt: NOW(),
  };
  data.p2pNotifications.unshift(notification);
  void persistP2PNotification(notification.id, req.userId!, {
    type: notification.type,
    title: notification.title,
    message: notification.message,
    orderId: notification.orderId,
    read: notification.read,
    amount: null,
    currency: null,
    asset: null,
    reference: null,
    instructions: null,
    createdAt: notification.createdAt,
  });
  notifyUser({
    userId: req.userId!,
    kind: "p2p_order_update",
    emailToggle: "p2pOrderUpdate",
    title: `P2P order opened with ${listing.userName}`,
    body: `Your ${userIsBuyer ? "buy" : "sell"} order for ${parsed.data.amount} ${listing.asset} is ${parsed.data.txHash ? "in progress" : "awaiting payment"}.${settleNote}`,
    link: "/p2p",
  });
  return res.json(order);
});

router.get("/p2p/notifications", requireAuth, (req, res) => {
  const list = getUserData(req.userId!).p2pNotifications;
  res.json({
    notifications: list,
    unreadCount: list.filter((n) => !n.read).length,
  });
});

router.post("/p2p/notifications/:id/read", requireAuth, (req, res) => {
  const id = (req.params["id"] as string);
  const list = getUserData(req.userId!).p2pNotifications;
  const found = list.find((n) => n.id === id);
  if (!found) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  found.read = true;
  res.json({
    notifications: list,
    unreadCount: list.filter((n) => !n.read).length,
  });
});

// ---------- Merchant application ----------

router.get("/p2p/merchant/application", requireAuth, (req, res) => {
  const userId = req.userId!;
  const stored = req.storedUser!;
  const app = [...p2pMerchantApplications.values()]
    .filter((a) => a.userId === userId)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))[0];
  const out: P2PMerchantApplicationOrNull = {
    application: app
      ? {
          id: app.id,
          userId: app.userId,
          userName: app.userName,
          userEmail: app.userEmail,
          displayName: app.displayName,
          legalName: app.legalName,
          contactEmail: app.contactEmail,
          country: app.country,
          paymentMethod: app.paymentMethod,
          payoutEmail: app.payoutEmail,
          bankInfo: app.bankInfo,
          assets: app.assets,
          reason: app.reason,
          status: app.status,
          rejectionReason: app.rejectionReason,
          submittedAt: app.submittedAt,
          decidedAt: app.decidedAt,
        }
      : null,
    isMerchant: stored.merchant,
  };
  return res.json(out);
});

router.post("/p2p/merchant/application", requireFullAuth, (req, res) => {
  const userId = req.userId!;
  const stored = req.storedUser!;
  const parsed = SubmitP2PMerchantApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid application", details: parsed.error.issues });
  }
  if (stored.merchant) {
    return res.status(409).json({ error: "You are already an approved merchant." });
  }
  const existing = [...p2pMerchantApplications.values()].find(
    (a) => a.userId === userId && a.status === "pending",
  );
  if (existing) {
    return res.status(409).json({ error: "You already have a pending application." });
  }
  // Conditional payment-method validation: e-transfer requires payoutEmail,
  // bank requires bankInfo. The schema enforces both fields are present
  // strings, but we treat empty strings as missing for the chosen method.
  const method = parsed.data.paymentMethod;
  if (method === "etransfer" && !parsed.data.payoutEmail.trim()) {
    return res.status(400).json({ error: "E-Transfer email is required for e-transfer applications." });
  }
  if (method === "bank" && !parsed.data.bankInfo.trim()) {
    return res.status(400).json({ error: "Bank receiving info is required for bank applications." });
  }
  const app: P2PMerchantApplicationData = {
    id: newId("app"),
    userId,
    userName: stored.user.fullName,
    userEmail: stored.user.email,
    displayName: parsed.data.displayName,
    legalName: parsed.data.legalName,
    contactEmail: parsed.data.contactEmail,
    country: parsed.data.country,
    paymentMethod: method,
    payoutEmail: parsed.data.payoutEmail,
    bankInfo: parsed.data.bankInfo,
    assets: parsed.data.assets,
    reason: parsed.data.reason,
    status: "pending",
    rejectionReason: null,
    submittedAt: NOW(),
    decidedAt: null,
  };
  p2pMerchantApplications.set(app.id, app);
  void persistP2PMerchantApplication(app.id, app.userId, {
    status: app.status,
    displayName: app.displayName,
    legalName: app.legalName,
    contactEmail: app.contactEmail,
    country: app.country,
    paymentMethod: app.paymentMethod,
    payoutEmail: app.payoutEmail ?? null,
    bankInfo: app.bankInfo ?? null,
    assets: app.assets,
    reason: app.reason,
    rejectionReason: app.rejectionReason ?? null,
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: app.submittedAt,
  });
  return res.json({
    id: app.id,
    userId: app.userId,
    userName: app.userName,
    userEmail: app.userEmail,
    displayName: app.displayName,
    legalName: app.legalName,
    contactEmail: app.contactEmail,
    country: app.country,
    paymentMethod: app.paymentMethod,
    payoutEmail: app.payoutEmail,
    bankInfo: app.bankInfo,
    assets: app.assets,
    reason: app.reason,
    status: app.status,
    rejectionReason: app.rejectionReason,
    submittedAt: app.submittedAt,
    decidedAt: app.decidedAt,
  });
});

// ---------- Merchant ↔ admin chat (merchant side, reuses /messages store) ----------

router.get("/p2p/merchant/chat", requireAuth, (req, res) => {
  return res.json(merchantAdminThread(req.userId!));
});

router.post("/p2p/merchant/chat", requireFullAuth, (req, res) => {
  const userId = req.userId!;
  const stored = req.storedUser!;
  const parsed = SendMyP2PMerchantChatBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid message", details: parsed.error.issues });
  }
  const u = stored.user;
  const msg: Message = {
    id: newId("msg"),
    senderId: u.id,
    senderName: u.fullName,
    senderAvatar: u.avatarUrl ?? null,
    content: parsed.data.content,
    context: "p2p_admin",
    contextId: null,
    isFromUser: true,
    createdAt: NOW(),
  };
  merchantAdminThread(userId).push(msg);
  req.log?.info?.({ userId, from: u.email }, "[p2p] Merchant chat message received");
  return res.json(msg);
});

export default router;
