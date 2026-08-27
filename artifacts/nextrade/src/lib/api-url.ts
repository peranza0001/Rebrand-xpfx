type ViteEnvLike = {
  VITE_API_URL?: string;
};

export function resolveApiBaseUrl(configuredApiUrl?: string | null, fallbackOrigin?: string | null): string {
  const rawValue = configuredApiUrl?.trim() || fallbackOrigin?.trim() || "";
  return rawValue.replace(/\/+$/, "");
}

const viteEnv = typeof import.meta !== "undefined" ? ((import.meta as unknown as { env?: ViteEnvLike }).env ?? {}) : {};
export const apiUrl = resolveApiBaseUrl(viteEnv.VITE_API_URL, typeof window !== "undefined" ? window.location.origin : "");

export async function loadCsrfToken(baseUrl = apiUrl): Promise<string> {
  const response = await fetch(`${baseUrl}/api/csrf-token`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to initialize request security.");
  const payload = await response.json() as { csrfToken?: string };
  if (!payload.csrfToken) throw new Error("Request security token was not returned.");
  return payload.csrfToken;
}

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiUrl ? `${apiUrl}${normalizedPath}` : normalizedPath;
}