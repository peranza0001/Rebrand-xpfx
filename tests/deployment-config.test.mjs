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

test('railpack install/build uses npm production override instead of forcing NODE_ENV during install', () => {
  const railpack = readJson(railpackPath);

  assert.equal(railpack.env?.NODE_ENV, undefined, 'railpack env should not force NODE_ENV=production during install/build');
  assert.match(railpack.install, /NPM_CONFIG_PRODUCTION=false/, 'install step should explicitly disable npm production mode');
  assert.match(railpack.build, /NPM_CONFIG_PRODUCTION=false/, 'build step should explicitly disable npm production mode');
});
