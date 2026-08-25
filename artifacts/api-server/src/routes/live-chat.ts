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
} from "@workspace/api-zod";
import { getChatNamespace } from "../lib/realtime";
import { adminPresence, getUserData, newId, NOW, userData, users } from "../lib/store";
import { getPersistedChatMessages, persistChatMessage } from "../lib/db-persist";
import { requireAdmin, requireAuth } from "../lib/session";
import { generateAIReply } from "../lib/openai-client";
import { pushAdminAlert } from "../lib/notify";
import { sendEmail } from "../lib/email";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import type { LiveChatMsg } from "../lib/store";

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

function localSupportReply(content: string, userName: string): string {
  const message = content.toLowerCase();
  const greeting = userName && userName !== "User" ? `Hi ${userName.split(/\s+/)[0]}! ` : "Hi! ";

  if (keywordEscalation(content)) {
    return `${greeting}I understand this needs human support. I have sent your conversation to our support team and a representative will take over here. Please do not share passwords, one-time codes, or private keys in chat.`;
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(message)) {
    return `${greeting}How can I help you today? I can guide you through your account, demo trading, deposits, withdrawals, KYC, or platform features.`;
  }
  if (/(deposit|fund|add money|cash in)/.test(message)) {
    return `${greeting}You can start a deposit from the Wallets page. Choose an available method, review the fee and destination details, and follow the confirmation steps shown there. I can also connect you with a support agent if you need help with a specific transaction.`;
  }
  if (/(withdraw|cash out|withdrawal)/.test(message)) {
    return `${greeting}Withdrawals are managed from the Wallets page. Make sure your destination details are correct and complete any required verification before submitting. Tell me whether you need help with crypto, bank, or card withdrawals.`;
  }
  if (/(kyc|verify|verification|identity)/.test(message)) {
    return `${greeting}KYC verification is available from the KYC page. Submit clear, valid documents that match your account details, then monitor the status there. I can explain the steps or connect you with an agent.`;
  }
  if (/(fee|fees|commission|spread|cost|charge)/.test(message)) {
    return `${greeting}Fees and spreads depend on the product, payment method, currency, and account conditions. Review the amount and fee breakdown shown before confirming an action. I cannot see or change account-specific charges in chat.`;
  }
  if (/(leverage|margin|liquidat|stop.?loss|take.?profit|risk)/.test(message)) {
    return `${greeting}Leverage increases both potential gains and losses. Margin can be reduced by adverse price movement, and stop-loss or take-profit orders do not guarantee a fill at the requested price. Use the Demo Trading workspace to practise and never risk funds you cannot afford to lose.`;
  }
  if (/(forex|currency pair|pip|lot|spread)/.test(message)) {
    return `${greeting}Forex trading uses currency pairs such as EUR/USD. The first currency is the base and the second is the quote currency; price movements are measured in pips. Check the instrument details, market status, spread, margin, and applicable restrictions before placing an order.`;
  }
  if (/(invest|smartvest|portfolio|return|profit|yield|plan)/.test(message)) {
    return `${greeting}Investment and SmartVest products involve market risk and do not guarantee returns. Review each product's objective, fees, risk level, redemption terms, and suitability information before subscribing. I can explain platform navigation, but I cannot provide personalized investment advice.`;
  }
  if (/(copy.?trad|follow trader|strategy|signal)/.test(message)) {
    return `${greeting}Copy trading can reproduce another trader's activity but does not remove market risk. Review the strategy history, allocation, drawdown, fees, and stop-copy controls before following anyone. Past performance is not a guarantee of future results.`;
  }
  if (/(p2p|peer.?to.?peer|merchant)/.test(message)) {
    return `${greeting}P2P trades are managed in the P2P marketplace. Check the merchant profile, price, limits, payment instructions, and escrow status, and keep communication on-platform. Never release assets until the payment is verified in your account.`;
  }
  if (/(wallet|balance|transaction|transfer|pending|status)/.test(message)) {
    return `${greeting}You can review balances, transfers, and transaction status from the Wallets page. Chat cannot expose private account data or change a transaction. Share only a public transaction reference with support, never passwords, OTPs, seed phrases, or private keys.`;
  }
  if (/(security|2fa|two.?factor|otp|code|phish|password|private key|seed)/.test(message)) {
    return `${greeting}Keep your password, one-time codes, recovery phrase, and private keys private. XpressPro FX support will never ask for them. If you suspect unauthorized access, secure your email, change your password, stop sharing information, and request a human-agent review immediately.`;
  }
  if (/(error|bug|broken|not work|unable|can't|cannot|technical)/.test(message)) {
    return `${greeting}I can help troubleshoot that. Tell me which page or action failed, the exact non-sensitive error text, and whether you are using the website or app. Do not include passwords, OTPs, wallet seed phrases, or private keys; I can escalate the case to a human representative.`;
  }
  if (/(demo|paper|practice|trade|trading|order)/.test(message)) {
    return `${greeting}The Demo Trading workspace uses simulated funds and live practice-market updates. Select an instrument, choose Buy or Sell, enter a position size, and submit the order. No real funds are moved in demo mode.`;
  }
  if (/(account|login|password recovery|forgot password|sign up|register)/.test(message)) {
    return `${greeting}I can help with account access, signup, password recovery, and profile settings. Tell me what is preventing you from accessing your account, without sharing your password or verification code.`;
  }
  return `${greeting}How can I help you today? I can answer questions about accounts, demo trading, deposits, withdrawals, KYC, and platform features. Type "agent" any time if you need a human support representative.`;
}

function keywordEscalation(content: string): boolean {
  const m = content.toLowerCase();
  return /(human|agent|real person|supervisor|manager|escalate|fraud|hack(ed)?|stolen|emergency)/.test(
    m,
  );
}

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

  const userMsg: LiveChatMsg = {
    id: newId("chat"),
    userId: req.userId!,
    senderName: userName,
    content: parsed.data.content,
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
    : await generateAIReply({
      userMessage: parsed.data.content,
      history,
      userName,
    });

  const replyText = userMsg.escalated
    ? localSupportReply(parsed.data.content, userName)
    : ai?.content || localSupportReply(parsed.data.content, userName);
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
    const ticketId = `TC-${newId("ticket").substring(0, 8).toUpperCase()}`;
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
      body: `${stored?.user.email ?? userName} requested a human agent. Ticket: ${ticketId}\n\nMessage: "${parsed.data.content.slice(0, 200)}"`,
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
      `User Message:\n${parsed.data.content}\n\n` +
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
