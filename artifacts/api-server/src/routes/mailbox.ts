/**
 * Mailbox routes — /mailbox (user), /admin/mailbox (admin)
 */
import { Router, type IRouter } from "express";
import {
  SendMailboxMessageBody,
  AdminMailboxReplyBody,
  UserMailboxReplyBody,
} from "@workspace/api-zod";
import {
  allMailboxThreads,
  getUserData,
  newId,
  NOW,
  userData,
  users,
} from "../lib/store";
import { requireAdmin, requireAuth } from "../lib/session";
import { notifyUser } from "../lib/notify";
import type { MailboxThreadData, MailboxMsg } from "../lib/store";

const NO_REPLY = "noreply@xpressprofx.com";

const PLATFORM_ADDRESSES = [
  NO_REPLY,
  "help@xpressprofx.com",
  "management@xpressprofx.com",
  "admin@xpressprofx.com",
  "chrislukeman@xpressprofx.com",
];

const USER_REACHABLE_ADDRESSES = PLATFORM_ADDRESSES.filter((a) => a !== NO_REPLY);

const router: IRouter = Router();

// GET /mailbox — current user's threads
router.get("/mailbox", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  return res.json(data.mailbox);
});

// POST /mailbox — create new thread (user sends to platform address)
router.post("/mailbox", requireAuth, (req, res) => {
  const parsed = SendMailboxMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const stored = users.get(req.userId!);
  const userEmail = stored?.user.email ?? "user@xpressprofx.com";
  const { to, subject, content, imageUrl } = parsed.data;

  if (to === NO_REPLY) {
    return res.status(400).json({
      error: `${NO_REPLY} is a one-way platform address. Send to ${USER_REACHABLE_ADDRESSES.join(", ")} instead.`,
    });
  }
  if (!USER_REACHABLE_ADDRESSES.includes(to)) {
    return res.status(400).json({
      error: `Invalid recipient. Valid addresses: ${USER_REACHABLE_ADDRESSES.join(", ")}`,
    });
  }

  const firstMsg: MailboxMsg = {
    id: newId("mm"),
    from: userEmail,
    content,
    imageUrl: imageUrl ?? null,
    createdAt: NOW(),
  };

  const thread: MailboxThreadData = {
    id: newId("thread"),
    userId: req.userId!,
    from: userEmail,
    to,
    subject,
    messages: [firstMsg],
    read: false,
    createdAt: NOW(),
    updatedAt: NOW(),
  };

  const data = getUserData(req.userId!);
  data.mailbox.push(thread);
  allMailboxThreads.set(thread.id, thread);

  return res.json(thread);
});

// GET /admin/mailbox — all threads
router.get("/admin/mailbox", requireAdmin, (_req, res) => {
  const threads: MailboxThreadData[] = [];
  for (const [, data] of userData) {
    threads.push(...data.mailbox);
  }
  threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return res.json(threads);
});

// POST /admin/mailbox/:threadId/reply — admin replies to thread
router.post("/admin/mailbox/:threadId/reply", requireAdmin, (req, res) => {
  const { threadId } = req.params as { threadId: string };
  const parsed = AdminMailboxReplyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const thread = allMailboxThreads.get(threadId);
  if (!thread) return res.status(404).json({ error: "Thread not found" });

  if (!PLATFORM_ADDRESSES.includes(parsed.data.from)) {
    return res.status(400).json({
      error: `Replies must come from a platform address: ${PLATFORM_ADDRESSES.join(", ")}`,
    });
  }

  const msg: MailboxMsg = {
    id: newId("mm"),
    from: parsed.data.from,
    content: parsed.data.content,
    imageUrl: parsed.data.imageUrl ?? null,
    createdAt: NOW(),
  };
  thread.messages.push(msg);
  thread.updatedAt = NOW();
  thread.read = true;
  // Admin opt-in: lock the thread so the user cannot reply. Replies from
  // NO_REPLY are also auto-locked.
  if (parsed.data.noReply || parsed.data.from === NO_REPLY) {
    thread.noReply = true;
  } else if (parsed.data.noReply === false) {
    thread.noReply = false;
  }

  notifyUser({
    userId: thread.userId,
    kind: "mailbox_reply",
    emailToggle: "mailboxReply",
    title: `New mailbox reply from ${parsed.data.from}`,
    body: thread.noReply
      ? `Re: ${thread.subject} — this thread is locked, please open a new mailbox message if you need to follow up.`
      : `Re: ${thread.subject}`,
    link: "/messages",
  });

  return res.json(thread);
});

// POST /mailbox/:threadId/reply — user replies; blocked when noReply.
router.post("/mailbox/:threadId/reply", requireAuth, (req, res) => {
  const { threadId } = req.params as { threadId: string };
  const parsed = UserMailboxReplyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const thread = allMailboxThreads.get(threadId);
  if (!thread || thread.userId !== req.userId) {
    return res.status(404).json({ error: "Thread not found" });
  }
  if (thread.noReply || thread.to === NO_REPLY) {
    return res.status(403).json({
      error: `${thread.to} is a no-reply thread. Open a new message to ${USER_REACHABLE_ADDRESSES.join(", ")} instead.`,
    });
  }

  const stored = users.get(req.userId!);
  const userEmail = stored?.user.email ?? "user@xpressprofx.com";
  const msg: MailboxMsg = {
    id: newId("mm"),
    from: userEmail,
    content: parsed.data.content,
    imageUrl: parsed.data.imageUrl ?? null,
    createdAt: NOW(),
  };
  thread.messages.push(msg);
  thread.updatedAt = NOW();
  thread.read = false;
  return res.json(thread);
});

export default router;
