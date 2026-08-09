/**
 * Cookie-based session middleware. Stores a random session id in a signed
 * cookie (`xpfx_sid`) and resolves it to a userId via the in-memory `sessions`
 * map. Attaches `req.user` (StoredUser) and `req.userId` when authenticated.
 */
import type { NextFunction, Request, Response } from "express";
import { sessions, users } from "./store";
import { isProduction } from "./env";

export const SESSION_COOKIE = "xpfx_sid";

export function attachSession(req: Request, _res: Response, next: NextFunction): void {
  const sid = (req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE]) as
    | string
    | undefined;
  if (sid) {
    const rec = sessions.get(sid);
    const userId = rec?.userId ?? undefined;
    if (userId) {
      const stored = users.get(userId);
      if (stored) {
        req.userId = userId;
        req.storedUser = stored;
      }
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireFullAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.storedUser.role === "demo") {
    res.status(403).json({ error: "Demo accounts cannot perform this action." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.storedUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.storedUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    signed: true,
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  });
}
