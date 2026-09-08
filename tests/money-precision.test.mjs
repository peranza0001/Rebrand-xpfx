import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMoney,
  adjustMoney,
  subtractMoney,
  multiplyMoney,
  moneyToNumber,
} from '../artifacts/api-server/src/lib/money.ts';

test('money helpers avoid binary floating-point drift', () => {
  assert.equal(addMoney(0.1, 0.2), 0.3);
  assert.equal(subtractMoney(1, 0.1), 0.9);
  assert.equal(multiplyMoney(19.99, 3), 59.97);
  assert.equal(moneyToNumber('100.005'), 100.01);
  assert.equal(adjustMoney('10.10', '0.20'), 10.3);
  assert.equal(adjustMoney('10.10', '-0.20'), 9.9);
});
