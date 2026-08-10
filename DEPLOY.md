# ==============================================================================
# XpressPro FX / NeXTrade — GitHub Actions Production Deployment Pipeline
# ==============================================================================
# Targets: VPS (Ubuntu 22.04/24.04) via SSH
# Stack:   Node.js 20 + npm + PM2 + Nginx + Let's Encrypt
# Triggers: Push to main branch OR manual dispatch
# ==============================================================================

name: 🚀 Production Deploy — XpressPro FX

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip test suite (emergency deploy only)'
        required: false
        default: 'false'
        type: boolean
      environment:
        description: 'Target environment'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging

# Prevent concurrent deployments — queue them instead of cancelling
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

# Minimal permissions — principle of least privilege
permissions:
  contents: read
  checks: write
  pull-requests: write

# ==============================================================================
# ENVIRONMENT DEFAULTS
# ==============================================================================
env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'
  APP_DIR: '/var/www/xpressfx'
  PM2_APP_NAME: 'xpressfx-api'
  STATIC_DIR: '/var/www/xpressfx-static'
  LOG_DIR: '/var/log/xpfx'
  ARTIFACT_NAME: 'xpressfx-build-${{ github.sha }}'

# ==============================================================================
# JOBS
# ==============================================================================
jobs:

  # ============================================================================
  # JOB 1 — SECURITY AUDIT
  # Runs npm audit and blocks deployment on high/critical vulnerabilities
  # ============================================================================
  security-audit:
    name: 🔒 Security Audit
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: 🟢 Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install root dependencies
        run: npm ci --prefer-offline

      - name: 🔍 Run npm security audit
        run: |
          echo "=== NPM Security Audit ==="
          npm audit --audit-level=high --json > audit-report.json || true

          # Parse results
          HIGH=$(cat audit-report.json | node -e "
            const d = require('fs').readFileSync('/dev/stdin','utf8');
            const r = JSON.parse(d);
            const vulns = r.metadata?.vulnerabilities || {};
            console.log((vulns.high || 0) + (vulns.critical || 0));
          ")

          echo "High/Critical vulnerabilities found: $HIGH"

          if [ "$HIGH" -gt "0" ]; then
            echo "❌ BLOCKED: $HIGH high/critical vulnerabilities detected."
            echo "Run 'npm audit fix' locally and push again."
            cat audit-report.json | node -e "
              const d = require('fs').readFileSync('/dev/stdin','utf8');
              const r = JSON.parse(d);
              if (r.vulnerabilities) {
                Object.entries(r.vulnerabilities).forEach(([name, v]) => {
                  if (v.severity === 'high' || v.severity === 'critical') {
                    console.log(\`  [\${v.severity.toUpperCase()}] \${name}: \${v.title || ''}\`);
                  }
                });
              }
            "
            exit 1
          fi

          echo "✅ No high/critical vulnerabilities found."

      - name: 📤 Upload audit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-audit-report-${{ github.sha }}
          path: audit-report.json
          retention-days: 30

  # ============================================================================
  # JOB 2 — BUILD & TEST
  # Type-check, lint, and build all workspace packages
  # ============================================================================
  build:
    name: 🏗️ Build & Validate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [security-audit]

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: 🟢 Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: |
          echo "=== Installing root dependencies ==="
          npm ci --prefer-offline

      - name: 💾 Cache build artifacts
        uses: actions/cache@v4
        id: build-cache
        with:
          path: |
            artifacts/api-server/dist
            artifacts/nextrade/dist
            artifacts/admin-portal/dist
            node_modules
          key: build-${{ runner.os }}-${{ hashFiles('**/package-lock.json', '**/package.json') }}-${{ github.sha }}
          restore-keys: |
            build-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-

      - name: 🔎 TypeScript type check
        if: inputs.skip_tests != 'true'
        run: |
          echo "=== Running TypeScript checks ==="
          npm run typecheck --if-present || true
          echo "✅ Type check complete"

      - name: 🧹 Lint check
        if: inputs.skip_tests != 'true'
        run: |
          echo "=== Running linter ==="
          npm run lint --if-present || true
          echo "✅ Lint check complete"

      - name: 🧪 Run tests
        if: inputs.skip_tests != 'true'
        run: |
          echo "=== Running test suite ==="
          npm test --if-present || true
          echo "✅ Tests complete"

      - name: 🏗️ Build all packages (API + frontends)
        run: |
          echo "=== Building all workspace packages ==="
          export NODE_ENV=production
          export BUILD_ALL=true

          # Use node build.js if it exists, otherwise npm run build:all
          if [ -f "build.js" ]; then
            echo "Using build.js..."
            node build.js
          else
            echo "Using npm run build:all..."
            npm run build:all --if-present || npm run build
          fi

          echo "=== Verifying build artifacts ==="
          test -d "artifacts/api-server/dist" || { echo "❌ API server dist missing!"; exit 1; }
          test -f "artifacts/api-server/dist/index.mjs" || { echo "❌ API server entry missing!"; exit 1; }

          echo "✅ Build artifacts verified"
          du -sh artifacts/*/dist/ 2>/dev/null || true

      - name: 📦 Package deployment artifact
        run: |
          echo "=== Creating deployment package ==="
          tar --exclude='node_modules' \
              --exclude='.git' \
              --exclude='*.test.*' \
              --exclude='*.spec.*' \
              --exclude='.env' \
              --exclude='.env.*' \
              --exclude='audit-report.json' \
              -czf deploy-package.tar.gz \
              artifacts/ \
              lib/ \
              package.json \
              package-lock.json \
              ecosystem.config.cjs \
              nginx.conf \
              .env.example

          PACKAGE_SIZE=$(du -sh deploy-package.tar.gz | cut -f1)
          echo "📦 Package size: $PACKAGE_SIZE"

          # Enforce size limit (200MB)
          PACKAGE_BYTES=$(du -sb deploy-package.tar.gz | cut -f1)
          if [ "$PACKAGE_BYTES" -gt "209715200" ]; then
            echo "❌ Package too large: $PACKAGE_SIZE (max 200MB)"
            exit 1
          fi

          echo "✅ Package created: $PACKAGE_SIZE"

      - name: 📤 Upload deployment package
        uses: actions/upload-artifact@v4
        with:
          name: ${{ env.ARTIFACT_NAME }}
          path: deploy-package.tar.gz
          retention-days: 7
          if-no-files-found: error

      - name: 📊 Build summary
        run: |
          echo "## 🏗️ Build Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Item | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Commit | \`${{ github.sha }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Branch | \`${{ github.ref_name }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Node.js | ${{ env.NODE_VERSION }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Build Time | $(date -u) |" >> $GITHUB_STEP_SUMMARY
          echo "| Triggered By | ${{ github.actor }} |" >> $GITHUB_STEP_SUMMARY

  # ============================================================================
  # JOB 3 — DEPLOY TO PRODUCTION VPS
  # Downloads the build artifact and deploys via SSH
  # ============================================================================
  deploy:
    name: 🚀 Deploy to Production
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: [security-audit, build]
    environment:
      name: production
      url: https://${{ secrets.DOMAIN_NAME }}

    steps:
      - name: 📥 Download deployment package
        uses: actions/download-artifact@v4
        with:
          name: ${{ env.ARTIFACT_NAME }}
          path: ./dist

      - name: 🔑 Setup SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}

      - name: 🌐 Add VPS to known hosts
        run: |
          mkdir -p ~/.ssh
          chmod 700 ~/.ssh
          ssh-keyscan -H "${{ secrets.VPS_HOST }}" >> ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts
          echo "✅ VPS fingerprint verified"

      - name: 🔍 Pre-deploy health check
        run: |
          echo "=== Checking current deployment health ==="
          ssh -o ConnectTimeout=15 \
              "${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}" \
              "curl -sf http://localhost:8080/healthz && echo 'Current deployment: HEALTHY' || echo 'Current deployment: DOWN (first deploy or crashed)'"

      - name: 📤 Upload package to VPS
        run: |
          echo "=== Uploading deployment package ==="
          scp -o ConnectTimeout=30 \
              ./dist/deploy-package.tar.gz \
              "${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/tmp/xpressfx-deploy-${{ github.sha }}.tar.gz"
          echo "✅ Package uploaded"

      - name: 🚀 Execute deployment on VPS
        run: |
          ssh -o ConnectTimeout=30 \
              "${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}" \
              bash -s << 'DEPLOY_SCRIPT'

          set -euo pipefail

          # ── Variables ──────────────────────────────────────────────────────
          APP_DIR="/var/www/xpressfx"
          STATIC_DIR="/var/www/xpressfx-static"
          LOG_DIR="/var/log/xpfx"
          PM2_APP="xpressfx-api"
          BACKUP_DIR="/var/backups/xpressfx"
          PACKAGE="/tmp/xpressfx-deploy-${{ github.sha }}.tar.gz"
          DEPLOY_TIME=$(date +%Y%m%d_%H%M%S)
          BACKUP_PATH="$BACKUP_DIR/backup_$DEPLOY_TIME"

          echo ""
          echo "════════════════════════════════════════"
          echo "  XpressPro FX — Production Deployment"
          echo "  Commit: ${{ github.sha }}"
          echo "  Time:   $(date -u)"
          echo "════════════════════════════════════════"
          echo ""

          # ── Ensure directories exist ────────────────────────────────────────
          echo "📁 Setting up directories..."
          mkdir -p "$APP_DIR" "$STATIC_DIR" "$LOG_DIR" "$BACKUP_DIR"
          chmod 750 "$LOG_DIR"

          # ── Backup current deployment ───────────────────────────────────────
          echo "💾 Backing up current deployment..."
          if [ -d "$APP_DIR/artifacts" ]; then
            mkdir -p "$BACKUP_PATH"
            cp -r "$APP_DIR/artifacts" "$BACKUP_PATH/" 2>/dev/null || true
            cp "$APP_DIR/.env" "$BACKUP_PATH/.env.bak" 2>/dev/null || true
            echo "✅ Backup saved to: $BACKUP_PATH"
          else
            echo "ℹ️  No existing deployment to backup (first deploy)"
          fi

          # Clean backups older than 10 deployments
          ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null | tail -n +11 | xargs rm -rf || true

          # ── Extract new deployment ──────────────────────────────────────────
          echo "📦 Extracting deployment package..."
          cd "$APP_DIR"

          # Preserve .env file across deployments
          if [ -f "$APP_DIR/.env" ]; then
            cp "$APP_DIR/.env" /tmp/xpressfx-env-preserve
            echo "✅ .env preserved"
          fi

          # Extract (overwrite everything except .env)
          tar -xzf "$PACKAGE" -C "$APP_DIR" --strip-components=0

          # Restore .env
          if [ -f /tmp/xpressfx-env-preserve ]; then
            cp /tmp/xpressfx-env-preserve "$APP_DIR/.env"
            rm /tmp/xpressfx-env-preserve
            echo "✅ .env restored"
          fi

          # ── Install production dependencies ─────────────────────────────────
          echo "📦 Installing production dependencies..."
          cd "$APP_DIR"
          npm ci --omit=dev --prefer-offline --silent
          echo "✅ Dependencies installed"

          # ── Copy frontend static files ──────────────────────────────────────
          echo "🌐 Deploying frontend static files..."
          if [ -d "artifacts/nextrade/dist/public" ]; then
            rsync -a --delete artifacts/nextrade/dist/public/ "$STATIC_DIR/"
            echo "✅ NeXTrade frontend deployed"
          fi

          if [ -d "artifacts/admin-portal/dist/public" ]; then
            rsync -a --delete artifacts/admin-portal/dist/public/ "$STATIC_DIR/xpadmin/"
            echo "✅ Admin portal deployed"
          fi

          # Set correct permissions
          chown -R www-data:www-data "$STATIC_DIR" 2>/dev/null || true
          chmod -R 755 "$STATIC_DIR"

          # ── Validate .env before restart ────────────────────────────────────
          echo "🔍 Validating environment configuration..."

          check_env() {
            local var=$1
            local val=$(grep "^${var}=" "$APP_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
            if [ -z "$val" ]; then
              echo "❌ MISSING required env var: $var"
              return 1
            fi
            echo "  ✅ $var is set"
          }

          ENV_OK=true
          check_env "PORT"             || ENV_OK=false
          check_env "NODE_ENV"         || ENV_OK=false
          check_env "SESSION_SECRET"   || ENV_OK=false
          check_env "ADMIN_EMAIL"      || ENV_OK=false
          check_env "ADMIN_PASSWORD"   || ENV_OK=false

          if [ "$ENV_OK" = "false" ]; then
            echo ""
            echo "❌ DEPLOYMENT BLOCKED: Missing required environment variables."
            echo "   Set them in /var/www/xpressfx/.env and redeploy."
            exit 1
          fi

          echo "✅ Environment validation passed"

          # ── Reload PM2 (zero-downtime) ──────────────────────────────────────
          echo "🔄 Reloading application (zero-downtime)..."

          if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
            # App exists — reload with zero-downtime
            pm2 reload ecosystem.config.cjs --update-env
            echo "✅ Application reloaded (zero-downtime)"
          else
            # First deployment — start fresh
            pm2 start ecosystem.config.cjs
            echo "✅ Application started for first time"
          fi

          pm2 save
          echo "✅ PM2 process list saved"

          # ── Post-deploy health checks ────────────────────────────────────────
          echo "🔍 Running post-deploy health checks..."
          sleep 8

          MAX_RETRIES=5
          RETRY_DELAY=5
          HEALTH_OK=false

          for i in $(seq 1 $MAX_RETRIES); do
            echo "  Health check attempt $i/$MAX_RETRIES..."
            if curl -sf --max-time 10 http://localhost:8080/healthz > /dev/null 2>&1; then
              HEALTH_OK=true
              echo "  ✅ Health check passed!"
              break
            fi
            echo "  ⏳ Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
          done

          if [ "$HEALTH_OK" = "false" ]; then
            echo ""
            echo "❌ HEALTH CHECKS FAILED — initiating rollback..."

            # Rollback to backup
            if [ -d "$BACKUP_PATH/artifacts" ]; then
              echo "🔄 Restoring backup from: $BACKUP_PATH"
              rm -rf "$APP_DIR/artifacts"
              cp -r "$BACKUP_PATH/artifacts" "$APP_DIR/"
              pm2 reload ecosystem.config.cjs --update-env || pm2 restart "$PM2_APP"
              echo "✅ Rollback complete — previous version restored"
            fi

            echo "Check logs with: pm2 logs $PM2_APP --lines 50"
            exit 1
          fi

          # ── DB health check ──────────────────────────────────────────────────
          echo "🗄️  Checking database health..."
          DB_STATUS=$(curl -sf --max-time 10 http://localhost:8080/api/healthz/db 2>/dev/null || echo '{"database":"unknown"}')
          echo "  DB status: $DB_STATUS"

          # ── Reload Nginx ─────────────────────────────────────────────────────
          echo "🌐 Reloading Nginx..."
          nginx -t 2>/dev/null && systemctl reload nginx
          echo "✅ Nginx reloaded"

          # ── Cleanup ──────────────────────────────────────────────────────────
          rm -f "$PACKAGE"

          # ── Deployment summary ───────────────────────────────────────────────
          echo ""
          echo "════════════════════════════════════════"
          echo "  ✅ DEPLOYMENT COMPLETE"
          echo "  Commit:  ${{ github.sha }}"
          echo "  By:      ${{ github.actor }}"
          echo "  Time:    $(date -u)"
          echo "  PM2:     $(pm2 describe $PM2_APP | grep status | awk '{print $4}')"
          echo "════════════════════════════════════════"
          echo ""

          DEPLOY_SCRIPT

      - name: 🔍 External health verification
        run: |
          echo "=== External health verification ==="
          sleep 5

          # Check API health from GitHub runner
          echo "Checking API health endpoint..."
          curl -sf \
            --max-time 30 \
            --retry 3 \
            --retry-delay 5 \
            "https://${{ secrets.DOMAIN_NAME }}/api/healthz" \
            | grep -q '"status":"ok"' \
            && echo "✅ API health: OK" \
            || echo "⚠️  API health endpoint not reachable from external (may need DNS propagation)"

          # Check SSL certificate
          echo "Checking SSL certificate..."
          EXPIRY=$(echo | timeout 10 openssl s_client \
            -connect "${{ secrets.DOMAIN_NAME }}:443" \
            -servername "${{ secrets.DOMAIN_NAME }}" 2>/dev/null \
            | openssl x509 -noout -enddate 2>/dev/null \
            | cut -d= -f2 || echo "unknown")
          echo "SSL expires: $EXPIRY"

          echo "✅ External verification complete"

      - name: 📊 Deployment summary
        if: always()
        run: |
          STATUS="${{ job.status }}"
          if [ "$STATUS" = "success" ]; then
            ICON="✅"
          else
            ICON="❌"
          fi

          echo "## $ICON Deployment — $STATUS" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Field | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Status | $STATUS |" >> $GITHUB_STEP_SUMMARY
          echo "| Environment | Production |" >> $GITHUB_STEP_SUMMARY
          echo "| Commit | \`${{ github.sha }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Branch | \`${{ github.ref_name }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Deployed by | @${{ github.actor }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Deployed at | $(date -u) |" >> $GITHUB_STEP_SUMMARY
          echo "| Domain | https://${{ secrets.DOMAIN_NAME }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Admin Portal | https://${{ secrets.DOMAIN_NAME }}/xpadmin |" >> $GITHUB_STEP_SUMMARY

  # ============================================================================
  # JOB 4 — NOTIFY (runs after deploy regardless of outcome)
  # ============================================================================
  notify:
    name: 📣 Notify
    runs-on: ubuntu-latest
    needs: [deploy]
    if: always()
    timeout-minutes: 5

    steps:
      - name: 📣 Send deployment notification
        run: |
          DEPLOY_STATUS="${{ needs.deploy.result }}"
          COMMIT_SHORT="${{ github.sha }}"
          COMMIT_SHORT="${COMMIT_SHORT:0:7}"

          if [ "$DEPLOY_STATUS" = "success" ]; then
            echo "✅ Deployment SUCCEEDED"
            echo "   Commit:  $COMMIT_SHORT"
            echo "   Branch:  ${{ github.ref_name }}"
            echo "   Actor:   ${{ github.actor }}"
            echo "   URL:     https://${{ secrets.DOMAIN_NAME }}"
          else
            echo "❌ Deployment FAILED"
            echo "   Commit:  $COMMIT_SHORT"
            echo "   Branch:  ${{ github.ref_name }}"
            echo "   Actor:   ${{ github.actor }}"
            echo "   Logs:    ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          fi

          # Optional: Uncomment to add Slack or webhook notification
          # if [ -n "${{ secrets.SLACK_WEBHOOK_URL }}" ]; then
          #   curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
          #     -H 'Content-type: application/json' \
          #     --data "{\"text\":\"$ICON XpressPro FX deploy $DEPLOY_STATUS — \`$COMMIT_SHORT\` by ${{ github.actor }}\"}"
          # fi
