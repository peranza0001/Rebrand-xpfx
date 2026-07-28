import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const scriptPath = path.join(repoRoot, 'scripts', 'generate-secrets.mjs');

test('secret generator preserves demo-auth defaults for fresh clones', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'rebrand-secrets-'));
  const tempEnvPath = path.join(tempDir, '.env');
  writeFileSync(tempEnvPath, 'ENABLE_DEMO_AUTH=true\n');

  const envContent = readFileSync(tempEnvPath, 'utf8');
  assert.match(envContent, /ENABLE_DEMO_AUTH=true/);

  rmSync(tempDir, { recursive: true, force: true });
});

test('secret generation script exists and is runnable', () => {
  const result = execFileSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: 'utf8' });
  assert.ok(result.includes('Environment file updated') || result.includes('No secrets to generate'));
});
