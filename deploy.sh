#!/bin/bash
set -euo pipefail

echo "==> Pulling latest code"
git pull origin main

echo "==> Running deployment validation"
node scripts/predeploy.mjs --skip-env-check

echo "==> Installing dependencies"
npm install --no-audit --no-fund

echo "==> Building all workspaces"
npm run build --workspace=artifacts/api-server
npm run build --workspace=artifacts/nextrade
npm run build --workspace=artifacts/admin-portal

echo "==> Running database migrations"
cd artifacts/api-server && npx prisma migrate deploy && cd ../.. || true

echo "==> Reloading API with PM2 (zero-downtime)"
pnpm run pm2:install || true
pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

echo "==> Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx || true

echo "==> Health check"
sleep 5
curl --fail http://127.0.0.1:${PORT:-3000}/healthz || (pm2 rollback xpressfx-api && exit 1)

echo "==> Deployment complete"