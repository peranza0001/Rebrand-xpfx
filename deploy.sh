#!/bin/bash
set -euo pipefail

echo "==> Pulling latest code"
git pull origin main

echo "==> Running deployment validation"
node scripts/predeploy.mjs --skip-env-check

echo "==> Installing dependencies"
npm install --workspaces

echo "==> Building all workspaces"
npm run build --workspace=artifacts/api-server
npm run build --workspace=artifacts/nextrade
npm run build --workspace=artifacts/admin-portal

echo "==> Running database migrations"
cd artifacts/api-server && npx prisma migrate deploy && cd ../..

echo "==> Copying frontend builds"
cp -r artifacts/nextrade/dist /var/www/xpresspro/nextrade
cp -r artifacts/admin-portal/dist /var/www/xpresspro/admin-portal

echo "==> Reloading API with PM2 (zero-downtime)"
npm install -g pm2 || true
pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

echo "==> Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "==> Health check"
sleep 5
curl --fail http://127.0.0.1:${PORT:-8080}/healthz || (pm2 rollback xpresspro-api && exit 1)

echo "==> Deployment complete"