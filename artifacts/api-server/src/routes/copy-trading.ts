import { Router, type IRouter } from "express";
import { newUuid } from "../lib/store";
import { getPrismaModelDelegate } from "../lib/db-persist";
import { requireAuth, requireFullAuth } from "../lib/session";

const router: IRouter = Router();
const DEFAULT_LEADERS = [
  { id: "4f7f1f0d-9d72-4b9c-9f8f-000000000001", displayName: "Alex Pro Trader", strategy: "Balanced momentum", riskLevel: "moderate", monthlyReturn: 18.5, winRate: 72, maxDrawdown: 12 },
  { id: "4f7f1f0d-9d72-4b9c-9f8f-000000000002", displayName: "Sarah FX Master", strategy: "Multi-asset trend", riskLevel: "moderate", monthlyReturn: 15.2, winRate: 68, maxDrawdown: 14 },
  { id: "4f7f1f0d-9d72-4b9c-9f8f-000000000003", displayName: "Mike Momentum", strategy: "Short-term momentum", riskLevel: "high", monthlyReturn: 12.8, winRate: 65, maxDrawdown: 16 },
];

function leaderDelegate(): any | null { return getPrismaModelDelegate("CopyLeader"); }
function relationshipDelegate(): any | null { return getPrismaModelDelegate("CopyRelationship"); }
function eventDelegate(): any | null { return getPrismaModelDelegate("CopyEvent"); }

async function ensureLeaders(): Promise<any[]> {
  const delegate = leaderDelegate();
  if (!delegate) return DEFAULT_LEADERS.map((leader) => ({ ...leader, followerCount: 0, suspended: false }));
  for (const leader of DEFAULT_LEADERS) {
    await delegate.upsert({ where: { id: leader.id }, update: leader, create: leader });
  }
  return delegate.findMany({ where: { suspended: false }, orderBy: { monthlyReturn: "desc" } });
}

router.get("/copy-trading/leaders", requireAuth, async (_req, res) => {
  try { return res.json({ leaders: await ensureLeaders(), mode: leaderDelegate() ? "database" : "local" }); }
  catch (error) { return res.status(503).json({ error: "Copy trading is temporarily unavailable.", detail: error instanceof Error ? error.message : undefined }); }
});

router.get("/copy-trading/history", requireAuth, async (req, res) => {
  const delegate = eventDelegate();
  if (!delegate) return res.json({ events: [], mode: "local" });
  const events = await delegate.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return res.json({ events, mode: "database" });
});

router.post("/copy-trading/leaders/:leaderId/follow", requireFullAuth, async (req, res) => {
  const delegate = relationshipDelegate();
  const leader = leaderDelegate();
  const leaderId = String(req.params["leaderId"] ?? "");
  const allocationPct = Number(req.body?.allocationPct ?? 10);
  if (!leader || !delegate) return res.status(503).json({ error: "Copy trading persistence is unavailable." });
  if (!Number.isFinite(allocationPct) || allocationPct < 1 || allocationPct > 100) return res.status(400).json({ error: "Allocation must be between 1 and 100 percent." });
  const target = await leader.findUnique({ where: { id: leaderId } });
  if (!target || target.suspended) return res.status(404).json({ error: "Leader not found or suspended." });
  const relationship = await delegate.upsert({ where: { userId_leaderId: { userId: req.userId, leaderId } }, update: { status: "active", allocationPct, stoppedAt: null }, create: { id: newUuid(), userId: req.userId, leaderId, allocationPct } });
  await leader.update({ where: { id: leaderId }, data: { followerCount: { increment: 1 } } });
  return res.status(201).json({ relationship, disclaimer: "Copy trading is simulated until a regulated execution provider is configured. Past performance is not indicative of future results." });
});

router.delete("/copy-trading/leaders/:leaderId/follow", requireFullAuth, async (req, res) => {
  const delegate = relationshipDelegate();
  const leader = leaderDelegate();
  if (!leader || !delegate) return res.status(503).json({ error: "Copy trading persistence is unavailable." });
  const leaderId = String(req.params["leaderId"] ?? "");
  const relationship = await delegate.updateMany({ where: { userId: req.userId, leaderId, status: "active" }, data: { status: "stopped", stoppedAt: new Date() } });
  if (relationship.count) await leader.update({ where: { id: leaderId }, data: { followerCount: { decrement: 1 } } });
  return res.json({ stopped: relationship.count > 0 });
});

router.post("/copy-trading/leaders/:leaderId/copy", requireFullAuth, async (req, res) => {
  const leader = leaderDelegate();
  const relationships = relationshipDelegate();
  const events = eventDelegate();
  const leaderId = String(req.params["leaderId"] ?? "");
  const notional = Number(req.body?.notional ?? 0);
  if (!leader || !relationships || !events) return res.status(503).json({ error: "Copy trading persistence is unavailable." });
  if (!Number.isFinite(notional) || notional <= 0) return res.status(400).json({ error: "Notional must be greater than zero." });
  const relationship = await relationships.findFirst({ where: { userId: req.userId, leaderId, status: "active" } });
  if (!relationship) return res.status(409).json({ error: "Follow this leader before copying a simulated trade." });
  const event = await events.create({ data: { id: newUuid(), userId: req.userId, leaderId, relationshipId: relationship.id, symbol: String(req.body?.symbol ?? "BTC/USDT"), side: String(req.body?.side ?? "buy"), notional, simulated: true, status: "simulated" } });
  return res.status(201).json({ event, disclaimer: "This is a simulated copy event. No external provider account or live order was used." });
});

export default router;