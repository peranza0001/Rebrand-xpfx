#!/usr/bin/env node
/**
 * Generate missing environment secrets
 * - SESSION_SECRET, COOKIE_SECRET, ADMIN_SECRET, ENCRYPTION_KEY
 * - Only writes keys that are missing or empty
 * - Never overwrites existing values
 * - Appends to .env file
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const envPath = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(repoRoot, '.env');
const envExamplePath = process.env.ENV_EXAMPLE_FILE ? path.resolve(process.env.ENV_EXAMPLE_FILE) : path.join(repoRoot, '.env.example');

const secrets = {
  SESSION_SECRET: () => crypto.randomBytes(64).toString('hex'),
  COOKIE_SECRET: () => crypto.randomBytes(64).toString('hex'),
  ADMIN_SECRET: () => crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('hex'),
};

// Read existing .env file, or bootstrap from .env.example when missing
let envContent = '';
let existingKeys = {};

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf-8');
}

// Parse existing keys, but treat blank values as missing so placeholders in .env.example can be filled.
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  const separatorIndex = line.indexOf('=');
  if (separatorIndex === -1) {
    return;
  }

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();

  if (key && value !== '') {
    existingKeys[key] = true;
  }
});

// Generate missing secrets
const generated = [];
const existing = [];
let newContent = envContent;

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  newContent = envContent;
}

Object.entries(secrets).forEach(([key, generator]) => {
  if (existingKeys[key]) {
    existing.push(key);
  } else {
    const value = generator();
    const linePattern = new RegExp(`^${key}=.*$`, 'm');
    if (linePattern.test(newContent)) {
      newContent = newContent.replace(linePattern, `${key}=${value}`);
    } else {
      newContent += (newContent.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
    }
    generated.push(key);
  }
});

// Write back to .env
if (generated.length > 0) {
  fs.writeFileSync(envPath, newContent, 'utf-8');
  console.log('✓ Generated secrets:');
  generated.forEach(k => console.log(`  - ${k}`));
}

if (existing.length > 0) {
  console.log('✓ Already exists:');
  existing.forEach(k => console.log(`  - ${k}`));
}

if (generated.length === 0 && existing.length === 0) {
  console.log('ℹ No secrets to generate');
} else {
  console.log(`\n✓ Environment file updated: ${envPath}`);
}

process.exit(0);
