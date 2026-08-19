import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const railpackPath = path.join(repoRoot, 'railpack.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('railpack install/build keeps dev dependencies available without deprecated npm production config', () => {
  const railpack = readJson(railpackPath);

  assert.equal(railpack.env?.NODE_ENV, undefined, 'railpack env should not force NODE_ENV=production during install/build');
  assert.match(railpack.install, /--include=dev/, 'install step should explicitly include dev dependencies');
  assert.match(railpack.build, /--include=dev|npm run predeploy/, 'build step should keep dev dependencies available during build');
});
