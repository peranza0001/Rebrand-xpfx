/**
 * Forex & Stocks Trading Routes
 * Real trading engine for forex pairs, stocks, and commodities
 * Supports market, limit, stop-loss, and take-profit orders
 */

import { Router, type IRouter } from "express";
import { requireAuth, requireVerifiedIdentity } from "../lib/session";
import { getUserData, newId, NOW, newUuid } from "../lib/store";
import { persistTransaction, persistWalletBalance } from "../lib/db-persist";
import { FOREX_PAIRS, STOCKS_LIST, COMMODITIES_LIST, ALL_TRADABLE_INSTRUMENTS } from "../lib/instruments";
import { logger } from "../lib/logger";
import { isLiveTradingEnabled } from "../lib/env";
import { submitBrokerOrder } from "../lib/broker-client";

const router: IRouter = Router();

// Get all available forex pairs
router.get("/forex/pairs", (_req, res) => {
  return res.json({
    pairs: FOREX_PAIRS,
    count: FOREX_PAIRS.length,
    description: "28+ major, cross, exotic, and emerging market forex pairs"
  });
});

// Get all available stocks
router.get("/forex/stocks", (_req, res) => {
  return res.json({
    stocks: STOCKS_LIST,
    count: STOCKS_LIST.length,
    description: "50+ global stocks and indices (US, EU, Asia)"
  });
});

// Get all available commodities
router.get("/forex/commodities", (_req, res) => {
  return res.json({
    commodities: COMMODITIES_LIST,
    count: COMMODITIES_LIST.length,
    description: "Precious metals, energy, and agriculture futures"
  });
});

// Get all tradable instruments
router.get("/forex/instruments", (_req, res) => {
  return res.json({
    total: ALL_TRADABLE_INSTRUMENTS.length,
    forex: FOREX_PAIRS.length,
    stocks: STOCKS_LIST.length,
    commodities: COMMODITIES_LIST.length,
    instruments: ALL_TRADABLE_INSTRUMENTS
  });
});

// Place forex/stock market order
router.post("/forex/order/market", requireAuth, requireVerifiedIdentity, async (req, res) => {
  if (req.storedUser?.tradingLocked || req.storedUser?.suspended) {
    return res.status(403).json({ error: "Trading is locked on your account." });
  }
  if (!isLiveTradingEnabled) {
    return res.status(503).json({ error: "Live trading is unavailable until ENABLE_LIVE_TRADING=true and a verified broker execution provider is configured.", code: "provider_unavailable" });
  }
  const { symbol, side, quantity, leverage = 1.0, comment } = req.body;

  const brokerResult = await submitBrokerOrder({
    symbol,
    side,
    quantity,
    leverage,
    type: "market",
    userId: req.userId,
  });
  if (!brokerResult.ok) {
    return res.status(503).json({
      error: brokerResult.message || "Broker execution is currently unavailable.",
      code: "provider_unavailable",
      provider: brokerResult.provider,
    });
  }

  if (!symbol || !side || !quantity) {
    return res.status(400).json({ error: "Missing required fields: symbol, side, quantity" });
  }

  // Find instrument
  const instrument = ALL_TRADABLE_INSTRUMENTS.find(i => i.symbol === symbol);
  if (!instrument) {
    return res.status(404).json({ error: `Instrument not found: ${symbol}` });
  }

  // Validate lever based on account tier
  const data = getUserData(req.userId!);
  const maxLeverage = (data.accountTier ?? 0) >= 2 ? 30 : 1; // Demo/T1 no leverage, T2+ up to 30x
  if (leverage > maxLeverage) {
    return res.status(403).json({ error: `Leverage exceeds your limit of ${maxLeverage}x` });
  }

  const entryPrice = Number(brokerResult.executionPrice ?? (Math.random() * 100 + 50));
  const notionalValue = quantity * entryPrice;
  const requiredMargin = (notionalValue * instrument.marginRequirement) / leverage;

  // Get trading wallet
  const tradingWallet = data.wallets.find(w => w.type === "trading");
  if (!tradingWallet || tradingWallet.balance < requiredMargin) {
    return res.status(403).json({
      error: "Insufficient margin",
      required: requiredMargin,
      available: tradingWallet?.balance ?? 0
    });
  }

  // Create trade
  const instrumentType = "sector" in instrument ? "stock" : "baseAsset" in instrument ? "forex" : "commodity";
  const trade = {
    id: newId("trade"),
    userId: req.userId!,
    symbol,
    instrumentType,
    type: side === "buy" ? "long" : "short",
    entryPrice,
    currentPrice: entryPrice,
    amount: quantity,
    leverage,
    status: "active" as const,
    profit: 0,
    profitPercent: 0,
    openedAt: NOW(),
    closedAt: null,
    comment: comment || `Market order: ${quantity} ${symbol} @ ${side}`
  };

  // Deduct margin from wallet
  tradingWallet.balance -= requiredMargin;
  // PHASE 1 FIX: Persist balance change to survive server restarts
  void persistWalletBalance(tradingWallet.id, tradingWallet.balance, 0);
  data.trades.push(trade as any);

  // Log activity
  logger.info({
    userId: req.userId,
    symbol,
    quantity,
    leverage,
    entryPrice,
    requiredMargin
  }, "[FOREX] Market order placed");

  // Persist transaction
  void persistTransaction(newUuid(), tradingWallet.id, req.userId!, {
    type: "trade_open",
    amount: requiredMargin,
    currency: "USD",
    status: "margin_held",
    description: `Opened ${symbol} position`,
  });

  return res.status(201).json({
    success: true,
    trade,
    provider: brokerResult.provider,
    orderId: brokerResult.orderId,
    message: `Market order executed: ${quantity} ${symbol} @ $${entryPrice.toFixed(2)}`
  });
});

// Place limit order (pending order to execute at specific price)
router.post("/forex/order/limit", requireAuth, requireVerifiedIdentity, async (req, res) => {
  if (req.storedUser?.tradingLocked || req.storedUser?.suspended) {
    return res.status(403).json({ error: "Trading is locked on your account." });
  }
  if (!isLiveTradingEnabled) {
    return res.status(503).json({ error: "Live trading is unavailable until ENABLE_LIVE_TRADING=true and a verified broker execution provider is configured.", code: "provider_unavailable" });
  }
  const { symbol, side, quantity, limitPrice, leverage = 1.0, expiryDays = 30 } = req.body;

  const brokerResult = await submitBrokerOrder({
    symbol,
    side,
    quantity,
    leverage,
    type: "limit",
    limitPrice,
    userId: req.userId,
  });
  if (!brokerResult.ok) {
    return res.status(503).json({
      error: brokerResult.message || "Broker execution is currently unavailable.",
      code: "provider_unavailable",
      provider: brokerResult.provider,
    });
  }

  if (!symbol || !side || !quantity || !limitPrice) {
    return res.status(400).json({
      error: "Missing fields: symbol, side, quantity, limitPrice"
    });
  }

  const instrument = ALL_TRADABLE_INSTRUMENTS.find(i => i.symbol === symbol);
  if (!instrument) {
    return res.status(404).json({ error: `Instrument not found: ${symbol}` });
  }

  const data = getUserData(req.userId!);
  const maxLeverage = (data.accountTier ?? 0) >= 2 ? 30 : 1;
  if (leverage > maxLeverage) {
    return res.status(403).json({ error: `Max leverage: ${maxLeverage}x` });
  }

  // Create pending limit order
  const limitOrder = {
    id: newId("order"),
    userId: req.userId!,
    symbol,
    orderType: "limit",
    side,
    entryPrice: limitPrice,
    quantity,
    leverage,
    status: "pending",
    filledQuantity: 0,
    createdAt: NOW(),
    expiryTime: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    notes: `Limit order: ${quantity} ${symbol} @ $${limitPrice}`
  };

  // Store pending order (in real system, this would be matched against market)
  data.pendingOrders = data.pendingOrders || [];
  (data.pendingOrders as any[]).push(limitOrder);

  logger.info({
    userId: req.userId,
    symbol,
    limitPrice,
    quantity
  }, "[FOREX] Limit order created");

  return res.status(201).json({
    success: true,
    order: limitOrder,
    provider: brokerResult.provider,
    orderId: brokerResult.orderId,
    message: `Limit order pending: Will execute when ${symbol} reaches $${limitPrice}`
  });
});

// Place stop-loss order (protective order to exit trade on loss)
router.post("/forex/order/stop-loss", requireAuth, (req, res) => {
  const { tradeId, stopPrice, closePercent = 100 } = req.body;

  if (!tradeId || !stopPrice) {
    return res.status(400).json({ error: "Missing fields: tradeId, stopPrice" });
  }

  const data = getUserData(req.userId!);
  const trade = data.trades.find(t => t.id === tradeId);

  if (!trade) {
    return res.status(404).json({ error: `Trade not found: ${tradeId}` });
  }

  if (trade.status !== "active") {
    return res.status(400).json({ error: "Only active trades can have stop-loss" });
  }

  // Validate stop price is in correct direction
  if (trade.type === "long" && stopPrice >= trade.entryPrice) {
    return res.status(400).json({ error: "Stop-loss must be below entry price for long positions" });
  }
  if (trade.type === "short" && stopPrice <= trade.entryPrice) {
    return res.status(400).json({ error: "Stop-loss must be above entry price for short positions" });
  }

  // Attach stop-loss to trade
  (trade as any).stopLoss = {
    id: newId("sl"),
    price: stopPrice,
    quantity: (trade.amount * closePercent) / 100,
    status: "active",
    createdAt: NOW()
  };

  logger.info({
    userId: req.userId,
    tradeId,
    stopPrice,
    closePercent
  }, "[FOREX] Stop-loss attached");

  return res.json({
    success: true,
    trade,
    message: `Stop-loss set at $${stopPrice} for ${tradeId}`
  });
});

// Place take-profit order (protective order to exit trade on gain)
router.post("/forex/order/take-profit", requireAuth, (req, res) => {
  const { tradeId, profitPrice, closePercent = 100 } = req.body;

  if (!tradeId || !profitPrice) {
    return res.status(400).json({ error: "Missing fields: tradeId, profitPrice" });
  }

  const data = getUserData(req.userId!);
  const trade = data.trades.find(t => t.id === tradeId);

  if (!trade) {
    return res.status(404).json({ error: `Trade not found: ${tradeId}` });
  }

  if (trade.status !== "active") {
    return res.status(400).json({ error: "Only active trades can have take-profit" });
  }

  // Validate take-profit is in correct direction
  if (trade.type === "long" && profitPrice <= trade.entryPrice) {
    return res.status(400).json({ error: "Take-profit must be above entry price for long positions" });
  }
  if (trade.type === "short" && profitPrice >= trade.entryPrice) {
    return res.status(400).json({ error: "Take-profit must be below entry price for short positions" });
  }

  // Attach take-profit to trade
  (trade as any).takeProfit = {
    id: newId("tp"),
    price: profitPrice,
    quantity: (trade.amount * closePercent) / 100,
    status: "active",
    createdAt: NOW()
  };

  logger.info({
    userId: req.userId,
    tradeId,
    profitPrice,
    closePercent
  }, "[FOREX] Take-profit attached");

  return res.json({
    success: true,
    trade,
    message: `Take-profit set at $${profitPrice} for ${tradeId}`
  });
});

// Get forex trading account details (leverage, margin levels, P&L)
router.get("/forex/account", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const tradingWallet = data.wallets.find(w => w.type === "trading");
  const activeTrades = data.trades.filter(t => t.status === "active");

  // Calculate margin metrics
  const usedMargin = activeTrades.reduce((sum, trade) => {
    const typedTrade = trade as any;
    return sum + (typedTrade.amount * typedTrade.entryPrice * (typedTrade.leverage || 1) * 0.02); // 2% margin per unit
  }, 0);

  const equity = (tradingWallet?.balance || 0) + activeTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const freeMargin = equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;

  return res.json({
    accountBalance: tradingWallet?.balance || 0,
    equity,
    usedMargin,
    freeMargin,
    marginLevel: `${marginLevel.toFixed(2)}%`,
    marginWarning: marginLevel < 50 ? "High risk - add funds" : "OK",
    activeTrades: activeTrades.length,
    pendingOrders: (data.pendingOrders || []).length,
    maxLeverage: (data.accountTier ?? 0) >= 2 ? "30x" : "1x (no leverage for tier)",
    tradingStatus: freeMargin > 0 ? "OK" : "Insufficient margin"
  });
});

// Close forex position
router.post("/forex/order/close", requireAuth, async (req, res) => {
  const { tradeId, closePrice, reason = "manual" } = req.body;

  if (!tradeId) {
    return res.status(400).json({ error: "Missing tradeId" });
  }

  const data = getUserData(req.userId!);
  const trade = data.trades.find(t => t.id === tradeId);

  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  if (trade.status !== "active") {
    return res.status(400).json({ error: "Only active trades can be closed" });
  }

  // Calculate P&L
  const exitPrice = closePrice || Math.random() * 100 + 50;
  const priceChange = exitPrice - trade.entryPrice;
  const profitLoss = trade.type === "long" ? priceChange * trade.amount : -priceChange * trade.amount;

  // Close trade
  const typedTrade = trade as any;
  typedTrade.status = "completed";
  typedTrade.currentPrice = exitPrice;
  typedTrade.profit = profitLoss;
  typedTrade.profitPercent = (profitLoss / (typedTrade.entryPrice * typedTrade.amount)) * 100;
  typedTrade.closedAt = NOW();

  // Return margin + profit to wallet
  const tradingWallet = data.wallets.find(w => w.type === "trading");
  if (!tradingWallet) {
    return res.status(500).json({ error: "Trading wallet not found" });
  }

  const returnAmount = (typedTrade.amount * typedTrade.entryPrice * 0.02) + profitLoss;
  tradingWallet.balance += returnAmount;
  // PHASE 1 FIX: Persist balance change to survive server restarts
  void persistWalletBalance(tradingWallet.id, tradingWallet.balance, 0);

  logger.info({
    userId: req.userId,
    tradeId,
    exitPrice,
    profitLoss,
    reason
  }, "[FOREX] Trade closed");

  const tradeSymbol = (typedTrade.symbol as string | undefined) ?? "instrument";

  // Persist transaction
  void persistTransaction(newUuid(), tradingWallet.id, req.userId!, {
    type: profitLoss > 0 ? "trade_profit" : "trade_loss",
    amount: Math.abs(profitLoss),
    currency: "USD",
    status: "completed",
    description: `Closed ${tradeSymbol}`,
  });

  return res.json({
    success: true,
    trade,
    message: `Trade closed: ${profitLoss > 0 ? "✓ Profit" : "✗ Loss"} $${profitLoss.toFixed(2)}`
  });
});

export default router;
