/**
 * Live chat routes — user side + admin side + AI bot
 */
import { Router, type IRouter } from "express";
import {
  SendLiveChatMessageBody,
  AdminReplyLiveChatBody,
  AdminReplyLiveChatParams,
} from "@workspace/api-zod";
import { getChatNamespace } from "../lib/realtime";
import { adminPresence, getUserData, newId, NOW, userData, users } from "../lib/store";
import { persistChatMessage } from "../lib/db-persist";
import { requireAdmin, requireAuth, requireFullAuth } from "../lib/session";
import { generateAIReply } from "../lib/openai-client";
import { pushAdminAlert } from "../lib/notify";
import type { LiveChatMsg } from "../lib/store";

const ADMIN_PRESENCE_WINDOW_MS = 60_000;

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

const FALLBACK_REPLY =
  "Thanks for reaching out — our support team is reviewing your message. For urgent issues email help@xpressprofx.com, or type 'agent' to escalate to a live person.";

function keywordEscalation(content: string): boolean {
  const m = content.toLowerCase();
  return /(human|agent|real person|supervisor|manager|escalate|fraud|hack(ed)?|stolen|emergency)/.test(
    m,
  );
}

// GET /live-chat — current user's messages
router.get("/live-chat", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  return res.json(data.liveChat);
});

// POST /live-chat — send message, get AI reply (with possible handoff)
router.post("/live-chat", requireFullAuth, async (req, res) => {
  const parsed = SendLiveChatMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const data = getUserData(req.userId!);
  const stored = users.get(req.userId!);
  const userName = stored?.user.fullName ?? "User";

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
  void persistChatMessage(req.userId!, 'user', req.userId!, userMsg.content);

  // Build AI history from prior messages.
  const history = data.liveChat
    .filter((m) => m.id !== userMsg.id)
    .slice(-10)
    .map((m) => ({
      role: m.isFromUser ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const ai = await generateAIReply({
    userMessage: parsed.data.content,
    history,
    userName,
  });

  const replyText = ai?.content ?? FALLBACK_REPLY;
  const aiEscalated = ai?.escalated ?? false;
  const escalated = userMsg.escalated || aiEscalated;

  const botReply: LiveChatMsg = {
    id: newId("chat"),
    userId: req.userId!,
    senderName: "XpressPro FX AI Support",
    content: replyText,
    isFromUser: false,
    isBot: true,
    escalated: aiEscalated,
    createdAt: NOW(),
  };
  data.liveChat.push(botReply);
  void persistChatMessage(req.userId!, 'bot', null, botReply.content);

  if (escalated) {
    // Mark the most recent user msg as escalated and notify admins once.
    userMsg.escalated = true;
    const presence = presenceState();
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
    void persistChatMessage(req.userId!, 'bot', null, noAgentMsg.content);
    }
    pushAdminAlert({
      kind: "live_chat.handoff",
      title: presence.anyOnline
        ? "Live chat handoff requested"
        : "Live chat handoff requested — NO admin online",
      body: `${stored?.user.email ?? userName} requested a human agent. Last message: "${parsed.data.content.slice(0, 200)}"`,
      userId: req.userId!,
      userEmail: stored?.user.email ?? null,
      severity: presence.anyOnline ? "warning" : "critical",
      linkUrl: `/live-chat/${req.userId}`,
      email: true,
    });
  }

  return res.json({
    userMessage: userMsg,
    botReply,
    escalated,
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
router.get("/admin/live-chats", requireAdmin, (req, res) => {
  touchAdminPresence(req.userId!);
  const sessions = [];
  for (const [userId, data] of userData) {
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

// POST /admin/live-chats/:userId/reply — admin replies
router.post("/admin/live-chats/:userId/reply", requireAdmin, (req, res) => {
  const p = AdminReplyLiveChatParams.safeParse(req.params);
  const b = AdminReplyLiveChatBody.safeParse(req.body);
  if (!p.success || !b.success) return res.status(400).json({ error: "Invalid" });
  touchAdminPresence(req.userId!);

  const data = getUserData(p.data.userId);

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
  // Persist admin reply (best-effort) and broadcast in realtime to any connected clients in the conv room.
  void persistChatMessage(p.data.userId, 'admin', req.userId!, msg.content);
  try {
    const ns = getChatNamespace();
    ns?.to(`conv:${p.data.userId}`).emit('message', msg);
  } catch (err) {
    // best-effort; do not fail the request if broadcasting fails
  }

  return res.json(msg);
});

export default router;
