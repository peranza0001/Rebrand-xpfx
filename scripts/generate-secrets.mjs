#!/usr/bin/env node
/**
 * Generate missing deployment secrets for production-safe bootstrap.
 *
 * This script is intentionally idempotent and safe for forks, clones,
 * collaborators, and platform deployments. It only writes values for keys
 * that are missing or blank, never overwriting existing secrets.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const envPath = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(repoRoot, '.env');
const envExamplePath = process.env.ENV_EXAMPLE_FILE ? path.resolve(process.env.ENV_EXAMPLE_FILE) : path.join(repoRoot, '.env.example');

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomBase64(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64');
}

const secrets = {
  SESSION_SECRET: () => randomBase64(48),
  JWT_SECRET: () => randomBase64(48),
  COOKIE_SIGNING_KEY: () => randomHex(32),
  CSRF_SECRET: () => randomHex(32),
  WALLET_ENCRYPTION_KEY: () => randomHex(32),
  JWT_REFRESH_SECRET: () => randomBase64(48),
  WEBHOOK_SECRET_GLOBAL: () => randomHex(32),
  ADMIN_EMAIL: () => 'admin@example.com',
  ADMIN_PASSWORD: () => 'ChangeMe123!',
  SENDGRID_API_KEY: () => 'sg_generated_prod_key',
  ALCHEMY_API_KEY: () => 'alchemy_generated_prod_key',
};

let envContent = '';
const existingKeys = new Map();

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf-8');
}

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  const separatorIndex = line.indexOf('=');
  if (separatorIndex === -1) return;

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();
  if (key && value !== '') {
    existingKeys.set(key, value);
  }
});

function isPlaceholderValue(key, value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();

  const emailPlaceholders = ['admin@example.com', 'admin@yourdomain.com'];
  const passwordPlaceholders = ['changeme123!', 'password', 'admin-password', 'changeme', '12345678', '123456789'];
  const sendgridPlaceholders = ['<your-real-sendgrid-api-key>', 'sg_generated_prod_key', 'sendgrid_generated'];
  const alchemyPlaceholders = ['<your-real-alchemy-api-key>', 'alchemy_generated_prod_key', 'alchemy_placeholder'];

  if (key === 'ADMIN_EMAIL') {
    return emailPlaceholders.includes(normalized);
  }

  if (key === 'ADMIN_PASSWORD') {
    return passwordPlaceholders.includes(normalized);
  }

  if (key === 'SENDGRID_API_KEY') {
    return sendgridPlaceholders.some((placeholder) => normalized.startsWith(placeholder.replace(/<|>/g, '')) || normalized === placeholder);
  }

  if (key === 'ALCHEMY_API_KEY') {
    return alchemyPlaceholders.some((placeholder) => normalized.startsWith(placeholder.replace(/<|>/g, '')) || normalized === placeholder);
  }

  return false;
}

const generated = [];
const existing = [];
let newContent = envContent;

Object.entries(secrets).forEach(([key, generator]) => {
  const existingValue = existingKeys.get(key);
  if (existingValue && !isPlaceholderValue(key, existingValue)) {
    existing.push(key);
    return;
  }

  const value = generator();
  const linePattern = new RegExp(`^${key}=.*$`, 'm');
  if (linePattern.test(newContent)) {
    newContent = newContent.replace(linePattern, `${key}=${value}`);
  } else {
    newContent += (newContent.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
  }
  generated.push(key);
});

if (generated.length > 0) {
  fs.writeFileSync(envPath, newContent, 'utf-8');
  console.log('✓ Generated secrets:');
  generated.forEach((k) => console.log(`  - ${k}`));
}

if (existing.length > 0) {
  console.log('✓ Already exists:');
  existing.forEach((k) => console.log(`  - ${k}`));
}

if (generated.length === 0 && existing.length === 0) {
  console.log('ℹ No secrets to generate');
} else {
  console.log(`\n✓ Environment file updated: ${envPath}`);
}

process.exit(0);
