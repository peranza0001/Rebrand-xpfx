import type { StoredUser } from "../lib/store";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      sessionId?: string;
      storedUser?: StoredUser;
    }
  }
}

export {};
