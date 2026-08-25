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

export function resolveOpenAIModel(
  rawEnv: Record<string, string | undefined> = process.env,
): string {
  const selected =
    rawEnv.OPENAI_MODEL ||
    rawEnv.AI_INTEGRATIONS_OPENAI_MODEL ||
    rawEnv.OPENAI_CHAT_MODEL ||
    "gpt-4.1-mini";

  return selected.trim() || "gpt-4.1-mini";
}

export function resolveOpenAIApiKey(
  rawEnv: Record<string, string | undefined> = process.env,
): string | undefined {
  const selected =
    rawEnv.AI_INTEGRATIONS_OPENAI_API_KEY ||
    rawEnv.OPENAI_API_KEY;
  const trimmed = selected?.trim();
  return trimmed || undefined;
}

export function resolveOpenAIBaseURL(
  rawEnv: Record<string, string | undefined> = process.env,
): string {
  const selected =
    rawEnv.AI_INTEGRATIONS_OPENAI_BASE_URL ||
    rawEnv.OPENAI_BASE_URL ||
    rawEnv.OPENAI_API_BASE_URL ||
    "https://api.openai.com/v1";
  return selected.trim() || "https://api.openai.com/v1";
}

export function getOpenAI(): OpenAI | null {
  if (cached) return cached;
  const apiKey = resolveOpenAIApiKey({
    AI_INTEGRATIONS_OPENAI_API_KEY: env.AI_INTEGRATIONS_OPENAI_API_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
  });
  const baseURL = resolveOpenAIBaseURL({
    AI_INTEGRATIONS_OPENAI_BASE_URL: env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    OPENAI_BASE_URL: env.OPENAI_BASE_URL,
  });

  if (!apiKey) {
    logger.warn("openai-client: OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_API_KEY not configured");
    return null;
  }

  cached = new OpenAI({ apiKey, baseURL });
  return cached;
}

const SYSTEM_PROMPT = `You are XpressPro FX live support, a friendly AI assistant for a hybrid fintech, forex brokerage, trading, and investment platform.

Your job:
- Help users with: accounts, deposits, withdrawals, wallets, KYC/AML, forex, demo trading, crypto, leverage, margin, orders, risk controls, fees, investments, SmartVest, copy trading, P2P, security, mailbox / support tickets, and platform features.
- Be concise (1–3 short paragraphs max). Use the user's first name if you know it.
- NEVER invent specific dollar amounts, balances, transaction ids, or KYC decisions for the user. If they ask about their actual data, tell them to check the relevant page or wait for support.
- If a user is angry, asks for a "human", says "agent", "manager", "person", "supervisor", "real person", or describes an emergency / fraud / hack / loss, you MUST escalate.
- Do not provide personalized financial, tax, legal, or investment advice. Explain platform mechanics and direct users to verified product disclosures.
- Never claim an order, payment, withdrawal, KYC decision, refund, or account change was completed unless the platform explicitly provides that status.
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
  const model = resolveOpenAIModel();
  try {
    const res = await client.chat.completions.create(
      {
        model,
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
    logger.warn({ err: (err as Error).message, model }, "openai-client: chat failed");
    return null;
  }
}
