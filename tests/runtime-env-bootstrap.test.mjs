import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const runtimeEnvModule = path.join(repoRoot, 'artifacts/api-server/src/lib/runtime-env.ts');
const envModule = path.join(repoRoot, 'artifacts/api-server/src/lib/env.ts');
const tsxLoader = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs');

test('runtime env bootstrap loads .env before dependent modules are imported', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rebrand-runtime-env-'));
  const tempEnvPath = path.join(tempDir, '.env');
  writeFileSync(tempEnvPath, 'ADMIN_EMAIL=bootstrap@example.com\n');

  try {
    const script = `
      const runtimeEnvModuleExport = await import(${JSON.stringify(runtimeEnvModule)});
      const loadRuntimeEnv = typeof runtimeEnvModuleExport.loadRuntimeEnv === 'function'
        ? runtimeEnvModuleExport.loadRuntimeEnv
        : typeof runtimeEnvModuleExport.default === 'function'
          ? runtimeEnvModuleExport.default
          : runtimeEnvModuleExport.default?.default;
      loadRuntimeEnv();
      const envModuleExport = await import(${JSON.stringify(envModule)});
      const env = envModuleExport.env ?? envModuleExport.default?.env;
      console.log(env?.ADMIN_EMAIL ?? 'MISSING');
    `;

    const result = execFileSync(process.execPath, ['--import', tsxLoader, '-e', script], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ENV_FILE: tempEnvPath,
      },
      encoding: 'utf8',
    });

    assert.equal(result.trim(), 'bootstrap@example.com');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('runtime env bootstrap discovers .env in a parent directory from a nested cwd', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rebrand-runtime-env-'));
  const nestedDir = path.join(tempDir, 'workspace', 'api');
  mkdirSync(nestedDir, { recursive: true });
  const tempEnvPath = path.join(tempDir, '.env');
  writeFileSync(tempEnvPath, 'ADMIN_EMAIL=nested@example.com\n');

  try {
    const script = `
      const runtimeEnvModuleExport = await import(${JSON.stringify(runtimeEnvModule)});
      const loadRuntimeEnv = typeof runtimeEnvModuleExport.loadRuntimeEnv === 'function'
        ? runtimeEnvModuleExport.loadRuntimeEnv
        : typeof runtimeEnvModuleExport.default === 'function'
          ? runtimeEnvModuleExport.default
          : runtimeEnvModuleExport.default?.default;
      loadRuntimeEnv();
      const envModuleExport = await import(${JSON.stringify(envModule)});
      const env = envModuleExport.env ?? envModuleExport.default?.env;
      console.log(env?.ADMIN_EMAIL ?? 'MISSING');
    `;

    const result = execFileSync(process.execPath, ['--import', tsxLoader, '-e', script], {
      cwd: nestedDir,
      env: {
        ...process.env,
      },
      encoding: 'utf8',
    });

    assert.equal(result.trim(), 'nested@example.com');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
