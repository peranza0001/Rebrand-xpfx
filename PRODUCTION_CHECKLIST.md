# XpressPro FX — Production Deployment Checklist

> **Status**: Enterprise-grade deployment guide for real users and financial transactions.
> **Last Updated**: 2024
> **Audience**: DevOps, Security, and Infrastructure teams

---

## 🔐 SECURITY PREREQUISITES

### Encryption & Secrets Management

- [ ] **Wallet Encryption** — Generate and securely store `WALLET_ENCRYPTION_KEY`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  - Store in vault (Render Secrets, Railway Secrets, Kubernetes secrets, HashiCorp Vault)
  - Never commit to repo or logs
  - Rotate annually or on key compromise

- [ ] **Session Secret** — Generate strong session signing key:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```
  - Use different secret per environment (dev/staging/prod)
  - Rotate on active session compromise (forces re-login)

- [ ] **JWT Secret** (if JWT auth is enabled):
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```
  - Optional but recommended for API-to-API or mobile clients
  - Keep separate from SESSION_SECRET

- [ ] **API Keys** (all external integrations):
  - Alchemy / Infura (blockchain provider)
  - SendGrid / SMTP credentials (email)
  - MoonPay (on-ramp)
  - Coinbase Commerce (payments)
  - OpenAI (AI features)
  - Store in platform secrets manager, never in code

### Admin Account Provisioning

- [ ] **Admin Email & Password** — Set unique, strong credentials:
  - `ADMIN_EMAIL`: Use dedicated ops email (not personal)
  - `ADMIN_PASSWORD`: 16+ chars, mixed case, numbers, symbols
  - Enable 2FA on the admin email account
  - Store password in encrypted team vault (1Password, Bitwarden)

- [ ] **Admin Notification Email** (optional but recommended):
  - Set `ADMIN_NOTIFY_EMAIL` to a separate monitored inbox
  - Receives critical alerts (failed deployments, security events)

### CORS Configuration (Multi-Deployment)

- [ ] **Railway / Render / VPS** — Set `ALLOWED_ORIGINS`:
  ```env
  ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
  ```
  - Fail-closed if not set (all cross-origin requests denied)
  - Include admin portal and all frontend subdomains
  - Use full `https://` URLs, not bare hostnames

- [ ] **Development** — Leave `ALLOWED_ORIGINS` unset:
  - `NODE_ENV=development` allows all origins by default
  - This makes local development easier

- [ ] **Replit** — Automatic:
  - Replit sets `REPLIT_DOMAINS` automatically
  - `ALLOWED_ORIGINS` takes precedence when set

---

## 🗄️ DATABASE & PERSISTENCE

### PostgreSQL Setup

- [ ] **Create Dedicated Database**:
  - Railway: Add PostgreSQL service (auto-sets `DATABASE_URL`)
  - Render: Create PostgreSQL service
  - Supabase: Create project (provides `postgres://` URL)
  - Self-hosted: Use managed PostgreSQL (RDS, DigitalOcean, Linode)

- [ ] **Connection String Format**:
  ```
  DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
  ```
  - Always use `sslmode=require` in production
  - Store in platform secrets, not `.env`

- [ ] **Apply Drizzle Schema**:
  ```bash
  # From workspace root:
  DATABASE_URL=postgres://... npm run db:push
  
  # Or from lib/db:
  cd lib/db
  DATABASE_URL=postgres://... npx drizzle-kit push --config drizzle.config.ts
  ```
  - Run once per deployment environment
  - Safe to re-run (schema-push is idempotent)

- [ ] **Database Backups**:
  - Enable automated backups (7-30 days retention)
  - Railway / Render / Supabase: Built-in backup features
  - Test restore procedure quarterly
  - Document recovery runbook

- [ ] **Database Monitoring**:
  - Monitor connection count (Railway/Render dashboards)
  - Alert on slow queries (>1s)
  - Monitor disk usage and scaling triggers

### In-Memory Fallback

- [ ] **Without `DATABASE_URL`**:
  - Server runs in-memory-only mode
  - Data is lost on restart/redeploy
  - Acceptable for staging/demo; **unacceptable for production**

- [ ] **Hydration on Startup**:
  - Server loads database state into memory on boot
  - Non-fatal if DB is unreachable (logs warning, continues in-memory)
  - Monitor logs for hydration failures

---

## 📬 EMAIL PROVIDERS

### SendGrid (Preferred)

- [ ] **Configure SendGrid**:
  - Create SendGrid account (sendgrid.com)
  - Generate API key with "Mail Send" permission
  - Set `SENDGRID_API_KEY` in production secrets
  - Update `SMTP_FROM` to your verified sender identity

- [ ] **Sender Domain Verification**:
  - SendGrid: Verify domain in "Sender Authentication"
  - Improves deliverability (DKIM, SPF, DMARC)

- [ ] **Monitor Email Delivery**:
  - SendGrid dashboard: Activity, bounces, unsubscribes
  - Alert on high bounce rate (>5%)

### SMTP Fallback

- [ ] **When SendGrid is Not Available**:
  - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Recommended: Gmail, AWS SES, or your mail provider
  - `SMTP_PORT`: Typically 587 (TLS) or 465 (SSL)

- [ ] **Gmail (Testing Only)**:
  - Generate [App Password](https://myaccount.google.com/apppasswords)
  - Not recommended for production (rate limits)

- [ ] **AWS SES**:
  - Economical at scale
  - Requires domain verification
  - Higher limits than Gmail

### Email Monitoring

- [ ] **Transactional Emails**:
  - OTP delivery (login, password reset)
  - Admin alerts
  - Support tickets

- [ ] **Alerts**:
  - Monitor bounce rate (>5% = investigate)
  - Monitor delivery latency (>5s = investigate)
  - Track failed sends (logs + dashboard)

---

## 💳 BLOCKCHAIN & PAYMENT PROVIDERS

### Alchemy / Infura (Blockchain Provider)

- [ ] **Choose One**:
  - Alchemy (recommended): Better performance, developer experience
  - Infura: Stable, established
  - Falls back to ethers public provider if not set (rate-limited)

- [ ] **Setup**:
  - Create account and API key
  - Set `ALCHEMY_API_KEY` or `INFURA_API_KEY`
  - Test with `GET /api/assets/price` endpoint

- [ ] **Monitoring**:
  - Track RPC call latency
  - Alert on rate limit errors (429)
  - Monitor balance if using shared public provider

### MoonPay (On-Ramp / Off-Ramp)

- [ ] **Production Setup**:
  - Create MoonPay Business Account
  - Generate live API credentials (`MOONPAY_API_KEY`, `MOONPAY_SECRET_KEY`)
  - **Security**: Secret key is required in production (validates checkout URL signatures)
  - Missing secret key + live API key = **Critical vulnerability** (rejects at startup)

- [ ] **Webhook Configuration**:
  - Set webhook endpoint to `https://yourdomain.com/api/webhook/moonpay`
  - Generate webhook secret (`MOONPAY_WEBHOOK_SECRET`)
  - Verify webhook signature before processing

- [ ] **Sandbox Testing**:
  - If credentials are missing, API calls use sandbox URLs automatically
  - Acceptable for dev/demo

- [ ] **Unsupported Regions**:
  - Override with `MOONPAY_UNSUPPORTED_COUNTRIES` JSON array
  - Example: `["KP","IR","SY"]` (North Korea, Iran, Syria)

### Coinbase Commerce (Payments)

- [ ] **Optional Integration**:
  - Create Coinbase Commerce account
  - Generate API key (`COINBASE_API_KEY`, `COINBASE_API_SECRET`)
  - Set webhook secret (`COINBASE_WEBHOOK_SECRET`)

- [ ] **Webhook Endpoint**:
  - `https://yourdomain.com/api/webhook/coinbase`

---

## 🤖 AI INTEGRATIONS

### OpenAI (Chat / Live Chat)

- [ ] **Optional but Recommended**:
  - Create OpenAI API account
  - Generate API key (`AI_INTEGRATIONS_OPENAI_API_KEY`)
  - Set custom base URL if using Azure OpenAI (`AI_INTEGRATIONS_OPENAI_BASE_URL`)

- [ ] **Graceful Degradation**:
  - If key is missing, live-chat falls back to canned replies
  - No impact on core platform functionality

- [ ] **Rate Limiting**:
  - Monitor OpenAI usage dashboard
  - Set per-minute limits in production

---

## 🚀 DEPLOYMENT CONFIGURATION

### Build Artifacts

- [ ] **Frontend Build Mode** — Choose One:
  
  **Option A: Single-Service (API serves frontends)**
  ```bash
  BUILD_ALL=true npm run build:all
  npm run start  # Starts API with frontend bundles
  ```
  - Simpler deployment (one process)
  - Smaller footprint (Railway/Render free tier)
  - Set `BUILD_ALL=true` in production env

  **Option B: Separate Services (Recommended for Scale)**
  ```bash
  npm run build:api         # Builds /api only
  npm run build:frontend    # Builds frontends separately
  ```
  - Deploy API to Railway, Render, Fly, or VPS
  - Deploy frontends to Vercel, Netlify, or CDN
  - Better caching, separate scaling
  - Leave `BUILD_ALL` unset or `false`

- [ ] **Build Validation**:
  ```bash
  npm run predeploy  # Type-check, lint, validate
  ```
  - Run in CI before deployment
  - Prevents bad builds reaching production

- [ ] **Security audit**:
  ```bash
  npm run audit:ci
  ```
  - Run before any production release
  - Fail on high or critical dependency vulnerabilities

- [ ] **Operational readiness**:
  - Confirm `/health`, `/healthz`, `/readyz`, and `/metrics` are reachable in production.
  - Verify `ALLOWED_ORIGINS` contains all app and admin origins.
  - Confirm incident handling: alert routing, rollback process, and post-mortem documentation.

### Platform-Specific Deployment

#### Railway

```bash
# 1. Create account and connect GitHub repo
# 2. Add environment variables from .env.example
# 3. Add PostgreSQL service (auto-sets DATABASE_URL)
# 4. Railway auto-detects Node.js and runs start script

# Variables to set:
PORT=8080
NODE_ENV=production
SESSION_SECRET=(generate)
WALLET_ENCRYPTION_KEY=(generate)
ADMIN_EMAIL=(your email)
ADMIN_PASSWORD=(strong password)
ALLOWED_ORIGINS=https://yourapp.railway.app
```

#### Render

```bash
# 1. Create account at render.com
# 2. New Web Service > Connect GitHub repo
# 3. Build Command:
npm install -g pnpm && node build.js

# 4. Start Command:
node artifacts/api-server/dist/index.mjs

# 5. Environment Variables: (same as Railway)

# 6. Add PostgreSQL (Render Redis optional)
```

#### Fly.io

```bash
# 1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
# 2. Initialize Fly app:
fly launch

# 3. Set secrets:
fly secrets set WALLET_ENCRYPTION_KEY=(generate)
fly secrets set SESSION_SECRET=(generate)
fly secrets set ADMIN_EMAIL=(your email)
fly secrets set ADMIN_PASSWORD=(strong password)

# 4. Deploy:
fly deploy
```

#### VPS (Ubuntu / Debian)

```bash
# 1. SSH into server
ssh user@vps.example.com

# 2. Install dependencies
apt update && apt install -y nodejs npm git postgresql-client
npm install -g pnpm pm2

# 3. Clone repo
git clone https://github.com/your-org/your-repo /var/www/xpressfx
cd /var/www/xpressfx

# 4. Configure environment
cp .env.example /etc/xpressfx.env
nano /etc/xpressfx.env  # Fill in values

# 5. Build
node build.js

# 6. Start with PM2
pm2 start artifacts/api-server/dist/index.mjs --name xpressfx --instances max
pm2 save
pm2 startup
systemctl restart pm2-root

# 7. (Optional) Nginx reverse proxy with SSL
# See NGINX_SETUP.md

# 8. Monitor
pm2 logs xpressfx
pm2 monit
```

---

## 🔍 MONITORING & OBSERVABILITY

### Application Logging

- [ ] **Log Level**:
  - Production: `LOG_LEVEL=info` (default)
  - Staging: `LOG_LEVEL=debug` (more verbose)
  - Never use `trace` in production (too verbose)

- [ ] **Log Destinations**:
  - Railway / Render: Built-in log viewer
  - VPS: Write to `/var/log/xpressfx.log` (configure PM2)
  - Aggregation: DataDog, Loggly, or Papertrail

- [ ] **Critical Alerts**:
  - `[crash-guard] uncaughtException`
  - `[crash-guard] unhandledRejection`
  - `[admin] No admin account provisioned`
  - Database hydration failures

### Health Checks

- [ ] **Implement Health Endpoint** (add to app.ts):
  ```typescript
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });
  ```
  - Railway / Render / Fly: Enable health check in dashboard
  - Point to `/health`
  - Failure count: 3, timeout: 5s

### Performance Metrics

- [ ] **Response Time**:
  - Alert if p95 > 500ms
  - Alert if p99 > 2s

- [ ] **Error Rate**:
  - Alert if >1% of requests return 5xx
  - Track by endpoint

- [ ] **Database**:
  - Monitor connection pool usage
  - Alert if connections exceed 80% of max

### Uptime Monitoring

- [ ] **Synthetic Monitoring**:
  - Ping health endpoint every 60s
  - Alert if down for >2 consecutive checks
  - Recommended: Uptime Robot (free), Better Stack, Datadog

---

## 🛡️ SECURITY HARDENING

### HTTPS / TLS

- [ ] **Mandatory in Production**:
  - Railway / Render: Free SSL via Let's Encrypt
  - VPS: Use Certbot (Let's Encrypt) + Nginx
  - Fly.io: Free automatic HTTPS
  - Redirect HTTP → HTTPS

- [ ] **HSTS Headers** (set in app.ts):
  ```typescript
  app.use(helmet.hsts({ maxAge: 31536000 }));  // 1 year
  ```

### Rate Limiting

- [ ] **Existing Implementation**:
  - `express-rate-limit` configured in app.ts
  - Default: 100 requests per 15 minutes per IP
  - IPv6 fix: `keyGeneratorIpFallback: false`

- [ ] **Adjust for Production Load**:
  ```typescript
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 500,                  // requests per window
    skip: (req) => req.ip === '127.0.0.1',  // Skip localhost
  });
  ```

### Content Security Policy (CSP)

- [ ] **Add CSP Headers**:
  ```typescript
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.alchemy.com", "https://api.openai.com"],
    },
  }));
  ```

### SQL Injection Prevention

- [ ] **Use Prepared Statements** (Already done with Drizzle):
  - Never concatenate SQL strings
  - Drizzle ORM prevents injection

- [ ] **Input Validation**:
  - All routes validate with Zod schemas (generated from OpenAPI)
  - No bare `process.env` access (use `lib/env.ts`)

### CSRF Protection

- [ ] **Session-Based CSRF** (Express sessions):
  - Cookies are `HttpOnly` and `Secure`
  - SameSite=Strict by default
  - CSRF tokens in forms (session middleware handles)

### Dependency Security

- [ ] **Audit Dependencies**:
  ```bash
  npm audit
  npm audit fix
  ```
  - Run before every production deployment
  - Enable Dependabot in GitHub settings

- [ ] **Locked Versions**:
  - Use `pnpm-lock.yaml` (committed)
  - Prevents supply-chain attacks

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Code Quality

- [ ] Run type check: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Run pre-deploy validation: `node scripts/predeploy.mjs`

### Environment Validation

- [ ] [ ] All required secrets set (never use dev values in prod)
- [ ] [ ] `NODE_ENV=production`
- [ ] [ ] `PORT` configured correctly
- [ ] [ ] `DATABASE_URL` points to production DB
- [ ] [ ] `SESSION_SECRET` is unique per environment
- [ ] [ ] `WALLET_ENCRYPTION_KEY` is set and valid (64 hex chars)
- [ ] [ ] `ADMIN_EMAIL` and `ADMIN_PASSWORD` are unique
- [ ] [ ] `ALLOWED_ORIGINS` includes all frontend domains

### Database

- [ ] [ ] PostgreSQL service provisioned
- [ ] [ ] Connection string tested
- [ ] [ ] Drizzle schema applied: `DATABASE_URL=... npm run db:push`
- [ ] [ ] Backups enabled
- [ ] [ ] Restore test passed

### Integrations

- [ ] [ ] SendGrid / SMTP email provider configured
- [ ] [ ] Alchemy / Infura blockchain provider configured
- [ ] [ ] MoonPay credentials (if on-ramp is enabled)
- [ ] [ ] OpenAI key (if AI features are enabled)
- [ ] [ ] Webhook endpoints registered

### Deployment

- [ ] [ ] Build artifacts created: `npm run build:all`
- [ ] [ ] No build warnings or errors
- [ ] [ ] Build size reasonable (<200MB total)
- [ ] [ ] Start script tested locally
- [ ] [ ] Graceful shutdown tested (SIGTERM handling)

### Monitoring

- [ ] [ ] Health check endpoint working
- [ ] [ ] Logs being collected
- [ ] [ ] Error alerting configured
- [ ] [ ] Uptime monitoring configured

### Documentation

- [ ] [ ] Deployment runbook created
- [ ] [ ] Rollback procedure documented
- [ ] [ ] Emergency contacts listed
- [ ] [ ] Secrets rotation schedule documented

---

## 🚨 INCIDENT RESPONSE

### Application Won't Start

```bash
# Check logs
pm2 logs xpressfx  # On VPS
fly logs            # On Fly.io

# Common issues:
# 1. PORT not set → set PORT env var
# 2. DATABASE_URL missing → data lost, but server continues in-memory
# 3. WALLET_ENCRYPTION_KEY invalid → production startup fails
# 4. MOONPAY secrets mismatch → startup fails
# 5. Admin account misconfigured → warning only, continues
```

### Database Connection Failures

```bash
# Test connection
psql "postgres://user:pass@host:5432/dbname?sslmode=require"

# If connection fails:
# 1. Check hostname and credentials
# 2. Verify firewall allows connection
# 3. Verify DB is running and healthy
# 4. Check connection pool (may be exhausted)
```

### Performance Degradation

```bash
# Check metrics
pm2 monit            # CPU, memory usage
fly scale show       # Memory allocation

# Common causes:
# 1. Connection pool exhausted → increase max connections
# 2. Memory leak → check recent changes, restart
# 3. Slow DB queries → check query logs, add indexes
# 4. High CPU → check for infinite loops, add more instances
```

### Security Breach Response

1. **Revoke compromised keys immediately**:
   - Regenerate `SESSION_SECRET` → forces re-login
   - Regenerate `WALLET_ENCRYPTION_KEY` → re-encrypt all wallets
   - Update admin password → notify admins

2. **Audit logs for unusual activity**:
   - Check deployment logs
   - Check application logs for unauthorized access
   - Review database access logs

3. **Notify affected users** (if PII compromised)

---

## 📋 MAINTENANCE SCHEDULE

| Task | Frequency | Owner |
|------|-----------|-------|
| Security audit (npm audit) | Weekly | DevOps |
| Database backup verification | Monthly | DBA |
| SSL certificate renewal | Auto (Let's Encrypt) | Platform |
| Secret rotation (SESSION_SECRET) | Quarterly | Ops |
| Wallet encryption key rotation | Annually | Security |
| Dependency updates | Monthly | Dev |
| Load testing | Quarterly | QA |
| Disaster recovery drill | Semi-annually | Ops |

---

## 📞 SUPPORT & ESCALATION

**Production Support Contacts**:
- On-call engineer: See PagerDuty / escalation policy
- Security incidents: security@yourdomain.com
- Database issues: dba@yourdomain.com

**Documentation**:
- Runbook: /docs/runbook.md
- Troubleshooting: /docs/troubleshooting.md
- Architecture: /docs/architecture.md

---

## ✨ SUCCESS CRITERIA

✅ Server starts cleanly with `NODE_ENV=production`
✅ Admin portal accessible at `/xpadmin`
✅ All external integrations (email, blockchain, payments) working
✅ Database persisting data across restarts
✅ Health check endpoint responding
✅ Logs aggregated and monitored
✅ HTTPS working with valid certificate
✅ Rate limiting preventing abuse
✅ Graceful shutdown handling SIGTERM
✅ Team trained on runbooks and escalation
