import { Router } from 'express';
import { requireAuth } from '../lib/session';
import { assetCatalog, demoConfig, getUserData } from '../lib/store';
import sim from '../lib/simulation-engine';

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
  getDemoAccountSnapshot(req.userId!);
  const { instrument, symbol, type, side, price, amount, quantity, leverage } = req.body as any;
  const resolvedInstrument = instrument || symbol;
  const resolvedAmount = amount ?? quantity;

  if (!resolvedInstrument || !type || !side || resolvedAmount === undefined || resolvedAmount === null || Number.isNaN(Number(resolvedAmount))) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const amountValue = Number(resolvedAmount);
  const order = sim.placeOrder({
    userId: req.userId!,
    instrument: resolvedInstrument,
    type,
    side,
    price: price ? Number(price) : undefined,
    amount: amountValue,
    leverage: Number(leverage ?? 10),
  });

  return res.json({ success: true, order });
});

router.post('/demo/reset-balance', requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const defaultAmount = demoConfig.defaultBalance;
  const trading = data.wallets.find((w) => w.type === 'trading');
  if (trading) trading.balance = defaultAmount;
  data.trades = [];
  data.transactions = [];
  return res.json({ success: true, message: 'Demo balance reset', balance: defaultAmount });
});

export default router;
