import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const rememberPath = path.join(root, 'remember.md');
const now = new Date();
const timestamp = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

function getGitSummary() {
  try {
    const gitStatus = execSync('git status --porcelain --untracked-files=all', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const summary = gitStatus.trim();
    if (!summary) return 'Clean working tree';

    return summary.split('\n').slice(0, 3).join(' | ');
  } catch {
    return 'Git status unavailable';
  }
}

function buildMemoryBlock() {
  const title = '## 🤖 AUTO-SYNC MEMORY';
  const body = [
    `- Last sync: ${timestamp}`,
    '- Memory rule: Any AI change must refresh this file before finishing the task.',
    '- This project now auto-syncs the memory log via the `remember:update` script and git hooks.',
    `- Current working tree: ${getGitSummary()}`,
  ];

  return `${title}\n${body.join('\n')}\n`;
}

function ensureMarker(content) {
  const startMarker = '<!-- AUTO-UPDATE:START -->';
  const endMarker = '<!-- AUTO-UPDATE:END -->';
  const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  const block = `${startMarker}\n${buildMemoryBlock()}${endMarker}`;

  if (pattern.test(content)) {
    return content.replace(pattern, block);
  }

  return `${content}\n\n${block}\n`;
}

function updateRemember() {
  if (!fs.existsSync(rememberPath)) {
    const content = '# Remember\n\n' + ensureMarker('');
    fs.writeFileSync(rememberPath, content);
    console.log(`Created ${path.relative(root, rememberPath)} at ${timestamp}`);
    return;
  }

  const existing = fs.readFileSync(rememberPath, 'utf8');
  const updated = ensureMarker(existing);
  fs.writeFileSync(rememberPath, updated);
  console.log(`Updated ${path.relative(root, rememberPath)} at ${timestamp}`);
}

updateRemember();
