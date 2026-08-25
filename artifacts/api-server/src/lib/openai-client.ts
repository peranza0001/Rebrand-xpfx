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

const FAQ_REPLIES: Array<{ pattern: RegExp; content: string }> = [
  {
    pattern: /signup|sign up|otp|verification code|login|log in|session|blank|dashboard|forgot password|kyc/i,
    content: "For account access, use Sign up or Log in and complete the email verification step. If the dashboard is blank, refresh once and confirm your session is active; do not share an OTP or password here. KYC status and limits are shown in the KYC area, and support can review account-specific issues.",
  },
  {
    pattern: /demo|practice order|first trade|open.*trade|buy|sell|risk/i,
    content: "Demo Trading is a virtual-funds workspace. Open Demo Trading from the navigation, choose a market, select Buy or Sell, set a small practice size, and submit the order. Demo results are not future live performance, so practise with risk you can understand.",
  },
  {
    pattern: /deposit|withdraw|funds|money|fee|charge|transfer/i,
    content: "Use the platform's Deposit and Withdrawals pages to check status and instructions. Never send funds to an address or person provided in chat. Fees and processing status depend on the transaction and are shown in the relevant account area; support will not invent a fee or promise a completion time.",
  },
  {
    pattern: /smartvest|investment|copy|manager|return|profit/i,
    content: "SmartVest and copy features are simulations or managed-product workflows where marked in the app, not guarantees. Review the displayed terms, risk information, and any required disclaimer before proceeding. Past or simulated results do not guarantee future performance.",
  },
  {
    pattern: /education|learn|lesson|course|beginner/i,
    content: "Start in Education for the beginner lessons, then use Demo Trading to practise market selection, position sizing, and closing a trade. The demo desk keeps virtual funds separate from live balances.",
  },
  {
    pattern: /status|maintenance|offline|access|down|unavailable/i,
    content: "Platform availability can change during maintenance or provider interruptions. Check the status message in the app and try again later; never repeat a payment or trade just because a page is slow. Support can investigate a persistent access issue.",
  },
  {
    pattern: /phish|security|otp|password|seed|private key|cvv|pin|scam|hack|stolen|fraud/i,
    content: "XpressPro FX support will never ask for your password, OTP, CVV, PIN, seed phrase, or private key. Do not share them in chat or follow unexpected links. Secure your account and ask for a human representative if you suspect phishing or fraud.",
  },
  {
    pattern: /human|agent|representative|supervisor|manager|escalat|person/i,
    content: "I can connect you with a human representative. Please choose Talk to support and provide your name, registered email, and a short description of the issue. Do not include passwords, OTPs, payment-card details, PINs, or wallet secrets.",
  },
];

export function redactChatContent(content: string): string {
  return content
    .replace(/\b(?:password|passcode|otp|verification code|pin|cvv|cvc|seed phrase|private key)\b\s*[:=]?\s*[^\s,;]+/gi, "$1 [redacted]")
    .replace(/\b\d{3,8}\b/g, (value) => value.length >= 4 ? "[redacted]" : value);
}

export function generateFaqReply(userMessage: string): AIChatReply | null {
  const match = FAQ_REPLIES.find((faq) => faq.pattern.test(userMessage));
  if (!match) return null;
  return {
    content: match.content,
    escalated: /human|agent|representative|supervisor|manager|escalat|person|fraud|hack|stolen/i.test(userMessage),
  };
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
