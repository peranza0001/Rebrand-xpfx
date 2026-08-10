export interface FeatureAccessState {
  canAccessP2P: boolean;
  canAccessSmartVest: boolean;
  requiresUpgradeForP2P: boolean;
  requiresUpgradeForSmartVest: boolean;
}

export function getFeatureAccess(payload: { currentTier?: string; capabilities?: { p2pEnabled?: boolean; smartvest?: boolean } | null }): FeatureAccessState {
  const tier = payload.currentTier ?? 'tier_0';
  const capabilities = payload.capabilities ?? {};
  const p2pEnabled = Boolean(capabilities.p2pEnabled);
  const smartvestEnabled = Boolean(capabilities.smartvest);

  const tierLevel = parseTierRank(tier);

  return {
    canAccessP2P: p2pEnabled || tierLevel >= 2,
    canAccessSmartVest: smartvestEnabled || tierLevel >= 2,
    requiresUpgradeForP2P: !p2pEnabled && tierLevel < 2,
    requiresUpgradeForSmartVest: !smartvestEnabled && tierLevel < 2,
  };
}

function parseTierRank(tier: string): number {
  const match = /^tier_(\d+)$/.exec(tier.toLowerCase() || '');
  if (!match) return 0;
  return Number(match[1]);
}

export async function fetchFeatureAccess(): Promise<FeatureAccessState> {
  const response = await fetch('/api/account/tier/limits', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Unable to load account feature access');
  }

  const payload = await response.json();
  return getFeatureAccess({
    currentTier: payload.currentTier,
    capabilities: payload.capabilities,
  });
}
