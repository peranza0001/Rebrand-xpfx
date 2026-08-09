/**
 * /messages routes — fetch and send messages across manager / p2p / support contexts.
 */
import { Router, type IRouter } from "express";
import {
  GetMessagesQueryParams,
  SendMessageBody,
  type Message,
} from "@workspace/api-zod";
import { getUserData, managers, newId, NOW } from "../lib/store";
import { persistSupportTicket } from "../lib/db-persist";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

function threadKey(context: string, contextId?: string | null): string {
  return `${context}:${contextId ?? "default"}`;
}

router.get("/messages", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const parsed = GetMessagesQueryParams.safeParse(req.query);
  const context = parsed.success ? parsed.data.context ?? "manager" : "manager";
  const contextId = parsed.success ? parsed.data.contextId : undefined;
  const key = threadKey(context, contextId ?? null);
  res.json(data.messages.get(key) ?? []);
});

router.post("/messages", requireAuth, (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid message", details: parsed.error.issues });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  const { context, contextId, content } = parsed.data;
  const key = threadKey(context, contextId);
  const list = data.messages.get(key) ?? [];
  const userMsg: Message = {
    id: newId("msg"),
    senderId: u.id,
    senderName: u.fullName,
    senderAvatar: u.avatarUrl ?? null,
    content,
    context,
    contextId: contextId ?? null,
    isFromUser: true,
    createdAt: NOW(),
  };
  list.push(userMsg);

  if (context === "manager" && u.selectedManagerId) {
    const manager = managers.find((m) => m.id === u.selectedManagerId);
    if (manager) {
      const replies = [
        "Got it — I'll factor that into the next entry.",
        "Noted. Watching the order book closely on this one.",
        "Understood. I'll update you once we hit the next level.",
        "Thanks for the heads-up. Adjusting position size accordingly.",
      ];
      const reply: Message = {
        id: newId("msg"),
        senderId: manager.id,
        senderName: manager.name,
        senderAvatar: manager.avatarUrl,
        content: replies[Math.floor(Math.random() * replies.length)] ?? "Got it.",
        context: "manager",
        contextId: null,
        isFromUser: false,
        createdAt: new Date(Date.now() + 1500).toISOString(),
      };
      list.push(reply);
    }
  } else if (context === "support" && contextId) {
    // Append to ticket thread too
    const ticket = data.supportTickets.find((t) => t.id === contextId);
    if (ticket) {
      ticket.messages.push(userMsg);
      ticket.updatedAt = NOW();
      const reply: Message = {
        id: newId("stm"),
        senderId: "support_agent",
        senderName: "XpressPro FX Support",
        senderAvatar: null,
        content: "Thanks — a specialist will follow up shortly.",
        context: "support",
        contextId,
        isFromUser: false,
        createdAt: new Date(Date.now() + 2000).toISOString(),
      };
      list.push(reply);
      ticket.messages.push(reply);
      void persistSupportTicket(ticket.id, req.userId!, {
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    }
  }
  data.messages.set(key, list);
  return res.json(userMsg);
});

export default router;
