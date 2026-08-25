import { Router } from 'express';
import { requireAuth } from '../lib/session';
import { assetCatalog, demoConfig, getUserData } from '../lib/store';
import sim, { calculateMargin } from '../lib/simulation-engine';

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
    }));

  return {
    balance: Number(tradingWallet?.balance ?? 0),
    positions,
    openPositions: positions.length,
    totalPnl: positions.reduce((sum, position) => sum + position.pnl, 0),
  };
}

router.get('/demo/account', requireAuth, (req, res) => {
  res.json(getDemoAccountSnapshot(req.userId!));
});

router.get('/demo/instruments', requireAuth, (_req, res) => {
  const list = assetCatalog.slice(0, 12).map((a) => ({ symbol: a.symbol, name: a.name, price: a.price }));
  res.json(list);
});

router.post('/demo/order', requireAuth, (req, res) => {
  if (req.storedUser?.tradingLocked || req.storedUser?.suspended) {
    return res.status(403).json({ error: 'Trading is locked on your account.' });
  }
  getDemoAccountSnapshot(req.userId!);
  const { instrument, symbol, type, side, price, amount, quantity, leverage } = req.body as any;
  const resolvedInstrument = instrument || symbol;
  const resolvedAmount = amount ?? quantity;

  const allowedInstruments = new Set(assetCatalog.slice(0, 8).map((asset) => asset.symbol));
  const amountValue = Number(resolvedAmount);
  const leverageValue = Number(leverage ?? 10);
  const priceValue = price === undefined || price === null || price === '' ? undefined : Number(price);

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
  });

  return res.json({ success: true, order });
});

router.post('/demo/reset-balance', requireAuth, (req, res) => {
  if (req.storedUser?.role !== 'demo' && req.storedUser?.demoMode !== true) {
    return res.status(403).json({ error: 'Only isolated demo accounts can reset demo trading data.' });
  }
  const data = getUserData(req.userId!);
  const defaultAmount = demoConfig.defaultBalance;
  const trading = data.wallets.find((w) => w.type === 'trading');
  if (trading) trading.balance = defaultAmount;
  data.trades = [];
  data.transactions = [];
  return res.json({ success: true, message: 'Demo balance reset', balance: defaultAmount });
});

export default router;
