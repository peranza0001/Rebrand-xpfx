import { createHash } from "crypto";

export type LegacyPlanType = "starter-growth" | "standard-trader" | "elite-investor" | "us-stocks-plus";
export type PlanId =
  | "standard"
  | "pro"
  | "vip"
  | "starter_spark"
  | "growth_core"
  | "momentum_pulse"
  | "alpha_forge"
  | "precision_nexus"
  | "quant_dominion"
  | "institutional_apex"
  | "sovereign_vector"
  | "elite_horizon"
  | "apex_legacy"
  | "titan_reserve"
  | "infinity_protocol";

export type InvestmentPlanType = PlanId | LegacyPlanType;
export type TradingDuration = "short" | "long";

export interface PlanProjection {
  planId: InvestmentPlanType;
  capital: number;
  estimatedProfitPct: number;
  estimatedProfit: number;
  projectedBalance: number;
  longTradeDays: number;
  shortTradeDays: number;
  marketSignal: string;
  riskLevel: string;
  recommendedHoldDays: number;
  automationEnabled: boolean;
}
export interface InvestmentPlan {
  id: PlanId;
  name: string;
  minDeposit: number;
  maxDeposit: number;
  durationDays: number;
  dailyRoiMin: number;
  dailyRoiMax: number;
  capitalEfficiencyBonus: number;
  riskLevel: "low" | "low-med" | "medium" | "med-high" | "high" | "very-high" | "extreme";
  weeklyTopUp: number;
  requiredLevel: number;
  allowNewUserOnce: boolean;
  description: string;
  estimatedReturnPercent?: number;
  tradingDuration?: TradingDuration;
  maxActivePlans?: number;
  features?: string[];
  automationLevel?: "passive" | "active" | "aggressive";
  recommendedHoldDays?: number;
}

export interface InvestmentPlanDefinition extends InvestmentPlan {
  estimatedReturnPercent: number;
  tradingDuration: TradingDuration;
  maxActivePlans: number;
  features: string[];
  automationLevel: "passive" | "active" | "aggressive";
  recommendedHoldDays: number;
}

export interface ActiveInvestmentPlan {
  id: string;
  userId: string;
  planType: InvestmentPlanType;
  planName: string;
  status: "active" | "completed" | "cancelled" | "suspended";
  initialCapital: number;
  currentBalance: number;
  currentPnL: number;
  pnlPercent: number;
  startedAt: string;
  estimatedEndDate: string;
  completedAt?: string;
  automationEnabled: boolean;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  accountManagerId?: string;
  manuallyControlledBy?: string;
  controlLog: PlanControlLog[];
  trades: string[];
  executionHistory: PlanExecution[];
  riskMetrics: RiskMetrics;
}

export interface PlanControlLog {
  timestamp: string;
  action: "created" | "modified" | "suspended" | "resumed" | "cancelled" | "completed" | "trade_executed" | "trade_closed";
  adminId?: string;
  details: Record<string, unknown>;
  reason?: string;
}

export interface PlanExecution {
  executionId: string;
  timestamp: string;
  type: "entry" | "exit" | "rebalance" | "stop_loss" | "take_profit";
  instrument: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  pnl?: number;
  status: "pending" | "executed" | "failed" | "cancelled";
}

export interface RiskMetrics {
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  maxRiskExposure: number;
  leverageUsed: number;
  marginLevel: number;
}

export type AccountAuthorizationLevel = "basic" | "identity_verified" | "trading_ready" | "full_authorized";

export interface AccountChecklist {
  userId: string;
  completed: boolean;
  authorized: boolean;
  authorizationLevel: AccountAuthorizationLevel;
  completionPercent: number;
  items: ChecklistItem[];
  missingMandatory: string[];
  nextRequiredStep: string | null;
  accessSummary: string[];
  completedAt?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: "verification" | "funding" | "setup" | "risk_management";
  completed: boolean;
  completedAt?: string;
  mandatory: boolean;
}

export interface GasFeeWallet {
  userId: string;
  address: string;
  currency: string;
  balance: number;
  gasFeesRequired: number;
  lastUpdatedAt: string;
  walletLabel?: string;
}

export interface PendingGasCharge {
  id: string;
  userId: string;
  reason: "withdrawal" | "crypto_transfer" | "contract_interaction" | "plan_activation";
  amount: number;
  status: "pending" | "charged" | "failed";
  createdAt: string;
  chargedAt?: string;
  description: string;
}

export interface InvestmentPlanSubscription {
  subscriptionId: string;
  userId: string;
  planId: InvestmentPlanType;
  planName: string;
  status: "active" | "paused" | "cancelled" | "completed";
  initialDeposit: number;
  currentBalance: number;
  estimatedProfit: number;
  estimatedProfitPct: number;
  accountManagerId: string | null;
  accountManagerName: string | null;
  subscriptionStarted: string;
  subscriptionEnd?: string | null;
  lastRebalance: string;
  manuallyControlledBy?: string | null;
  automationEnabled: boolean;
  longTradeDays: number;
  shortTradeDays: number;
  marketSignal: string;
}

const LEGACY_PLAN_ALIASES: Partial<Record<LegacyPlanType, PlanId>> = {
  "starter-growth": "starter_spark",
  "standard-trader": "momentum_pulse",
  "elite-investor": "institutional_apex",
  "us-stocks-plus": "infinity_protocol",
};

export function normalizePlanId(planId: string): PlanId {
  const raw = String(planId ?? "").trim();
  if (raw in LEGACY_PLAN_ALIASES) {
    return LEGACY_PLAN_ALIASES[raw as LegacyPlanType] as PlanId;
  }

  if (raw in INVESTMENT_PLANS) {
    return raw as PlanId;
  }

  const match = Object.keys(INVESTMENT_PLANS).find((key) => key.toLowerCase() === raw.toLowerCase());
  if (match) {
    return match as PlanId;
  }

  throw new Error(`Unknown investment plan: ${planId}`);
}

export const INVESTMENT_PLANS: Record<PlanId, InvestmentPlan> = {
  standard: {
    id: "standard",
    name: "Standard",
    minDeposit: 500,
    maxDeposit: 4999,
    durationDays: 14,
    dailyRoiMin: 0.004,
    dailyRoiMax: 0.0155,
    capitalEfficiencyBonus: 0.05,
    riskLevel: "low-med",
    weeklyTopUp: 60,
    requiredLevel: 1,
    allowNewUserOnce: true,
    description: "Accessible core tier for first-time investors with structured growth pacing and transparent execution.",
    estimatedReturnPercent: 12.4,
    tradingDuration: "long",
    maxActivePlans: 2,
    features: ["Core market exposure", "Transparent fee structure", "Weekly automation and review"],
    automationLevel: "passive",
    recommendedHoldDays: 14,
  },
  pro: {
    id: "pro",
    name: "Pro",
    minDeposit: 5000,
    maxDeposit: 24999,
    durationDays: 21,
    dailyRoiMin: 0.0065,
    dailyRoiMax: 0.024,
    capitalEfficiencyBonus: 0.12,
    riskLevel: "medium",
    weeklyTopUp: 180,
    requiredLevel: 3,
    allowNewUserOnce: false,
    description: "Higher-conviction strategy tier designed for active portfolio builders seeking stronger compounding.",
    estimatedReturnPercent: 18.8,
    tradingDuration: "short",
    maxActivePlans: 3,
    features: ["Active allocation strategy", "$10k+ efficiency boost", "Priority account review"],
    automationLevel: "active",
    recommendedHoldDays: 21,
  },
  vip: {
    id: "vip",
    name: "VIP",
    minDeposit: 25000,
    maxDeposit: 99999,
    durationDays: 45,
    dailyRoiMin: 0.0095,
    dailyRoiMax: 0.033,
    capitalEfficiencyBonus: 0.24,
    riskLevel: "high",
    weeklyTopUp: 420,
    requiredLevel: 5,
    allowNewUserOnce: false,
    description: "VIP tier for larger balances with greater capital efficiency, higher throughput, and direct oversight.",
    estimatedReturnPercent: 27.6,
    tradingDuration: "short",
    maxActivePlans: 4,
    features: ["VIP capital efficiency", "Direct oversight", "Accelerated top-up management"],
    automationLevel: "aggressive",
    recommendedHoldDays: 45,
  },
  starter_spark: {
    id: "starter_spark",
    name: "Starter Spark",
    minDeposit: 300,
    maxDeposit: 2999,
    durationDays: 10,
    dailyRoiMin: 0.0035,
    dailyRoiMax: 0.0095,
    capitalEfficiencyBonus: 0,
    riskLevel: "low",
    weeklyTopUp: 40,
    requiredLevel: 1,
    allowNewUserOnce: true,
    description: "Exclusive one-time entry plan for new users. Steady compounding with locked daily profits.",
    estimatedReturnPercent: 7.5,
    tradingDuration: "long",
    maxActivePlans: 2,
    features: ["Exclusive new-user entry", "Locked daily profit accrual", "Low-volatility compounding"],
    automationLevel: "passive",
    recommendedHoldDays: 10,
  },
  growth_core: {
    id: "growth_core",
    name: "Growth Core",
    minDeposit: 3000,
    maxDeposit: 9999,
    durationDays: 18,
    dailyRoiMin: 0.0055,
    dailyRoiMax: 0.0145,
    capitalEfficiencyBonus: 0.08,
    riskLevel: "low-med",
    weeklyTopUp: 90,
    requiredLevel: 2,
    allowNewUserOnce: false,
    description: "Core growth engine — first real step into consistent capital acceleration.",
    estimatedReturnPercent: 14.5,
    tradingDuration: "long",
    maxActivePlans: 3,
    features: ["Core capital acceleration", "Portfolio balancing", "Weekly strategy automation"],
    automationLevel: "active",
    recommendedHoldDays: 18,
  },
  momentum_pulse: {
    id: "momentum_pulse",
    name: "Momentum Pulse",
    minDeposit: 10000,
    maxDeposit: 24999,
    durationDays: 25,
    dailyRoiMin: 0.0075,
    dailyRoiMax: 0.021,
    capitalEfficiencyBonus: 0.15,
    riskLevel: "medium",
    weeklyTopUp: 180,
    requiredLevel: 3,
    allowNewUserOnce: false,
    description: "Momentum strategy. Capital above $10k begins receiving efficiency bonus.",
    estimatedReturnPercent: 19.5,
    tradingDuration: "short",
    maxActivePlans: 3,
    features: ["Momentum execution", "$10k+ efficiency boost", "Short-cycle re-entry logic"],
    automationLevel: "active",
    recommendedHoldDays: 25,
  },
  alpha_forge: {
    id: "alpha_forge",
    name: "Alpha Forge",
    minDeposit: 25000,
    maxDeposit: 59999,
    durationDays: 35,
    dailyRoiMin: 0.0095,
    dailyRoiMax: 0.026,
    capitalEfficiencyBonus: 0.22,
    riskLevel: "medium",
    weeklyTopUp: 320,
    requiredLevel: 4,
    allowNewUserOnce: false,
    description: "Alpha generation forge for serious capital.",
    estimatedReturnPercent: 25.2,
    tradingDuration: "short",
    maxActivePlans: 4,
    features: ["Scaling model exposure", "Risk-managed compounding", "Alpha signal overlay"],
    automationLevel: "aggressive",
    recommendedHoldDays: 35,
  },
  precision_nexus: {
    id: "precision_nexus",
    name: "Precision Nexus",
    minDeposit: 60000,
    maxDeposit: 149999,
    durationDays: 45,
    dailyRoiMin: 0.0115,
    dailyRoiMax: 0.031,
    capitalEfficiencyBonus: 0.28,
    riskLevel: "med-high",
    weeklyTopUp: 550,
    requiredLevel: 5,
    allowNewUserOnce: false,
    description: "Precision multi-factor model with strong compounding power.",
    estimatedReturnPercent: 30.8,
    tradingDuration: "short",
    maxActivePlans: 4,
    features: ["Multi-factor strategy", "Higher frequency compounding", "Precision execution control"],
    automationLevel: "aggressive",
    recommendedHoldDays: 45,
  },
  quant_dominion: {
    id: "quant_dominion",
    name: "Quant Dominion",
    minDeposit: 150000,
    maxDeposit: 349999,
    durationDays: 60,
    dailyRoiMin: 0.0135,
    dailyRoiMax: 0.037,
    capitalEfficiencyBonus: 0.35,
    riskLevel: "high",
    weeklyTopUp: 900,
    requiredLevel: 6,
    allowNewUserOnce: false,
    description: "Quantitative dominion layer — institutional-grade daily generation.",
    estimatedReturnPercent: 36.8,
    tradingDuration: "short",
    maxActivePlans: 4,
    features: ["Institutional-grade automation", "Quantitative signal layering", "Higher daily generation"],
    automationLevel: "aggressive",
    recommendedHoldDays: 60,
  },
  institutional_apex: {
    id: "institutional_apex",
    name: "Institutional Apex",
    minDeposit: 350000,
    maxDeposit: 799999,
    durationDays: 90,
    dailyRoiMin: 0.0155,
    dailyRoiMax: 0.042,
    capitalEfficiencyBonus: 0.42,
    riskLevel: "high",
    weeklyTopUp: 1500,
    requiredLevel: 7,
    allowNewUserOnce: false,
    description: "Apex institutional allocation with extended duration.",
    estimatedReturnPercent: 42.7,
    tradingDuration: "long",
    maxActivePlans: 3,
    features: ["Institutional reallocation", "Extended duration capital efficiency", "Strategic account oversight"],
    automationLevel: "aggressive",
    recommendedHoldDays: 90,
  },
  sovereign_vector: {
    id: "sovereign_vector",
    name: "Sovereign Vector",
    minDeposit: 800000,
    maxDeposit: 1999999,
    durationDays: 120,
    dailyRoiMin: 0.018,
    dailyRoiMax: 0.048,
    capitalEfficiencyBonus: 0.5,
    riskLevel: "very-high",
    weeklyTopUp: 2800,
    requiredLevel: 8,
    allowNewUserOnce: false,
    description: "Sovereign-grade vector strategy with maximum capital efficiency.",
    estimatedReturnPercent: 47.0,
    tradingDuration: "long",
    maxActivePlans: 2,
    features: ["Sovereign capital allocation", "Maximum throughput efficiency", "Long-horizon programing"],
    automationLevel: "aggressive",
    recommendedHoldDays: 120,
  },
  elite_horizon: {
    id: "elite_horizon",
    name: "Elite Horizon",
    minDeposit: 2000000,
    maxDeposit: 4999999,
    durationDays: 150,
    dailyRoiMin: 0.0205,
    dailyRoiMax: 0.054,
    capitalEfficiencyBonus: 0.58,
    riskLevel: "very-high",
    weeklyTopUp: 4500,
    requiredLevel: 9,
    allowNewUserOnce: false,
    description: "Elite long-horizon protocol with exceptional compounding trajectory.",
    estimatedReturnPercent: 53.0,
    tradingDuration: "long",
    maxActivePlans: 2,
    features: ["Elite compounding runway", "High-capital efficiency", "Long-duration exposure"],
    automationLevel: "aggressive",
    recommendedHoldDays: 150,
  },
  apex_legacy: {
    id: "apex_legacy",
    name: "Apex Legacy",
    minDeposit: 5000000,
    maxDeposit: 9999999,
    durationDays: 180,
    dailyRoiMin: 0.023,
    dailyRoiMax: 0.06,
    capitalEfficiencyBonus: 0.65,
    riskLevel: "extreme",
    weeklyTopUp: 7000,
    requiredLevel: 10,
    allowNewUserOnce: false,
    description: "Legacy apex allocation for high-net-worth participants.",
    estimatedReturnPercent: 58.5,
    tradingDuration: "long",
    maxActivePlans: 1,
    features: ["Legacy apex tier", "High-net-worth prioritization", "Maximum daily efficiency"],
    automationLevel: "aggressive",
    recommendedHoldDays: 180,
  },
  titan_reserve: {
    id: "titan_reserve",
    name: "Titan Reserve",
    minDeposit: 10000000,
    maxDeposit: 19999999,
    durationDays: 240,
    dailyRoiMin: 0.026,
    dailyRoiMax: 0.068,
    capitalEfficiencyBonus: 0.75,
    riskLevel: "extreme",
    weeklyTopUp: 11000,
    requiredLevel: 11,
    allowNewUserOnce: false,
    description: "Titan reserve tier — near-maximum efficiency and duration.",
    estimatedReturnPercent: 66.0,
    tradingDuration: "long",
    maxActivePlans: 1,
    features: ["Reserve capital expansion", "Extended multi-quarter runway", "Peak efficiency tier"],
    automationLevel: "aggressive",
    recommendedHoldDays: 240,
  },
  infinity_protocol: {
    id: "infinity_protocol",
    name: "Infinity Protocol",
    minDeposit: 20000000,
    maxDeposit: 50000000,
    durationDays: 365,
    dailyRoiMin: 0.029,
    dailyRoiMax: 0.075,
    capitalEfficiencyBonus: 0.9,
    riskLevel: "extreme",
    weeklyTopUp: 18000,
    requiredLevel: 12,
    allowNewUserOnce: false,
    description: "Flagship Infinity Protocol — highest tier, longest horizon, ultimate capital efficiency.",
    estimatedReturnPercent: 74.0,
    tradingDuration: "long",
    maxActivePlans: 1,
    features: ["Flagship long-horizon strategy", "Ultimate efficiency", "Maximum tier performance"],
    automationLevel: "aggressive",
    recommendedHoldDays: 365,
  },
};

for (const [legacyId, canonicalId] of Object.entries(LEGACY_PLAN_ALIASES)) {
  const canonicalPlan = INVESTMENT_PLANS[canonicalId as PlanId];
  const legacyPlan = legacyId === "starter-growth"
    ? { ...canonicalPlan, recommendedHoldDays: 30 }
    : canonicalPlan;
  Object.defineProperty(INVESTMENT_PLANS, legacyId, {
    configurable: false,
    enumerable: false,
    value: legacyPlan,
    writable: false,
  });
}

export function getWeeklyTopUpAmount(planId: PlanId | string): number {
  const resolved = normalizePlanId(planId);
  return INVESTMENT_PLANS[resolved].weeklyTopUp;
}

export function generateMarketFlowMultiplier(planId: PlanId | string, userId: string, dayIndex: number, principal: number): number {
  const resolved = normalizePlanId(planId);
  const plan = INVESTMENT_PLANS[resolved];
  const seedStr = `${plan.id}:${userId}:${dayIndex}:${Math.floor(principal)}:${new Date().toISOString().slice(0, 10)}`;
  const hash = createHash("sha256").update(seedStr).digest("hex");

  const r1 = Number.parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  const r2 = Number.parseInt(hash.slice(8, 16), 16) / 0xffffffff;
  const r3 = Number.parseInt(hash.slice(16, 24), 16) / 0xffffffff;

  const trend = Math.sin((dayIndex + r1 * 10) * 0.35) * 0.6;
  const volatility = (r2 - 0.5) * 1.4;
  const meanReversion = (0.5 - r3) * 0.4;
  let raw = trend + volatility + meanReversion;

  if (r1 < 0.175) {
    return -(0.0018 + r2 * 0.009);
  }

  const range = plan.dailyRoiMax - plan.dailyRoiMin;
  let multiplier = plan.dailyRoiMin + Math.abs(raw) * range;

  if (multiplier > 0 && principal >= 10000) {
    multiplier *= 1 + plan.capitalEfficiencyBonus;
  }

  return Math.min(multiplier, plan.dailyRoiMax * (1 + plan.capitalEfficiencyBonus + 0.15));
}

export const DEFAULT_ACCOUNT_CHECKLIST: ChecklistItem[] = [
  {
    id: "email-verify",
    label: "Email verified",
    description: "Confirm your email address for account security",
    category: "verification",
    completed: false,
    mandatory: true,
  },
  {
    id: "phone-verify",
    label: "Phone verified",
    description: "Add and verify a phone number for 2FA",
    category: "verification",
    completed: false,
    mandatory: true,
  },
  {
    id: "kyc-approved",
    label: "KYC verification approved",
    description: "Complete identity verification (KYC) to unlock trading features",
    category: "verification",
    completed: false,
    mandatory: true,
  },
  {
    id: "bank-connected",
    label: "Bank account connected",
    description: "Link a verified bank account for deposits and withdrawals",
    category: "funding",
    completed: false,
    mandatory: true,
  },
  {
    id: "deposit-made",
    label: "Initial deposit completed",
    description: "Make a minimum deposit to activate your trading account",
    category: "funding",
    completed: false,
    mandatory: true,
  },
  {
    id: "risk-acknowledge",
    label: "Risk disclosure acknowledged",
    description: "Review and accept the risk disclosure document",
    category: "risk_management",
    completed: false,
    mandatory: true,
  },
  {
    id: "api-setup",
    label: "API credentials configured (optional)",
    description: "Configure API access if using automated trading tools",
    category: "setup",
    completed: false,
    mandatory: false,
  },
];

export function evaluateAccountChecklist(items: ChecklistItem[] = DEFAULT_ACCOUNT_CHECKLIST): AccountChecklist {
  const mandatoryItems = items.filter((item) => item.mandatory);
  const completedCount = items.filter((item) => item.completed).length;
  const missingMandatory = mandatoryItems.filter((item) => !item.completed).map((item) => item.label);
  const emailVerified = items.find((item) => item.id === "email-verify")?.completed ?? false;
  const phoneVerified = items.find((item) => item.id === "phone-verify")?.completed ?? false;
  const kycApproved = items.find((item) => item.id === "kyc-approved")?.completed ?? false;
  const bankConnected = items.find((item) => item.id === "bank-connected")?.completed ?? false;
  const depositComplete = items.find((item) => item.id === "deposit-made")?.completed ?? false;
  const riskAcknowledged = items.find((item) => item.id === "risk-acknowledge")?.completed ?? false;

  let authorizationLevel: AccountAuthorizationLevel = "basic";
  if (emailVerified && phoneVerified && kycApproved) {
    authorizationLevel = "identity_verified";
  }
  if (emailVerified && phoneVerified && kycApproved && bankConnected && depositComplete) {
    authorizationLevel = "trading_ready";
  }
  if (emailVerified && phoneVerified && kycApproved && bankConnected && depositComplete && riskAcknowledged) {
    authorizationLevel = "full_authorized";
  }

  const authorized = authorizationLevel === "full_authorized";
  const nextRequiredStep = missingMandatory[0] ?? null;
  const accessSummary = [
    "Basic profile access",
    ...(authorizationLevel === "basic" ? [] : ["Identity verification approved"]),
    ...(authorizationLevel === "identity_verified" ? ["Enhanced due diligence cleared"] : []),
    ...(authorizationLevel === "trading_ready" || authorizationLevel === "full_authorized" ? ["Funding and bank verification complete"] : []),
    ...(authorizationLevel === "full_authorized" ? ["Full trading and withdrawal authorization granted"] : []),
  ];

  return {
    userId: "",
    completed: mandatoryItems.every((item) => item.completed),
    authorized,
    authorizationLevel,
    completionPercent: items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100),
    items,
    missingMandatory,
    nextRequiredStep,
    accessSummary,
  };
}
export function generatePlanProjection(planId: InvestmentPlanType, capital: number): PlanProjection {
  const plan = INVESTMENT_PLANS[normalizePlanId(String(planId))];
  const safeCapital = Math.max(0, Number(capital) || 0);
  const baseReturn = plan.estimatedReturnPercent ?? 12;
  const annualizedReturn = baseReturn / 100;
  const shortBias = plan.tradingDuration === "short" ? 1.18 : 1.0;
  const longTradeDays = plan.tradingDuration === "long" ? Math.max(14, (plan.recommendedHoldDays ?? plan.durationDays) - 15) : Math.max(7, Math.ceil((plan.recommendedHoldDays ?? plan.durationDays) * 0.55));
  const shortTradeDays = plan.tradingDuration === "short" ? Math.max(8, Math.round((plan.recommendedHoldDays ?? plan.durationDays) * 0.75)) : Math.max(4, Math.ceil((plan.recommendedHoldDays ?? plan.durationDays) * 0.35));
  const estimatedProfitPct = Number((annualizedReturn * shortBias * 100).toFixed(2));
  const estimatedProfit = Number((safeCapital * (estimatedProfitPct / 100)).toFixed(2));
  const projectedBalance = Number((safeCapital + estimatedProfit).toFixed(2));

  let marketSignal = "Momentum remains constructive with controlled risk exposure.";
  if (plan.tradingDuration === "short") {
    marketSignal = "Short-cycle execution is active; momentum and volatility are being monitored for profitable re-entry opportunities.";
  } else if (plan.id === "infinity_protocol") {
    marketSignal = "Long-term strategic allocation remains heavily biased toward disciplined compounding and capital preservation.";
  }

  return {
    planId: plan.id,
    capital: safeCapital,
    estimatedProfitPct,
    estimatedProfit,
    projectedBalance,
    longTradeDays,
    shortTradeDays,
    marketSignal,
    riskLevel: plan.riskLevel,
    recommendedHoldDays: plan.recommendedHoldDays ?? plan.durationDays,
    automationEnabled: true,
  };
}
