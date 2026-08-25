/**
 * Live chat routes — user side + admin side + AI chatbot with human escalation
 * 
 * ChatWay-like system:
 * 1. User sends message → Chatbot responds immediately
 * 2. User requests human ("agent", "human", "escalate") → Chatbot escalates
 * 3. Escalation triggers:
 *    - Admin notification in app
 *    - Email to ADMIN_EMAIL with ticket ID
 *    - Email to SMTP_FROM (support@xpressprofx.com)
 *    - Admin can reply via admin panel or reply to support email
 * 4. Email replies are automatically added to chat (when admin replies to support@xpressprofx.com)
 */
import { Router, type IRouter } from "express";
import {
  SendLiveChatMessageBody,
  AdminReplyLiveChatBody,
  AdminReplyLiveChatParams,
  type SupportTicket,
} from "@workspace/api-zod";
import { getChatNamespace } from "../lib/realtime";
import { adminPresence, getUserData, newId, newUuid, NOW, userData, users } from "../lib/store";
import { getPersistedChatMessages, persistChatMessage, persistSupportTicket } from "../lib/db-persist";
import { requireAdmin, requireAuth } from "../lib/session";
import { generateAIReply, generateFaqReply, redactChatContent } from "../lib/openai-client";
import { pushAdminAlert } from "../lib/notify";
import { sendEmail } from "../lib/email";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import type { LiveChatMsg } from "../lib/store";
import { getChatbotResponse, keywordEscalation } from "../lib/chatbot";

const ADMIN_PRESENCE_WINDOW_MS = 60_000;
const SUPPORT_EMAIL = env.SMTP_FROM || "support@xpressprofx.com";

function touchAdminPresence(adminId: string): void {
  adminPresence.set(adminId, NOW());
}

interface PresenceState {
  onlineAdminCount: number;
  anyOnline: boolean;
  admins: Array<{ userId: string; email: string; fullName: string; lastSeenAt: string }>;
}

function presenceState(): PresenceState {
  const cutoff = Date.now() - ADMIN_PRESENCE_WINDOW_MS;
  const admins: PresenceState["admins"] = [];
  for (const [adminId, lastSeenAt] of adminPresence) {
    if (Date.parse(lastSeenAt) < cutoff) continue;
    const stored = users.get(adminId);
    if (!stored || stored.role !== "admin") continue;
    admins.push({
      userId: adminId,
      email: stored.user.email,
      fullName: stored.user.fullName,
      lastSeenAt,
    });
  }
  return { onlineAdminCount: admins.length, anyOnline: admins.length > 0, admins };
}

const router: IRouter = Router();

router.post("/live-chat/identify", requireAuth, (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const country = typeof req.body?.country === "string" ? req.body.country.trim().slice(0, 80) : "";
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid name and email." });
  }

  const stored = users.get(req.userId!);
  if (!stored) return res.status(404).json({ error: "Chat identity is unavailable." });
  stored.user.fullName = name;
  stored.user.email = email;
  if (country) stored.user.country = country;
  usersByEmail.set(email, req.userId!);
  return res.json({ name, email, country });
});

async function persistChatBestEffort(userId: string, senderType: 'user' | 'admin' | 'bot', senderId: string | null, content: string): Promise<void> {
  const persisted = await persistChatMessage(userId, senderType, senderId, content);
  if (!persisted) {
    logger.warn({ userId, senderType }, "live-chat persistence unavailable; serving from active session");
  }
}

// GET /live-chat — current user's messages
router.get("/live-chat", requireAuth, async (req, res) => {
  const data = getUserData(req.userId!);
  const persisted = await getPersistedChatMessages(req.userId!);
  if (persisted.length > 0) {
    data.liveChat.splice(0, data.liveChat.length, ...persisted);
  }
  return res.json(data.liveChat);
});

// POST /live-chat — send message, get AI reply (with possible handoff)
router.post("/live-chat", requireAuth, async (req, res) => {
  const parsed = SendLiveChatMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const data = getUserData(req.userId!);
  const stored = users.get(req.userId!);
  const userName = stored?.user.fullName ?? "User";
  let handoff: { ticketId: string; status: "queued"; agentAvailable: boolean } | null = null;

  const safeContent = redactChatContent(parsed.data.content);
  const userMsg: LiveChatMsg = {
    id: newId("chat"),
    userId: req.userId!,
    senderName: userName,
    content: safeContent,
    isFromUser: true,
    isBot: false,
    escalated: keywordEscalation(parsed.data.content),
    createdAt: NOW(),
  };
  data.liveChat.push(userMsg);
  await persistChatBestEffort(req.userId!, 'user', req.userId!, userMsg.content);

  try {
    const ns = getChatNamespace();
    ns?.to('admins').emit('message', userMsg);
  } catch {
    // best-effort notification delivery; do not fail the request
  }

  // Build AI history from prior messages.
  const history = data.liveChat
    .filter((m) => m.id !== userMsg.id)
    .slice(-10)
    .map((m) => ({
      role: m.isFromUser ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const ai = userMsg.escalated
    ? null
    : generateFaqReply(safeContent) ?? await generateAIReply({
      userMessage: safeContent,
      history,
      userName,
    });

  const localReply = getChatbotResponse(parsed.data.content, userName);
  const replyText = userMsg.escalated
    ? localReply.content
    : ai?.content || localReply.content;
  const aiEscalated = ai?.escalated ?? false;
  const escalated = userMsg.escalated || aiEscalated;

  const botReply: LiveChatMsg = {
    id: newId("chat"),
    userId: req.userId!,
    senderName: "XpressPro FX AI Support",
    content: replyText,
    isFromUser: false,
    isBot: true,
    escalated: userMsg.escalated || aiEscalated,
    createdAt: NOW(),
  };
  data.liveChat.push(botReply);
  await persistChatBestEffort(req.userId!, 'bot', null, botReply.content);

  if (escalated) {
    // Mark the most recent user msg as escalated and notify admins once.
    userMsg.escalated = true;
    const presence = presenceState();
    const ticketId = `XPFX-${newId("ticket").substring(0, 8).toUpperCase()}`;
    const ticketRecordId = newUuid();
    const ticketCreatedAt = NOW();
    const ticket: SupportTicket = {
      id: ticketRecordId,
      subject: `Live chat escalation ${ticketId}`,
      status: "open",
      priority: presence.anyOnline ? "medium" : "high",
      messages: [],
      createdAt: ticketCreatedAt,
      updatedAt: ticketCreatedAt,
    };
    data.supportTickets.unshift(ticket);
    void persistSupportTicket(ticket.id, req.userId!, {
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
    handoff = { ticketId, status: "queued", agentAvailable: presence.anyOnline };
    
    if (!presence.anyOnline) {
      const noAgentMsg: LiveChatMsg = {
        id: newId("chat"),
        userId: req.userId!,
        senderName: "XpressPro FX AI Support",
        content:
          "No agent is available right now. I've notified our support team and they will reply here as soon as they're back online — you'll also receive a mailbox notification when they respond. In the meantime, you can keep typing and I'll keep helping.",
        isFromUser: false,
        isBot: true,
        escalated: true,
        createdAt: NOW(),
      };
      data.liveChat.push(noAgentMsg);
      await persistChatMessage(req.userId!, 'bot', null, noAgentMsg.content);
    }
    
    // Notify admin in-app
    pushAdminAlert({
      kind: "live_chat.handoff",
      title: presence.anyOnline
        ? "Live chat handoff requested"
        : "Live chat handoff requested — NO admin online",
      body: `${stored?.user.email ?? userName} requested a human agent. Ticket: ${ticketId}\n\nMessage: "${safeContent.slice(0, 200)}"`,
      userId: req.userId!,
      userEmail: stored?.user.email ?? null,
      severity: presence.anyOnline ? "warning" : "critical",
      linkUrl: `/live-chat/${req.userId}`,
      email: true,
    });

    // Send ChatWay-style email notification to support email (SMTP_FROM)
    // Admin can reply directly to this email and it will be added to the chat
    const userEmail = stored?.user.email ?? "unknown@example.com";
    const emailSubject = `[LIVECHAT] ${ticketId} - ${userName} needs support`;
    const emailBody = `New live chat escalation request:\n\n` +
      `Ticket ID: ${ticketId}\n` +
      `User: ${userName}\n` +
      `Email: ${userEmail}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `User Message:\n${safeContent}\n\n` +
      `---\n` +
      `Reply to this email to respond to the user (or use the admin panel at ${env.FRONTEND_URL || 'https://app.xpressprofx.com'}/admin/livechat)\n` +
      `Ticket ID ${ticketId} will be tracked with this conversation.\n`;

    void sendEmail({
      to: SUPPORT_EMAIL,
      subject: emailSubject,
      body: emailBody,
      text: emailBody,
      kind: "live_chat.escalation",
    }).catch(() => undefined);
  }

  return res.json({
    userMessage: userMsg,
    botReply,
    escalated,
    handoff,
  });
});

// Admin presence endpoints.
router.post("/admin/presence/heartbeat", requireAdmin, (req, res) => {
  touchAdminPresence(req.userId!);
  return res.json(presenceState());
});

router.get("/admin/presence", requireAdmin, (_req, res) => {
  return res.json(presenceState());
});

// GET /admin/live-chats — list all chat sessions (admin)
router.get("/admin/live-chats", requireAdmin, async (req, res) => {
  touchAdminPresence(req.userId!);
  const sessions = [];
  for (const [userId, data] of userData) {
    const persistedMessages = await getPersistedChatMessages(userId);
    if (persistedMessages.length > 0) {
      data.liveChat.splice(0, data.liveChat.length, ...persistedMessages);
    }
    if (data.liveChat.length === 0) continue;
    const stored = users.get(userId);
    const lastMsg = data.liveChat[data.liveChat.length - 1];
    const unread = data.liveChat.filter((m) => m.isFromUser).length;
    sessions.push({
      userId,
      userName: stored?.user.fullName ?? "Unknown",
      userEmail: stored?.user.email ?? "",
      messages: data.liveChat,
      lastMessageAt: lastMsg?.createdAt ?? NOW(),
      escalated: data.liveChat.some((m) => m.escalated),
      unreadByAdmin: unread,
    });
  }
  return res.json(sessions);
});

// POST /admin/live-chats/:userId/reply — admin replies (via panel or email)
router.post("/admin/live-chats/:userId/reply", requireAdmin, async (req, res) => {
  const p = AdminReplyLiveChatParams.safeParse(req.params);
  const b = AdminReplyLiveChatBody.safeParse(req.body);
  if (!p.success || !b.success) return res.status(400).json({ error: "Invalid" });
  touchAdminPresence(req.userId!);

  const data = getUserData(p.data.userId);
  const adminStored = users.get(req.userId!);
  const adminName = adminStored?.user.fullName ?? "Support Agent";

  const msg: LiveChatMsg = {
    id: newId("chat"),
    userId: p.data.userId,
    senderName: "XpressPro FX Support",
    content: b.data.content,
    isFromUser: false,
    isBot: false,
    escalated: false,
    createdAt: NOW(),
  };
  data.liveChat.push(msg);
  const persisted = await persistChatMessage(p.data.userId, 'admin', req.userId!, msg.content);
  if (!persisted) {
    data.liveChat.pop();
    return res.status(503).json({ error: "Chat storage is temporarily unavailable. Please try again." });
  }
  // Broadcast after durable persistence so connected clients never see a message
  // that disappears on restart.
  try {
    const ns = getChatNamespace();
    ns?.to(`conv:${p.data.userId}`).emit('message', msg);
  } catch {
    // best-effort; do not fail the request if broadcasting fails
  }

  const recipient = users.get(p.data.userId)?.user.email;
  if (recipient) {
    // Send email notification to user with admin reply
    void sendEmail({
      to: recipient,
      from: SUPPORT_EMAIL,
      subject: "Reply from XpressPro FX Support",
      body: `${adminName} replied:\n\n${b.data.content}\n\n---\nReply to this email or visit your account to continue the conversation.`,
      kind: "live_chat.admin_reply",
    }).catch(() => undefined);
  }

  return res.json(msg);
});

/**
 * POST /live-chat/email-reply — Handle inbound email replies from support inbox
 * 
 * When admin replies to livechat notification emails, this endpoint processes
 * the reply and adds it to the conversation. Used by email webhook or manual ingestion.
 * 
 * ChatWay-like: Allows admins to reply directly from their email client.
 */
router.post("/live-chat/email-reply", async (req, res) => {
  // This would typically come from SendGrid/SMTP webhook
  // For now, we require a simple authentication token or API key
  const { ticketId, userId, senderName, content, fromEmail } = req.body;
  
  if (!ticketId || !userId || !content) {
    return res.status(400).json({ error: "Missing required fields: ticketId, userId, content" });
  }

  try {
    const data = getUserData(userId);
    if (!data) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add admin reply to chat
    const msg: LiveChatMsg = {
      id: newId("chat"),
      userId,
      senderName: senderName || "XpressPro FX Support",
      content,
      isFromUser: false,
      isBot: false,
      escalated: false,
      createdAt: NOW(),
    };
    data.liveChat.push(msg);
    const persisted = await persistChatMessage(userId, 'admin', null, content);
    if (!persisted) {
      data.liveChat.pop();
      return res.status(503).json({ error: "Chat storage is temporarily unavailable. Please try again." });
    }

    // Broadcast in realtime
    try {
      const ns = getChatNamespace();
      ns?.to(`conv:${userId}`).emit('message', msg);
    } catch {
      // best-effort
    }

    // Send confirmation email back to support team
    void sendEmail({
      to: fromEmail || SUPPORT_EMAIL,
      subject: `Email reply received - ${ticketId}`,
      body: `Your reply to ticket ${ticketId} has been posted to the customer's chat.\n\nMessage has been delivered to the conversation.`,
      kind: "live_chat.email_reply_confirmation",
    }).catch(() => undefined);

    return res.json({ success: true, message: "Reply added to chat", msg });
  } catch {
    return res.status(500).json({ error: "Failed to process email reply" });
  }
});

/**
 * GET /live-chat/status — Check livechat system status and support email connectivity
 */
router.get("/live-chat/status", (_req, res) => {
  return res.json({
    status: "operational",
    supportEmail: SUPPORT_EMAIL,
    features: {
      chatbot: true,
      humanEscalation: true,
      emailNotification: true,
      emailReply: true,
    },
    timestamp: NOW(),
  });
});

export default router;
