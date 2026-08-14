import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('production DB guard skips install-time checks during install and postinstall', () => {
  for (const lifecycle of ['install', 'postinstall']) {
    const result = spawnSync(process.execPath, ['scripts/ensure-db-ready.mjs'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        npm_lifecycle_event: lifecycle,
        DATABASE_URL: 'postgresql://postgres:pass@postgres-ozqi.railway.internal:5432/railway',
        DIRECT_DATABASE_URL: 'postgresql://postgres:pass@postgres-ozqi.railway.internal:5432/railway',
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, `${lifecycle} check failed: ${result.stderr || result.stdout || 'Expected install-time DB check to skip cleanly'}`);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /skip|install-time|postinstall|install/i, `Expected the ${lifecycle} guard to explicitly skip install-time checks`);
  }
});
