const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const apiUrl = (configuredApiUrl || window.location.origin).replace(/\/$/, "");

export function apiPath(path: string): string {
  return `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}