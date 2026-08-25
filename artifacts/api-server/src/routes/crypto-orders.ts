import { Router, type IRouter } from "express";
import { getUserData, newId, newUuid, NOW } from "../lib/store";
import { persistTransaction } from "../lib/db-persist";
import { requireAuth } from "../lib/session";
import { isLiveTradingEnabled } from "../lib/env";

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
  const orderId = newUuid();
  const order: CryptoOrder = { id: orderId, userId, side, asset, amount, currency, status: "pending_stub", provider: "stub", createdAt: NOW() };
  cryptoOrders.set(order.id, order);
  const data = getUserData(userId);
  const wallet = data.wallets.find((item) => item.type === "main") ?? data.wallets[0];
  if (wallet) {
    const transaction = {
      id: orderId, walletId: wallet.id, type: side === "buy" ? "deposit" : "withdrawal",
      amount, currency, status: "pending", description: `[crypto-stub:${orderId}] ${side} ${amount} ${asset}`, createdAt: order.createdAt,
    } as any;
    data.transactions.unshift(transaction);
    void persistTransaction(transaction.id, wallet.id, userId, {
      type: transaction.type, amount, currency, status: "pending", description: transaction.description,
    });
  }
  return order;
}

router.get("/crypto/orders", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const orders = new Map(
    [...cryptoOrders.values()]
      .filter((order) => order.userId === req.userId)
      .map((order) => [order.id, order]),
  );
  for (const transaction of data.transactions) {
    const match = transaction.description.match(/^\[crypto-stub:([^\]]+)\] (buy|sell) ([0-9]+(?:\.[0-9]+)?) ([A-Z0-9._-]+)$/);
    if (!match || transaction.status !== "pending" || orders.has(match[1])) continue;
    orders.set(match[1], {
      id: match[1], userId: req.userId!, side: match[2] as "buy" | "sell", asset: match[4],
      amount: Number(match[3]), currency: transaction.currency, status: "pending_stub", provider: "stub", createdAt: transaction.createdAt,
    });
  }
  res.json([...orders.values()]);
});

router.post("/crypto/buy", requireAuth, (req, res) => {
  if (!isLiveTradingEnabled) {
    return res.status(503).json({ error: "Crypto trading is unavailable until ENABLE_LIVE_TRADING=true and a live execution provider is configured.", code: "provider_unavailable" });
  }
  const order = createOrder(req.userId!, "buy", req.body ?? {});
  if (!order) return res.status(400).json({ error: "asset and a positive amount are required." });
  return res.status(202).json({ ok: true, stub: true, notice: "Crypto buy queued in providerless stub mode; no external funds moved.", order });
});

router.post("/crypto/sell", requireAuth, (req, res) => {
  if (!isLiveTradingEnabled) {
    return res.status(503).json({ error: "Crypto trading is unavailable until ENABLE_LIVE_TRADING=true and a live execution provider is configured.", code: "provider_unavailable" });
  }
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
  if (!isLiveTradingEnabled) {
    return res.status(503).json({ error: "Copy trading is unavailable until ENABLE_LIVE_TRADING=true and a live execution provider is configured.", code: "provider_unavailable" });
  }
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
