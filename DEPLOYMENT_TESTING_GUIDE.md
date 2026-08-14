# 🚀 Deployment Verification & Testing Guide

**Status:** ✅ All Fixes Applied and Ready for Testing  
**Last Updated:** 2026-08-14  

---

## Overview

This guide provides step-by-step instructions to verify that the blank page issue is fixed across all supported deployment platforms.

---

## What Was Fixed

| Issue | Fix | Files Changed |
|-------|-----|----------------|
| Frontend apps don't initialize API base URL | Added `setBaseUrl()` call in main.tsx | nextrade/src/main.tsx, admin-portal/src/main.tsx |
| Vercel config has hardcoded Railway URL | Changed to placeholder for manual config | vercel.json |
| Missing VITE_API_URL in deployment files | Added with documentation | RAILWAY_ENV_PRODUCTION.env, VERCEL_ENV_PRODUCTION.env, VPS_ENV_PRODUCTION.env |
| No deployment guide | Created comprehensive guide | DEPLOYMENT_FIX_GUIDE.md |

---

## Local Testing (Start Here)

### 1. Verify Build Succeeds
```bash
cd /workspaces/Rebrand-xpfx
npm run build

# Expected output:
# ✓ built in X.XXs (for both nextrade and admin-portal)
# All workspace builds should complete successfully
```

### 2. Start Local Development Server
```bash
# Terminal 1: Start API server
PORT=3000 npm run dev:api

# Terminal 2: Start nextrade frontend
npm run dev:nextrade

# Terminal 3 (optional): Start admin portal
npm run dev:admin

# Terminal 4 (optional): Start mockup
npm run dev:mockup
```

### 3. Test Sign-In Flow
```bash
# Open browser to http://localhost:5174 (nextrade)
# or http://localhost:5173 (admin-portal)

# Sign up with test email
# - Email: testuser@example.com
# - Password: TestPassword123!
# - Country: United States

# Verify OTP (use test OTP from logs or endpoint)

# After verification:
# ✅ Dashboard should load (NOT blank page)
# ✅ Can see user name, balance, recent trades
# ✅ Browser DevTools Network tab shows successful API calls
# ✅ No errors in browser Console
```

### 4. Check Browser DevTools
```
Press F12 → Network Tab
1. Try to log in
2. Look for /api/auth/session request
3. Should see:
   - Status: 200 (after login)
   - Response contains user data
   - No CORS errors
4. Look for /api/wallets request
5. Should get data back (or 200 OK even if empty)
```

### 5. Check Server Logs
```bash
# Look for these successful messages:
# [auth] login successful
# [auth] session created
# [session] session cookie set
# [api] GET /api/auth/session 200 OK

# NOT:
# [CORS] origin not allowed
# Cannot set cookie
# Session not found
```

---

## Production Platform Testing

### Railway Deployment

**Prerequisites:**
- Railway account with project set up
- Git repository connected to Railway
- PostgreSQL database configured

**Steps:**

1. **Configure Environment Variables in Railway Dashboard:**
   ```
   Go to: https://railway.app → Project → Services → API → Variables
   
   Add/Update:
   VITE_API_URL = https://your-railway-app.up.railway.app
   ALLOWED_ORIGINS = https://your-railway-app.up.railway.app,https://yourdomain.com
   (plus all other required variables)
   ```

2. **Trigger Deployment:**
   ```bash
   # Option A: Auto-deploy (just push to main)
   git push origin main
   
   # Option B: Manual via Railway CLI
   railway login
   railway link
   railway up --skip-env-check
   
   # Option C: Manual via Dashboard
   # Click "Redeploy" in Railway dashboard
   ```

3. **Wait for Build (2-5 minutes)**
   - Watch Railway dashboard → Deployments
   - Should see "Build started" → "Build succeeded" → "Deployment succeeded"

4. **Test the Application:**
   ```bash
   # Open in browser
   https://your-railway-app.up.railway.app
   
   # Sign up and test
   # After login, verify:
   ✅ Dashboard loads (not blank)
   ✅ Can see user data
   ✅ Network requests go to Railway API URL
   ```

5. **Run Automated Test:**
   ```bash
   node tests/e2e-deployment-verification.test.mjs https://your-railway-app.up.railway.app
   
   # Expected output:
   # ✓ Frontend HTML contains React root element
   # ✓ Can reach API health endpoint
   # ✓ All tests passed
   ```

6. **Troubleshooting Railway:**
   ```bash
   # Check logs
   railway logs
   
   # Should NOT see:
   # "[CORS] origin not allowed"
   # "Cannot GET /api"
   # Session-related errors
   
   # Should see:
   # "Server listening on port 8080"
   # "Database connected" (if DB configured)
   ```

---

### Vercel Deployment

**Prerequisites:**
- Vercel account
- GitHub repository connected to Vercel
- API running on Railway or other platform

**Steps:**

1. **Create Vercel Project:**
   ```bash
   cd artifacts/nextrade
   vercel deploy --prod
   ```

2. **Configure Environment Variables in Vercel Dashboard:**
   ```
   Go to: https://vercel.com → Project → Settings → Environment Variables
   
   Add:
   VITE_API_URL = https://your-railway-app.up.railway.app
   (or your API endpoint)
   ```

3. **Redeploy from Vercel Dashboard:**
   - Settings → Deployments → Redeploy

4. **Update Railway ALLOWED_ORIGINS:**
   ```
   Go to Railway → Variables
   ALLOWED_ORIGINS = ...,https://your-vercel-app.vercel.app
   
   Redeploy Railway
   ```

5. **Test:**
   ```bash
   # Open https://your-vercel-app.vercel.app
   # Sign in
   # Verify dashboard loads
   
   node tests/e2e-deployment-verification.test.mjs https://your-vercel-app.vercel.app
   ```

---

### VPS/PM2 Deployment

**Prerequisites:**
- SSH access to VPS
- Node.js >= 20 installed
- PostgreSQL database configured
- PM2 installed globally

**Steps:**

1. **SSH to VPS:**
   ```bash
   ssh user@your-vps-ip
   cd /var/www/Rebrand-xpfx
   ```

2. **Update .env File:**
   ```bash
   nano .env  # or vi .env
   
   # Add/Update:
   NODE_ENV=production
   PORT=3000
   VITE_API_URL=http://localhost:3000  # or https://yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
   (plus all other required variables)
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   pm2 restart ecosystem.config.cjs
   pm2 save
   ```

4. **Verify Deployment:**
   ```bash
   # Check if service is running
   pm2 status
   
   # Check logs
   pm2 logs
   
   # Test API
   curl http://localhost:3000/healthz
   # Should return: { "status": "ok", ... }
   ```

5. **Test in Browser:**
   ```bash
   # If domain configured:
   https://yourdomain.com
   
   # If VPS IP only:
   http://your-vps-ip:3000
   
   # Sign in and verify dashboard loads
   ```

6. **Run Test:**
   ```bash
   node tests/e2e-deployment-verification.test.mjs http://your-vps-ip:3000
   ```

---

### Docker Compose Deployment

**Steps:**

1. **Create .env.production:**
   ```bash
   cp .env.production.example .env.production
   
   # Edit and set:
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:yourpass@postgres:5432/xpressprofx
   VITE_API_URL=http://localhost:3000
   ALLOWED_ORIGINS=http://localhost,http://localhost:3000,http://127.0.0.1
   (plus all required secrets)
   ```

2. **Build and Run:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   
   # Wait for services to start
   sleep 10
   ```

3. **Verify Containers:**
   ```bash
   docker-compose ps
   # All should show "Up"
   
   docker-compose logs api
   # Should see "Server listening on port 3000"
   ```

4. **Test:**
   ```bash
   # API health check
   curl http://localhost:3000/healthz
   
   # Open in browser
   http://localhost:3000
   
   # Sign in and verify dashboard
   
   node tests/e2e-deployment-verification.test.mjs http://localhost:3000
   ```

---

### Render.com Deployment

**Steps:**

1. **Connect GitHub Repo to Render**
   - Go to https://dashboard.render.com
   - Create new Web Service
   - Connect your GitHub repo

2. **Configure Environment Variables:**
   ```
   Dashboard → Service → Environment
   
   Add:
   VITE_API_URL = https://your-render-app.onrender.com
   ALLOWED_ORIGINS = https://your-render-app.onrender.com,https://yourdomain.com
   (plus all other required variables)
   ```

3. **Deploy:**
   - Push to GitHub, or
   - Click "Deploy" in Render dashboard

4. **Test:**
   ```bash
   # Open https://your-render-app.onrender.app
   # Sign in
   # Verify dashboard loads
   
   node tests/e2e-deployment-verification.test.mjs https://your-render-app.onrender.app
   ```

---

## Automated Verification

### Running E2E Tests

```bash
# Test a single deployment
node tests/e2e-deployment-verification.test.mjs https://your-railway-app.up.railway.app

# Test all platforms (if deployed)
node tests/e2e-deployment-verification.test.mjs https://your-railway-app.up.railway.app && \
node tests/e2e-deployment-verification.test.mjs https://your-vercel-app.vercel.app && \
node tests/e2e-deployment-verification.test.mjs http://your-vps-ip:3000
```

### Expected Test Output

```
Testing deployment at: https://your-railway-app.up.railway.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Frontend HTML contains React root element
✓ Can reach API health endpoint  
✓ API returns 200 OK
✓ HTML is not empty (has content)
✓ No "blank page" indicators found

All tests passed! ✓
```

### If Tests Fail

```
Test Error: Cannot reach API endpoint
→ Check: Is the API running? Is VITE_API_URL correct?

Test Error: CORS error in logs
→ Check: ALLOWED_ORIGINS includes your frontend domain

Test Error: Session endpoint returns 401
→ Check: Cookie is being set (browser DevTools → Application → Cookies)

Test Error: Dashboard still blank
→ Check: Browser console for errors
→ Check: Network tab for failed API requests
→ Check: setBaseUrl() is being called (add console.log to verify)
```

---

## Checklist: Before Declaring Success

- [ ] Local development works (sign up, login, dashboard loads)
- [ ] Build succeeds with no errors/warnings
- [ ] Railway deployment works and dashboard loads
- [ ] Vercel frontend connects to Railway API and dashboard loads
- [ ] VPS/PM2 deployment works (if applicable)
- [ ] Docker deployment works (if applicable)
- [ ] E2E test passes for each platform
- [ ] Browser DevTools shows no CORS errors
- [ ] Server logs show no error messages
- [ ] Can complete full sign-up → login → dashboard flow
- [ ] Can see user data (name, balance, trades)
- [ ] Session persists across page refresh
- [ ] Logout works and redirects to login page

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Still blank page after login | VITE_API_URL not set or wrong | Set correct API URL in environment, rebuild frontend |
| CORS error in browser | ALLOWED_ORIGINS doesn't include frontend domain | Add frontend domain to ALLOWED_ORIGINS, restart API |
| API endpoint 404 | API not running or URL is wrong | Verify API is running, check VITE_API_URL |
| Session not saving | Cookie not being set | Check Session middleware, CORS credentials setting |
| "Cannot POST /api/auth/login" | API route not found | Check API is built correctly, check PORT |
| Build succeeds but browser shows error | VITE_API_URL embedded wrong | Delete build cache, rebuild |

---

## Next Steps After Verification

1. **Mark Deployment as Complete**
   - Update your deployment status tracker
   - Document which platforms have been tested
   - Note any platform-specific issues

2. **Monitor for Issues**
   - Watch server logs for errors
   - Check user reports
   - Monitor API response times
   - Track authentication success rate

3. **Performance Testing**
   ```bash
   # Once stable, run load tests
   node tests/performance-test.mjs <url>
   ```

4. **Rollout to More Users**
   - Gradually increase traffic
   - Monitor error rates
   - Be ready to rollback if needed

---

## Support & Documentation

- **Deployment Guide:** [DEPLOYMENT_FIX_GUIDE.md](DEPLOYMENT_FIX_GUIDE.md)
- **Railway Docs:** [railway.app/docs](https://railway.app/docs)
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **VPS Guide:** Check your hosting provider's docs
- **Docker Docs:** [docker.com/docs](https://docker.com/docs)

---

**Last Updated:** 2026-08-14  
**Status:** Ready for Production Testing
