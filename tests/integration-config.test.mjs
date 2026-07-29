import test from 'node:test';
import assert from 'node:assert/strict';
import integrationConfigModule from '../artifacts/api-server/src/lib/integration-config.ts';

const { isSendGridConfigured, isAlchemyConfigured } = integrationConfigModule.default ?? integrationConfigModule;

test('placeholder sendgrid and alchemy credentials are treated as unconfigured', () => {
  assert.equal(isSendGridConfigured('sg_generated_prod_key'), false);
  assert.equal(isSendGridConfigured('SG.1234567890abcdef0123456789abcdef'), true);
  assert.equal(isAlchemyConfigured('alchemy_generated_prod_key'), false);
  assert.equal(isAlchemyConfigured('eth-mainnet-abc123'), true);
});
