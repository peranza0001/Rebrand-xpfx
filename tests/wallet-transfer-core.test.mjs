import test from 'node:test';
import assert from 'node:assert/strict';
import { freshUserData, transferBetweenWallets } from '../artifacts/api-server/src/lib/store.ts';

test('transferBetweenWallets moves available balance between platform wallets', () => {
  const data = freshUserData('u_wallet_transfer_test');
  const main = data.wallets.find((wallet) => wallet.type === 'main');
  const trading = data.wallets.find((wallet) => wallet.type === 'trading');
  const social = data.wallets.find((wallet) => wallet.type === 'social');

  assert.ok(main && trading && social, 'expected platform wallets to exist');

  main.balance = 1500;
  trading.balance = 250;
  social.balance = 100;

  const result = transferBetweenWallets({
    wallets: data.wallets,
    transactions: data.transactions,
  }, {
    fromWalletId: main.id,
    toWalletId: trading.id,
    amount: 300,
    description: 'Fund trading wallet',
    currency: 'USD',
  });

  assert.equal(result.from.balance, 1200);
  assert.equal(result.to.balance, 550);
  assert.equal(data.transactions[0].description, 'Fund trading wallet');
  assert.equal(data.transactions[0].amount, -300);
});
