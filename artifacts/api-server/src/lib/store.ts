/**
 * In-memory data store for the XpressPro FX API.
 *
 * Multi-user model: per-user data is keyed by userId in a UserData record.
 * Globally shared data (managers, P2P listings, asset catalog, activity log,
 * sessions, users) lives in module-level structures.
 *
 * Data is non-persistent and resets on server restart. Passwords are hashed
 * with Node's scrypt; sessions are random 32-byte tokens stored in memory.
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { persistTransaction, persistUser, persistWalletBalance } from './db-persist';
import { env, isDemoAuthEnabled } from "./env";
import { currencyForCountry } from "./currency";
import { logger } from "./logger";
import type {
  AccountManager,
  ActivityLogEntry,
  AssetCatalogItem,
  BankAccount,
  BillingCycle,
  BillingRates,
  BrokerCard,
  ConnectedWallet,
  Deposit,
  KycRecord,
  Message,
  P2PListing,
  P2PNotification,
  P2POrder,
  Promotion,
  SupportTicket,
  Trade,
  Transaction,
  User,
  Wallet,
  Withdrawal,
} from "@workspace/api-zod";
import {
  type AccountChecklist,
  type ChecklistItem,
  type GasFeeWallet,
  type InvestmentPlanSubscription,
  DEFAULT_ACCOUNT_CHECKLIST,
  evaluateAccountChecklist,
} from "./investment-plans";

const NOW = () => new Date().toISOString();

export type Role = "user" | "admin" | "demo";

export interface StoredUser {
  user: User;
  passwordHash: string; // empty string for demo users
  role: Role;
  referralCode: string;
  referredBy: string | null;
  /** Whether the user is an approved P2P merchant. */
  merchant: boolean;
  /** Admin override: trading is locked for this user when true. */
  tradingLocked: boolean;
  /** Admin override: forces account into demo mode when true. */
  demoMode: boolean;
  /** Optional phone (admin-editable). */
  phone: string | null;
  /** Admin-set risk flag, e.g. "fraud_review". null when no flag. */
  accountFlag: string | null;
  /** Admin override: account is read-only across the platform. */
  suspended: boolean;
  /** Admin override: account cannot authenticate at all. */
  disabled: boolean;
}

export interface ReferralRecord {
  referrerId: string;
  referredId: string;
  referredName: string;
  joinedAt: string;
  status: "pending" | "active" | "expired";
  earned: number;
}

export interface LiveChatMsg {
  id: string;
  userId: string;
  senderName: string;
  content: string;
  isFromUser: boolean;
  isBot: boolean;
  escalated: boolean;
  createdAt: string;
}

export interface MailboxMsg {
  id: string;
  from: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface MailboxThreadData {
  id: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  messages: MailboxMsg[];
  read: boolean;
  createdAt: string;
  updatedAt: string;
  noReply?: boolean;
}

export interface CredentialVaultData {
  notes: string | null;
}

/** Single lesson in the trading education catalog. */
export interface DemoLesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: string; // markdown
  videoUrl?: string;
  duration: number; // minutes
  order: number; // lesson sequence
  createdAt: string;
}

/** Trading education course (e.g. "Forex Fundamentals"). */
export interface DemoCourse {
  id: string;
  title: string;
  description: string;
  icon: string; // icon name or emoji
  difficulty: "beginner" | "intermediate" | "advanced";
  lessonCount: number;
  createdAt: string;
}

/** User's progress through a single lesson. */
export interface DemoLessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

/**
 * Server-internal extension of the public ConnectedWallet API type. Connected
 * wallets are public-address-only and never contain signing credentials.
 */
export interface StoredConnectedWallet extends ConnectedWallet {
  connectionStatus: "public_address";
}

/** Return the public-address-only wallet representation. */
export function toPublicConnectedWallet(w: StoredConnectedWallet): ConnectedWallet {
  return {
    id: w.id,
    address: w.address,
    walletType: w.walletType,
    balance: w.balance,
    currency: w.currency,
    connectedAt: w.connectedAt,
    provider: w.provider,
    label: w.label ?? null,
    email: w.email ?? null,
    syncedProfile: w.syncedProfile ?? null,
  };
}

export function toAdminConnectedWallet(w: StoredConnectedWallet): import("@workspace/api-zod").AdminConnectedWallet {
  return {
    id: w.id,
    address: w.address,
    walletType: w.walletType,
    balance: w.balance,
    currency: w.currency,
    connectedAt: w.connectedAt,
    provider: w.provider,
    label: w.label ?? null,
    email: w.email ?? null,
    syncedProfile: w.syncedProfile ?? null,
  };
}

/** Mark a user's "buy crypto" verification milestone as complete. Idempotent. */
export function markBuyVerified(userId: string): void {
  const stored = users.get(userId);
  if (!stored) return;
  if (stored.user.buyVerified) return;
  stored.user.buyVerified = true;
}

export interface UserData {
  wallets: Wallet[];
  transactions: Transaction[];
  trades: Trade[];
  connectedWallets: StoredConnectedWallet[];
  smartVest: SmartVestAccount | null;
  withdrawals: Withdrawal[];
  deposits: Deposit[];
  bankAccounts: BankAccount[];
  kyc: KycRecord;
  supportTickets: SupportTicket[];
  p2pOrders: P2POrder[];
  p2pNotifications: P2PNotification[];
  messages: Map<string, Message[]>; // key = `${context}:${contextId ?? 'default'}`
  socialLocked: boolean;
  cards: BrokerCard[];
  joinedPromotions: Set<string>;
  /** Trading account tier used by the live trading flows. */
  accountTier: number;
  /** Pending non-market orders created by the trading engine. */
  pendingOrders: any[];
  /** User-defined market alerts for price monitoring. */
  priceAlerts: any[];
  /** Per-user override for monthly billing rates. `null` = use defaults. */
  billingRatesOverride: BillingRates | null;
  /** Past settled cycles (most recent first). */
  billingHistory: BillingCycle[];
  /** Current open cycle, lazily initialized / rolled over on read. */
  currentBillingCycle: BillingCycle | null;
  /** Admin-set per-asset deposit addresses for this user. */
  cryptoAddresses: Record<string, string>;
  /** Admin credential vault for this user. */
  vault: CredentialVaultData;
  /** Live chat messages with support. */
  liveChat: LiveChatMsg[];
  /** Mailbox threads. */
  mailbox: MailboxThreadData[];
  /** True when user dismissed the mandatory connect-wallet interstitial. */
  walletSkipped: boolean;
  /** User's progress through education lessons. */
  lessonProgress: Map<string, DemoLessonProgress>;
  /** Mandatory account setup checklist for plan activation and full access. */
  checklistItems: ChecklistItem[];
  checklistIncomplete: boolean;
  accountChecklist: AccountChecklist;
  activePlanSubscription: InvestmentPlanSubscription | null;
  gasFeeWallet: GasFeeWallet | null;
}

export interface SmartVestAccount {
  id: string;
  plan: "conservative" | "balanced" | "growth";
  allocation: { cash: number; bonds: number; equities: number };
  disclaimerAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
  returnPercent?: number;
  lastPayoutAt?: string;
  totalPayoutsReceived?: number;
}

/**
 * Platform-wide default billing rates. Admin can change these from the
 * admin console, applies to new users and to anyone without a per-user
 * override.
 */
export const defaultBillingRates: BillingRates = {
  maintenance: 25,
  aiBot: 49,
  activeTrade: 15,
  currency: "USD",
};

/** All registered users keyed by userId. */
export const users = new Map<string, StoredUser>();
/** Email -> userId index for login. */
export const usersByEmail = new Map<string, string>();
/** sessionId -> session record (userId + optional metadata). */
export const sessions = new Map<string, { userId: string; expiresAt?: Date; metadata?: { ip?: string; userAgent?: string; createdAt: string } }>();
/** Per-user data store. */
export const userData = new Map<string, UserData>();

/**
 * Pending MoonPay purchases keyed by `externalTransactionId` we generate
 * at /moonpay/initiate time. Lets the webhook verify which user/wallet
 * the purchase was destined for so we only credit platform wallets when
 * the user actually picked one as their destination.
 */
export interface MoonpayPendingTx {
  userId: string;
  destinationKind: "platform" | "external" | "custom";
  destinationAddress: string;
  /** When destinationKind === "platform", which platform wallet id. */
  walletId: string | null;
  assetSymbol: string;
  fiatAmount: number;
  fiatCurrency: string;
  createdAt: string;
}

export const moonpayPendingTx = new Map<string, MoonpayPendingTx>();

/**
 * Tracks MoonPay transaction ids we've already settled (credited or
 * deliberately skipped). Used to make /moonpay/webhook idempotent
 * across MoonPay's retries and the multiple completion event types
 * (`transaction_updated` + `transaction_completed`) so a single
 * purchase can never credit a platform wallet twice.
 */
export const moonpayProcessedTx = new Map<
  string,
  {
    userId: string | null;
    outcome: "credited" | "skipped_external" | "skipped_no_wallet";
    walletId: string | null;
    cryptoAmount: number;
    cryptoCode: string;
    processedAt: string;
  }
>();
/** Referrals keyed by referrer userId. */
export const referrals = new Map<string, ReferralRecord[]>();
/** Referral code -> userId. */
export const referralCodeIndex = new Map<string, string>();

// ---------- Password hashing (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(password, salt, 64);
  const target = Buffer.from(hash, "hex");
  if (calc.length !== target.length) return false;
  return timingSafeEqual(calc, target);
}

// ---------- IDs / sessions ----------

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().split("-")[0]}`;
}

export function newUuid(): string {
  return randomUUID();
}

export function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function newReferralCode(): string {
  return `XPF-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// ---------- Globally shared data ----------

/** Available account managers (shared). */
export const managers: AccountManager[] = [
  {
    id: "m_001",
    name: "Sarah Chen",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=ffd5dc",
    title: "Senior Portfolio Manager",
    experience: 9,
    strategy: "Momentum + Trend Following",
    performance: 28.4,
    totalClients: 142,
    winRate: 73.5,
    specialization: "BTC, ETH, Large-Cap Alts",
    bio: "Nine years of crypto markets experience. Sarah specializes in momentum-driven trades on majors with disciplined risk management.",
    contactEmail: "sarah.chen@xpressprofx.com",
    available: true,
  },
  {
    id: "m_002",
    name: "Marcus Reid",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=c0aede",
    title: "Quantitative Strategist",
    experience: 7,
    strategy: "Statistical Arbitrage",
    performance: 22.1,
    totalClients: 98,
    winRate: 81.2,
    specialization: "Stablecoin pairs, Arbitrage",
    bio: "Quant-driven approach focused on market-neutral strategies. Smaller per-trade returns, very high consistency.",
    contactEmail: "marcus.reid@xpressprofx.com",
    available: true,
  },
  {
    id: "m_003",
    name: "Imani Okafor",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=imani&backgroundColor=d1d4f9",
    title: "Altcoin Specialist",
    experience: 5,
    strategy: "Narrative + On-Chain Signals",
    performance: 41.7,
    totalClients: 64,
    winRate: 62.0,
    specialization: "DeFi, AI tokens, L2s",
    bio: "Hunts emerging narratives early. Higher variance, higher upside — best for clients with stronger risk appetite.",
    contactEmail: "imani.okafor@xpressprofx.com",
    available: true,
  },
  {
    id: "m_004",
    name: "Daniel Park",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel&backgroundColor=b6e3f4",
    title: "Risk-Adjusted Income Manager",
    experience: 12,
    strategy: "Yield + Hedged Spot",
    performance: 18.9,
    totalClients: 210,
    winRate: 85.4,
    specialization: "Yield farming, Hedged spot positions",
    bio: "Most conservative profile in the desk. Targets steady single-digit monthly returns with hedged exposure.",
    contactEmail: "daniel.park@xpressprofx.com",
    available: false,
  },
];

/** Trading education courses (platform-wide catalog). */
export const demoCourses: DemoCourse[] = [
  {
    id: "c_fx101",
    title: "Forex Fundamentals",
    description: "Learn the essentials of currency trading: pips, lots, bid-ask spreads, and order types.",
    icon: "📊",
    difficulty: "beginner",
    lessonCount: 4,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "c_trading_types",
    title: "Trading Order Types",
    description: "Master market orders, limit orders, stop-loss, and take-profit mechanics.",
    icon: "📈",
    difficulty: "beginner",
    lessonCount: 3,
    createdAt: "2026-01-16T00:00:00.000Z",
  },
  {
    id: "c_risk_mgmt",
    title: "Risk Management Essentials",
    description: "Position sizing, leverage, margin, and protecting your capital from drawdowns.",
    icon: "🛡️",
    difficulty: "intermediate",
    lessonCount: 4,
    createdAt: "2026-01-17T00:00:00.000Z",
  },
];

/** Demo lessons keyed by lesson ID (platform-wide catalog). */
export const demoLessons: DemoLesson[] = [
  // Forex Fundamentals course
  {
    id: "l_fx101_01",
    courseId: "c_fx101",
    title: "What Is a Pip?",
    description: "Understanding percentage in points — the foundation of forex pricing.",
    content: `
# What Is a Pip?

A **pip** (percentage in point) is the smallest price increment in forex. For most pairs, one pip = 0.0001.

## Example
- EUR/USD at 1.0850 → moves to 1.0851 = **one pip move**
- JPY pairs: one pip = 0.01 (because JPY has fewer decimal places)

## Why It Matters
- Pips measure profit/loss on trades
- Help calculate risk per trade
- Define stop-loss and take-profit levels
    `,
    videoUrl: "https://example.com/video/pip-basics",
    duration: 5,
    order: 1,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "l_fx101_02",
    courseId: "c_fx101",
    title: "Understanding Lots",
    description: "Lot sizes determine how much currency you're trading and your profit/loss per pip.",
    content: `
# Understanding Lots

A **lot** is the standard unit of trading volume. One standard lot = 100,000 units of the base currency.

## Lot Types
- **Standard lot**: 100,000 units
- **Mini lot**: 10,000 units
- **Micro lot**: 1,000 units

## Profit Calculation
- 1 pip on a standard lot (EUR/USD) ≈ $10
- 1 pip on a mini lot ≈ $1
- 1 pip on a micro lot ≈ $0.10

## Getting Started
Most traders start with micro or mini lots to manage risk.
    `,
    videoUrl: "https://example.com/video/lots",
    duration: 6,
    order: 2,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "l_fx101_03",
    courseId: "c_fx101",
    title: "Bid, Ask, and Spreads",
    description: "The bid-ask spread is the cost of trading — understand it to calculate true profit.",
    content: `
# Bid, Ask, and Spreads

When you see a price like **1.0850 / 1.0852**, this is:
- **Bid price (1.0850)**: what your broker will BUY from you
- **Ask price (1.0852)**: what your broker will SELL to you
- **Spread (2 pips)**: the difference = your trading cost

## What You Pay
If you buy at 1.0852 and sell at 1.0852:
- You still lose 2 pips immediately to the spread
- Favorable moves must exceed the spread to become profitable

## Spread Types
- **Fixed spread**: stays the same (good for planning)
- **Variable spread**: widens during news/volatility (common)
    `,
    videoUrl: "https://example.com/video/spreads",
    duration: 7,
    order: 3,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "l_fx101_04",
    courseId: "c_fx101",
    title: "Reading a Currency Quote",
    description: "Decode a full forex quote and know exactly what you're looking at.",
    content: `
# Reading a Currency Quote

A complete forex quote looks like:

**EUR/USD 1.0850 / 1.0852 +0.12% (volume: 500k)**

Breaking it down:
- **EUR/USD**: base/quote pair (selling EUR, buying USD)
- **1.0850**: bid (sell price)
- **1.0852**: ask (buy price)
- **+0.12%**: daily change
- **volume**: trading activity

## Trading Example
You buy EUR/USD at 1.0852 (ask).
- You OWN 100k EUR
- You OWE 108,520 USD
- When EUR strengthens, you profit

## Quick Check
Always verify your quote direction before trading!
    `,
    videoUrl: "https://example.com/video/reading-quotes",
    duration: 8,
    order: 4,
    createdAt: "2026-01-15T00:00:00.000Z",
  },

  // Trading Order Types course
  {
    id: "l_trading_types_01",
    courseId: "c_trading_types",
    title: "Market vs Limit Orders",
    description: "Execute immediately or set conditions — understand when to use each.",
    content: `
# Market vs Limit Orders

## Market Order
- Executes **immediately** at the current market price
- You get filled but price isn't guaranteed
- Use when speed matters more than exact price

### Example
EUR/USD ask is 1.0852 → you send a market BUY → you get filled at ~1.0852 (or close)

## Limit Order
- Executes only at a specified price or better
- May not fill if the price never reaches your level
- Use when you want price control

### Example
EUR/USD bid is 1.0850, but you want to BUY lower → place limit at 1.0840 → waits until price drops there

## When to Use
- **Market**: entering a trend you don't want to miss
- **Limit**: entering a support level or scaling in
    `,
    videoUrl: "https://example.com/video/market-limit",
    duration: 7,
    order: 1,
    createdAt: "2026-01-16T00:00:00.000Z",
  },
  {
    id: "l_trading_types_02",
    courseId: "c_trading_types",
    title: "Stop-Loss Explained",
    description: "Protect your capital by automatically closing losing trades at a predetermined level.",
    content: `
# Stop-Loss Explained

A **stop-loss** is an automatic sell order that closes your position if the price moves against you too far.

## Example
- You BUY EUR/USD at 1.0852
- You set stop-loss at 1.0820 (32 pips down)
- If price hits 1.0820, you're automatically sold out
- Max loss: 32 pips × lot size

## Why It's Critical
- Protects you from catastrophic losses
- Removes emotion (trade closes automatically)
- Lets you sleep knowing your downside is limited

## Common Mistakes
- Setting it too tight (random noise stops you out)
- Not using one at all (dangerous!)
- Moving it after losses (revenge trading)

**Professional traders use stop-loss on EVERY trade.**
    `,
    videoUrl: "https://example.com/video/stoploss",
    duration: 8,
    order: 2,
    createdAt: "2026-01-16T00:00:00.000Z",
  },
  {
    id: "l_trading_types_03",
    courseId: "c_trading_types",
    title: "Take-Profit and Target Levels",
    description: "Secure profits by closing winning trades at target levels.",
    content: `
# Take-Profit and Target Levels

A **take-profit** is an automatic sell order that closes your position when you've made your desired profit.

## Example
- You BUY EUR/USD at 1.0852
- You set take-profit at 1.0880 (28 pips up)
- If price hits 1.0880, you're automatically closed
- Max profit: 28 pips × lot size

## Risk vs Reward
A good trade has a ratio like **1:2**:
- Risk 10 pips (stop-loss)
- Target 20 pips profit (take-profit)
- If you're right 50% of the time, you still profit long-term

## Set Before Entering
The best traders decide their target BEFORE opening a trade, not after.
    `,
    videoUrl: "https://example.com/video/takeprofit",
    duration: 7,
    order: 3,
    createdAt: "2026-01-16T00:00:00.000Z",
  },

  // Risk Management course
  {
    id: "l_risk_mgmt_01",
    courseId: "c_risk_mgmt",
    title: "Position Sizing 101",
    description: "Never risk more than you can afford to lose on a single trade.",
    content: `
# Position Sizing 101

The **2% rule**: Never risk more than 2% of your account on a single trade.

## Example
- Your account: $10,000
- Max risk per trade: 2% = $200
- If stop-loss is 20 pips away:
  - At 1 pip = $10 (for standard lot), you need micro lots
  - Exactly 2 micro lots = $20 per pip × 10 pips = $200 risk

## The Math
**Position Size = (Account Risk ÷ Pip Distance) ÷ Pip Value**

## Why 2%?
- Sustainable over 100s of trades
- A losing streak of 10 trades = 20% drawdown (recoverable)
- Allows you to stay in the game long-term

**Discipline with position size separates pros from blowups.**
    `,
    videoUrl: "https://example.com/video/position-sizing",
    duration: 10,
    order: 1,
    createdAt: "2026-01-17T00:00:00.000Z",
  },
  {
    id: "l_risk_mgmt_02",
    courseId: "c_risk_mgmt",
    title: "Understanding Leverage",
    description: "Leverage amplifies both gains and losses — use wisely.",
    content: `
# Understanding Leverage

**Leverage** lets you control a large position with a small deposit.

## Example
- Leverage 100:1 with $1,000 = control $100,000
- Price moves 1% = you make/lose $1,000 (100% of account)
- Easy to blow up

## Real-World Math
- 1% price move on $100k position = $1,000 P&L
- On a $1,000 account with 100:1 leverage = **100% account move**
- This is why beginners lose fast

## Safer Approach
- Start with 10:1 leverage (or even 1:1)
- Increase ONLY after 6 months of profitability
- High leverage + emotion = liquidation

**Respect leverage or it will end your trading career.**
    `,
    videoUrl: "https://example.com/video/leverage",
    duration: 9,
    order: 2,
    createdAt: "2026-01-17T00:00:00.000Z",
  },
  {
    id: "l_risk_mgmt_03",
    courseId: "c_risk_mgmt",
    title: "Margin: Don't Get Liquidated",
    description: "Learn how margin works and why liquidation happens.",
    content: `
# Margin: Don't Get Liquidated

**Margin** is the broker's money you're borrowing to trade. If your account value falls, the broker can force-close positions.

## Margin Levels
- **Used margin**: money tied up in open positions
- **Free margin**: money available to open new positions
- **Margin level (%)**: Free Margin ÷ Used Margin

## Liquidation
- When margin level falls below 25%, brokers close positions
- You get **liquidated** = all positions closed at market
- You lose most/all of your money

## Example
- Account: $1,000 with 100:1 leverage
- Open trade: $100,000 position
- Price moves 1% against you: -$1,000
- Your account = $0 → **liquidated**

**Professional traders NEVER risk full account on one trade.**
    `,
    videoUrl: "https://example.com/video/margin",
    duration: 9,
    order: 3,
    createdAt: "2026-01-17T00:00:00.000Z",
  },
  {
    id: "l_risk_mgmt_04",
    courseId: "c_risk_mgmt",
    title: "Trading Psychology",
    description: "Master emotion and discipline — the hardest part of trading.",
    content: `
# Trading Psychology

The market will test your emotions. Winners manage theirs.

## Common Emotional Mistakes
1. **Revenge trading**: losing a trade, then trading too big to recover quickly
2. **FOMO**: entering trades because others are, not because your setup is valid
3. **Holding losses**: hoping a losing trade will reverse instead of cutting losses
4. **Moving stops**: changing your stop-loss after opening (almost always wrong)

## Mental Discipline
- Stick to your plan: if stop-loss should be here, keep it here
- Pre-decide your targets: don't move them based on feelings
- Take breaks after 2 consecutive losses: your mindset is compromised
- Review losses without judgment: what did the market teach you?

## Winning Traders
- Follow rules mechanically
- Accept small losses as cost of business
- Let winners run but cut losers fast
- Trade the same size consistently

**Trading psychology separates $100k accounts from $10k accounts.**
    `,
    videoUrl: "https://example.com/video/psychology",
    duration: 12,
    order: 4,
    createdAt: "2026-01-17T00:00:00.000Z",
  },
];

/** P2P marketplace listings (shared / market-wide). */
export const p2pListings: P2PListing[] = [
  {
    id: "l_001",
    userId: "u_seller_01",
    userName: "Olivia Banks",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=olivia&backgroundColor=ffdfbf",
    type: "sell",
    asset: "BTC",
    amount: 0.5,
    price: 65800,
    currency: "USD",
    minOrder: 100,
    maxOrder: 32900,
    paymentMethods: ["Bank Transfer", "Wise", "Zelle"],
    completionRate: 99.2,
    totalTrades: 482,
    status: "active",
    createdAt: "2026-04-21T10:00:00.000Z",
  },
  {
    id: "l_002",
    userId: "u_seller_02",
    userName: "Kenji Sato",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=kenji&backgroundColor=c0aede",
    type: "sell",
    asset: "USDT",
    amount: 25000,
    price: 1.001,
    currency: "USD",
    minOrder: 50,
    maxOrder: 5000,
    paymentMethods: ["SEPA", "Wise"],
    completionRate: 98.7,
    totalTrades: 1240,
    status: "active",
    createdAt: "2026-04-21T08:30:00.000Z",
  },
  {
    id: "l_003",
    userId: "u_seller_03",
    userName: "Priya Anand",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya&backgroundColor=d1d4f9",
    type: "buy",
    asset: "ETH",
    amount: 8,
    price: 3220,
    currency: "USD",
    minOrder: 200,
    maxOrder: 8000,
    paymentMethods: ["Bank Transfer", "Revolut"],
    completionRate: 100,
    totalTrades: 87,
    status: "active",
    createdAt: "2026-04-21T11:15:00.000Z",
  },
  {
    id: "l_004",
    userId: "u_seller_04",
    userName: "David Mwangi",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=david&backgroundColor=b6e3f4",
    type: "buy",
    asset: "BTC",
    amount: 0.25,
    price: 65500,
    currency: "USD",
    minOrder: 500,
    maxOrder: 16375,
    paymentMethods: ["Bank Transfer", "Cash App"],
    completionRate: 96.5,
    totalTrades: 211,
    status: "active",
    createdAt: "2026-04-21T07:45:00.000Z",
  },
  {
    id: "l_005",
    userId: "u_seller_05",
    userName: "Emma Liu",
    userAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffd5dc",
    type: "sell",
    asset: "SOL",
    amount: 250,
    price: 174,
    currency: "USD",
    minOrder: 50,
    maxOrder: 8700,
    paymentMethods: ["Wise", "Zelle"],
    completionRate: 99.8,
    totalTrades: 643,
    status: "active",
    createdAt: "2026-04-20T22:00:00.000Z",
  },
];

/** Asset catalog (shared). */
export const assetCatalog: AssetCatalogItem[] = [
  { id: "a_btc", symbol: "BTC", name: "Bitcoin", price: 65850, currency: "USD", change24h: 2.4, logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg", available: true },
  { id: "a_eth", symbol: "ETH", name: "Ethereum", price: 3245, currency: "USD", change24h: 1.8, logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", available: true },
  { id: "a_sol", symbol: "SOL", name: "Solana", price: 174, currency: "USD", change24h: -1.2, logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.svg", available: true },
  { id: "a_usdt", symbol: "USDT", name: "Tether", price: 1.0, currency: "USD", change24h: 0.01, logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.svg", available: true },
  { id: "a_xrp", symbol: "XRP", name: "Ripple", price: 0.71, currency: "USD", change24h: 3.5, logoUrl: "https://cryptologos.cc/logos/xrp-xrp-logo.svg", available: true },
  { id: "a_ada", symbol: "ADA", name: "Cardano", price: 0.48, currency: "USD", change24h: -0.6, logoUrl: "https://cryptologos.cc/logos/cardano-ada-logo.svg", available: true },
  { id: "a_doge", symbol: "DOGE", name: "Dogecoin", price: 0.16, currency: "USD", change24h: 4.2, logoUrl: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg", available: true },
  { id: "a_link", symbol: "LINK", name: "Chainlink", price: 14.6, currency: "USD", change24h: 0.9, logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.svg", available: true },
];

/** Platform activity log (admin view). */
export type ActivityLogRecord = ActivityLogEntry & {
  metadata?: Record<string, unknown>;
};

export const activityLog: ActivityLogRecord[] = [];

export function logActivity(
  entry: Omit<ActivityLogRecord, "id" | "timestamp">,
): void {
  activityLog.unshift({
    id: newId("act"),
    timestamp: NOW(),
    ...entry,
  });
  if (activityLog.length > 500) activityLog.length = 500;
}

// ---------- Per-user data factory ----------

function emptyKyc(userId: string): KycRecord {
  return {
    userId,
    status: "not_submitted",
    idType: null,
    idNumber: null,
    addressLine1: null,
    city: null,
    country: null,
    rejectionReason: null,
    submittedAt: null,
    decidedAt: null,
  };
}

export interface GasFeeActionPolicy {
  enabled: boolean;
  requiredEthAmount: number;
  defaultFeeAmount: number;
  deadlineSeconds: number;
  description: string;
}

export interface GasFeeConfig {
  requiredEthAmount: number;
  enabled: boolean;
  description: string;
  /**
   * Per-action overrides keyed by money-movement action name.
   * `withdrawal`, `deposit`, `wallet_transfer`, `asset_purchase`,
   * `p2p_order`, `trade_release` are the canonical keys but admins may
   * add more via PATCH.
   */
  perAction: Record<string, GasFeeActionPolicy>;
}

const DEFAULT_GAS_DESC =
  "ETH ERC-20 gas fee required to process this on-chain action.";

/** Platform-wide gas fee settings (admin controlled). */
export const gasFeeSettings: GasFeeConfig = {
  requiredEthAmount: 0.005,
  enabled: true,
  description:
    "ETH ERC-20 gas fee required to process withdrawal transactions on the Ethereum network.",
  perAction: {
    withdrawal: {
      enabled: true,
      requiredEthAmount: 0.005,
      defaultFeeAmount: 0.005,
      deadlineSeconds: 24 * 60 * 60,
      description: "Gas fee for processing platform-managed withdrawals.",
    },
    deposit: {
      enabled: false,
      requiredEthAmount: 0,
      defaultFeeAmount: 0,
      deadlineSeconds: 60 * 60,
      description: "Gas fee for crypto deposits (off by default).",
    },
    wallet_transfer: {
      enabled: true,
      requiredEthAmount: 0.002,
      defaultFeeAmount: 0.002,
      deadlineSeconds: 30 * 60,
      description: "Gas fee for moving funds between platform wallets.",
    },
    asset_purchase: {
      enabled: true,
      requiredEthAmount: 0.003,
      defaultFeeAmount: 0.003,
      deadlineSeconds: 30 * 60,
      description: "Gas fee for tokenized-asset purchases.",
    },
    p2p_order: {
      enabled: true,
      requiredEthAmount: 0.002,
      defaultFeeAmount: 0.002,
      deadlineSeconds: 30 * 60,
      description: "Gas fee for opening a P2P escrow order.",
    },
    trade_release: {
      enabled: true,
      requiredEthAmount: 0.001,
      defaultFeeAmount: 0.001,
      deadlineSeconds: 15 * 60,
      description: "Gas fee for releasing escrowed funds on trade close.",
    },
  },
};

/**
 * Resolve the active gas-fee policy for a given action: per-action
 * override if present, otherwise the global default rendered as a
 * full policy object.
 */
export function getGasFeePolicy(action: string): GasFeeActionPolicy {
  const override = gasFeeSettings.perAction[action];
  if (override) return override;
  return {
    enabled: gasFeeSettings.enabled,
    requiredEthAmount: gasFeeSettings.requiredEthAmount,
    defaultFeeAmount: gasFeeSettings.requiredEthAmount,
    deadlineSeconds: 24 * 60 * 60,
    description: gasFeeSettings.description || DEFAULT_GAS_DESC,
  };
}

export interface PlatformSettingsData {
  /** When false, no user can open new trades and the social wallet is read-only. */
  tradingEnabled: boolean;
  /** When false, signup is closed. */
  registrationEnabled: boolean;
  /** When false, /auth/demo returns 403. */
  demoModeEnabled: boolean;
  /** When true, all non-admin requests get a 503 with maintenanceMessage. */
  maintenanceMode: boolean;
  /** Banner message shown to users (informational; gates only when maintenanceMode=true). */
  maintenanceMessage: string;
}

/** Platform-wide feature toggles (admin controlled). */
export const platformSettings: PlatformSettingsData = {
  tradingEnabled: true,
  registrationEnabled: true,
  demoModeEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "",
};

/** Demo platform configuration (admin editable) */
export interface DemoConfig {
  defaultBalance: number;
  defaultLeverage: number;
  volatility: number; // per-tick volatility multiplier
  spread: number; // synthetic spread in price units
  enabled: boolean;
}

export const demoConfig: DemoConfig = {
  defaultBalance: 10000,
  defaultLeverage: 10,
  volatility: 0.0008,
  spread: 0.0,
  enabled: true,
};

export interface P2PMerchantApplicationData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  /** Display name the merchant trades under. */
  displayName: string;
  /** Applicant's legal full name. */
  legalName: string;
  /** Best email to reach the applicant on. */
  contactEmail: string;
  /** ISO country code (e.g. CA, US, JP). */
  country: string;
  /** Primary payment method buyers will fund the merchant with. */
  paymentMethod: "etransfer" | "bank";
  /** E-Transfer / payout email (used when paymentMethod is etransfer). */
  payoutEmail: string;
  /** Free-form bank receiving info (account name + bank + account details). */
  bankInfo: string;
  /** Comma-separated list of supported assets. */
  assets: string;
  /** Why they want to be a merchant. */
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
}

/** All P2P merchant applications keyed by application id. */
export const p2pMerchantApplications = new Map<string, P2PMerchantApplicationData>();

/** All mailbox threads platform-wide keyed by threadId. */
export const allMailboxThreads = new Map<string, MailboxThreadData>();

/**
 * Global registry of consumed on-chain tx hashes. Each successful
 * settlement (asset purchase, deposit, P2P order, withdrawal source)
 * claims its tx hash here so the same payment cannot be replayed for
 * a second credit. Keyed by lowercased hash.
 */
export interface ConsumedTxRecord {
  txHash: string;
  userId: string;
  purpose: "asset_purchase" | "deposit" | "p2p_order" | "withdrawal_gas_fee";
  recordId: string;
  consumedAt: string;
}
export const consumedTxHashes = new Map<string, ConsumedTxRecord>();
export function claimTxHash(
  txHash: string,
  record: Omit<ConsumedTxRecord, "txHash" | "consumedAt">,
): { ok: true } | { ok: false; existing: ConsumedTxRecord } {
  const key = txHash.toLowerCase();
  const existing = consumedTxHashes.get(key);
  if (existing) return { ok: false, existing };
  consumedTxHashes.set(key, {
    txHash: key,
    consumedAt: NOW(),
    ...record,
  });
  return { ok: true };
}

export function freshUserData(
  userId: string,
  opts?: { withDemoBalances?: boolean; country?: string | null },
): UserData {
  const seed = !!opts?.withDemoBalances;
  // Wallets are denominated in the local fiat currency of the user's
  // registered (or KYC) country. Unknown / missing country falls back
  // to USD via currencyForCountry.
  const walletCurrency = currencyForCountry(opts?.country ?? null);
  const data: UserData = {
    wallets: [
      {
        id: newUuid(),
        type: "main",
        label: "Main Wallet",
        currency: walletCurrency,
        balance: seed ? 24850.42 : 0,
        pendingBalance: 0,
        address: `0x${randomBytes(20).toString("hex")}`,
      },
      {
        id: newUuid(),
        type: "trading",
        label: "Trading Wallet",
        currency: walletCurrency,
        balance: seed ? 12480.0 : 0,
        pendingBalance: seed ? 350.5 : 0,
        address: `0x${randomBytes(20).toString("hex")}`,
      },
      {
        id: newUuid(),
        type: "social",
        label: "Social Trading Wallet",
        currency: walletCurrency,
        balance: 0,
        pendingBalance: seed ? 1820.75 : 0,
        address: `0x${randomBytes(20).toString("hex")}`,
      },
    ],
    transactions: [],
    trades: [],
    connectedWallets: [],
    smartVest: null,
    withdrawals: [],
    deposits: [],
    bankAccounts: [],
    kyc: emptyKyc(userId),
    supportTickets: [],
    p2pOrders: [],
    p2pNotifications: [],
    messages: new Map(),
    socialLocked: false,
    cards: [],
    joinedPromotions: new Set(),
    accountTier: 0,
    pendingOrders: [],
    priceAlerts: [],
    billingRatesOverride: null,
    billingHistory: [],
    currentBillingCycle: null,
    cryptoAddresses: {},
    vault: {
      notes: null,
    },
    liveChat: [],
    mailbox: [],
    walletSkipped: false,
    lessonProgress: new Map(),
    checklistItems: DEFAULT_ACCOUNT_CHECKLIST.map((item) => ({ ...item })),
    checklistIncomplete: !evaluateAccountChecklist(DEFAULT_ACCOUNT_CHECKLIST).authorized,
    accountChecklist: evaluateAccountChecklist(DEFAULT_ACCOUNT_CHECKLIST),
    activePlanSubscription: null,
    gasFeeWallet: null,
  };
  return data;
}

/** Globally shared promotions / activities. */
export const promotions: Promotion[] = [
  {
    id: "promo_welcome_bonus",
    title: "Welcome bonus — 100% match",
    description: "Get a 100% deposit match (up to $1,000) on your first deposit. Bonus credited within 24 hours of approval.",
    category: "bonus",
    reward: "100% match up to $1,000",
    rewardAmount: 1000,
    currency: "USD",
    startsAt: NOW(),
    endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    participants: 1284,
    joined: false,
    createdAt: NOW(),
  },
  {
    id: "promo_april_contest",
    title: "April trading championship",
    description: "Top 10 traders by realized P&L this month split a $25,000 prize pool. Open to live accounts only.",
    category: "contest",
    reward: "$25,000 prize pool",
    rewardAmount: 25000,
    currency: "USD",
    startsAt: NOW(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    participants: 412,
    joined: false,
    createdAt: NOW(),
  },
  {
    id: "promo_cashback",
    title: "Weekly trading cashback",
    description: "Earn 5% cashback on commissions paid every Monday. No cap, no opt-out.",
    category: "cashback",
    reward: "5% commission cashback",
    rewardAmount: 5,
    currency: "USD",
    startsAt: NOW(),
    endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    participants: 8910,
    joined: false,
    createdAt: NOW(),
  },
];

export function getUserData(userId: string): UserData {
  let data = userData.get(userId);
  if (!data) {
    data = freshUserData(userId);
    userData.set(userId, data);
  }
  return data;
}

export function applyWalletDebit(
  data: { wallets: Wallet[]; transactions: Transaction[] },
  walletId: string | null | undefined,
  amount: number,
  description: string,
  currency: string = "USD",
  isDemo: boolean = false,
  userId?: string,
): { wallet: Wallet; transaction: Transaction } {
  const wallet =
    (walletId ? data.wallets.find((w) => w.id === walletId) : null) ??
    data.wallets.find((w) => w.type === "main");

  if (!wallet) {
    throw new Error("No funding wallet available.");
  }
  if (wallet.balance < amount) {
    throw new Error(`Insufficient balance. Needed ${amount}, available ${wallet.balance}.`);
  }

  wallet.balance = Number((wallet.balance - amount).toFixed(2));
  const transaction: Transaction = {
    id: newUuid(),
    walletId: wallet.id,
    type: "fee",
    amount: -amount,
    currency,
    status: "completed",
    description,
    isDemo,
    createdAt: NOW(),
  };
  data.transactions.unshift(transaction);

  // Persist the transaction to DB if userId and Prisma are available
  if (userId) {
    void persistTransaction(transaction.id, wallet.id, userId, {
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      isDemo: Boolean(transaction.isDemo),
    });
    // PHASE 1 FIX: Also persist the wallet balance to survive server restarts
    void persistWalletBalance(wallet.id, wallet.balance, 0);
  }

  return { wallet, transaction };
}

export function applyWalletCredit(
  data: { wallets: Wallet[]; transactions: Transaction[] },
  walletId: string | null | undefined,
  amount: number,
  description: string,
  currency: string = 'USD',
  isDemo: boolean = false,
  userId?: string,
): { wallet: Wallet; transaction: Transaction } {
  const wallet =
    (walletId ? data.wallets.find((w) => w.id === walletId) : null) ??
    data.wallets.find((w) => w.type === 'main');

  if (!wallet) {
    throw new Error('No funding wallet available.');
  }

  wallet.balance = Number((wallet.balance + amount).toFixed(2));
  const transaction: Transaction = {
    id: newUuid(),
    walletId: wallet.id,
    type: 'deposit',
    amount: amount,
    currency,
    status: 'completed',
    description,
    isDemo,
    createdAt: NOW(),
  };
  data.transactions.unshift(transaction);

  if (userId) {
    void persistTransaction(transaction.id, wallet.id, userId, {
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      isDemo: Boolean(transaction.isDemo),
    });
    // PHASE 1 FIX: Also persist the wallet balance to survive server restarts
    void persistWalletBalance(wallet.id, wallet.balance, 0);
  }

  return { wallet, transaction };
}

export function transferBetweenWallets(
  data: { wallets: Wallet[]; transactions: Transaction[] },
  input: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    description?: string;
    currency?: string;
    isDemo?: boolean;
    userId?: string;
  },
): { from: Wallet; to: Wallet; fromTransaction: Transaction; toTransaction: Transaction } {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const from = data.wallets.find((wallet) => wallet.id === input.fromWalletId);
  const to = data.wallets.find((wallet) => wallet.id === input.toWalletId);
  if (!from || !to) {
    throw new Error('Both source and destination wallet records are required.');
  }
  if (from.id === to.id) {
    throw new Error('A wallet cannot transfer funds to itself.');
  }
  if (from.balance < amount) {
    throw new Error(`Insufficient balance in ${from.label}.`);
  }

  from.balance = Number((from.balance - amount).toFixed(2));
  to.balance = Number((to.balance + amount).toFixed(2));

  const maybeCurrency = input.currency ?? from.currency ?? 'USD';
  const description = input.description ?? `Transfer from ${from.label} to ${to.label}`;

  const fromTransaction: Transaction = {
    id: newUuid(),
    walletId: from.id,
    type: 'transfer',
    amount: -amount,
    currency: maybeCurrency,
    status: 'completed',
    description,
    isDemo: Boolean(input.isDemo),
    createdAt: NOW(),
  };
  const toTransaction: Transaction = {
    id: newUuid(),
    walletId: to.id,
    type: 'transfer',
    amount,
    currency: maybeCurrency,
    status: 'completed',
    description: `Received ${description}`,
    isDemo: Boolean(input.isDemo),
    createdAt: NOW(),
  };

  data.transactions.unshift(fromTransaction, toTransaction);

  if (input.userId) {
    void persistTransaction(fromTransaction.id, from.id, input.userId, {
      type: fromTransaction.type,
      amount: Number(fromTransaction.amount),
      currency: fromTransaction.currency,
      status: fromTransaction.status,
      description: fromTransaction.description,
      isDemo: Boolean(fromTransaction.isDemo),
    });
    void persistTransaction(toTransaction.id, to.id, input.userId, {
      type: toTransaction.type,
      amount: Number(toTransaction.amount),
      currency: toTransaction.currency,
      status: toTransaction.status,
      description: toTransaction.description,
      isDemo: Boolean(toTransaction.isDemo),
    });
  }

  return { from, to, fromTransaction, toTransaction };
}

export function getDemoCourses(): DemoCourse[] {
  return demoCourses;
}

export function getDemoLessons(): DemoLesson[] {
  return demoLessons;
}

// ---------- Seeded users ----------

export function createUser(opts: {
  id?: string;
  email: string;
  password: string;
  fullName: string;
  username: string;
  country: string;
  role: Role;
  kycVerified?: boolean;
  avatarSeed?: string;
  merchant?: boolean;
  phone?: string | null;
}): StoredUser {
  const id = opts.id ?? newUuid();
  const referralCode = newReferralCode();
  const stored: StoredUser = {
    user: {
      id,
      username: opts.username,
      email: opts.email,
      fullName: opts.fullName,
      country: opts.country,
      kycVerified: opts.kycVerified ?? false,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${opts.avatarSeed ?? opts.username}&backgroundColor=b6e3f4`,
      createdAt: NOW(),
      selectedManagerId: null,
      phone: opts.phone ?? null,
      merchant: opts.merchant ?? false,
      moonpayEmail: null,
      buyVerified: false,
    },
    passwordHash: hashPassword(opts.password),
    role: opts.role,
    accountFlag: null,
    suspended: false,
    disabled: false,
    referralCode,
    referredBy: null,
    merchant: opts.merchant ?? false,
    tradingLocked: false,
    demoMode: opts.role === "demo",
    phone: opts.phone ?? null,
  };
  users.set(id, stored);
  usersByEmail.set(opts.email.toLowerCase(), id);
  referralCodeIndex.set(referralCode, id);
  referrals.set(id, []);
  // Persist to DB so admin-created and seeded users survive restarts.
  // Note: This is a background operation but we don't wait for it here.
  // Callers that need guaranteed persistence should await separately if needed.
  persistUser(id, {
    email: opts.email,
    username: opts.username,
    passwordHash: stored.passwordHash,
    fullName: opts.fullName,
    country: opts.country,
    phone: opts.phone ?? null,
  }).catch((err) => {
    logger.warn(
      { userId: id, email: opts.email, err },
      '[store] Background persist failed for user created via createUser'
    );
  });
  return stored;
}

const DEMO_USER_EMAIL = "demo@xpressprofx.com";
const DEMO_USER_ID = "u_demo_default";

export function ensureDemoUser(): StoredUser {
  const existing = users.get(DEMO_USER_ID);
  if (existing) {
    return existing;
  }

  const stored = createUser({
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    password: "demo-password",
    fullName: "Demo Trader",
    username: "demo_trader",
    country: "US",
    role: "demo",
    kycVerified: true,
    avatarSeed: "demo",
  });

  stored.demoMode = true;
  stored.user.kycVerified = true;
  stored.user.buyVerified = false;
  stored.user.merchant = false;
  stored.role = "demo";

  const demoData = freshUserData(stored.user.id, { withDemoBalances: true, country: stored.user.country });
  demoData.wallets[0]!.balance = 24850.42;
  demoData.wallets[1]!.balance = 12480;
  demoData.wallets[1]!.pendingBalance = 350.5;
  demoData.wallets[2]!.pendingBalance = 1820.75;
  demoData.transactions = [
    {
      id: newId("tx"),
      walletId: demoData.wallets[0]!.id,
      type: "deposit",
      amount: 5000,
      currency: "USD",
      status: "completed",
      description: "Demo funding",
      createdAt: NOW(),
    },
  ];
  demoData.trades = [];
  userData.set(stored.user.id, demoData);

  return stored;
}

/** Create an isolated paper-trading account for a public visitor. */
export function createIsolatedDemoUser(): StoredUser {
  const id = newUuid();
  const suffix = id.replace(/-/g, "").slice(0, 12);
  const stored = createUser({
    id,
    email: `visitor-${suffix}@demo.xpressprofx.invalid`,
    password: "",
    fullName: "Demo Trader",
    username: `demo_${suffix}`,
    country: "US",
    role: "demo",
    kycVerified: false,
    avatarSeed: suffix,
  });
  const data = freshUserData(id, { withDemoBalances: true, country: "US" });
  data.wallets[0]!.balance = demoConfig.defaultBalance;
  data.wallets[1]!.balance = 0;
  data.wallets[2]!.balance = 0;
  data.transactions = [];
  data.trades = [];
  userData.set(id, data);
  return stored;
}

// --- Seed Alex (development-only demo user) ---
// Only seeded when ENABLE_DEMO_AUTH=true AND not in production.
if (isDemoAuthEnabled) {
const alex = createUser({
  id: "u_demo_001",
  email: "alex@xpressprofx.com",
  password: "password123",
  fullName: "Alex Morgan",
  username: "alex_trader",
  country: "US",
  role: "user",
  kycVerified: true,
  avatarSeed: "alex",
});
const alexData = freshUserData(alex.user.id, { withDemoBalances: true });

// Replace generated wallet IDs with stable ones referenced by seeded data
alexData.wallets[0]!.id = "w_main";
alexData.wallets[1]!.id = "w_trading";
alexData.wallets[2]!.id = "w_social";

alexData.transactions = [
  { id: "tx_001", walletId: "w_main", type: "deposit", amount: 5000, currency: "USD", status: "completed", description: "Bank deposit", createdAt: "2026-04-10T12:00:00.000Z" },
  { id: "tx_002", walletId: "w_main", type: "transfer", amount: -1500, currency: "USD", status: "completed", description: "Transfer to trading wallet", createdAt: "2026-04-12T09:30:00.000Z" },
  { id: "tx_003", walletId: "w_trading", type: "trade_profit", amount: 480, currency: "USD", status: "completed", description: "BTC/USDT long closed", createdAt: "2026-04-15T16:45:00.000Z" },
  { id: "tx_004", walletId: "w_main", type: "p2p_buy", amount: -2000, currency: "USD", status: "completed", description: "P2P purchase: 0.045 BTC", createdAt: "2026-04-18T10:15:00.000Z" },
  { id: "tx_005", walletId: "w_trading", type: "withdrawal", amount: -350.5, currency: "USD", status: "pending", description: "Withdrawal request", createdAt: "2026-04-20T14:22:00.000Z" },
];

alexData.trades = [
  { id: "t_001", pair: "BTC/USDT", type: "long", status: "active", entryPrice: 64200, currentPrice: 65850, targetPrice: 68000, amount: 0.25, currency: "USD", profit: 412.5, expectedProfit: 950, managerId: "m_001", createdAt: "2026-04-18T08:00:00.000Z", completedAt: null },
  { id: "t_002", pair: "ETH/USDT", type: "long", status: "active", entryPrice: 3120, currentPrice: 3245, targetPrice: 3400, amount: 4, currency: "USD", profit: 500, expectedProfit: 1120, managerId: "m_001", createdAt: "2026-04-19T11:30:00.000Z", completedAt: null },
  { id: "t_003", pair: "SOL/USDT", type: "short", status: "completed", entryPrice: 185, currentPrice: 172, targetPrice: 170, amount: 50, currency: "USD", profit: 650, expectedProfit: 750, managerId: "m_001", createdAt: "2026-04-12T09:00:00.000Z", completedAt: "2026-04-15T16:45:00.000Z" },
  { id: "t_004", pair: "XRP/USDT", type: "long", status: "completed", entryPrice: 0.62, currentPrice: 0.71, targetPrice: 0.7, amount: 5000, currency: "USD", profit: 450, expectedProfit: 400, managerId: "m_002", createdAt: "2026-04-08T10:00:00.000Z", completedAt: "2026-04-14T18:20:00.000Z" },
];

alexData.messages.set("manager:default", [
  { id: "msg_001", senderId: "m_001", senderName: "Sarah Chen", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=ffd5dc", content: "Welcome to the desk, Alex. I've opened a BTC long and an ETH long for you — both within your defined risk band.", context: "manager", contextId: null, isFromUser: false, createdAt: "2026-04-18T08:05:00.000Z" },
  { id: "msg_002", senderId: alex.user.id, senderName: alex.user.fullName, senderAvatar: null, content: "Thanks Sarah. What's your plan if BTC pulls back to 63k?", context: "manager", contextId: null, isFromUser: true, createdAt: "2026-04-18T08:12:00.000Z" },
  { id: "msg_003", senderId: "m_001", senderName: "Sarah Chen", senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=ffd5dc", content: "We'll add at 63.2k and re-target 68k. Stop stays at 61.8k — same risk envelope.", context: "manager", contextId: null, isFromUser: false, createdAt: "2026-04-18T08:14:00.000Z" },
]);

alexData.p2pOrders = [
  { id: "o_001", listingId: "l_002", buyerId: alex.user.id, sellerId: "u_seller_02", asset: "USDT", amount: 1000, price: 1.001, currency: "USD", status: "payment_sent", createdAt: "2026-04-21T09:00:00.000Z" },
];

alexData.p2pNotifications = [
  { id: "n_001", type: "order_update", title: "Seller has confirmed payment", message: "Kenji Sato confirmed your payment for 1,000 USDT. Funds released to your trading wallet.", orderId: "o_001", read: false, createdAt: "2026-04-21T09:35:00.000Z" },
  { id: "n_002", type: "deposit_incoming", title: "Incoming deposit detected", message: "0.045 BTC deposit detected. Awaiting 2 of 3 confirmations.", orderId: null, read: false, createdAt: "2026-04-21T07:20:00.000Z" },
  { id: "n_003", type: "admin_message", title: "Maintenance window scheduled", message: "Brief P2P maintenance scheduled for April 25, 02:00–02:30 UTC.", orderId: null, read: true, createdAt: "2026-04-19T14:00:00.000Z" },
];

alexData.kyc = { ...emptyKyc(alex.user.id), status: "approved", idType: "passport", idNumber: "P12345678", addressLine1: "100 Market St", city: "San Francisco", country: "US", submittedAt: "2025-09-02T00:00:00.000Z", decidedAt: "2025-09-03T00:00:00.000Z" };

alexData.deposits = [
  { id: "dep_001", userId: alex.user.id, amount: 5000, currency: "USD", method: "bank_transfer", status: "completed", reference: "Wire #88421", createdAt: "2026-04-10T12:00:00.000Z" },
  { id: "dep_002", userId: alex.user.id, amount: 2500, currency: "USD", method: "card", status: "completed", reference: "Visa ****4242", createdAt: "2026-04-14T08:15:00.000Z" },
];

alexData.withdrawals = [
  { id: "wd_001", userId: alex.user.id, userName: alex.user.fullName, amount: 350.5, currency: "USD", method: "crypto_wallet", destination: "0x9aF2...F1A2", status: "pending", rejectionReason: null, createdAt: "2026-04-20T14:22:00.000Z", decidedAt: null },
];

alexData.bankAccounts = [
  { id: "bank_001", userId: alex.user.id, bankName: "Chase Bank", accountHolder: "Alex Morgan", last4: "4421", currency: "USD", verified: true, isDefault: true, fiatBalance: 12450.75, fiatCurrency: "USD", createdAt: "2025-10-12T00:00:00.000Z" },
];

alexData.connectedWallets = [
  {
    id: "cw_001",
    walletType: "metamask",
    address: "0x9aF24Bf21D90b6FbDcD86F3FfeC3F86E58D3F1A2",
    balance: 1.842,
    currency: "ETH",
    connectionStatus: "public_address",
    connectedAt: "2026-04-09T14:00:00.000Z",
    provider: "self_custody",
    label: null,
    email: null,
    syncedProfile: null,
  },
  {
    id: "cw_002",
    walletType: "trust_wallet",
    address: "0x12C5Aab19Be3a1eC5e2B89eF73a9c9D7d3A11bAa",
    balance: 0.075,
    currency: "BTC",
    connectionStatus: "public_address",
    connectedAt: "2026-04-12T18:30:00.000Z",
    provider: "self_custody",
    label: null,
    email: null,
    syncedProfile: null,
  },
];

alexData.supportTickets = [
  {
    id: "st_001",
    subject: "KYC document re-review",
    status: "in_progress",
    priority: "medium",
    messages: [
      { id: "stm_001", senderId: alex.user.id, senderName: alex.user.fullName, senderAvatar: null, content: "Hi — my passport was rejected as low quality. Resubmitting a higher-resolution scan now.", context: "support", contextId: "st_001", isFromUser: true, createdAt: "2026-04-19T10:00:00.000Z" },
      { id: "stm_002", senderId: "support_agent", senderName: "XpressPro FX Support", senderAvatar: null, content: "Got it, Alex. Re-review takes up to 24 hours. We'll email you when it's complete.", context: "support", contextId: "st_001", isFromUser: false, createdAt: "2026-04-19T10:42:00.000Z" },
    ],
    createdAt: "2026-04-19T10:00:00.000Z",
    updatedAt: "2026-04-19T10:42:00.000Z",
  },
];

userData.set(alex.user.id, alexData);

// Seed referrals for Alex (visible referral history)
referrals.set(alex.user.id, [
  { referrerId: alex.user.id, referredId: "u_ref_01", referredName: "Jordan Reyes", joinedAt: "2026-03-12T00:00:00.000Z", status: "active", earned: 42.5 },
  { referrerId: alex.user.id, referredId: "u_ref_02", referredName: "Mei Lin", joinedAt: "2026-04-02T00:00:00.000Z", status: "active", earned: 18.0 },
  { referrerId: alex.user.id, referredId: "u_ref_03", referredName: "Tomas Becker", joinedAt: "2026-04-15T00:00:00.000Z", status: "pending", earned: 0 },
]);
logActivity({ actorId: alex.user.id, actorName: alex.user.fullName, action: "system.seed", detail: "Demo user Alex Morgan seeded with sample portfolio." });
} // end non-production seed block

export const adminSeedStatus: {
  provisioned: boolean;
  emails: string[];
  reason: string;
} = {
  provisioned: false,
  emails: [],
  reason: "",
};

// --- Seed Admin user (credentials must be set via environment variables) ---
export function seedAdminAccountsFromEnv(): void {
  const rawAdminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  const adminEmails = rawAdminEmail
    ? [...new Set(rawAdminEmail.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))]
    : [];

  const nextStatus = adminEmails.length > 0 && adminPassword
    ? {
        provisioned: true,
        emails: adminEmails,
        reason: `Admin account(s) provisioned from environment for ${adminEmails.length} address(es).`,
      }
    : {
        provisioned: false,
        emails: adminEmails,
        reason: !adminEmails.length && !adminPassword
          ? "Both ADMIN_EMAIL and ADMIN_PASSWORD env vars are missing."
          : !adminEmails.length
            ? "ADMIN_EMAIL env var is missing."
            : "ADMIN_PASSWORD env var is missing.",
      };

  adminSeedStatus.provisioned = nextStatus.provisioned;
  adminSeedStatus.emails = nextStatus.emails;
  adminSeedStatus.reason = nextStatus.reason;

  if (adminEmails.length === 0 || !adminPassword) {
    return;
  }

  adminEmails.forEach((email, index) => {
    const adminId = index === 0 ? "u_admin" : `u_admin_${index + 1}`;
    const username = index === 0 ? "admin" : `admin${index + 1}`;
    const fullName = index === 0 ? "Platform Admin" : `Platform Admin ${index + 1}`;
    const existing = usersByEmail.get(email);
    if (existing) {
      const stored = users.get(existing);
      if (stored) {
        stored.role = "admin";
        stored.passwordHash = createUser({
          id: existing,
          email,
          password: adminPassword,
          fullName,
          username,
          country: "US",
          role: "admin",
          kycVerified: true,
          avatarSeed: username,
        }).passwordHash;
      }
      logActivity({ actorId: existing, actorName: fullName, action: "system.seed", detail: `Admin credentials refreshed from environment for ${email}.` });
      return;
    }

    const user = createUser({
      id: adminId,
      email,
      password: adminPassword,
      fullName,
      username,
      country: "US",
      role: "admin",
      kycVerified: true,
      avatarSeed: username,
    });
    users.set(user.user.id, user);
    usersByEmail.set(email, user.user.id);
    referralCodeIndex.set(user.referralCode, user.user.id);
    if (!referrals.has(user.user.id)) referrals.set(user.user.id, []);
    userData.set(user.user.id, freshUserData(user.user.id));
    logActivity({ actorId: user.user.id, actorName: user.user.fullName, action: "system.seed", detail: adminSeedStatus.reason });
  });
}

seedAdminAccountsFromEnv();

// --- Seed sample P2P merchant applications (development-only) ---
if (isDemoAuthEnabled) {
  const sampleApps: P2PMerchantApplicationData[] = [
    {
      id: "app_pending_001",
      userId: "u_applicant_01",
      userName: "Jordan Reyes",
      userEmail: "jordan.reyes@example.com",
      displayName: "Reyes Crypto OTC",
      legalName: "Jordan A. Reyes",
      contactEmail: "jordan.reyes@example.com",
      country: "CA",
      paymentMethod: "bank",
      payoutEmail: "payouts@reyesotc.com",
      bankInfo: "Jordan Reyes — RBC Royal Bank — Acct ****1124 — Transit 02871",
      assets: "BTC, USDT, ETH",
      reason: "Have been trading P2P for 3 years. Looking to scale my volume on this platform.",
      status: "pending",
      rejectionReason: null,
      submittedAt: "2026-04-19T11:30:00.000Z",
      decidedAt: null,
    },
    {
      id: "app_approved_001",
      userId: "u_seller_02",
      userName: "Kenji Sato",
      userEmail: "kenji.sato@example.com",
      displayName: "Sato P2P",
      legalName: "Kenji Sato",
      contactEmail: "kenji.sato@example.com",
      country: "JP",
      paymentMethod: "etransfer",
      payoutEmail: "kenji@sato-p2p.io",
      bankInfo: "Kenji Sato — Mizuho Bank — Acct ****8821",
      assets: "USDT, USDC",
      reason: "Established merchant from another platform with 1,200+ completed orders.",
      status: "approved",
      rejectionReason: null,
      submittedAt: "2026-03-02T08:00:00.000Z",
      decidedAt: "2026-03-04T10:15:00.000Z",
    },
  ];
  for (const app of sampleApps) {
    p2pMerchantApplications.set(app.id, app);
  }
}

export { NOW };

// ---------- Notifications, alerts, sent-email log, notification settings ----------

export interface NotificationData {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface AdminAlertData {
  id: string;
  kind: string;
  title: string;
  body: string;
  userId: string | null;
  userEmail: string | null;
  severity: "info" | "warning" | "critical";
  read: boolean;
  createdAt: string;
  linkUrl?: string | null;
}

/**
 * Admin live-chat presence: adminUserId → ISO timestamp of the most recent
 * heartbeat or admin live-chat action. Considered "online" when the gap is
 * within ADMIN_PRESENCE_WINDOW_MS (see live-chat.ts).
 */
export const adminPresence = new Map<string, string>();

export interface SentEmailData {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  kind: string;
  sentAt: string;
}

export interface NotificationSettingsData {
  withdrawalGasFeeRequired: boolean;
  withdrawalApproved: boolean;
  withdrawalRejected: boolean;
  withdrawalExpired: boolean;
  kycApproved: boolean;
  kycRejected: boolean;
  kycReset: boolean;
  accountSuspended: boolean;
  accountDisabled: boolean;
  accountFlagged: boolean;
  broadcastTicket: boolean;
  mailboxReply: boolean;
  liveChatHandoff: boolean;
  withdrawalSubmitted: boolean;
  depositReceived: boolean;
  p2pOrderUpdate: boolean;
  tradeOpened: boolean;
  walletTransfer: boolean;
  planNotifications: boolean;
}

/** Per-user inbox of in-app notifications (most-recent first). */
export const userNotifications = new Map<string, NotificationData[]>();
/** Admin-side alert stream (most-recent first). */
export const adminAlerts: AdminAlertData[] = [];
/** Bounded log of emails the platform pretended to send. */
export const sentEmails: SentEmailData[] = [];
/** Admin-controlled per-action email toggles. Defaults: ALL on. */
export const notificationSettings: NotificationSettingsData = {
  withdrawalGasFeeRequired: true,
  withdrawalApproved: true,
  withdrawalRejected: true,
  withdrawalExpired: true,
  kycApproved: true,
  kycRejected: true,
  kycReset: true,
  accountSuspended: true,
  accountDisabled: true,
  accountFlagged: true,
  broadcastTicket: true,
  mailboxReply: true,
  liveChatHandoff: true,
  withdrawalSubmitted: true,
  depositReceived: true,
  p2pOrderUpdate: true,
  tradeOpened: true,
  walletTransfer: true,
  planNotifications: true,
};
