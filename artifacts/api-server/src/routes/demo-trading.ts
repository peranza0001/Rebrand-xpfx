import { Router } from 'express';
import { requireAuth } from '../lib/session';
import { assetCatalog, demoConfig, getUserData, newUuid, NOW } from '../lib/store';
import { deletePersistedDemoTrades, ensurePersistedDemoAccount, persistDemoTrade, persistTransaction, persistWalletBalance } from '../lib/db-persist';
import sim, { calculateMargin, getCurrentPrice } from '../lib/simulation-engine';

const router = Router();

export function getDemoAccountSnapshot(userId: string) {
  const data = getUserData(userId);
  const tradingWallet = data.wallets.find((wallet) => wallet.type === 'trading');
  if (tradingWallet && tradingWallet.balance <= 0 && data.trades.length === 0) {
    tradingWallet.balance = demoConfig.defaultBalance;
  }
  const positions = data.trades
    .filter((trade) => trade.status === 'active')
    .map((trade) => ({
      id: trade.id,
      symbol: trade.pair,
      side: trade.type === 'long' ? 'Long' : 'Short',
      entryPrice: Number(trade.entryPrice ?? 0),
      currentPrice: Number(trade.currentPrice ?? trade.entryPrice ?? 0),
      size: Number(trade.amount ?? 0),
      pnl: Number(trade.profit ?? 0),
      pnlPercent: Number((((Number(trade.profit ?? 0)) / Math.max(0.01, Number((trade as any).marginRequired ?? 0.01))) * 100).toFixed(2)),
      openTime: new Date(trade.createdAt ?? Date.now()).toISOString(),
    }));

  return {
    balance: Number(tradingWallet?.balance ?? 0),
    positions,
    openPositions: positions.length,
    totalPnl: positions.reduce((sum, position) => sum + position.pnl, 0),
  };
}

router.get('/demo/account', requireAuth, (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Demo trading requires an isolated demo session.' });
  }
  return res.json(getDemoAccountSnapshot(req.userId!));
});

router.post('/demo/start', requireAuth, async (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Demo trading requires an isolated demo session.' });
  }

  const persisted = await ensurePersistedDemoAccount(req.userId!, demoConfig.defaultBalance);
  if (!persisted) {
    return res.status(503).json({
      error: 'Demo trading is temporarily unavailable because the demo account could not be persisted.',
      code: 'demo_persistence_unavailable',
    });
  }

  return res.status(200).json({
    success: true,
    mode: 'demo',
    account: getDemoAccountSnapshot(req.userId!),
  });
});

router.get('/demo/instruments', requireAuth, (_req, res) => {
  const list = assetCatalog.slice(0, 12).map((a) => ({ symbol: a.symbol, name: a.name, price: a.price }));
  res.json(list);
});

router.post('/demo/order', requireAuth, (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Demo trading requires an isolated demo session.' });
  }
  if (req.storedUser?.tradingLocked || req.storedUser?.suspended) {
    return res.status(403).json({ error: 'Trading is locked on your account.' });
  }
  getDemoAccountSnapshot(req.userId!);
  const { instrument, symbol, type, side, price, amount, quantity, leverage, stopLoss, takeProfit } = req.body as any;
  const resolvedInstrument = instrument || symbol;
  const resolvedAmount = amount ?? quantity;

  const allowedInstruments = new Set(assetCatalog.slice(0, 8).map((asset) => asset.symbol));
  const amountValue = Number(resolvedAmount);
  const leverageValue = Number(leverage ?? 10);
  const priceValue = price === undefined || price === null || price === '' ? undefined : Number(price);
  const stopLossValue = stopLoss === undefined || stopLoss === null || stopLoss === '' ? undefined : Number(stopLoss);
  const takeProfitValue = takeProfit === undefined || takeProfit === null || takeProfit === '' ? undefined : Number(takeProfit);

  if (!allowedInstruments.has(String(resolvedInstrument))) {
    return res.status(400).json({ error: 'Unsupported demo instrument' });
  }
  if (type !== 'market' && type !== 'limit' && type !== 'stop') {
    return res.status(400).json({ error: 'Unsupported order type' });
  }
  if (side !== 'buy' && side !== 'sell') {
    return res.status(400).json({ error: 'Unsupported order side' });
  }
  if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1_000_000_000) {
    return res.status(400).json({ error: 'Demo amount must be between 0 and 1,000,000,000' });
  }
  if (!Number.isInteger(leverageValue) || leverageValue < 1 || leverageValue > 50) {
    return res.status(400).json({ error: 'Demo leverage must be an integer between 1 and 50' });
  }
  if (type !== 'market' && (!Number.isFinite(priceValue) || (priceValue ?? 0) <= 0)) {
    return res.status(400).json({ error: 'Limit and stop orders require a positive price' });
  }
  if (stopLossValue !== undefined && (!Number.isFinite(stopLossValue) || stopLossValue <= 0)) {
    return res.status(400).json({ error: 'Stop loss must be a positive price' });
  }
  if (takeProfitValue !== undefined && (!Number.isFinite(takeProfitValue) || takeProfitValue <= 0)) {
    return res.status(400).json({ error: 'Take profit must be a positive price' });
  }

  const data = getUserData(req.userId!);
  const tradingWallet = data.wallets.find((wallet) => wallet.type === 'trading');
  const requiredMargin = calculateMargin(String(resolvedInstrument), amountValue, leverageValue);
  if (!tradingWallet || requiredMargin === undefined || tradingWallet.balance < requiredMargin) {
    return res.status(400).json({
      error: 'Insufficient demo margin for this order',
      requiredMargin: requiredMargin ?? null,
      availableBalance: tradingWallet?.balance ?? 0,
    });
  }

  const order = sim.placeOrder({
    userId: req.userId!,
    instrument: resolvedInstrument,
    type,
    side,
    price: priceValue,
    amount: amountValue,
    leverage: leverageValue,
    stopLoss: stopLossValue,
    takeProfit: takeProfitValue,
  });

  return res.json({ success: true, order });
});

router.delete('/demo/position/:tradeId', requireAuth, async (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Demo trading requires an isolated demo session.' });
  }
  if (req.storedUser?.tradingLocked || req.storedUser?.suspended) {
    return res.status(403).json({ error: 'Trading is locked on your account.' });
  }

  const data = getUserData(req.userId!);
  const trade = data.trades.find((item) => item.id === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: 'Demo position not found' });
  if (trade.status !== 'active') return res.status(409).json({ error: 'Demo position is already closed' });

  const exitPrice = getCurrentPrice(trade.pair);
  if (exitPrice === undefined || !Number.isFinite(exitPrice)) {
    return res.status(503).json({ error: 'Demo market price is temporarily unavailable' });
  }

  const typedTrade = trade as any;
  const margin = Number(typedTrade.marginRequired ?? (trade.entryPrice * trade.amount) / (typedTrade.leverage || 1));
  const profitLoss = trade.type === 'long'
    ? (exitPrice - trade.entryPrice) * trade.amount
    : (trade.entryPrice - exitPrice) * trade.amount;
  typedTrade.status = 'completed';
  typedTrade.currentPrice = exitPrice;
  typedTrade.profit = Math.round(profitLoss * 100) / 100;
  typedTrade.completedAt = NOW();

  const tradingWallet = data.wallets.find((wallet) => wallet.type === 'trading');
  if (!tradingWallet) return res.status(500).json({ error: 'Demo wallet not found' });
  const returnAmount = Math.round((margin + typedTrade.profit) * 100) / 100;
  await persistDemoTrade(req.userId!, typedTrade);
  tradingWallet.balance = Number((tradingWallet.balance + returnAmount).toFixed(2));
  void persistWalletBalance(tradingWallet.id, tradingWallet.balance, 0);
  void persistTransaction(newUuid(), tradingWallet.id, req.userId!, {
    type: 'demo_trade_close',
    amount: returnAmount,
    currency: 'USD',
    status: 'completed',
    description: `Demo trade closed: ${trade.pair}`,
    isDemo: true,
  });

  return res.json({ success: true, trade, balance: tradingWallet.balance });
});

router.post('/demo/reset-balance', requireAuth, async (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Only isolated demo accounts can reset demo trading data.' });
  }
  const data = getUserData(req.userId!);
  const defaultAmount = demoConfig.defaultBalance;
  const trading = data.wallets.find((w) => w.type === 'trading');
  if (trading) trading.balance = defaultAmount;
  data.trades = [];
  data.transactions = [];
  await deletePersistedDemoTrades(req.userId!);
  return res.json({ success: true, message: 'Demo balance reset', balance: defaultAmount });
});

export default router;
