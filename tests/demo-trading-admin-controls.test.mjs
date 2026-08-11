import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const appFile = path.join(repoRoot, 'artifacts/nextrade/src/App.tsx');
const shellFile = path.join(repoRoot, 'artifacts/nextrade/src/components/layout/Shell.tsx');
const adminUserDetailFile = path.join(repoRoot, 'artifacts/admin-portal/src/pages/user-detail.tsx');

const appSource = fs.readFileSync(appFile, 'utf8');
const shellSource = fs.readFileSync(shellFile, 'utf8');
const demoTradingPageFile = path.join(repoRoot, 'artifacts/nextrade/src/pages/demo-trading.tsx');
const demoTradingPageSource = fs.readFileSync(demoTradingPageFile, 'utf8');
const adminSource = fs.readFileSync(adminUserDetailFile, 'utf8');

test('demo trading route and sidebar entry are wired into the client experience', () => {
  assert.match(appSource, /path="\/demo-trading"/, 'demo trading route should be registered');
  assert.match(shellSource, /Demo Trading/, 'sidebar should expose the demo trading entry');
  assert.match(demoTradingPageSource, /<ChartContainer/, 'demo trading page should render the chart container');
});

test('admin user detail page exposes explicit access-control controls', () => {
  assert.match(adminSource, /Access control/, 'admin detail page should expose an access control section');
  assert.match(adminSource, /backend control path/, 'admin access controls should describe their backend effect');
});
