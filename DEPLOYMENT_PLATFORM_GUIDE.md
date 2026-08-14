# Platform-Specific Deployment & Verification Guide

This guide provides step-by-step instructions for deploying and testing the blank page fix on all supported platforms.

## 📋 Overview of Changes

The blank page issue has been fixed through three key changes:

1. **Frontend Loading State Fix** (`artifacts/nextrade/src/App.tsx`)
   - RootRoute now displays PublicHome during auth loading instead of returning null
   - Prevents blank page while session is being fetched

2. **Error Handling** (`artifacts/nextrade/src/lib/auth.tsx`)
   - AuthProvider gracefully handles session fetch errors
   - Users can see the homepage even if session endpoint fails

3. **Persistence Fix** (`artifacts/api-server/src/lib/hydrate.ts`)
   - Email keys normalized to lowercase in usersByEmail Map
   - Ensures user data survives server restart/redeployment
   - Prevents duplicate user detection issues

---

## 1️⃣ RAILWAY Platform

### Trigger Deployment

```bash
# Option A: Wait for auto-deploy (GitHub integration)
# Railway automatically triggers builds when commits are pushed to main
# Expected time: 2-5 minutes
# Monitor: Check Railway Dashboard > Deployments

# Option B: Force redeploy via Railway CLI
railway login
railway link  # Select your project
railway up    # Trigger deployment

# Option C: Manual redeploy via Railway Dashboard
# 1. Go to https://railway.app
# 2. Select your project "Rebrand-xpfx"
# 3. Go to Deployments tab
# 4. Click the latest deployment and select "Redeploy"
```

### Verify Deployment

```bash
# Test the production URL (replace with your actual URL)
BASE_URL="https://rebrand-xpfx-production-1988.up.railway.app"

# Run E2E tests
node tests/e2e-deployment-verification.test.mjs "$BASE_URL"

# Manual tests:
# 1. Open $BASE_URL in browser
# 2. Should see homepage (not blank page)
# 3. Sign up with test email and check database persistence

# Check logs
railway logs   # Real-time logs
railway logs --tail 100  # Last 100 lines
```

### Troubleshooting Railway

```bash
# Check environment variables are set
railway env list

# Must have:
# - DATABASE_URL (for persistence)
# - SESSION_SECRET
# - All other secrets from .env.example

# Clear build cache if blank page persists
# 1. Go to Railway Dashboard
# 2. Project Settings > Environment
# 3. Delete problematic deploys, trigger new build

# Check health endpoint
curl -v "$BASE_URL/healthz"

# Check session endpoint
curl "$BASE_URL/api/auth/session" | jq .
```

---

## 2️⃣ VERCEL Platform

### Deploy to Vercel

```bash
# Option A: Auto-deploy via GitHub integration
# If Vercel is connected to repo, deployment triggers on git push
# Expected time: 3-7 minutes

# Option B: Deploy manually
npm install -g vercel
vercel login
vercel deploy --prod  # Deploy to production

# Option C: Via Vercel CLI with environment
vercel env pull  # Pull environment variables
vercel deploy --prod
```

### Configure for Vercel

Vercel needs special configuration because it's serverless. The API server should run elsewhere or be served differently:

```javascript
// vercel.json (already configured in repo)
{
  "buildCommand": "npm run predeploy && npm run build --workspace=artifacts/nextrade",
  "outputDirectory": "artifacts/nextrade/dist/public",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Note: The full backend (Express server) cannot run on Vercel. If you need persistence on Vercel, configure API routes separately or use an external API server.

### Verify Vercel Deployment

```bash
# Replace with your Vercel URL
BASE_URL="https://your-vercel-domain.vercel.app"

# Test frontend loads
curl "$BASE_URL/" | grep '<div id="root"'

# If backend is configured on Vercel:
curl "$BASE_URL/api/auth/session" | jq .

# Run E2E tests
node tests/e2e-deployment-verification.test.mjs "$BASE_URL"
```

---

## 3️⃣ VPS/PM2 Platform

### Deploy to VPS

```bash
# SSH into VPS
ssh user@your-vps-ip

# Navigate to project directory
cd /path/to/Rebrand-xpfx

# Pull latest code
git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Rebuild
npm run build

# Stop old processes
pm2 stop all

# Start with PM2
pm2 start ecosystem.config.cjs

# Verify startup
pm2 logs
pm2 status
```

### Verify VPS Deployment

```bash
# On your local machine:
BASE_URL="http://your-vps-ip:8080"  # or your domain

# Run E2E tests
node tests/e2e-deployment-verification.test.mjs "$BASE_URL"

# Manual verification
curl "$BASE_URL/" | grep '<div id="root"'
curl "$BASE_URL/api/auth/session" | jq .

# Test restart persistence
# 1. Create account via browser
# 2. SSH to VPS: pm2 restart all
# 3. Verify account still exists (login should work)
# 4. Check logs: pm2 logs
```

### PM2 Configuration

```javascript
// ecosystem.config.cjs (already configured)
module.exports = {
  apps: [{
    name: "xpresspro",
    script: "artifacts/api-server/dist/index.mjs",
    env: {
      NODE_ENV: "production"
    },
    instances: 2,
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "500M",
    autorestart: true,
    max_restarts: 5,
    min_uptime: "10s"
  }]
};
```

---

## 4️⃣ DOCKER & DOCKER COMPOSE

### Deploy with Docker Compose

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# Verify running
docker-compose ps

# Check logs
docker-compose logs -f api-server
docker-compose logs -f frontend
```

### Test Docker Deployment

```bash
# Frontend should be at http://localhost:3000
# API should be at http://localhost:5000

BASE_URL="http://localhost:5000"
node tests/e2e-deployment-verification.test.mjs "$BASE_URL"

# Manual tests
curl http://localhost:5000/ | grep '<div id="root"'
curl http://localhost:5000/api/auth/session | jq .
```

### Test Persistence in Docker

```bash
# 1. Create account via http://localhost:3000
# 2. Stop containers
docker-compose down

# 3. Start again
docker-compose up -d

# 4. Verify account still exists
# Log in should work if DATABASE_URL is configured

# Check database persistence
docker-compose exec db psql -U postgres -d xpresspro -c "SELECT * FROM users;"
```

### Docker Compose Configuration

```yaml
# docker-compose.yml (already configured)
services:
  api-server:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://...
      # All secrets from .env
    depends_on:
      - db
  
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: xpresspro
      POSTGRES_PASSWORD: ...
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## 5️⃣ LOCAL DEVELOPMENT

### Local Development Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server (will start both frontend and backend)
npm run dev

# Or start them separately:
# Terminal 1: Frontend dev server
npm run dev --workspace=artifacts/nextrade

# Terminal 2: Backend dev server (watches for changes)
npm run dev --workspace=artifacts/api-server
```

### Verify Local Development

```bash
# Frontend typically runs on http://localhost:5174 (Vite dev server)
# Backend API on http://localhost:5000

# Test backend
BASE_URL="http://localhost:5000"
node tests/e2e-deployment-verification.test.mjs "$BASE_URL"

# Test full flow
# 1. Visit http://localhost:5000/ or http://localhost:5174/
# 2. Should see homepage (not blank)
# 3. Sign up and create account
# 4. Restart backend: npm run dev --workspace=artifacts/api-server
# 5. Verify account still exists after restart
```

### Local Development Quick Start

```bash
# Make sure environment is set up
cp .env.example .env

# Install all dependencies
npm install --legacy-peer-deps

# Build both frontend and backend
npm run build

# Start server in production mode
NODE_ENV=development node artifacts/api-server/dist/index.mjs

# In another terminal, run tests
node tests/e2e-deployment-verification.test.mjs http://localhost:5000
```

---

## 📊 Complete Test Checklist

Use this checklist to verify the fix works on each platform:

- [ ] **Homepage loads without blank page** - Browser shows content, not white/blank
- [ ] **API health check responds** - `GET /healthz` returns 200
- [ ] **Session endpoint responds** - `GET /api/auth/session` returns JSON
- [ ] **Sign up works** - Can create new account via sign up flow
- [ ] **Login works** - Can log in with created account
- [ ] **Data persists after restart** - Account exists after server restart
- [ ] **No console errors** - Browser DevTools shows no error messages
- [ ] **All JS/CSS loads** - Network tab shows all assets loaded (not 404)
- [ ] **Mobile works** - Responsive design works on mobile device
- [ ] **E2E tests pass** - `node tests/e2e-deployment-verification.test.mjs` returns all ✅

---

## 🚀 Deployment Summary

| Platform | Trigger | Time | Status Check |
|----------|---------|------|--------------|
| **Railway** | Auto (git push) or manual redeploy | 2-5 min | Dashboard, E2E tests, health endpoint |
| **Vercel** | Auto (git push) | 3-7 min | Deployment status, E2E tests |
| **VPS/PM2** | Manual git pull + build | 5-10 min | pm2 logs, E2E tests, curl tests |
| **Docker** | `docker-compose build && up` | 1-3 min | docker ps, E2E tests, browser |
| **Local Dev** | `npm run dev` | <1 min | Browser, E2E tests, npm test |

---

## 🆘 Still Seeing Blank Page?

**Debug Steps:**

1. **Check browser console** (F12)
   - Any JavaScript errors?
   - Check Network tab - are assets loading?

2. **Verify API is responding**
   ```bash
   curl https://your-deployment-url/api/auth/session
   ```
   - Should return JSON, not error

3. **Check server logs**
   - Railway: `railway logs`
   - PM2: `pm2 logs`
   - Docker: `docker-compose logs`
   - Look for errors during startup or hydration

4. **Verify frontend build**
   - HTML includes `<div id="root">`
   - JavaScript files are being served (not 404)
   - CSS is being served

5. **Check DATABASE_URL**
   - If using persistence, DATABASE_URL must be set
   - If not set, app runs in-memory (users lost on restart)

6. **Clear cache**
   - Browser: Hard refresh (Ctrl+Shift+R)
   - Railway: Deploy again or use `railway up`
   - Vercel: Redeploy via dashboard

**If still stuck:** Check `/workspaces/Rebrand-xpfx/DEPLOYMENT/README.md` for detailed troubleshooting.

---

## ✅ Deployment Complete

Once all platforms pass the test checklist:
1. ✅ Blank page issue is **FIXED**
2. ✅ User data persistence is **RESTORED**
3. ✅ All platforms are **LIVE**
4. ✅ Full rollout to production users is **READY**

**Next:** Monitor production URLs for any issues and keep E2E tests running as part of CI/CD pipeline.
