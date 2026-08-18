#!/usr/bin/env node
/**
 * Generate missing deployment secrets for production-safe bootstrap.
 *
 * This script is intentionally idempotent and safe for forks, clones,
 * collaborators, and platform deployments. It only writes values for keys
 * that are missing, blank, or contain known placeholders, never overwriting
 * real existing secrets. It also seeds the repo with safe default values
 * needed by any hosting provider so deployment remains stable
 * when a project is moved across GitHub accounts or hosts.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const envPath = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(repoRoot, '.env');
const envExamplePath = process.env.ENV_EXAMPLE_FILE ? path.resolve(process.env.ENV_EXAMPLE_FILE) : path.join(repoRoot, '.env.example');

const isProductionMode = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

const defaultProductionValues = {
  NODE_ENV: 'production',
  PORT: '3000',
  LOG_LEVEL: 'info',
  ALLOWED_ORIGINS: 'https://web-production-45a7e.up.railway.app,https://xpressprofxcom.vercel.app',
  PUBLIC_APP_URL: 'https://xpressprofxcom.vercel.app',
  FRONTEND_URL: 'https://xpressprofxcom.vercel.app',
  VITE_API_URL: 'https://web-production-45a7e.up.railway.app',
  SESSION_SECRET: 'change_me_session_secret',
  JWT_SECRET: 'change_me_jwt_secret',
  WALLET_ENCRYPTION_KEY: 'change_me_wallet_encryption_key',
  ADMIN_EMAIL: 'admin@example.com,ops@example.com',
  ADMIN_PASSWORD: 'ChangeMe123!',
  ADMIN_NOTIFY_EMAIL: 'admin@example.com',
  ENABLE_DEMO_AUTH: 'false',
  REFERRAL_REWARD_USD: '10',
  DATABASE_URL: 'postgresql://postgres:change_me_secure_password@db.example.internal:5432/railway',
  DIRECT_DATABASE_URL: 'postgresql://postgres:change_me_secure_password@db.example.internal:5432/railway',
  ALCHEMY_API_KEY: 'https://base-mainnet.g.alchemy.com/v2/alchemy_generated_placeholder,https://eth-mainnet.g.alchemy.com/v2/alchemy_generated_placeholder,https://bnb-mainnet.g.alchemy.com/v2/alchemy_generated_placeholder,https://bitcoin-mainnet.g.alchemy.com/v2/alchemy_generated_placeholder',
  APP_NAME: 'XpressProFX',
  SENDGRID_API_KEY: 'SG.generated_placeholder_do_not_use',
  SMTP_FROM: 'support@example.com',
  SMTP_HOST: 'smtp.sendgrid.net',
  SMTP_PASS: 'SG.generated_placeholder_do_not_use',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'apikey',
};

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomBase64(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64');
}

const secrets = {
  NODE_ENV: () => defaultProductionValues.NODE_ENV,
  PORT: () => defaultProductionValues.PORT,
  LOG_LEVEL: () => defaultProductionValues.LOG_LEVEL,
  ALLOWED_ORIGINS: () => defaultProductionValues.ALLOWED_ORIGINS,
  PUBLIC_APP_URL: () => defaultProductionValues.PUBLIC_APP_URL,
  FRONTEND_URL: () => defaultProductionValues.FRONTEND_URL,
  VITE_API_URL: () => defaultProductionValues.VITE_API_URL,
  SESSION_SECRET: () => defaultProductionValues.SESSION_SECRET,
  COOKIE_SECRET: () => randomHex(64),
  ADMIN_SECRET: () => randomHex(64),
  ENCRYPTION_KEY: () => randomHex(64),
  JWT_SECRET: () => defaultProductionValues.JWT_SECRET,
  COOKIE_SIGNING_KEY: () => randomHex(32),
  CSRF_SECRET: () => randomHex(32),
  WALLET_ENCRYPTION_KEY: () => defaultProductionValues.WALLET_ENCRYPTION_KEY,
  JWT_REFRESH_SECRET: () => randomBase64(48),
  WEBHOOK_SECRET_GLOBAL: () => randomHex(32),
  ADMIN_EMAIL: () => defaultProductionValues.ADMIN_EMAIL,
  ADMIN_PASSWORD: () => defaultProductionValues.ADMIN_PASSWORD,
  ADMIN_NOTIFY_EMAIL: () => defaultProductionValues.ADMIN_NOTIFY_EMAIL,
  ENABLE_DEMO_AUTH: () => defaultProductionValues.ENABLE_DEMO_AUTH,
  REFERRAL_REWARD_USD: () => defaultProductionValues.REFERRAL_REWARD_USD,
  DATABASE_URL: () => defaultProductionValues.DATABASE_URL,
  DIRECT_DATABASE_URL: () => defaultProductionValues.DIRECT_DATABASE_URL,
  ALCHEMY_API_KEY: () => defaultProductionValues.ALCHEMY_API_KEY,
  APP_NAME: () => defaultProductionValues.APP_NAME,
  SENDGRID_API_KEY: () => defaultProductionValues.SENDGRID_API_KEY,
  SMTP_FROM: () => defaultProductionValues.SMTP_FROM,
  SMTP_HOST: () => defaultProductionValues.SMTP_HOST,
  SMTP_PASS: () => defaultProductionValues.SMTP_PASS,
  SMTP_PORT: () => defaultProductionValues.SMTP_PORT,
  SMTP_SECURE: () => defaultProductionValues.SMTP_SECURE,
  SMTP_USER: () => defaultProductionValues.SMTP_USER,
};

if (isProductionMode) {
  console.log('ℹ Production mode detected — skipping repo secret generation so Railway runtime values remain authoritative.');
  process.exit(0);
}

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

  const placeholderPatterns = [
    'yourdomain',
    'replacewith',
    'changeme',
    'change_me',
    'your-real',
    'example.com',
    'localhost',
    'sg_generated_prod_key',
    'alchemy_generated_prod_key',
    'generated_prod_key',
    'generated_placeholder',
    'placeholder',
    'example',
    'your-',
    '<',
    '>',
  ];

  if (key === 'ADMIN_EMAIL' && (normalized.includes('admin@example.com') || normalized.includes('yourdomain.com'))) {
    return true;
  }

  if (key === 'ADMIN_PASSWORD' && (normalized.includes('changeme') || normalized.includes('replacewith') || normalized.includes('password'))) {
    return true;
  }

  if (key === 'SMTP_FROM' && normalized.includes('yourdomain')) {
    return true;
  }

  if (key === 'DATABASE_URL' && normalized.includes('postgresql://') && normalized.includes('example.internal')) {
    return true;
  }

  return placeholderPatterns.some((fragment) => normalized.includes(fragment));
}

const generated = [];
const existing = [];
const aliasMap = new Map([
  ['COOKIE_SECRET', 'COOKIE_SIGNING_KEY'],
]);
let newContent = envContent;

Object.entries(secrets).forEach(([key, generator]) => {
  const existingValue = existingKeys.get(key) ?? (() => {
    const alias = aliasMap.get(key);
    return alias ? existingKeys.get(alias) : undefined;
  })();

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
  console.log('✓ Generated or bootstrapped secrets:');
  generated.forEach((k) => console.log(`  - ${k}`));
}

if (existing.length > 0) {
  console.log('✓ Preserved existing secrets:');
  existing.forEach((k) => console.log(`  - ${k}`));
}

if (generated.length === 0 && existing.length === 0) {
  console.log('ℹ No secrets to generate');
} else {
  console.log(`\n✓ Environment file updated: ${envPath}`);
}

process.exit(0);
