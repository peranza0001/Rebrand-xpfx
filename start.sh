#!/bin/bash
# XpressPro FX — Universal Production Start Script
# Works on any Linux/macOS system, VPS, or container.
#
# Usage:
#   bash start.sh                    # build API + start
#   BUILD_ALL=true bash start.sh     # build API + frontends + start (single-service)
#
set -euo pipefail

echo ""
echo "======================================"
echo " XpressPro FX — Production Start"
echo " $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================"
echo ""

# Load .env file if it exists (local/VPS usage)
if [ -f "/etc/xpressfx.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/xpressfx.env
  set +a
  echo "[env] Loaded /etc/xpressfx.env"
elif [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  echo "[env] Loaded .env"
fi

export PORT="${PORT:-8080}"
RUN_NODE_ENV="${NODE_ENV:-production}"
export NODE_ENV="$RUN_NODE_ENV"

# Ensure a usable port value
PORT_INT="${PORT}"
if ! [[ "$PORT_INT" =~ ^[0-9]+$ ]]; then
  echo "[warn] Invalid PORT '$PORT_INT', falling back to 3000" >&2
  PORT_INT=3000
fi
export PORT="$PORT_INT"

echo "[config] PORT=${PORT}  NODE_ENV=${NODE_ENV}"

# Validate required env vars before building
if [ -z "${SESSION_SECRET:-}" ] && [ "$RUN_NODE_ENV" = "production" ]; then
  echo "[warn] SESSION_SECRET not set; using a temporary fallback for local/VPS startup" >&2
  export SESSION_SECRET="${SESSION_SECRET:-xpresspro-fx-temporary-secret}"
fi

# Clean stale processes on the chosen port when running locally or on a VPS
if command -v lsof >/dev/null 2>&1; then
  echo "[cleanup] Removing existing listeners on port ${PORT}..."
  lsof -ti tcp:"$PORT" | xargs -r kill -9 || true
elif command -v fuser >/dev/null 2>&1; then
  echo "[cleanup] Removing existing listeners on port ${PORT}..."
  fuser -k "$PORT"/tcp >/dev/null 2>&1 || true
fi

# Install dependencies
echo ""
echo "[install] Running npm install with development dependencies..."
# Ensure devDependencies (like TypeScript) are available when running locally or on a VPS
npm install --include=dev --legacy-peer-deps --no-audit --no-fund

echo ""
echo "[predeploy] Running deployment validation..."
node scripts/predeploy.mjs --skip-env-check

# Build API server
echo ""
echo "[build] Building API server..."
npm run build --workspace=artifacts/api-server

# Optionally build frontend apps (single-service mode)
if [ "${BUILD_ALL:-false}" = "true" ]; then
  echo ""
  echo "[build] Building NeXTrade frontend..."
  npm run build --workspace=artifacts/nextrade
  echo "[build] Building admin portal..."
  npm run build --workspace=artifacts/admin-portal
fi

export NODE_ENV="$RUN_NODE_ENV"

echo ""
echo "[start] Starting API server on port ${PORT}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
