import { Router, type IRouter } from "express";
import { getUserData, newId, newUuid, NOW } from "../lib/store";
import { persistTransaction } from "../lib/db-persist";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

type CryptoOrder = {
  id: string;
  userId: string;
  side: "buy" | "sell";
  asset: string;
  amount: number;
  currency: string;
  status: "pending_stub";
  provider: "stub";
  createdAt: string;
};

type CopyEvent = {
  id: string;
  followerId: string;
  traderId: string;
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  status: "simulated";
  createdAt: string;
};

const cryptoOrders = new Map<string, CryptoOrder>();
const followedTraders = new Map<string, Set<string>>();
const copyEvents = new Map<string, CopyEvent[]>();

function createOrder(userId: string, side: "buy" | "sell", body: Record<string, unknown>): CryptoOrder | null {
  const asset = typeof body.asset === "string" ? body.asset.trim().toUpperCase() : "";
  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() || "USD" : "USD";
  if (!asset || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return null;
  const order: CryptoOrder = { id: newId("crypto"), userId, side, asset, amount, currency, status: "pending_stub", provider: "stub", createdAt: NOW() };
  cryptoOrders.set(order.id, order);
  const data = getUserData(userId);
  const wallet = data.wallets.find((item) => item.type === "main") ?? data.wallets[0];
  if (wallet) {
    const transaction = {
      id: newUuid(), walletId: wallet.id, type: side === "buy" ? "deposit" : "withdrawal",
      amount, currency, status: "pending", description: `Stub crypto ${side}: ${amount} ${asset}`, createdAt: order.createdAt,
    } as any;
    data.transactions.unshift(transaction);
    void persistTransaction(transaction.id, wallet.id, userId, {
      type: transaction.type, amount, currency, status: "pending", description: transaction.description,
    });
  }
  return order;
}

router.get("/crypto/orders", requireAuth, (req, res) => {
  res.json([...cryptoOrders.values()].filter((order) => order.userId === req.userId));
});

router.post("/crypto/buy", requireAuth, (req, res) => {
  const order = createOrder(req.userId!, "buy", req.body ?? {});
  if (!order) return res.status(400).json({ error: "asset and a positive amount are required." });
  return res.status(202).json({ ok: true, stub: true, notice: "Crypto buy queued in providerless stub mode; no external funds moved.", order });
});

router.post("/crypto/sell", requireAuth, (req, res) => {
  const order = createOrder(req.userId!, "sell", req.body ?? {});
  if (!order) return res.status(400).json({ error: "asset and a positive amount are required." });
  return res.status(202).json({ ok: true, stub: true, notice: "Crypto sell queued in providerless stub mode; no external funds moved.", order });
});

router.get("/copy-trading/strategies", requireAuth, (_req, res) => {
  res.json({ stub: true, strategies: [
    { id: "balanced", name: "Balanced FX", risk: "moderate", provider: "internal_simulation" },
    { id: "momentum", name: "Momentum Crypto", risk: "high", provider: "internal_simulation" },
  ] });
});

router.get("/copy-trading/follows", requireAuth, (req, res) => {
  res.json({ stub: true, traderIds: [...(followedTraders.get(req.userId!) ?? [])] });
});

router.post("/copy-trading/follow", requireAuth, (req, res) => {
  const traderId = typeof req.body?.traderId === "string" ? req.body.traderId.trim() : "";
  if (!traderId || traderId.length > 100) return res.status(400).json({ error: "traderId is required." });
  const follows = followedTraders.get(req.userId!) ?? new Set<string>();
  follows.add(traderId);
  followedTraders.set(req.userId!, follows);
  return res.status(202).json({ ok: true, stub: true, traderId, status: "following", notice: "Copy trading is running in internal simulation mode." });
});

router.post("/copy-trading/unfollow", requireAuth, (req, res) => {
  const traderId = typeof req.body?.traderId === "string" ? req.body.traderId.trim() : "";
  followedTraders.get(req.userId!)?.delete(traderId);
  return res.json({ ok: true, stub: true, traderId, status: "not_following" });
});

router.get("/copy-trading/events", requireAuth, (req, res) => {
  res.json({ stub: true, events: copyEvents.get(req.userId!) ?? [] });
});

export function recordStubCopyEvent(input: Omit<CopyEvent, "id" | "createdAt" | "status">): CopyEvent {
  const event: CopyEvent = { ...input, id: newId("copy"), status: "simulated", createdAt: NOW() };
  const list = copyEvents.get(input.followerId) ?? [];
  list.unshift(event);
  copyEvents.set(input.followerId, list.slice(0, 100));
  return event;
}

export default router;
