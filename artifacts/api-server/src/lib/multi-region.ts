/**
 * Multi-region readiness and failover helpers.
 * This provides a simple provider-agnostic switching layer for primary and backup regions.
 */

export interface RegionalHealthStatus {
  region: string;
  healthy: boolean;
  latencyMs?: number;
  lastCheckedAt: string;
}

export interface RegionalStatus {
  activeRegion: string;
  primaryRegion: string;
  failoverRegion?: string;
  failoverEnabled: boolean;
  failoverMode: boolean;
  states: Record<string, RegionalHealthStatus>;
}

export function getConfiguredRegions(): { primaryRegion: string; failoverRegion?: string } {
  const primaryRegion = process.env.PRIMARY_REGION || process.env.REGION || 'us-east-1';
  const failoverRegion = process.env.FAILOVER_REGION || process.env.BACKUP_REGION || process.env.SECONDARY_REGION;

  return {
    primaryRegion,
    failoverRegion,
  };
}

export function getActiveRegion(): string {
  return process.env.ACTIVE_REGION || process.env.PRIMARY_REGION || process.env.REGION || 'us-east-1';
}

export function isFailoverEnabled(): boolean {
  const { failoverRegion } = getConfiguredRegions();
  return Boolean(failoverRegion && failoverRegion.length > 0);
}

export function isFailoverMode(): boolean {
  const { primaryRegion } = getConfiguredRegions();
  const activeRegion = getActiveRegion();
  return activeRegion !== primaryRegion;
}

export function evaluateRegionalHealth(region: string): RegionalHealthStatus {
  const now = new Date().toISOString();

  // If the platform is configured with health probes or checks, this function can be expanded.
  // For now, we consider a region healthy unless explicitly marked as unhealthy.
  const envFlag = process.env[`REGION_${region.toUpperCase().replace(/-/g, '_')}_HEALTHY`];
  const healthy = envFlag === undefined ? true : envFlag.toLowerCase() !== 'false';

  return {
    region,
    healthy,
    lastCheckedAt: now,
  };
}

export function getRegionalStatus(): RegionalStatus {
  const { primaryRegion, failoverRegion } = getConfiguredRegions();
  const activeRegion = getActiveRegion();
  const states: Record<string, RegionalHealthStatus> = {
    [primaryRegion]: evaluateRegionalHealth(primaryRegion),
  };

  if (failoverRegion) {
    states[failoverRegion] = evaluateRegionalHealth(failoverRegion);
  }

  const failoverEnabled = isFailoverEnabled();
  const failoverMode = isFailoverMode();

  return {
    activeRegion,
    primaryRegion,
    failoverRegion,
    failoverEnabled,
    failoverMode,
    states,
  };
}

export function promoteFailoverRegion(): RegionalStatus {
  const { primaryRegion, failoverRegion } = getConfiguredRegions();

  if (!failoverRegion) {
    return getRegionalStatus();
  }

  process.env.ACTIVE_REGION = failoverRegion;

  return getRegionalStatus();
}

export function demoteFailoverRegion(): RegionalStatus {
  const { primaryRegion } = getConfiguredRegions();
  process.env.ACTIVE_REGION = primaryRegion;
  return getRegionalStatus();
}
