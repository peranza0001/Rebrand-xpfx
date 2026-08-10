import assert from 'node:assert/strict';
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

const tier1Access = getFeatureAccess(tier1);
assert.equal(tier1Access.canAccessP2P, false);
assert.equal(tier1Access.canAccessSmartVest, false);
assert.equal(tier1Access.requiresUpgradeForP2P, true);

const tier2Access = getFeatureAccess(tier2);
assert.equal(tier2Access.canAccessP2P, true);
assert.equal(tier2Access.canAccessSmartVest, true);
console.log('feature access test passed');
