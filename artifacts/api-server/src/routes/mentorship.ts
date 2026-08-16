import { Router, type IRouter } from "express";
import { z } from "zod";
import { applyWalletDebit, getUserData, logActivity, newId, NOW } from "../lib/store";
import { requireAuth } from "../lib/session";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface Mentor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  experience: string;
  avatar: string;
  availability: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
}

// Seeded mentors with diverse specialties
const mentors: Mentor[] = [
  {
    id: "m_mentor_001",
    name: "Sarah Chen",
    title: "Senior FX Trader",
    specialty: "Forex Day Trading & Technical Analysis",
    bio: "10+ years in Forex markets. Specializes in breakout strategies and risk management for retail traders.",
    hourlyRate: 150,
    rating: 4.9,
    reviewCount: 287,
    experience: "10+ years",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=ffd5dc",
    availability: [
      { dayOfWeek: "Monday", startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: "Wednesday", startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: "Friday", startTime: "09:00", endTime: "17:00" },
    ],
  },
  {
    id: "m_mentor_002",
    name: "Raj Patel",
    title: "Portfolio Manager & Swing Trader",
    specialty: "Swing Trading & Position Management",
    bio: "Managed $50M+ in assets. Expert in swing trading, position sizing, and portfolio diversification.",
    hourlyRate: 200,
    rating: 4.8,
    reviewCount: 156,
    experience: "15+ years",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=raj&backgroundColor=c0aede",
    availability: [
      { dayOfWeek: "Tuesday", startTime: "14:00", endTime: "18:00" },
      { dayOfWeek: "Thursday", startTime: "14:00", endTime: "18:00" },
      { dayOfWeek: "Saturday", startTime: "10:00", endTime: "14:00" },
    ],
  },
  {
    id: "m_mentor_003",
    name: "Emma Rodriguez",
    title: "Risk Management Specialist",
    specialty: "Risk Assessment & Capital Preservation",
    bio: "Former risk analyst at major investment bank. Teaches advanced risk management and position sizing.",
    hourlyRate: 180,
    rating: 4.7,
    reviewCount: 203,
    experience: "12+ years",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=d1d4f9",
    availability: [
      { dayOfWeek: "Monday", startTime: "10:00", endTime: "12:00" },
      { dayOfWeek: "Wednesday", startTime: "10:00", endTime: "12:00" },
      { dayOfWeek: "Friday", startTime: "10:00", endTime: "12:00" },
    ],
  },
  {
    id: "m_mentor_004",
    name: "James Wilson",
    title: "Crypto & Alt-Assets Trader",
    specialty: "Cryptocurrency & Emerging Markets",
    bio: "Early adopter and crypto trading expert. Guides traders through crypto volatility and DeFi opportunities.",
    hourlyRate: 160,
    rating: 4.6,
    reviewCount: 189,
    experience: "8+ years",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james&backgroundColor=b6e3f4",
    availability: [
      { dayOfWeek: "Tuesday", startTime: "18:00", endTime: "21:00" },
      { dayOfWeek: "Thursday", startTime: "18:00", endTime: "21:00" },
      { dayOfWeek: "Sunday", startTime: "14:00", endTime: "17:00" },
    ],
  },
];

interface MentorshipSession {
  id: string;
  userId: string;
  mentorId: string;
  status: "scheduled" | "completed" | "cancelled";
  scheduledDate: string;
  duration: number; // minutes
  cost: number;
  topic: string;
  notes: string;
  createdAt: string;
  completedAt?: string;
}

// In-memory storage for mentorship sessions
export const mentorshipSessions = new Map<string, MentorshipSession[]>();

/**
 * GET /mentorship/mentors
 * Returns list of available mentors
 */
router.get("/mentors", requireAuth, (_req, res) => {
  try {
    return res.json({
      success: true,
      mentors: mentors.map((m) => ({
        ...m,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] GET /sessions error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentors.",
    });
  }
});

router.get("/mentorship/mentors", requireAuth, (_req, res) => {
  try {
    return res.json({
      success: true,
      mentors: mentors.map((m) => ({
        ...m,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] GET /mentors error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentors.",
    });
  }
});

/**
 * GET /mentorship/mentors/:mentorId
 * Returns single mentor with availability
 */
router.get("/mentors/:mentorId", requireAuth, (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentor = mentors.find((m) => m.id === mentorId);

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found.",
      });
    }

    return res.json({
      success: true,
      mentor,
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] GET /mentors/:mentorId error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentor details.",
    });
  }
});

router.get("/mentorship/mentors/:mentorId", requireAuth, (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentor = mentors.find((m) => m.id === mentorId);

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found.",
      });
    }

    return res.json({
      success: true,
      mentor,
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] GET /mentors/:mentorId error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentor details.",
    });
  }
});

/**
 * POST /mentorship/sessions/book
 * Books a mentorship session with payment request
 */
const MentorBookBody = z.object({
  scheduledDate: z.string().optional(),
  duration: z.number().min(30).max(180).optional(),
  topic: z.string().min(10).max(500).optional(),
  notes: z.string().optional(),
  walletId: z.string().optional(),
  slot: z.string().optional(),
});

const BookSessionBody = z.object({
  mentorId: z.string(),
  scheduledDate: z.string(),
  duration: z.number().min(30).max(180),
  topic: z.string().min(10).max(500),
  notes: z.string().optional(),
  walletId: z.string().optional(),
});

router.post("/mentors/:mentorId/book", requireAuth, (req, res) => {
  try {
    const parsed = MentorBookBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking request.",
        details: parsed.error.issues,
      });
    }

    const mentorId = req.params.mentorId;
    const { scheduledDate, duration, topic, notes, walletId, slot } = parsed.data;

    const resolvedMentorId = mentorId ?? "";
    const resolvedDuration = duration ?? 60;
    const resolvedTopic = topic ?? "Mentorship session";
    const resolvedScheduledDate = scheduledDate ?? slot ?? NOW();

    const mentor = mentors.find((m) => m.id === resolvedMentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found.",
      });
    }

    const durationHours = resolvedDuration / 60;
    const cost = Number((mentor.hourlyRate * durationHours).toFixed(2));

    const data = getUserData(req.userId!);
    let wallet;
    try {
      ({ wallet } = applyWalletDebit(
        data,
        walletId,
        cost,
        `Mentorship session: ${mentor.name} - ${resolvedTopic}`,
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed.";
      return res.status(400).json({
        success: false,
        message,
      });
    }

    const sessionId = newId("ms");
    const session: MentorshipSession = {
      id: sessionId,
      userId: req.userId!,
      mentorId: resolvedMentorId,
      status: "scheduled",
      scheduledDate: resolvedScheduledDate,
      duration: resolvedDuration,
      cost,
      topic: resolvedTopic,
      notes: notes || "",
      createdAt: NOW(),
    };

    if (!mentorshipSessions.has(req.userId!)) {
      mentorshipSessions.set(req.userId!, []);
    }
    mentorshipSessions.get(req.userId!)!.push(session);

    logActivity({
      actorId: req.userId!,
      actorName: "user",
      action: "mentorship_booked",
      detail: `Booked mentorship session with ${mentor.name}`,
      metadata: {
        sessionId,
        mentorId: resolvedMentorId,
        cost,
        duration: resolvedDuration,
        scheduledDate: resolvedScheduledDate,
      },
    });

    notifyUser({
      userId: req.userId!,
      kind: "mentorship",
      title: "Mentorship Session Booked! 📅",
      body: `Session with ${mentor.name} scheduled for ${new Date(resolvedScheduledDate).toLocaleDateString()}`,
      link: null,
    });

    pushAdminAlert({
      kind: "mentorship.booking",
      title: "New Mentorship Booking",
      body: `User booked ${resolvedDuration}min session with ${mentor.name} for $${cost}`,
      userId: req.userId,
      severity: "info",
    });

    return res.json({
      success: true,
      message: "Mentorship session booked successfully.",
      session,
      payment: {
        amount: cost,
        walletId: wallet.id,
        status: "completed",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] POST /mentors/:mentorId/book error");
    return res.status(500).json({
      success: false,
      message: "Failed to book mentorship session.",
    });
  }
});

router.post("/mentorship/sessions/book", requireAuth, (req, res) => {
  try {
    const parsed = BookSessionBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking request.",
        details: parsed.error.issues,
      });
    }

    const { mentorId, scheduledDate, duration, topic, notes, walletId } =
      parsed.data;

    const resolvedMentorId = mentorId ?? "";
    const resolvedDuration = duration ?? 60;
    const resolvedTopic = topic ?? "Mentorship session";
    const resolvedScheduledDate = scheduledDate ?? NOW();

    // Verify mentor exists
    const mentor = mentors.find((m) => m.id === resolvedMentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found.",
      });
    }

    // Calculate cost
    const durationHours = resolvedDuration / 60;
    const cost = Number((mentor.hourlyRate * durationHours).toFixed(2));

    // Get user data
    const data = getUserData(req.userId!);

    // Verify wallet has sufficient balance
    const wallet =
      (walletId ? data.wallets.find((w) => w.id === walletId) : null) ??
      data.wallets.find((w) => w.type === "main");

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "No funding wallet available.",
      });
    }

    if (wallet.balance < cost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Session costs ${cost}, but you have ${wallet.balance} available.`,
        requiredBalance: cost,
        availableBalance: wallet.balance,
      });
    }

    // Create session
    const sessionId = newId("ms");
    const session: MentorshipSession = {
      id: sessionId,
      userId: req.userId!,
      mentorId: resolvedMentorId,
      status: "scheduled",
      scheduledDate: resolvedScheduledDate,
      duration: resolvedDuration,
      cost,
      topic: resolvedTopic,
      notes: notes || "",
      createdAt: NOW(),
    };

    // Store session
    if (!mentorshipSessions.has(req.userId!)) {
      mentorshipSessions.set(req.userId!, []);
    }
    mentorshipSessions.get(req.userId!)!.push(session);

    // Deduct from wallet
    wallet.balance = Number((wallet.balance - cost).toFixed(2));

    // Record transaction
    data.transactions.unshift({
      id: newId("tx"),
      walletId: wallet.id,
      type: "fee",
      amount: -cost,
      currency: "USD",
      status: "completed",
      description: `Mentorship session: ${mentor.name} - ${resolvedTopic}`,
      createdAt: NOW(),
    });

    // Log activity
    logActivity({
      actorId: req.userId!,
      actorName: "user",
      action: "mentorship_booked",
      detail: `Booked mentorship session with ${mentor.name}`,
      metadata: {
        sessionId,
        mentorId: resolvedMentorId,
        cost,
        duration: resolvedDuration,
        scheduledDate: resolvedScheduledDate,
      },
    });

    // Notify user
    notifyUser({
      userId: req.userId!,
      kind: "mentorship",
      title: "Mentorship Session Booked! 📅",
      body: `Session with ${mentor.name} scheduled for ${new Date(resolvedScheduledDate).toLocaleDateString()}`,
      link: null,
    });

    // Alert admin
    pushAdminAlert({
      kind: "mentorship.booking",
      title: "New Mentorship Booking",
      body: `User booked ${resolvedDuration}min session with ${mentor.name} for $${cost}`,
      userId: req.userId,
      severity: "info",
    });

    return res.json({
      success: true,
      message: "Mentorship session booked successfully.",
      session,
      payment: {
        amount: cost,
        walletId: wallet.id,
        status: "completed",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] POST /sessions/book error");
    return res.status(500).json({
      success: false,
      message: "Failed to book mentorship session.",
    });
  }
});

/**
 * GET /mentorship/sessions
 * Returns user's mentorship sessions
 */
router.get("/mentorship/sessions", requireAuth, (req, res) => {
  try {
    const sessions = mentorshipSessions.get(req.userId!) || [];

    // Enrich with mentor details
    const enriched = sessions.map((session) => {
      const mentor = mentors.find((m) => m.id === session.mentorId);
      return {
        ...session,
        mentor: mentor
          ? {
              name: mentor.name,
              title: mentor.title,
              avatar: mentor.avatar,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      sessions: enriched,
      summary: {
        total: enriched.length,
        scheduled: enriched.filter((s) => s.status === "scheduled").length,
        completed: enriched.filter((s) => s.status === "completed").length,
        totalSpent: enriched.reduce((sum, s) => sum + s.cost, 0),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] GET /sessions error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve mentorship sessions.",
    });
  }
});

/**
 * POST /mentorship/sessions/:sessionId/cancel
 * Cancels a scheduled session and refunds payment
 */
router.post("/mentors/bookings/:bookingId/cancel", requireAuth, (req, res) => {
  try {
    const { bookingId } = req.params;
    const sessions = mentorshipSessions.get(req.userId!) || [];
    const session = sessions.find((s) => s.id === bookingId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${session.status} session.`,
      });
    }

    session.status = "cancelled";

    const data = getUserData(req.userId!);
    const mainWallet = data.wallets.find((w) => w.type === "main");
    if (mainWallet) {
      mainWallet.balance = Number((mainWallet.balance + session.cost).toFixed(2));
      data.transactions.unshift({
        id: newId("tx"),
        walletId: mainWallet.id,
        type: "fee",
        amount: session.cost,
        currency: "USD",
        status: "completed",
        description: `Mentorship session refund: ${session.topic}`,
        createdAt: NOW(),
      });
    }

    logActivity({
      actorId: req.userId!,
<<<<<<< HEAD
      action: "mentorship_cancelled",
      detail: `Cancelled mentorship session ${bookingId}, refunded $${session.cost}.`,
=======
      actorName: "user",
      action: "mentorship_cancelled",
      detail: `Cancelled mentorship session`,
      metadata: {
        sessionId: bookingId,
        refundAmount: session.cost,
      },
>>>>>>> 04fe53a9 (fix: stabilize api typing, notifications, and deploy validation)
    });

    notifyUser({
      userId: req.userId!,
<<<<<<< HEAD
      kind: "info",
      title: "Session Cancelled",
      body: `Your mentorship session has been cancelled. $${session.cost} has been refunded.`,
=======
      kind: "mentorship",
      title: "Session Cancelled",
      body: `Your mentorship session has been cancelled. $${session.cost} has been refunded.`,
      link: null,
>>>>>>> 04fe53a9 (fix: stabilize api typing, notifications, and deploy validation)
    });

    return res.json({
      success: true,
      message: "Mentorship session cancelled and refunded.",
      session,
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] POST /mentors/bookings/:bookingId/cancel error");
    return res.status(500).json({
      success: false,
      message: "Failed to cancel mentorship session.",
    });
  }
});

router.post("/mentorship/sessions/:sessionId/cancel", requireAuth, (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessions = mentorshipSessions.get(req.userId!) || [];
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${session.status} session.`,
      });
    }

    // Update session status
    session.status = "cancelled";

    // Refund to wallet
    const data = getUserData(req.userId!);
    const mainWallet = data.wallets.find((w) => w.type === "main");

    if (mainWallet) {
      mainWallet.balance = Number((mainWallet.balance + session.cost).toFixed(2));

      // Record refund transaction
      data.transactions.unshift({
        id: newId("tx"),
        walletId: mainWallet.id,
        type: "fee",
        amount: session.cost,
        currency: "USD",
        status: "completed",
        description: `Mentorship session refund: ${session.topic}`,
        createdAt: NOW(),
      });
    }

    // Log activity
    logActivity({
      actorId: req.userId!,
<<<<<<< HEAD
      action: "mentorship_cancelled",
      detail: `Cancelled mentorship session ${sessionId}, refunded $${session.cost}.`,
=======
      actorName: "user",
      action: "mentorship_cancelled",
      detail: `Cancelled mentorship session`,
      metadata: {
        sessionId,
        refundAmount: session.cost,
      },
>>>>>>> 04fe53a9 (fix: stabilize api typing, notifications, and deploy validation)
    });

    // Notify user
    notifyUser({
      userId: req.userId!,
<<<<<<< HEAD
      kind: "info",
      title: "Session Cancelled",
      body: `Your mentorship session has been cancelled. $${session.cost} has been refunded.`,
=======
      kind: "mentorship",
      title: "Session Cancelled",
      body: `Your mentorship session has been cancelled. $${session.cost} has been refunded.`,
      link: null,
>>>>>>> 04fe53a9 (fix: stabilize api typing, notifications, and deploy validation)
    });

    return res.json({
      success: true,
      message: "Mentorship session cancelled and refunded.",
      session,
    });
  } catch (error) {
    logger.error({ err: error }, "[mentorship] POST /sessions/:sessionId/cancel error");
    return res.status(500).json({
      success: false,
      message: "Failed to cancel mentorship session.",
    });
  }
});

export default router;
