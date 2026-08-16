/**
 * Investment Plans System
 * ========================
 * Manages professional trading and investment plans that run automatically
 * with real-time market analysis, admin controls, and account manager oversight.
 */

export type InvestmentPlanType = "starter-growth" | "standard-trader" | "elite-investor" | "us-stocks-plus";
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

export interface InvestmentPlanDefinition {
  id: InvestmentPlanType;
  name: string;
  description: string;
  minDeposit: number;
  estimatedReturnPercent: number;
  tradingDuration: TradingDuration;
  maxActivePlans: number;
  features: string[];
  automationLevel: "passive" | "active" | "aggressive";
  riskLevel: "conservative" | "moderate" | "aggressive";
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
  currentPnL: number; // profit/loss in USD
  pnlPercent: number; // return percentage
  startedAt: string;
  estimatedEndDate: string;
  completedAt?: string;
  // Automatic execution details
  automationEnabled: boolean;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  // Admin oversight
  accountManagerId?: string; // admin assigned manager
  manuallyControlledBy?: string; // admin id if manually controlled
  controlLog: PlanControlLog[];
  // Real-time tracking
  trades: string[]; // trade IDs linked to this plan
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
  maxDrawdown: number; // percentage
  volatility: number; // annualized
  sharpeRatio: number;
  maxRiskExposure: number; // USD
  leverageUsed: number; // current leverage ratio
  marginLevel: number; // percent
}

export interface AccountChecklist {
  userId: string;
  completed: boolean;
  completionPercent: number;
  items: ChecklistItem[];
  missingMandatory: string[];
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
  currency: string; // ETH, MATIC, etc.
  balance: number;
  gasFeesRequired: number; // total fees pending/charged
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

/**
 * Professional Investment Plans Catalog
 */
export const INVESTMENT_PLANS: Record<InvestmentPlanType, InvestmentPlanDefinition> = {
  "starter-growth": {
    id: "starter-growth",
    name: "Starter Growth",
    description: "Build confidence with diversified trading and long-term crypto, forex, and US stock exposure.",
    minDeposit: 250,
    estimatedReturnPercent: 8.5,
    tradingDuration: "long",
    maxActivePlans: 2,
    features: [
      "Multi-asset access across forex, crypto, indices and equities",
      "1:50 leverage for balanced risk management",
      "Recurring investment automation and dollar-cost averaging",
      "Paper trading simulator and guided setup",
      "Market commentary and weekly strategy briefings",
    ],
    automationLevel: "passive",
    riskLevel: "conservative",
    recommendedHoldDays: 90,
  },
  "standard-trader": {
    id: "standard-trader",
    name: "Standard Trader",
    description: "Our flagship plan for active traders who want real-time execution across digital assets and equities.",
    minDeposit: 1500,
    estimatedReturnPercent: 18.5,
    tradingDuration: "short",
    maxActivePlans: 3,
    features: [
      "Access to 3,000+ US stocks and 60+ forex pairs",
      "Advanced charting with execution alerts and trade signals",
      "Priority support, risk dashboard and portfolio analytics",
      "1:200 leverage with tighter spreads on major instruments",
      "Automated stop-loss and profit-taking workflows",
    ],
    automationLevel: "active",
    riskLevel: "moderate",
    recommendedHoldDays: 30,
  },
  "elite-investor": {
    id: "elite-investor",
    name: "Elite Investor",
    description: "A premium portfolio plan with deeper capital markets exposure, structured risk controls, and analyst insight.",
    minDeposit: 10000,
    estimatedReturnPercent: 22.0,
    tradingDuration: "long",
    maxActivePlans: 5,
    features: [
      "Portfolio rebalancing across stocks, ETFs, crypto and commodities",
      "Dedicated account manager and custom trading allocation models",
      "Expanded leverage and reduced commissions",
      "Private market updates and institutional research briefs",
      "Quarterly portfolio review with macro strategy guidance",
    ],
    automationLevel: "aggressive",
    riskLevel: "moderate",
    recommendedHoldDays: 60,
  },
  "us-stocks-plus": {
    id: "us-stocks-plus",
    name: "US Stocks Plus",
    description: "Focused on long-term equity growth with dividend tracking, market sentiment tools, and recurring buy plans.",
    minDeposit: 5000,
    estimatedReturnPercent: 12.0,
    tradingDuration: "long",
    maxActivePlans: 4,
    features: [
      "Fractional shares on top NASDAQ and NYSE listings",
      "Dividend and earnings calendar tracking",
      "Recurring weekly or monthly investment automation",
      "Portfolio allocation for blue-chip growth and value names",
      "Institutional-grade risk scoring and buy-zone alerts",
    ],
    automationLevel: "passive",
    riskLevel: "conservative",
    recommendedHoldDays: 180,
  },
};

/**
 * Default Account Checklist Items
 */
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

  return {
    userId: "",
    completed: mandatoryItems.every((item) => item.completed),
    completionPercent: items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100),
    items,
    missingMandatory,
  };
}

export function generatePlanProjection(planId: InvestmentPlanType, capital: number): PlanProjection {
  const plan = INVESTMENT_PLANS[planId];
  const safeCapital = Math.max(0, Number(capital) || 0);
  const annualizedReturn = plan.estimatedReturnPercent / 100;
  const shortBias = plan.tradingDuration === "short" ? 1.18 : 1.0;
  const longTradeDays = plan.tradingDuration === "long" ? Math.max(14, plan.recommendedHoldDays - 15) : Math.max(7, Math.ceil(plan.recommendedHoldDays * 0.55));
  const shortTradeDays = plan.tradingDuration === "short" ? Math.max(8, Math.round(plan.recommendedHoldDays * 0.75)) : Math.max(4, Math.ceil(plan.recommendedHoldDays * 0.35));
  const estimatedProfitPct = Number((annualizedReturn * shortBias * 100).toFixed(2));
  const estimatedProfit = Number((safeCapital * (estimatedProfitPct / 100)).toFixed(2));
  const projectedBalance = Number((safeCapital + estimatedProfit).toFixed(2));

  let marketSignal = "Momentum remains constructive with controlled risk exposure.";
  if (plan.tradingDuration === "short") {
    marketSignal = "Short-cycle execution is active; momentum and volatility are being monitored for profitable re-entry opportunities.";
  } else if (plan.id === "us-stocks-plus") {
    marketSignal = "Long-term equity trend is favoring disciplined accumulation with defensive stop placement and dividend-sensitive rotations.";
  } else if (plan.id === "elite-investor") {
    marketSignal = "Institutional allocation model remains bullish across diversified growth and hedged macro exposure.";
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
    recommendedHoldDays: plan.recommendedHoldDays,
    automationEnabled: true,
  };
}
