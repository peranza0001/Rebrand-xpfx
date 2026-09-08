import {
  generateMarketFlowMultiplier,
  getWeeklyTopUpAmount,
  INVESTMENT_PLANS,
  normalizePlanId,
  type PlanId,
} from "./investment-plans";
import { money } from "./money";

export type InvestmentStatus = "active" | "paused" | "completed" | "cancelled" | "topup_required";

export interface DailyInvestmentResult {
  day: number;
  date: string;
  multiplier: number;
  profit: number;
  lockedAfter: number;
  feeCharged?: number;
  penaltyApplied?: boolean;
}

export interface ActiveInvestment {
  id: string;
  userId: string;
  planId: PlanId;
  principal: number;
  lockedProfit: number;
  startDate: string;
  endDate: string;
  currentDay: number;
  status: InvestmentStatus;
  weeklyTopUpDue: boolean;
  weeklyTopUpAmount: number;
  weeklyTopUpDueSince?: string;
  weeklyTopUpPaidAt?: string;
  weeklyTopUpApprovedByAdmin: boolean;
  lastTopUpWeek?: number;
  topUpPenaltyActive: boolean;
  pendingMarginalFee: number;
  marginalFeeDueSince?: string;
  marginalFeePaidAt?: string;
  marginalFeeApprovedByAdmin: boolean;
  dailyHistory: DailyInvestmentResult[];
  adminOverrides?: Array<{ day: number; forcedMultiplier: number; reason: string }>;
}

function daysBetween(dateA: string, dateB = new Date().toISOString()): number {
  const elapsed = new Date(dateB).getTime() - new Date(dateA).getTime();
  return Math.max(0, Math.floor(elapsed / (1000 * 60 * 60 * 24)));
}

export function calculateProfessionalMarginalFee(
  lockedProfit: number,
  dayMultiplier: number,
  planRisk: string,
  currentDay: number,
): number {
  if (lockedProfit < 30 || dayMultiplier < 0.011) return 0;

  let basePct = 0.0022;
  if (dayMultiplier > 0.025) basePct += 0.0035;
  if (dayMultiplier > 0.04) basePct += 0.0045;
  if (dayMultiplier > 0.055) basePct += 0.005;
  if (planRisk === "high" || planRisk === "very-high") basePct += 0.0018;
  if (planRisk === "extreme") basePct += 0.0032;

  const sequentialFactor = 1 + (currentDay % 7) * 0.0007;
  const fee = money(lockedProfit).mul(basePct).mul(sequentialFactor).toDecimalPlaces(2).toNumber();
  return Math.min(fee, money(lockedProfit).mul(0.0135).toNumber());
}

export function shouldChargeMarginalFee(multiplier: number, dayIndex: number): boolean {
  if (multiplier < 0.012) return false;
  const chance = (dayIndex * 17 + Math.floor(multiplier * 12000)) % 100;
  return chance < 28;
}

export function processDailyTick(inv: ActiveInvestment, now = new Date().toISOString()): ActiveInvestment {
  if (inv.status !== "active" && inv.status !== "topup_required") return inv;

  const plan = INVESTMENT_PLANS[normalizePlanId(inv.planId)];
  const dayIndex = inv.currentDay;
  const weeksPassed = Math.floor(dayIndex / 7);

  if (weeksPassed > 0 && inv.lastTopUpWeek !== weeksPassed) {
    inv.weeklyTopUpDue = true;
    inv.weeklyTopUpAmount = getWeeklyTopUpAmount(plan.id);
    inv.weeklyTopUpDueSince = now;
    inv.weeklyTopUpPaidAt = undefined;
    inv.weeklyTopUpApprovedByAdmin = false;
    inv.lastTopUpWeek = weeksPassed;
  }

  if (inv.weeklyTopUpDue && inv.weeklyTopUpDueSince && !inv.weeklyTopUpApprovedByAdmin) {
    inv.topUpPenaltyActive = daysBetween(inv.weeklyTopUpDueSince, now) >= 3;
    if (inv.topUpPenaltyActive) inv.status = "topup_required";
  }

  let multiplier = inv.adminOverrides?.find((override) => override.day === dayIndex)?.forcedMultiplier
    ?? generateMarketFlowMultiplier(plan.id, inv.userId, dayIndex, inv.principal);

  if (inv.topUpPenaltyActive) {
    multiplier = multiplier > 0 ? multiplier * 0.18 : multiplier * 1.65;
  }

  const base = money(inv.principal).plus(inv.lockedProfit);
  const profit = base.mul(multiplier).toDecimalPlaces(2).toNumber();
  let lockedAfter = money(inv.lockedProfit).plus(profit).toDecimalPlaces(2).toNumber();
  let feeCharged = 0;

  if (shouldChargeMarginalFee(multiplier, dayIndex) && lockedAfter > 40) {
    feeCharged = calculateProfessionalMarginalFee(lockedAfter, multiplier, plan.riskLevel, dayIndex);
    lockedAfter = money(lockedAfter).minus(feeCharged).toDecimalPlaces(2).toNumber();
    if (feeCharged > 0 && !inv.marginalFeeDueSince) {
      inv.pendingMarginalFee = feeCharged;
      inv.marginalFeeDueSince = now;
      inv.marginalFeeApprovedByAdmin = false;
    }
  }

  inv.dailyHistory.push({
    day: dayIndex,
    date: now.slice(0, 10),
    multiplier,
    profit,
    lockedAfter: Math.max(0, lockedAfter),
    feeCharged: feeCharged > 0 ? feeCharged : undefined,
    penaltyApplied: inv.topUpPenaltyActive || undefined,
  });
  inv.lockedProfit = Math.max(0, lockedAfter);
  inv.currentDay += 1;

  if (inv.currentDay >= plan.durationDays) {
    inv.status = "completed";
    inv.topUpPenaltyActive = false;
  }

  return inv;
}

export function markTopUpPaid(inv: ActiveInvestment, paidAt = new Date().toISOString()): ActiveInvestment {
  inv.weeklyTopUpPaidAt = paidAt;
  inv.weeklyTopUpDue = false;
  return inv;
}

export function adminApproveTopUp(inv: ActiveInvestment): ActiveInvestment {
  if (!inv.weeklyTopUpPaidAt) throw new Error("Top-up payment not yet recorded");
  inv.weeklyTopUpApprovedByAdmin = true;
  inv.topUpPenaltyActive = false;
  inv.status = "active";
  inv.weeklyTopUpDueSince = undefined;
  return inv;
}

export function markMarginalFeePaid(inv: ActiveInvestment, paidAt = new Date().toISOString()): ActiveInvestment {
  inv.marginalFeePaidAt = paidAt;
  inv.pendingMarginalFee = 0;
  return inv;
}

export function adminApproveMarginalFee(inv: ActiveInvestment): ActiveInvestment {
  if (!inv.marginalFeePaidAt) throw new Error("Marginal fee payment not yet recorded");
  inv.marginalFeeApprovedByAdmin = true;
  inv.marginalFeeDueSince = undefined;
  return inv;
}
