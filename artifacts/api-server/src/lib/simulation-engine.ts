import { assetCatalog, getUserData, userData, newUuid, NOW } from './store';
import type { Server as IOServer, Namespace } from 'socket.io';
import { logger } from './logger';
import { getPersistedOpenDemoOrders, persistDemoOrder, persistDemoTrade, persistTransaction, persistWalletBalance } from './db-persist';

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
  stopLoss?: number;
  takeProfit?: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

const instruments = assetCatalog.slice(0, 8).map((a) => ({ symbol: a.symbol, price: Number(a.price || 0) }));

const ordersByInstrument = new Map<string, Order[]>();

export function getCurrentPrice(instrument: string): number | undefined {
  return instruments.find((item) => item.symbol === instrument)?.price;
}

export function calculateMargin(instrument: string, amount: number, leverage: number): number | undefined {
  const price = getCurrentPrice(instrument);
  if (price === undefined || !Number.isFinite(amount) || !Number.isFinite(leverage) || leverage <= 0) return undefined;
  return Number(((price * amount) / leverage).toFixed(2));
}

export async function placeOrder(order: Omit<Order, 'id' | 'status' | 'createdAt'>): Promise<Order | null> {
  const id = newUuid();
  const o: Order = { id, status: 'open', createdAt: NOW(), ...order };
  const list = ordersByInstrument.get(order.instrument) ?? [];
  list.push(o as Order);
  ordersByInstrument.set(order.instrument, list);
  if (!await persistDemoOrder(o)) {
    list.splice(list.findIndex((existing) => existing.id === id), 1);
    if (list.length === 0) ordersByInstrument.delete(order.instrument);
    return null;
  }
  return o;
}

export async function restorePersistedDemoOrders(): Promise<void> {
  const orders = await getPersistedOpenDemoOrders();
  for (const order of orders) {
    const list = ordersByInstrument.get(order.instrument) ?? [];
    if (!list.some((existing) => existing.id === order.id)) list.push(order);
    ordersByInstrument.set(order.instrument, list);
  }
}

export function closePosition(userId: string, tradeId: string): boolean {
  const data = getUserData(userId);
  const trade = data.trades.find((candidate) => candidate.id === tradeId);
  if (!trade || trade.status !== 'active') return false;

  trade.status = 'completed';
  trade.completedAt = NOW();
  const margin = Number((trade as any).marginRequired ?? 0);
  const profit = Number(trade.profit ?? 0);
  const tradingWallet = data.wallets.find((wallet) => wallet.type === 'trading');
  if (tradingWallet) {
    tradingWallet.balance = Number((tradingWallet.balance + margin + profit).toFixed(2));
  }
  return true;
}

export function initSimulation(io: IOServer, demoNs: Namespace) {
  void restorePersistedDemoOrders();
  // On each tick, random walk prices and evaluate orders
  setInterval(async () => {
    instruments.forEach(async (inst) => {
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
          if (!await persistDemoOrder(o)) {
            o.status = 'cancelled';
            await persistDemoOrder(o);
            demoNs.to(`user:${o.userId}`).emit('order_rejected', { order: o, reason: 'Demo order could not be durably filled.' });
            continue;
          }
          // create a trade and ledger entries
          try {
            const data = getUserData(o.userId);
            const notional = current * o.amount; // USD exposure
            const marginRequired = Number((notional / o.leverage).toFixed(2));
            
            const tradingWallet = data.wallets.find((wallet) => wallet.type === "trading");
            if (!tradingWallet || tradingWallet.balance < marginRequired) {
              throw new Error("Insufficient demo balance for this practice trade.");
            }
            tradingWallet.balance = Number((tradingWallet.balance - marginRequired).toFixed(2));
            if (!await persistWalletBalance(tradingWallet.id, tradingWallet.balance, 0)) {
              throw new Error("Demo balance could not be durably updated.");
            }
            
            // add trade record
            const trade = {
              id: newUuid(),
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
              stopLoss: o.stopLoss ?? null,
              takeProfit: o.takeProfit ?? null,
              marginRequired,
              managerId: null,
              createdAt: NOW(),
              completedAt: null,
            } as any;
            data.trades.unshift(trade);
            if (!await persistDemoTrade(o.userId, trade)) {
              throw new Error("Demo trade could not be durably stored.");
            }
            if (!await persistTransaction(newUuid(), tradingWallet.id, o.userId, {
              type: 'demo_trade_open',
              amount: marginRequired,
              currency: 'USD',
              status: 'margin_held',
              description: `Demo trade opened: ${o.side} ${o.amount} ${o.instrument}`,
              isDemo: true,
            })) {
              throw new Error("Demo trade ledger entry could not be persisted.");
            }
            demoNs.to(`instrument:${o.instrument}`).emit('order_filled', { order: o, trade });
          } catch (err) {
            o.status = 'cancelled';
            await persistDemoOrder(o);
            demoNs.to(`user:${o.userId}`).emit('order_rejected', { order: o, reason: (err as Error).message });
            logger.warn({ err }, 'Failed to process order fill');
          }
        } else {
          remaining.push(o);
        }
      }
      ordersByInstrument.set(inst.symbol, remaining);

      // Evaluate active trades for stop-out / P&L updates for this instrument
      for (const [uid, data] of userData) {
        for (const t of data.trades) {
          if (t.status !== 'active') continue;
          if (!t.pair || !t.entryPrice) continue;
          if (t.pair !== inst.symbol) continue; // only update trades for current instrument
          const current = inst.price;
          t.currentPrice = current;
          const pnl = t.type === 'long' ? (current - t.entryPrice) * t.amount : (t.entryPrice - current) * t.amount;
          t.profit = Math.round(pnl * 100) / 100;
          await persistDemoTrade(uid, t as any);

          const hitStopLoss = t.type === 'long'
            ? (t as any).stopLoss !== null && (t as any).stopLoss !== undefined && current <= (t as any).stopLoss
            : (t as any).stopLoss !== null && (t as any).stopLoss !== undefined && current >= (t as any).stopLoss;
          const hitTakeProfit = t.type === 'long'
            ? (t as any).takeProfit !== null && (t as any).takeProfit !== undefined && current >= (t as any).takeProfit
            : (t as any).takeProfit !== null && (t as any).takeProfit !== undefined && current <= (t as any).takeProfit;

          // Stop-out logic: if unrealized loss exceeds margin or margin ratio below threshold
          const margin = (t as any).marginRequired ?? (t.entryPrice * t.amount / ((t as any).leverage || 1));
          const equity = margin + t.profit; // margin + unrealized pnl
          const stopOutThreshold = 0.25; // 25% of margin
          if (hitStopLoss || hitTakeProfit || equity <= 0 || equity / Math.max(1, margin) < stopOutThreshold) {
            // Close trade
            t.status = 'completed';
            t.completedAt = NOW();
            // Credit demo margin and P&L back to the demo wallet only.
            try {
              const finalCredit = Math.round((margin + t.profit) * 100) / 100;
              const tradingWallet = data.wallets.find((wallet) => wallet.type === "trading");
              if (tradingWallet) {
                tradingWallet.balance = Number((tradingWallet.balance + finalCredit).toFixed(2));
                if (!await persistWalletBalance(tradingWallet.id, tradingWallet.balance, 0)) {
                  throw new Error("Demo balance could not be durably settled.");
                }
                if (!await persistTransaction(newUuid(), tradingWallet.id, uid, {
                  type: 'demo_trade_close',
                  amount: finalCredit,
                  currency: 'USD',
                  status: 'completed',
                  description: `Demo trade closed: ${t.pair}`,
                  isDemo: true,
                })) {
                  throw new Error("Demo settlement ledger entry could not be persisted.");
                }
              }
              
              demoNs.to(`user:${uid}`).emit('trade_closed', { userId: uid, trade: t });
            } catch (err) {
              logger.warn({ err }, 'Failed to credit closed trade funds or record ledger');
            }
          }
        }
      }
    });
  }, 1500);

  logger.info('[simulation] Initialized simulation engine with instruments: ' + instruments.map(i => i.symbol).join(', '));
}

export default { placeOrder, closePosition, initSimulation };
