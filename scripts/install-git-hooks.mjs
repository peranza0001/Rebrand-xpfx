import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const hooksDir = path.join(root, '.git', 'hooks');
const repoHooksDir = path.join(root, '.husky');
const preCommitSource = path.join(repoHooksDir, 'pre-commit');
const preCommitTarget = path.join(hooksDir, 'pre-commit');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function installHook() {
  if (!fs.existsSync(preCommitSource)) {
    console.warn('No .husky/pre-commit hook found; nothing to install.');
    return;
  }

  ensureDir(hooksDir);
  const source = fs.readFileSync(preCommitSource, 'utf8');
  fs.writeFileSync(preCommitTarget, source, { mode: 0o755 });
  console.log(`Installed git hook: ${path.relative(root, preCommitTarget)}`);
}

installHook();
