/**
 * Cookie-based session middleware. Stores a random session id in a signed
 * cookie (`xpfx_sid`) and resolves it to a userId via the in-memory `sessions`
 * map. Attaches `req.user` (StoredUser) and `req.userId` when authenticated.
 */
import type { NextFunction, Request, Response } from "express";
import { sessions, users } from "./store";
import { isProduction } from "./env";
import { deleteSession } from "./db-persist";

export const SESSION_COOKIE = "xpfx_sid";

export function getSessionId(req: Request): string | undefined {
  const signedSid = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
  if (signedSid) {
    return signedSid;
  }

  // In production we only accept signed session cookies. During development,
  // a raw cookie may be accepted when no signing secret is configured.
  if (process.env.NODE_ENV !== 'production') {
    return req.cookies?.[SESSION_COOKIE] as string | undefined;
  }

  return undefined;
}

function isExpired(expiresAt: Date | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

export async function cleanupExpiredSession(req: Request, res: Response, sid: string): Promise<void> {
  sessions.delete(sid);
  // best-effort remove persisted session if present
  void deleteSession(sid).catch(() => undefined);
  clearSessionCookie(res);
}

export async function attachSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sid = getSessionId(req);
  if (sid) {
    const rec = sessions.get(sid);
    if (rec) {
      if (isExpired(rec.expiresAt)) {
        await cleanupExpiredSession(req, res, sid);
        return next();
      }

      const stored = users.get(rec.userId);
      if (stored) {
        req.userId = rec.userId;
        req.sessionId = sid;
        req.storedUser = stored;
        (req as any).userRole = stored.role;
      }
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req || !req.storedUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireFullAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req || !req.storedUser) {
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
  if (!req || !req.storedUser) {
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
