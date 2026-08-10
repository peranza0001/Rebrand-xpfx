import assert from 'node:assert/strict';
import { AccountTier, getMandatoryChecklist } from '../artifacts/api-server/src/lib/account-tiers.ts';
import { getFeatureAccess } from '../artifacts/nextrade/src/lib/account-access.ts';

const tier1 = {
  currentTier: 'tier_1',
  capabilities: {
    p2pEnabled: false,
    smartvest: false,
  },
};

const tier2 = {
  currentTier: 'tier_2',
  capabilities: {
    p2pEnabled: true,
    smartvest: true,
  },
};

const tier8 = {
  currentTier: 'tier_8',
  capabilities: {
    p2pEnabled: false,
    smartvest: false,
  },
};

const tier1Access = getFeatureAccess(tier1);
assert.equal(tier1Access.canAccessP2P, false);
assert.equal(tier1Access.canAccessSmartVest, false);
assert.equal(tier1Access.requiresUpgradeForP2P, true);

const tier2Access = getFeatureAccess(tier2);
assert.equal(tier2Access.canAccessP2P, true);
assert.equal(tier2Access.canAccessSmartVest, true);

const tier8Access = getFeatureAccess(tier8);
assert.equal(tier8Access.canAccessP2P, true);
assert.equal(tier8Access.canAccessSmartVest, true);
assert.equal(tier8Access.requiresUpgradeForP2P, false);
assert.equal(tier8Access.requiresUpgradeForSmartVest, false);

const progressionChecklist = getMandatoryChecklist(AccountTier.TIER_2, AccountTier.TIER_3);
assert.deepEqual(progressionChecklist, []);

console.log('feature access test passed');
