import { Router } from 'express';
import { requireAuth } from '../lib/session';
import { assetCatalog, getUserData } from '../lib/store';
import sim from '../lib/simulation-engine';

const router = Router();

router.get('/demo/instruments', requireAuth, (_req, res) => {
  const list = assetCatalog.slice(0, 12).map((a) => ({ symbol: a.symbol, name: a.name, price: a.price }));
  res.json(list);
});

router.post('/demo/order', requireAuth, (req, res) => {
  const { instrument, type, side, price, amount, leverage } = req.body as any;
  if (!instrument || !type || !side || !amount) return res.status(400).json({ error: 'Missing fields' });
  const ord = sim.placeOrder({ userId: req.userId!, instrument, type, side, price: price ? Number(price) : undefined, amount: Number(amount), leverage: Number(leverage ?? 10) });
  return res.json({ success: true, order: ord });
});

router.post('/demo/reset-balance', requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const defaultAmount = 10000;
  // reset trading wallet balance only
  const trading = data.wallets.find((w) => w.type === 'trading');
  if (trading) trading.balance = defaultAmount;
  // clear demo trades and transactions (soft reset)
  data.trades = [];
  data.transactions = [];
  return res.json({ success: true, message: 'Demo balance reset', balance: defaultAmount });
});

export default router;
