const viteEnv = typeof import.meta !== "undefined" && import.meta && typeof import.meta.env !== "undefined" ? import.meta.env : {};

function getCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  if (typeof globalThis !== "undefined" && globalThis.location?.origin) {
    return globalThis.location.origin;
  }
  return "";
}

function isRailwayHost(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".up.railway.app");
  } catch {
    return false;
  }
}

export function resolveRuntimeApiUrl(configuredApiUrl: string | undefined, origin = getCurrentOrigin()): string {
  const configuredInput = configuredApiUrl ?? viteEnv.VITE_API_URL ?? "";
  const configured = configuredInput.trim().replace(/\/$/, "");
  const runtimeOrigin = origin.trim().replace(/\/$/, "");

  if (configured && runtimeOrigin && isRailwayHost(configured) && isRailwayHost(runtimeOrigin)) {
    const configuredHost = new URL(configured).hostname;
    const runtimeHost = new URL(runtimeOrigin).hostname;
    if (configuredHost !== runtimeHost) return runtimeOrigin;
  }

  return configured || runtimeOrigin;
}

export const apiUrl = resolveRuntimeApiUrl(viteEnv.VITE_API_URL);

export function apiPath(path: string): string {
  return `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}