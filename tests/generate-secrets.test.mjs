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

test('secret generation bootstraps .env from .env.example for fresh clones', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'rebrand-bootstrap-'));
  const tempEnvPath = path.join(tempDir, '.env');
  const tempExamplePath = path.join(tempDir, '.env.example');
  writeFileSync(tempExamplePath, 'SESSION_SECRET=\nENABLE_DEMO_AUTH=true\n');

  const result = execFileSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ENV_FILE: tempEnvPath,
      ENV_EXAMPLE_FILE: tempExamplePath,
    },
    encoding: 'utf8',
  });

  assert.ok(existsSync(tempEnvPath));
  const envContent = readFileSync(tempEnvPath, 'utf8');
  assert.match(envContent, /ENABLE_DEMO_AUTH=true/);
  assert.match(envContent, /SESSION_SECRET=/);
  assert.match(envContent, /COOKIE_SECRET=/);
  assert.match(envContent, /ADMIN_SECRET=/);
  assert.match(envContent, /ENCRYPTION_KEY=/);
  assert.doesNotMatch(envContent, /SESSION_SECRET=\s*$/m);
  assert.doesNotMatch(envContent, /COOKIE_SECRET=\s*$/m);
  assert.doesNotMatch(envContent, /ADMIN_SECRET=\s*$/m);
  assert.doesNotMatch(envContent, /ENCRYPTION_KEY=\s*$/m);
  assert.ok(result.includes('Generated secrets'));

  rmSync(tempDir, { recursive: true, force: true });
});

test('secret generation populates integration defaults for sendgrid and alchemy', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'rebrand-integration-'));
  const tempEnvPath = path.join(tempDir, '.env');
  const tempExamplePath = path.join(tempDir, '.env.example');
  writeFileSync(tempExamplePath, 'SESSION_SECRET=\nENABLE_DEMO_AUTH=true\n');

  const result = execFileSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ENV_FILE: tempEnvPath,
      ENV_EXAMPLE_FILE: tempExamplePath,
    },
    encoding: 'utf8',
  });

  const envContent = readFileSync(tempEnvPath, 'utf8');
  assert.match(envContent, /SENDGRID_API_KEY=/);
  assert.match(envContent, /ALCHEMY_API_KEY=/);
  assert.doesNotMatch(envContent, /SENDGRID_API_KEY=\s*$/m);
  assert.doesNotMatch(envContent, /ALCHEMY_API_KEY=\s*$/m);
  assert.match(envContent, /SENDGRID_API_KEY=sg_generated_/);
  assert.match(envContent, /ALCHEMY_API_KEY=alchemy_generated_/);
  assert.ok(result.includes('Generated secrets'));

  rmSync(tempDir, { recursive: true, force: true });
});

test('secret generation script exists and is runnable', () => {
  const result = execFileSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: 'utf8' });
  assert.ok(result.includes('Environment file updated') || result.includes('No secrets to generate'));
});
