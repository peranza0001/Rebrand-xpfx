import { assetCatalog, getUserData, userData, newId, NOW, applyWalletDebit, applyWalletCredit } from './store';
import type { Server as IOServer, Namespace } from 'socket.io';
import { logger } from './logger';

export type OrderType = 'market' | 'limit' | 'stop';
export interface Order {
  id: string;
  userId: string;
  instrument: string;
  type: OrderType;
  side: 'buy' | 'sell';
  price?: number; // for limit/stop
  amount: number; // units of asset
  leverage: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

const instruments = assetCatalog.slice(0, 8).map((a) => ({ symbol: a.symbol, price: Number(a.price || 0) }));

const ordersByInstrument = new Map<string, Order[]>();

function findInstrument(symbol: string) {
  return instruments.find((i) => i.symbol === symbol);
}

export function placeOrder(order: Omit<Order, 'id' | 'status' | 'createdAt'>): Order {
  const id = newId('ord');
  const o: Order = { id, status: 'open', createdAt: NOW(), ...order };
  const list = ordersByInstrument.get(order.instrument) ?? [];
  list.push(o as Order);
  ordersByInstrument.set(order.instrument, list);
  return o as Order;
}

export function initSimulation(io: IOServer, demoNs: Namespace) {
  // On each tick, random walk prices and evaluate orders
  setInterval(() => {
    instruments.forEach((inst) => {
      const vol = 0.0008; // adjustable
      const change = (Math.random() - 0.5) * vol * inst.price;
      inst.price = Math.max(0.00001, inst.price + change);
      demoNs.to(`instrument:${inst.symbol}`).emit('price_update', { symbol: inst.symbol, price: inst.price, ts: Date.now() });

      // evaluate orders for this instrument
      const orders = ordersByInstrument.get(inst.symbol) ?? [];
      const remaining: Order[] = [];
      for (const o of orders) {
        let filled = false;
        const current = inst.price;
        if (o.type === 'market') {
          filled = true;
        } else if (o.type === 'limit') {
          if ((o.side === 'buy' && current <= (o.price ?? 0)) || (o.side === 'sell' && current >= (o.price ?? 0))) {
            filled = true;
          }
        } else if (o.type === 'stop') {
          if ((o.side === 'buy' && current >= (o.price ?? 0)) || (o.side === 'sell' && current <= (o.price ?? 0))) {
            filled = true;
          }
        }

        if (filled) {
          o.status = 'filled';
          // create a trade and ledger entries
          try {
            const data = getUserData(o.userId);
            const notional = current * o.amount; // USD exposure
            const marginRequired = Number((notional / o.leverage).toFixed(2));
            // debit margin from trading wallet
            const { wallet, transaction } = applyWalletDebit({ wallets: data.wallets, transactions: data.transactions }, null, marginRequired, `Demo trade margin (${o.instrument})`, 'USD', true);
            // add trade record
            const trade = {
              id: newId('t'),
              pair: o.instrument,
              type: o.side === 'buy' ? 'long' : 'short',
              status: 'active',
              entryPrice: current,
              currentPrice: current,
              targetPrice: null,
              amount: o.amount,
              currency: 'USD',
              profit: 0,
              expectedProfit: 0,
              leverage: o.leverage,
              marginRequired,
              managerId: null,
              createdAt: NOW(),
              completedAt: null,
            } as any;
            data.trades.unshift(trade);
            demoNs.to(`instrument:${o.instrument}`).emit('order_filled', { order: o, trade });
          } catch (err) {
            logger.warn({ err }, 'Failed to process order fill');
          }
        } else {
          remaining.push(o);
        }
      }
      ordersByInstrument.set(inst.symbol, remaining);
    });
    // Evaluate active trades for stop-out / P&L updates
    for (const [uid, data] of userData) {
      for (const t of data.trades) {
        if (t.status !== 'active') continue;
        if (!t.pair || !t.entryPrice) continue;
        if (t.pair !== inst.symbol) continue; // only update trades for current instrument
        const current = inst.price;
        t.currentPrice = current;
        const pnl = t.type === 'long' ? (current - t.entryPrice) * t.amount : (t.entryPrice - current) * t.amount;
        t.profit = Math.round(pnl * 100) / 100;

        // Stop-out logic: if unrealized loss exceeds margin or margin ratio below threshold
        const margin = t.marginRequired ?? (t.entryPrice * t.amount / (t.leverage || 1));
        const equity = margin + t.profit; // margin + unrealized pnl
        const stopOutThreshold = 0.25; // 25% of margin
        if (equity <= 0 || equity / Math.max(1, margin) < stopOutThreshold) {
          // close trade
          t.status = 'completed';
          t.completedAt = NOW();
          // credit back margin + profit to trading wallet
          try {
            const { wallet: credited } = applyWalletCredit({ wallets: data.wallets, transactions: data.transactions }, null, Math.round((margin + t.profit) * 100) / 100, `Demo trade closed (${t.pair})`, 'USD', true);
            demoNs.emit('trade_closed', { userId: uid, trade: t });
          } catch (err) {
            logger.warn({ err }, 'Failed to credit closed trade funds');
          }
        }
      }
    }
  }, 1500);

  logger.info('[simulation] Initialized simulation engine with instruments: ' + instruments.map(i => i.symbol).join(', '));
}

export default { placeOrder, initSimulation };
