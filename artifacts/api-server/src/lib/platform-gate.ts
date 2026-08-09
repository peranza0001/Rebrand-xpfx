/**
 * Platform-wide gating middleware. Reads the singleton `platformSettings`
 * and rejects user-facing requests when admin toggles say so.
 *
 *  - maintenanceMode: returns 503 for everything except admin/auth/system
 *    endpoints so admins can still log in and turn it back off.
 *  - registrationEnabled=false: blocks POST /auth/signup.
 *  - demoModeEnabled=false: blocks POST /auth/demo.
 *  - tradingEnabled=false: blocks any non-admin POST to /trades* (release).
 *
 * Per-user `tradingLocked` is enforced separately in trade routes.
 */
import type { NextFunction, Request, Response } from "express";
import { platformSettings, sessions, users } from "./store";
import { SESSION_COOKIE, clearSessionCookie } from "./session";
import { deleteSession } from "./db-persist";

const MAINTENANCE_ALLOW_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/admin/",
  "/api/platform-settings",
];

export function platformGate(req: Request, res: Response, next: NextFunction): void {
  const url = req.originalUrl.split("?")[0] ?? req.url;

  // Determine if the caller is an admin (admins can keep using the platform during maintenance).
  let isAdmin = false;
  if (req.userId) {
    const stored = users.get(req.userId);
    isAdmin = stored?.role === "admin";

    // Disabled accounts: kill the session and reject everything except logout.
    if (stored?.disabled) {
      const sid = (req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE]) as
        | string
        | undefined;
      if (sid) {
        sessions.delete(sid);
        // best-effort delete persisted session
        void deleteSession(sid).catch(() => undefined);
      }
      clearSessionCookie(res);
      if (!url.startsWith("/api/auth/logout") && !url.startsWith("/api/auth/session")) {
        res.status(403).json({ error: "Account disabled. Contact support." });
        return;
      }
    }

    // Suspended accounts: read-only — reject mutating verbs except auth/session/notifications.
    if (
      stored?.suspended &&
      !isAdmin &&
      req.method !== "GET" &&
      !url.startsWith("/api/auth/") &&
      !url.startsWith("/api/notifications")
    ) {
      res.status(403).json({
        error: "Account suspended. Read-only access only. Contact help@xpressprofx.com.",
      });
      return;
    }
  }

  // Maintenance mode — block everything that isn't admin/auth.
  if (platformSettings.maintenanceMode && !isAdmin) {
    const allowed = MAINTENANCE_ALLOW_PREFIXES.some((p) => url.startsWith(p));
    if (!allowed) {
      res.status(503).json({
        error: "Platform under maintenance",
        message: platformSettings.maintenanceMessage || "Service temporarily unavailable.",
      });
      return;
    }
  }

  // Registration toggle.
  if (
    !platformSettings.registrationEnabled &&
    req.method === "POST" &&
    url === "/api/auth/signup"
  ) {
    res.status(403).json({ error: "Registration is currently disabled." });
    return;
  }

  // Demo mode toggle.
  if (
    !platformSettings.demoModeEnabled &&
    req.method === "POST" &&
    url === "/api/auth/demo"
  ) {
    res.status(403).json({ error: "Demo accounts are currently disabled." });
    return;
  }

  // Trading toggle — block trade-mutating endpoints for non-admins.
  if (
    !platformSettings.tradingEnabled &&
    !isAdmin &&
    req.method !== "GET" &&
    /^\/api\/trades(\/|$)/.test(url)
  ) {
    res.status(403).json({ error: "Trading is currently disabled by the platform." });
    return;
  }

  next();
}
