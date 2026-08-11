import test from 'node:test';
import assert from 'node:assert/strict';
import { persistTransaction } from '../artifacts/api-server/src/lib/db-persist.ts';

let called = false;

export function createMockPrisma() {
  return {
    transactions: {
      upsert: async ({ where, update, create }) => {
        called = true;
        assert.equal(where.id, '11111111-1111-1111-1111-111111111111');
        assert.equal(update.type, 'fee');
        assert.equal(create.type, 'fee');
        assert.equal(update.is_demo, undefined);
        assert.equal(create.is_demo, undefined);
        return {};
      },
    },
    $queryRaw: async () => [],
  };
}

Object.defineProperty(globalThis, 'logger', {
  value: { warn: () => undefined },
  configurable: true,
});

await test('persistTransaction gracefully omits is_demo when column is absent', async () => {
  const prisma = createMockPrisma();
  const module = await import('../artifacts/api-server/src/lib/db-persist.ts');
  module.setPrismaClient(prisma);
  await module.persistTransaction('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', {
    type: 'fee',
    amount: 10,
    currency: 'USD',
    status: 'completed',
    description: 'Test transaction',
    isDemo: true,
  });
  assert.equal(called, true);
});
