/**
 * Admin P2P merchant management — applications, decisions, notifications, chat.
 */
import { Router, type IRouter } from "express";
import {
  DecideAdminP2PMerchantApplicationBody,
  NotifyAdminP2PMerchantBody,
  SendAdminP2PMerchantChatBody,
  type AdminP2PMerchantsResponse,
  type AdminP2PMerchantSummary,
  type Message,
  type P2PMerchantApplication,
} from "@workspace/api-zod";
import {
  getUserData,
  logActivity,
  newId,
  NOW,
  p2pListings,
  p2pMerchantApplications,
  users,
} from "../lib/store";
import {
  persistP2PMerchantApplication,
  persistP2PNotification,
} from "../lib/db-persist";
import { requireAdmin } from "../lib/session";
import { merchantAdminThread } from "../lib/p2p-chat";

const router: IRouter = Router();

function toApiApplication(app: import("../lib/store").P2PMerchantApplicationData): P2PMerchantApplication {
  return {
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
  };
}

// ---------- List all applications + active merchants ----------

router.get("/admin/p2p/merchants", requireAdmin, (_req, res) => {
  const applications: P2PMerchantApplication[] = [];
  for (const app of p2pMerchantApplications.values()) {
    applications.push(toApiApplication(app));
  }
  applications.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  const merchants: AdminP2PMerchantSummary[] = [];
  for (const [userId, stored] of users) {
    if (!stored.merchant) continue;
    const approvedApp = [...p2pMerchantApplications.values()].find(
      (a) => a.userId === userId && a.status === "approved",
    );
    const totalListings = p2pListings.filter((l) => l.userId === userId).length;
    merchants.push({
      userId,
      userName: stored.user.fullName,
      userEmail: stored.user.email,
      displayName: approvedApp?.displayName ?? stored.user.fullName,
      approvedAt: approvedApp?.decidedAt ?? null,
      totalListings,
    });
  }
  merchants.sort((a, b) => a.userName.localeCompare(b.userName));

  const out: AdminP2PMerchantsResponse = { applications, merchants };
  return res.json(out);
});

// ---------- Approve / reject application ----------

router.post(
  "/admin/p2p/merchants/applications/:applicationId/decision",
  requireAdmin,
  (req, res) => {
    const applicationId = ((req.params["applicationId"] as string) as string);
    const app = p2pMerchantApplications.get(applicationId);
    if (!app) return res.status(404).json({ error: "Application not found" });

    const parsed = DecideAdminP2PMerchantApplicationBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid decision", details: parsed.error.issues });
    }

    if (parsed.data.decision === "approve") {
      app.status = "approved";
      app.rejectionReason = null;
      app.decidedAt = NOW();
      const stored = users.get(app.userId);
      if (stored) stored.merchant = true;
      // Notify the user via P2P notifications
      const data = getUserData(app.userId);
      const notification: import("@workspace/api-zod").P2PNotification = {
        id: newId("n"),
        type: "admin_message",
        title: "Merchant application approved",
        message: "You can now create P2P listings on the platform.",
        orderId: null,
        read: false,
        createdAt: NOW(),
      };
      data.p2pNotifications.unshift(notification);
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
        reviewedBy: req.userId!,
        reviewedAt: app.decidedAt,
        submittedAt: app.submittedAt,
      });
      void persistP2PNotification(notification.id, app.userId, {
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
      logActivity({
        actorId: req.userId!,
        actorName: req.storedUser!.user.fullName,
        action: "admin.p2p.merchant.approve",
        detail: `Approved merchant application ${applicationId} for ${app.userEmail}.`,
      });
    } else {
      app.status = "rejected";
      app.rejectionReason = parsed.data.reason ?? "Application rejected.";
      app.decidedAt = NOW();
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
        reviewedBy: req.userId!,
        reviewedAt: app.decidedAt,
        submittedAt: app.submittedAt,
      });
      // Notify the applicant if they have an account
      if (users.has(app.userId)) {
        const data = getUserData(app.userId);
        const notification: import("@workspace/api-zod").P2PNotification = {
          id: newId("n"),
          type: "admin_message",
          title: "Merchant application rejected",
          message: app.rejectionReason,
          orderId: null,
          read: false,
          createdAt: NOW(),
        };
        data.p2pNotifications.unshift(notification);
        void persistP2PNotification(notification.id, app.userId, {
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
      }
      logActivity({
        actorId: req.userId!,
        actorName: req.storedUser!.user.fullName,
        action: "admin.p2p.merchant.reject",
        detail: `Rejected merchant application ${applicationId} for ${app.userEmail}: ${app.rejectionReason}`,
      });
    }
    return res.json(toApiApplication(app));
  },
);

// ---------- Revoke merchant ----------

router.post("/admin/p2p/merchants/:userId/revoke", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });
  stored.merchant = false;
  // Mark any approved application as rejected so the user must reapply
  for (const app of p2pMerchantApplications.values()) {
    if (app.userId === userId && app.status === "approved") {
      app.status = "rejected";
      app.rejectionReason = "Merchant status revoked by admin.";
      app.decidedAt = NOW();
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
        reviewedBy: req.userId!,
        reviewedAt: app.decidedAt,
        submittedAt: app.submittedAt,
      });
    }
  }
  // Deactivate all of the merchant's listings
  for (const listing of p2pListings) {
    if (listing.userId === userId) listing.status = "inactive";
  }
  const data = getUserData(userId);
  const revokedNotification = {
    id: newId("n"),
    type: "admin_message" as const,
    title: "Merchant status revoked",
    message: "Your P2P merchant access has been revoked. Active listings have been deactivated.",
    orderId: null,
    read: false,
    createdAt: NOW(),
  };
  data.p2pNotifications.unshift(revokedNotification);
  void persistP2PNotification(revokedNotification.id, userId, {
    type: revokedNotification.type,
    title: revokedNotification.title,
    message: revokedNotification.message,
    orderId: revokedNotification.orderId,
    read: revokedNotification.read,
    amount: null,
    currency: null,
    asset: null,
    reference: null,
    instructions: null,
    createdAt: revokedNotification.createdAt,
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.p2p.merchant.revoke",
    detail: `Revoked merchant status for ${stored.user.email}.`,
  });
  return res.json({ ok: true });
});

// ---------- Notify merchant (P2P system notification) ----------

router.post("/admin/p2p/merchants/:userId/notify", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const parsed = NotifyAdminP2PMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid notification", details: parsed.error.issues });
  }
  const data = getUserData(userId);

  // Map admin "kind" to the P2PNotification.type enum. The `p2p_deposit`
  // kind is the canonical structured-deposit notification; the legacy
  // `deposit_incoming` / `deposit_confirmed` kinds remain accepted for
  // backwards compatibility.
  const kind = parsed.data.kind ?? "general";
  const notifType: "admin_message" | "deposit_incoming" | "deposit_confirmed" | "p2p_deposit" | "order_update" =
    kind === "deposit_incoming" ? "deposit_incoming" :
    kind === "deposit_confirmed" ? "deposit_confirmed" :
    kind === "p2p_deposit" ? "p2p_deposit" :
    kind === "order_update" ? "order_update" :
    "admin_message";

  // Deposit notifications carry structured fields (amount/currency/asset/
  // reference/instructions) so the nextrade UI can render them as a
  // dedicated card rather than concatenating them into the message body.
  const notification: import("@workspace/api-zod").P2PNotification = {
    id: newId("n"),
    type: notifType,
    title: parsed.data.title,
    message: parsed.data.message,
    orderId: null,
    read: false,
    createdAt: NOW(),
    amount: parsed.data.amount ?? null,
    currency: parsed.data.currency ? parsed.data.currency.toUpperCase() : null,
    asset: parsed.data.asset ?? null,
    reference: parsed.data.reference ?? null,
    instructions: parsed.data.instructions ?? null,
  };
  data.p2pNotifications.unshift(notification);
  void persistP2PNotification(notification.id, userId, {
    type: notification.type,
    title: notification.title,
    message: notification.message,
    orderId: notification.orderId,
    read: notification.read,
    amount: notification.amount,
    currency: notification.currency,
    asset: notification.asset,
    reference: notification.reference,
    instructions: notification.instructions,
    createdAt: notification.createdAt,
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.p2p.merchant.notify",
    detail: `Notified ${stored.user.email} (${kind}): ${parsed.data.title}`,
  });
  return res.json({ ok: true });
});

// ---------- Chat with merchant ----------

router.get("/admin/p2p/merchants/:userId/chat", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  if (!users.has(userId)) return res.status(404).json({ error: "User not found" });
  return res.json(merchantAdminThread(userId));
});

router.post("/admin/p2p/merchants/:userId/chat", requireAdmin, (req, res) => {
  const userId = ((req.params["userId"] as string) as string);
  const stored = users.get(userId);
  if (!stored) return res.status(404).json({ error: "User not found" });

  const parsed = SendAdminP2PMerchantChatBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid message", details: parsed.error.issues });
  }
  const admin = req.storedUser!.user;
  const msg: Message = {
    id: newId("msg"),
    senderId: admin.id,
    senderName: admin.fullName,
    senderAvatar: admin.avatarUrl ?? null,
    content: parsed.data.content,
    context: "p2p_admin",
    contextId: null,
    isFromUser: false,
    createdAt: NOW(),
  };
  merchantAdminThread(userId).push(msg);

  // Mirror as a P2P notification so the merchant sees it in-app
  const data = getUserData(userId);
  const notification: import("@workspace/api-zod").P2PNotification = {
    id: newId("n"),
    type: "admin_message",
    title: "Message from platform",
    message: parsed.data.content.slice(0, 140),
    orderId: null,
    read: false,
    createdAt: NOW(),
  };
  data.p2pNotifications.unshift(notification);
  void persistP2PNotification(notification.id, userId, {
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
  return res.json(msg);
});

export default router;
