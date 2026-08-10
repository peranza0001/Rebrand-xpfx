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

  return {
    canAccessP2P: p2pEnabled || tier === 'tier_2' || tier === 'tier_3',
    canAccessSmartVest: smartvestEnabled || tier === 'tier_2' || tier === 'tier_3',
    requiresUpgradeForP2P: !p2pEnabled && tier !== 'tier_2' && tier !== 'tier_3',
    requiresUpgradeForSmartVest: !smartvestEnabled && tier !== 'tier_2' && tier !== 'tier_3',
  };
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
