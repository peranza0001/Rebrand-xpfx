type ViteEnvLike = {
  VITE_API_URL?: string;
};

export function resolveApiBaseUrl(configuredApiUrl?: string | null, fallbackOrigin?: string | null): string {
  const rawValue = configuredApiUrl?.trim() || fallbackOrigin?.trim() || "";
  return rawValue.replace(/\/+$/, "");
}

const viteEnv = typeof import.meta !== "undefined" ? ((import.meta as unknown as { env?: ViteEnvLike }).env ?? {}) : {};
export const apiUrl = resolveApiBaseUrl(viteEnv.VITE_API_URL, typeof window !== "undefined" ? window.location.origin : "");

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiUrl ? `${apiUrl}${normalizedPath}` : normalizedPath;
}