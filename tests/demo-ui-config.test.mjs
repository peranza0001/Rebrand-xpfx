import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const loginFile = path.join(repoRoot, 'artifacts/nextrade/src/pages/login.tsx');

const source = fs.readFileSync(loginFile, 'utf8');

test('login page exposes the demo account experience in production builds', () => {
  assert.match(source, /Try Demo Account/, 'login page should render a demo account entry point');
  assert.doesNotMatch(source, /Demo accounts are unavailable in production\./, 'login page should not tell users that demo accounts are unavailable in production');
});
