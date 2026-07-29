import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { adminSeedStatus } from "../lib/store";
import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";
import { getIntegrationStatus } from "../lib/integration-config";

const router: IRouter = Router();

// Lightweight liveness probe — does NOT touch the DB. Railway's healthcheck
// should hit this so a slow/unreachable DB never marks a healthy process as
// dead and triggers an unnecessary restart loop.
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Deep readiness probe — actually pings the database. Useful for manual
// debugging and external uptime monitors that want to know DB state, but
// intentionally NOT what Railway's restart policy watches, since a DB blip
// should not kill an otherwise-healthy app server.
router.get("/healthz/db", async (_req, res) => {
  const db = getDb();
  if (!db) {
    res.status(200).json({ status: "ok", database: "disabled" });
    return;
  }
  try {
    await db.execute(sql`select 1`);
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      database: "unreachable",
      error: (err as Error).message,
    });
  }
});

// Public — lets the admin portal show a "no admin provisioned" banner
// instead of failing silently when ADMIN_EMAIL/ADMIN_PASSWORD secrets
// haven't been set yet. Does not leak the actual email.
router.get("/admin/provisioning-status", (_req, res) => {
  res.json({
    provisioned: adminSeedStatus.provisioned,
    integrations: getIntegrationStatus(),
  });
});

export default router;
