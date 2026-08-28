import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_ACCOUNT_CHECKLIST, generatePlanProjection, evaluateAccountChecklist, INVESTMENT_PLANS } from '../artifacts/api-server/src/lib/investment-plans.ts';
import { adminApproveTopUp, markTopUpPaid, processDailyTick } from '../artifacts/api-server/src/lib/investment-engine.ts';

test('standard trader plan creates a realistic automated projection', () => {
  const projection = generatePlanProjection('standard-trader', 2500);
  assert.ok(projection.estimatedProfit > 0);
  assert.ok(projection.estimatedProfitPct > 0);
  assert.ok(projection.longTradeDays >= 7);
  assert.ok(projection.shortTradeDays >= 4);
  assert.equal(typeof projection.marketSignal, 'string');
});

test('account checklist stays incomplete until all mandatory items are complete', () => {
  const checklist = evaluateAccountChecklist([
    { ...DEFAULT_ACCOUNT_CHECKLIST[0], completed: true },
    { ...DEFAULT_ACCOUNT_CHECKLIST[1], completed: true },
    { ...DEFAULT_ACCOUNT_CHECKLIST[2], completed: false },
    { ...DEFAULT_ACCOUNT_CHECKLIST[3], completed: true },
    { ...DEFAULT_ACCOUNT_CHECKLIST[4], completed: true },
    { ...DEFAULT_ACCOUNT_CHECKLIST[5], completed: true },
  ]);

  assert.equal(checklist.completed, false);
  assert.ok(checklist.completionPercent < 100);
  assert.ok(checklist.missingMandatory.length > 0);
});

test('plan catalog includes distinct long and short trading structures', () => {
  const longPlan = INVESTMENT_PLANS['starter-growth'];
  const shortPlan = INVESTMENT_PLANS['standard-trader'];
  assert.equal(longPlan.tradingDuration, 'long');
  assert.equal(shortPlan.tradingDuration, 'short');
  assert.ok(longPlan.recommendedHoldDays > shortPlan.recommendedHoldDays);
});

test('daily engine keeps profits precise and renews weekly top-ups', () => {
  const investment = {
    id: 'inv-1',
    userId: 'user-1',
    planId: 'starter_spark',
    principal: 1000,
    lockedProfit: 0,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-01-11T00:00:00.000Z',
    currentDay: 7,
    status: 'active',
    weeklyTopUpDue: false,
    weeklyTopUpAmount: 0,
    weeklyTopUpApprovedByAdmin: false,
    topUpPenaltyActive: false,
    pendingMarginalFee: 0,
    marginalFeeApprovedByAdmin: false,
    dailyHistory: [],
  };

  processDailyTick(investment, '2026-01-08T00:00:00.000Z');
  assert.equal(investment.weeklyTopUpDue, true);
  markTopUpPaid(investment, '2026-01-08T00:00:00.000Z');
  adminApproveTopUp(investment);
  investment.currentDay = 14;
  processDailyTick(investment, '2026-01-15T00:00:00.000Z');

  assert.equal(investment.weeklyTopUpDue, true);
  assert.equal(investment.weeklyTopUpAmount, 40);
  assert.equal(investment.dailyHistory.every((entry) => Number.isFinite(entry.profit)), true);
});
