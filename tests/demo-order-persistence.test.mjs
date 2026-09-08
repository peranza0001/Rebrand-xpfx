import test from 'node:test';
import assert from 'node:assert/strict';
import { persistDemoOrder, getPersistedOpenDemoOrders } from '../artifacts/api-server/src/lib/db-persist.ts';
import { setDbForTests } from '../artifacts/api-server/src/lib/db-client.ts';

test('demo order persistence has an explicit restart-safe open-order contract', async () => {
  const calls = [];
  const fakeDb = {
    insert: () => ({
      values: (value) => ({
        onConflictDoUpdate: async (update) => { calls.push({ value, update }); },
      }),
    }),
    select: () => ({
      from: () => ({
        where: async () => [{
          id: '11111111-1111-4111-8111-111111111111',
          userId: '22222222-2222-4222-8222-222222222222',
          instrument: 'BTC',
          type: 'market',
          side: 'buy',
          price: null,
          amount: '0.01000000',
          leverage: 10,
          stopLoss: null,
          takeProfit: null,
          status: 'open',
          createdAt: new Date('2026-08-28T00:00:00.000Z'),
          updatedAt: new Date('2026-08-28T00:00:00.000Z'),
        }],
      }),
    }),
  };

  setDbForTests(fakeDb);
  try {
    const orderId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    assert.equal(await persistDemoOrder({
      id: orderId,
      userId,
      instrument: 'BTC',
      type: 'market',
      side: 'buy',
      amount: 0.01,
      leverage: 10,
      status: 'open',
      createdAt: '2026-08-28T00:00:00.000Z',
    }), true);
    assert.equal(calls.length, 1);
    const restored = await getPersistedOpenDemoOrders();
    assert.equal(restored.length, 1);
    assert.equal(restored[0].id, orderId);
    assert.equal(restored[0].userId, userId);
    assert.equal(restored[0].status, 'open');
  } finally {
    setDbForTests(undefined);
  }
});