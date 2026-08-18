/**
 * Singleton OpenAI client routed through the Replit AI Integrations proxy
 * (no direct API key required — the `AI_INTEGRATIONS_OPENAI_*` env vars are
 * provisioned by the workspace).
 *
 * Used by /live-chat to power the AI support agent and detect when the
 * conversation should escalate to a human admin.
 */
import OpenAI from "openai";
import { logger } from "./logger";
import { env } from "./env";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (cached) return cached;
  const apiKey = env.OPENAI_API_KEY || env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = env.OPENAI_BASE_URL || env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey) {
    logger.warn("openai-client: OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_API_KEY not configured");
    return null;
  }

  cached = new OpenAI({ apiKey, baseURL });
  return cached;
}

const SYSTEM_PROMPT = `You are XpressPro FX live support, a friendly AI assistant for a crypto trading platform.

Your job:
- Help users with: deposits, withdrawals, KYC verification, gas fees, trading questions, mailbox / support tickets, account access, P2P trades, and platform features.
- Be concise (1–3 short paragraphs max). Use the user's first name if you know it.
- NEVER invent specific dollar amounts, balances, transaction ids, or KYC decisions for the user. If they ask about their actual data, tell them to check the relevant page or wait for support.
- If a user is angry, asks for a "human", says "agent", "manager", "person", "supervisor", "real person", or describes an emergency / fraud / hack / loss, you MUST escalate.
- When you decide to escalate, your reply MUST end with the literal token [HANDOFF] on its own line. Otherwise omit the token.

Tone: professional, calm, empathetic. Never promise refunds, gains, or specific timelines.`;

export interface AIChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatReply {
  content: string;
  escalated: boolean;
}

export async function generateAIReply(opts: {
  userMessage: string;
  history: AIChatTurn[];
  userName: string;
}): Promise<AIChatReply | null> {
  const client = getOpenAI();
  if (!client) return null;
  const OPENAI_TIMEOUT_MS = 15_000;
  try {
    const res = await client.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `User's display name: ${opts.userName}.` },
          ...opts.history.slice(-10).map((t) => ({
            role: t.role,
            content: t.content,
          })),
          { role: "user", content: opts.userMessage },
        ],
        max_tokens: 512,
      },
      { timeout: OPENAI_TIMEOUT_MS },
    );
    const raw = res.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;
    const escalated = /\[HANDOFF\]/i.test(raw);
    const cleaned = raw.replace(/\[HANDOFF\]/gi, "").trim();
    return { content: cleaned, escalated };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "openai-client: chat failed");
    return null;
  }
}
