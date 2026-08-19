# 🚀 Railway Deployment - Complete Step-by-Step Guide

**Status**: Ready for Immediate Deployment  
**Time Required**: 30-45 minutes  
**Platform**: Railway.app  

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before starting, verify you have:

- [ ] Railway account created (railway.app)
- [ ] GitHub repository connected to Railway
- [ ] PostgreSQL database instance provisioned
- [ ] All environment secrets generated (use script below)
- [ ] Production domain configured
- [ ] SSL certificate ready

---

## 🔑 STEP 1: Generate Production Secrets (5 min)

Run this once to generate all required secrets:

```bash
# Generate all secrets and save them
node -e "
const crypto = require('crypto');
const secrets = {
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_SECRET: crypto.randomBytes(32).toString('base64'),
  JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('base64'),
  CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
  COOKIE_SIGNING_KEY: crypto.randomBytes(32).toString('hex'),
  WALLET_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
};
console.log('=== COPY THESE SECRETS ===');
console.log(JSON.stringify(secrets, null, 2));
console.log('=== SAVE TO SECURE LOCATION ===');
" > secrets.json

# Display the secrets
cat secrets.json
```

**⚠️ IMPORTANT**: Save this file in a secure location (password manager, vault, etc). These are required for production.

---

## 🗄️ STEP 2: Database Setup (10 min)

### Option A: Railway PostgreSQL (Recommended)

```bash
# Create new PostgreSQL plugin in Railway dashboard
# 1. Go to railway.app/dashboard
# 2. Create new "PostgreSQL" plugin
# 3. Copy the connection string
# 4. Set DATABASE_URL below

# Verify connection
psql "postgresql://user:pass@host:5432/railway"

# You should see: psql (15.x, server 15.x)
```

### Option B: External PostgreSQL (DigitalOcean, AWS RDS, etc)

```bash
# Get your connection string:
# postgresql://username:password@host:port/database?sslmode=require

# Test the connection:
psql "your_connection_string"
```

---

## 🚀 STEP 3: Connect GitHub to Railway (5 min)

```bash
# If not already connected:
# 1. Go to railway.app/dashboard
# 2. Click "New Project"
# 3. Click "Deploy from GitHub"
# 4. Select your repository (trevionjamielynn800/Rebrand-xpfx)
# 5. Grant Railway access
# 6. Done!
```

---

## 📝 STEP 4: Set Environment Variables (10 min)

Via Railway Dashboard:

```bash
# Navigate to: Project → Settings → Environment
# Add these variables from your secrets.json:

SESSION_SECRET=<from secrets.json>
COOKIE_SECRET=<from secrets.json>
JWT_SECRET=<from secrets.json>
JWT_REFRESH_SECRET=<from secrets.json>
CSRF_SECRET=<from secrets.json>
COOKIE_SIGNING_KEY=<from secrets.json>
WALLET_ENCRYPTION_KEY=<from secrets.json>

# Production configuration:
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
ENABLE_DEMO_AUTH=false

# Database (from Step 2):
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require

# Network (UPDATE FOR YOUR DOMAIN):
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com

# Admin credentials (CHANGE AFTER FIRST LOGIN):
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-random-password>
```

---

## 🗂️ STEP 5: Database Migrations (5 min)

```bash
# SSH into Railway container or run:
npm run db:migrate:deploy

# Expected output:
# ✓ Ran 0 migrations
# ✓ Successfully synchronized Prisma schema with database

# Verify:
npm run db:check
# Expected: ✓ Database connection successful
```

---

## ✅ STEP 6: Deploy (Automatic)

```bash
# Push to main branch - Railway auto-deploys
git push origin main

# Railway builds and deploys automatically
# Monitor at: railway.app/project/[id]/deployments

# Expected build time: 5-10 minutes
# Status: Building → Deployed ✓
```

---

## 🔍 STEP 7: Verify Deployment (5 min)

```bash
# Check API health:
curl https://api.yourdomain.com/healthz
# Expected response: {"status":"ok","database":"connected"}

# Check CSRF token endpoint:
curl https://api.yourdomain.com/api/csrf-token
# Expected response: {"token":"..."}

# Check metrics:
curl https://api.yourdomain.com/metrics
# Expected response: Prometheus metrics

# View Railway logs:
railway logs --follow

# Expected final log:
# Server running on port 8080
# Database connected successfully
```

---

## 🚨 TROUBLESHOOTING

### Build Failure: "npm ERR!"

```bash
# Check build logs in Railway dashboard
# Common causes:
# 1. Missing dependencies: npm install
# 2. TypeScript errors: npm run type-check
# 3. Secrets missing: Verify all env vars set

# Retry:
git push origin main
```

### Database Connection Failed

```bash
# Verify DATABASE_URL is set:
railway env show DATABASE_URL

# Test connection directly:
psql "your_database_url"

# Check sslmode=require is in URL
# Common fix: Add ?sslmode=require to end
```

### API Responding 502 Bad Gateway

```bash
# Check container is running:
railway logs --follow

# Verify environment variables:
railway env show

# Check health endpoint:
curl -v https://api.yourdomain.com/healthz

# Restart deployment:
railway redeploy
```

### Port Already in Use

```bash
# Railway automatically assigns PORT=8080
# No action needed - it handles port mapping
```

---

## 📊 POST-DEPLOYMENT CHECKLIST

After successful deployment, verify:

```bash
✅ API responding: curl https://api.yourdomain.com/healthz
✅ Database connected: Check logs show "Database connected"
✅ Environment variables loaded: No errors in logs
✅ CORS configured: Test from frontend origin
✅ SSL/TLS working: https:// responds with valid cert
✅ Metrics endpoint: curl https://api.yourdomain.com/metrics
✅ Admin portal accessible: Log in with ADMIN_EMAIL/PASSWORD
✅ Rate limiting active: Make 31+ requests in 1 min, get 429
```

---

## 🔄 REDEPLOYMENT

To redeploy after code changes:

```bash
# Option 1: Automatic (recommended)
git commit -m "Your changes"
git push origin main
# Railway auto-deploys

# Option 2: Manual from Railway dashboard
# Project → Deployments → Redeploy latest

# Option 3: Via CLI
railway redeploy
```

---

## 🛡️ SECURITY AFTER DEPLOYMENT

```bash
# 1. Change admin password immediately:
curl -X POST https://api.yourdomain.com/api/admin/change-password \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"<default>","newPassword":"<new-strong-password>"}'

# 2. Verify HTTPS only:
curl -v http://api.yourdomain.com/healthz
# Expected: 301 redirect to https://

# 3. Check security headers:
curl -I https://api.yourdomain.com
# Expected: Strict-Transport-Security, Content-Security-Policy, etc.

# 4. Review admin logs:
curl https://api.yourdomain.com/api/admin/logs
# Expected: No suspicious activity
```

---

## 📈 MONITORING

### View Deployment Status
```bash
railway status
```

### View Logs (Real-time)
```bash
railway logs --follow
```

### View Metrics
```bash
curl https://api.yourdomain.com/metrics
```

### View Database Status
```bash
railway env show DATABASE_URL
```

---

## 🆘 SUPPORT RESOURCES

- [Railway Docs](https://docs.railway.app/)
- [GitHub Integration](https://docs.railway.app/reference/integrations)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Postgres Plugin](https://docs.railway.app/plugins/postgres)
- [Support Chat](https://railway.app/support)

---

## ✨ NEXT STEPS

After Railway deployment is successful:

1. **Deploy Frontend to Vercel** (see VERCEL_DEPLOYMENT_COMPLETE.md)
2. **Configure Email Service** (SendGrid setup)
3. **Set Up Monitoring** (Sentry, GA4)
4. **Run Health Checks** (verification script)
5. **Load Testing** (performance validation)

---

**Last Updated**: 2026-08-14  
**Status**: Ready for Deployment
