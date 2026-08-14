import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const railwayConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'railway.json'), 'utf8'));
const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const prismaSchema = fs.readFileSync(path.join(repoRoot, 'prisma/schema.prisma'), 'utf8');

test('Railway build config builds the frontend bundle', () => {
  const buildCommand = String(railwayConfig.build?.buildCommand || '');
  const rootBuildScript = String(rootPackage.scripts?.build || '');
  assert.match(buildCommand, /npm run build\b/, 'Expected Railway to invoke the project root build script');
  assert.match(rootBuildScript, /artifacts\/nextrade|artifacts\/admin-portal/, 'Expected the root build to compile the website frontend bundles');
});

test('Prisma schema has no merge markers', () => {
  assert.doesNotMatch(prismaSchema, /<<<<<<<|=======|>>>>>>>/, 'Prisma schema still contains leftover merge conflict markers');
});
