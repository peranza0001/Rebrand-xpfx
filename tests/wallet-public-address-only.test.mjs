import test from 'node:test';
import assert from 'node:assert/strict';

const importer = new URL('../artifacts/api-server/src/lib/wallet-encryption.ts', import.meta.url);

test('wallet flow rejects credential storage and never advertises encryption for public-address-only wallets', async () => {
  process.env.WALLET_ENCRYPTION_KEY = 'a'.repeat(64);

  const { encryptCredential, decryptCredential, isEncryptionAvailable, isEncryptedCredential } = await import(importer.href);

  assert.equal(isEncryptionAvailable(), false, 'public-address-only wallets must not enable credential encryption');
  assert.equal(isEncryptedCredential('0xabc'), false);

  let thrown;
  try {
    encryptCredential('seed phrase or private key');
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof Error, 'wallet credential storage must be rejected');
  assert.match(String(thrown.message), /public wallet addresses.*private keys|seed phrases.*private keys/i);
  assert.equal(decryptCredential('0xabc'), '0xabc');
});
