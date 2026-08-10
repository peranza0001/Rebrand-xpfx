import assert from 'node:assert/strict';
import { getDemoAccountSnapshot } from '../artifacts/api-server/src/routes/demo-trading.ts';
import { freshUserData, userData } from '../artifacts/api-server/src/lib/store.ts';

const userId = 'demo-state-test-user';
const data = freshUserData(userId, { withDemoBalances: true });
data.wallets.find((wallet) => wallet.type === 'trading').balance = 9876.54;
data.trades = [
  {
    id: 'trade-1',
    pair: 'EUR/USD',
    type: 'long',
    status: 'active',
    entryPrice: 1.0854,
    currentPrice: 1.0861,
    targetPrice: null,
    amount: 2500,
    currency: 'USD',
    profit: 18.75,
    expectedProfit: 0,
    leverage: 10,
    marginRequired: 271.35,
    managerId: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  },
];
userData.set(userId, data);

const snapshot = getDemoAccountSnapshot(userId);
assert.equal(snapshot.balance, 9876.54);
assert.equal(snapshot.positions.length, 1);
assert.equal(snapshot.positions[0].symbol, 'EUR/USD');
assert.equal(snapshot.positions[0].side, 'Long');
console.log('demo-trading snapshot test passed');
