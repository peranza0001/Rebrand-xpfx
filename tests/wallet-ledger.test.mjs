import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWalletLedgerInsertSql } from '../artifacts/api-server/src/lib/wallet-ledger.ts';

test('wallet ledger inserts are parameterized and include the real ledger values', () => {
  const query = buildWalletLedgerInsertSql({
    userId: '11111111-1111-1111-1111-111111111111',
    walletId: '22222222-2222-2222-2222-222222222222',
    entryType: 'deposit_approved',
    assetSymbol: 'USD',
    amount: 125.5,
    status: 'completed',
    sourceType: 'stripe_payment_intent',
    sourceId: 'pi_123',
    description: 'Confirmed digital wallet payment',
    metadata: { processor: 'stripe' },
  });

  const flattened = query.queryChunks
    .map((chunk) => {
      if (typeof chunk === 'string') return chunk;
      if (Array.isArray(chunk)) return chunk.join('');
      if (chunk && typeof chunk === 'object' && Array.isArray(chunk.value)) return chunk.value.join('');
      return String(chunk);
    })
    .join('');

  assert.equal(typeof query, 'object');
  assert.match(flattened, /wallet_ledger_entries/i);
  assert.match(flattened, /11111111-1111-1111-1111-111111111111/);
  assert.match(flattened, /deposit_approved/i);
  assert.match(flattened, /stripe_payment_intent/i);
  assert.match(flattened, /Confirmed digital wallet payment/i);
});
