import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const railpackPath = path.join(repoRoot, 'railpack.json');
const corsPath = path.join(repoRoot, 'artifacts/api-server/src/lib/cors.ts');
const execFileAsync = promisify(execFile);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('railpack install/build keeps dev dependencies available without deprecated npm production config', () => {
  const railpack = readJson(railpackPath);

  assert.equal(railpack.env?.NODE_ENV, undefined, 'railpack env should not force NODE_ENV=production during install/build');
  assert.match(railpack.install, /--include=dev/, 'install step should explicitly include dev dependencies');
  assert.match(railpack.build, /--include=dev|npm run predeploy/, 'build step should keep dev dependencies available during build');
});

test('Railway frontend origin with a trailing slash is accepted as a credentialed CORS origin', async () => {
  const script = `
    process.env.ALLOWED_ORIGINS = 'https://rebrand-xpfx-production-1988.up.railway.app,https://web-production-45a7e.up.railway.app/';
    const { isAllowedOrigin } = await import(${JSON.stringify(corsPath)});
    if (!isAllowedOrigin('https://web-production-45a7e.up.railway.app')) {
      process.exit(1);
    }
  `;
  await execFileAsync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: repoRoot,
  });
});

test('Vercel wildcard origins match only HTTPS subdomains and remain credential-safe', async () => {
  const script = `
    process.env.ALLOWED_ORIGINS = 'https://*.vercel.app,http://localhost:3000';
    const { isAllowedOrigin } = await import(${JSON.stringify(corsPath)});
    if (!isAllowedOrigin('https://preview-123.vercel.app')) process.exit(1);
    if (!isAllowedOrigin('https://nested.preview-123.vercel.app')) process.exit(1);
    if (isAllowedOrigin('http://preview-123.vercel.app')) process.exit(1);
    if (isAllowedOrigin('https://vercel.app')) process.exit(1);
    if (!isAllowedOrigin('http://localhost:3000/')) process.exit(1);
  `;
  await execFileAsync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: repoRoot,
  });
});
