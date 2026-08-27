import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const loginFile = path.join(repoRoot, 'artifacts/nextrade/src/pages/login.tsx');
const demoTradingFile = path.join(repoRoot, 'artifacts/nextrade/src/pages/demo-trading.tsx');

const source = fs.readFileSync(loginFile, 'utf8');

test('login page exposes the demo account experience in production builds', () => {
  assert.match(source, /Try Demo Account/, 'login page should render a demo account entry point');
  assert.doesNotMatch(source, /Demo accounts are unavailable in production\./, 'login page should not tell users that demo accounts are unavailable in production');
});

test('demo trading UI does not present simulated state as a live account', () => {
  const source = fs.readFileSync(demoTradingFile, 'utf8');
  assert.doesNotMatch(source, /Live account snapshot/);
  assert.doesNotMatch(source, /const baseEquity = 50000/);
  assert.match(source, /const baseEquity = demoBalance/);
  assert.match(source, /new simulated order/);
});
