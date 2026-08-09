/**
 * Admin-only routes: alerts stream, per-action notification settings,
 * sent-email log viewer, and broadcast-ticket creator.
 */
import { Router, type IRouter } from "express";
import {
  CreateBroadcastSupportTicketBody,
  UpdateAdminNotificationSettingsBody,
  type BroadcastResult,
  type Message,
  type SupportTicket,
} from "@workspace/api-zod";
import {
  adminAlerts,
  allMailboxThreads,
  getUserData,
  logActivity,
  newId,
  notificationSettings,
  NOW,
  sentEmails,
  users,
} from "../lib/store";
import { persistSupportTicket } from "../lib/db-persist";
import type { MailboxMsg, MailboxThreadData } from "../lib/store";
import { requireAdmin } from "../lib/session";
import { notifyUser } from "../lib/notify";

const router: IRouter = Router();

// ---------- Alerts ----------

router.get("/admin/alerts", requireAdmin, (_req, res) => {
  return res.json(adminAlerts);
});

router.post("/admin/alerts/read-all", requireAdmin, (_req, res) => {
  for (const a of adminAlerts) a.read = true;
  return res.json({ success: true, message: "All admin alerts marked read." });
});

// ---------- Notification settings (per-action email toggle) ----------

router.get("/admin/notification-settings", requireAdmin, (_req, res) => {
  return res.json(notificationSettings);
});

router.patch("/admin/notification-settings", requireAdmin, (req, res) => {
  const parsed = UpdateAdminNotificationSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid settings", details: parsed.error.issues });
  }
  Object.assign(notificationSettings, parsed.data);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.notification_settings.update",
    detail: "Updated per-action email notification toggles.",
  });
  return res.json(notificationSettings);
});

// ---------- Sent emails log ----------

router.get("/admin/sent-emails", requireAdmin, (_req, res) => {
  return res.json(sentEmails);
});

// ---------- Broadcast support ticket ----------

router.post("/admin/broadcast-tickets", requireAdmin, (req, res) => {
  const parsed = CreateBroadcastSupportTicketBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid broadcast", details: parsed.error.issues });
  }
  const actor = req.storedUser!;
  const mode = parsed.data.mode ?? "ticket";
  const filters = parsed.data.filters ?? {};
  let recipients = 0;
  let skipped = 0;

  for (const [userId, stored] of users) {
    if (stored.role === "admin") continue;
    const data = getUserData(userId);

    // Apply recipient filters.
    if (filters.kycStatus && filters.kycStatus !== "any" && data.kyc.status !== filters.kycStatus) {
      skipped += 1;
      continue;
    }
    if (filters.country && stored.user.country?.toLowerCase() !== filters.country.toLowerCase()) {
      skipped += 1;
      continue;
    }
    if (filters.merchant === "only" && !stored.merchant) { skipped += 1; continue; }
    if (filters.merchant === "exclude" && stored.merchant) { skipped += 1; continue; }

    if (mode === "mailbox") {
      const threadId = newId("thread");
      const msg: MailboxMsg = {
        id: newId("mm"),
        from: "help@xpressprofx.com",
        content: parsed.data.message,
        imageUrl: parsed.data.imageUrl ?? null,
        createdAt: NOW(),
      };
      const thread: MailboxThreadData = {
        id: threadId,
        userId,
        from: "help@xpressprofx.com",
        to: stored.user.email,
        subject: `[Broadcast] ${parsed.data.subject}`,
        messages: [msg],
        read: false,
        createdAt: NOW(),
        updatedAt: NOW(),
        noReply: true,
      };
      data.mailbox.unshift(thread);
      allMailboxThreads.set(threadId, thread);
    } else {
      const ticketId = newId("st");
      const fullMessage = parsed.data.imageUrl
        ? `${parsed.data.message}\n\n[image] ${parsed.data.imageUrl}`
        : parsed.data.message;
      const broadcastMsg: Message = {
        id: newId("stm"),
        senderId: actor.user.id,
        senderName: "XpressPro FX Team",
        senderAvatar: null,
        content: fullMessage,
        context: "support",
        contextId: ticketId,
        isFromUser: false,
        createdAt: NOW(),
      };
      const ticket: SupportTicket = {
        id: ticketId,
        subject: `[Broadcast] ${parsed.data.subject}`,
        status: "open",
        priority: parsed.data.priority,
        messages: [broadcastMsg],
        createdAt: NOW(),
        updatedAt: NOW(),
      };
      data.supportTickets.unshift(ticket);
      void persistSupportTicket(ticket.id, userId, {
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    }

    notifyUser({
      userId,
      kind: "broadcast_ticket",
      emailToggle: "broadcastTicket",
      title: parsed.data.subject,
      body: parsed.data.message,
      link: mode === "mailbox" ? "/messages" : "/support",
    });
    recipients += 1;
  }

  logActivity({
    actorId: req.userId!,
    actorName: actor.user.fullName,
    action: "admin.broadcast_ticket",
    detail: `Broadcast (${mode}) "${parsed.data.subject}" delivered to ${recipients} users (skipped ${skipped} via filters).`,
  });
  const result: BroadcastResult = { recipients, mode, skipped };
  return res.json(result);
});

export default router;
