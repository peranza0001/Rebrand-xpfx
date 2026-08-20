/**
 * /support routes — list and create support tickets.
 */
import { Router, type IRouter } from "express";
import {
  CreateSupportTicketBody,
  type Message,
  type SupportTicket,
} from "@workspace/api-zod";
import { getUserData, newId, NOW } from "../lib/store";
import { persistSupportTicket } from "../lib/db-persist";
import { requireAuth, requireFullAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/support/tickets", requireAuth, (req, res) => {
  res.json(getUserData(req.userId!).supportTickets);
});

router.get("/support/tickets/:ticketId", requireAuth, (req, res) => {
  const ticket = getUserData(req.userId!).supportTickets.find((item) => item.id === req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });
  return res.json(ticket);
});

router.post("/support/tickets", requireFullAuth, (req, res) => {
  const parsed = CreateSupportTicketBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ticket", details: parsed.error.issues });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  const ticketId = newId("st");
  const initialMessage: Message = {
    id: newId("stm"),
    senderId: u.id,
    senderName: u.fullName,
    senderAvatar: u.avatarUrl ?? null,
    content: parsed.data.message,
    context: "support",
    contextId: ticketId,
    isFromUser: true,
    createdAt: NOW(),
  };
  const autoReply: Message = {
    id: newId("stm"),
    senderId: "support_agent",
    senderName: "XpressPro FX Support",
    senderAvatar: null,
    content: "Thanks for reaching out — a support specialist will reply within a few hours.",
    context: "support",
    contextId: ticketId,
    isFromUser: false,
    createdAt: new Date(Date.now() + 2000).toISOString(),
  };
  const ticket: SupportTicket = {
    id: ticketId,
    subject: parsed.data.subject,
    status: "open",
    priority: parsed.data.priority,
    messages: [initialMessage, autoReply],
    createdAt: NOW(),
    updatedAt: NOW(),
  };
  data.supportTickets.unshift(ticket);
  void persistSupportTicket(ticket.id, u.id, {
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  });
  return res.json(ticket);
});

router.post("/support/tickets/:ticketId/reply", requireFullAuth, (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 4000) {
    return res.status(400).json({ error: "Reply content must be between 1 and 4000 characters." });
  }

  const data = getUserData(req.userId!);
  const ticket = data.supportTickets.find((item) => item.id === req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });
  if (ticket.status === "closed" || ticket.status === "resolved") {
    return res.status(409).json({ error: "This support ticket is closed." });
  }

  const user = req.storedUser!.user;
  const message: Message = {
    id: newId("stm"),
    senderId: user.id,
    senderName: user.fullName,
    senderAvatar: user.avatarUrl ?? null,
    content,
    context: "support",
    contextId: ticket.id,
    isFromUser: true,
    createdAt: NOW(),
  };
  ticket.messages.push(message);
  ticket.updatedAt = NOW();
  void persistSupportTicket(ticket.id, user.id, {
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  });
  return res.json({ ticket, message });
});

export default router;
