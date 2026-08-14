# Blank Page After Sign-In - Deployment Fix Guide

**Status:** ✅ Fixed and Ready for Deployment  
**Last Updated:** 2026-08-14  
**Affected Issue:** Users see blank white page after sign-in on deployed platforms

---

## What Was Fixed

### Problem
After users signed in successfully on deployed platforms (Railway, Vercel, VPS, Docker), they would see a blank white page instead of the dashboard. This was caused by:

1. **Missing API Base URL Configuration** - Frontend apps didn't know where to send API requests
2. **Incorrect Environment Variables** - Deployment configs didn't have `VITE_API_URL` properly set
3. **Frontend Not Initializing API Client** - The API base URL wasn't being passed to the API client on app startup

### Solution
1. ✅ Updated `artifacts/nextrade/src/main.tsx` to initialize API base URL from `VITE_API_URL` environment variable
2. ✅ Updated `artifacts/admin-portal/src/main.tsx` to initialize API base URL from `VITE_API_URL` environment variable
3. ✅ Updated deployment environment files for all platforms with proper `VITE_API_URL` configuration
4. ✅ Updated vercel.json to use placeholder for API URL (must be configured per deployment)

---

## Platform-Specific Deployment Instructions

### 1. Railway (Primary Production Platform)

**What to do:**

1. Go to [railway.app dashboard](https://railway.app)
2. Select your "Rebrand-xpfx" project
3. Click on the API service → "Variables" tab
4. Add or update the following environment variable:
   ```
   VITE_API_URL = https://your-railway-app.up.railway.app
   ```
   (Replace `your-railway-app` with your actual Railway app URL)

5. **Also update:**
   ```
   ALLOWED_ORIGINS = https://xpressprofx.com,https://www.xpressprofx.com,https://your-railway-app.up.railway.app
   ```

6. Trigger a redeploy:
   - Option A: Push a new commit to `main` (auto-deploys)
   - Option B: Click "Redeploy" button in Railway dashboard

**Verification:**
```bash
# After deployment, test the application
node tests/e2e-deployment-verification.test.mjs https://your-railway-app.up.railway.app
```

---

### 2. Vercel (Frontend Only Deployment)

**What to do:**

1. Deploy the nextrade frontend to Vercel:
   ```bash
   npm install -g vercel
   vercel deploy --prod --cwd=artifacts/nextrade
   ```

2. After deployment, go to Vercel dashboard → Project Settings → Environment Variables

3. Add the following variables:
   ```
   VITE_API_URL = https://your-api-server.com
   NODE_ENV = production
   ```
   Replace `https://your-api-server.com` with:
   - Your Railway app URL (e.g., `https://your-railway-app.up.railway.app`), OR
   - Your custom API domain (e.g., `https://api.yourdomain.com`), OR
   - Your Vercel API deployment (if deploying API separately)

4. **Important:** Update your Railway/backend CORS configuration to include the Vercel domain:
   ```
   ALLOWED_ORIGINS = https://your-vercel-app.vercel.app,https://yourdomain.com,...
   ```

5. Redeploy from Vercel dashboard

**Verification:**
```bash
node tests/e2e-deployment-verification.test.mjs https://your-vercel-app.vercel.app
```

---

### 3. VPS / PM2 (Self-Hosted)

**What to do:**

1. SSH into your VPS:
   ```bash
   ssh user@your-vps-ip
   cd /var/www/Rebrand-xpfx
   ```

2. Create/update `.env` file with VITE_API_URL:
   ```bash
   # If frontends are on same VPS
   VITE_API_URL=http://localhost:3000
   
   # Or if frontends are on external domain
   VITE_API_URL=https://yourdomain.com
   ```

3. Also update ALLOWED_ORIGINS:
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:3000
   ```

4. Rebuild and restart:
   ```bash
   npm run build
   pm2 restart ecosystem.config.cjs
   pm2 save
   ```

5. Check logs:
   ```bash
   pm2 logs
   ```

**Verification:**
```bash
node tests/e2e-deployment-verification.test.mjs http://your-vps-ip:3000
# or
node tests/e2e-deployment-verification.test.mjs https://yourdomain.com
```

---

### 4. Docker Compose (Local/Self-Hosted)

**What to do:**

1. Create/update `.env.production` file in project root:
   ```bash
   NODE_ENV=production
   PORT=3000
   VITE_API_URL=http://localhost:3000
   ALLOWED_ORIGINS=http://localhost,http://localhost:3000,http://127.0.0.1
   # ... other required variables
   ```

2. Build and run:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. Check if running:
   ```bash
   docker-compose logs api
   docker-compose ps
   ```

**Verification:**
```bash
node tests/e2e-deployment-verification.test.mjs http://localhost:3000
```

---

### 5. Render.com (Alternative PaaS)

**What to do:**

1. Go to [render.com dashboard](https://dashboard.render.com)
2. Select your service
3. Go to "Environment" tab
4. Add/update:
   ```
   VITE_API_URL = https://your-render-app.onrender.com
   ALLOWED_ORIGINS = https://your-render-app.onrender.com,https://yourdomain.com
   ```

5. Trigger redeploy by pushing to GitHub or manually clicking "Deploy"

**Verification:**
```bash
node tests/e2e-deployment-verification.test.mjs https://your-render-app.onrender.com
```

---

## Environment Variable Reference

### Frontend (Build-Time)
These variables are embedded into the frontend build and **must** be set during build:

- **`VITE_API_URL`** (CRITICAL)
  - Where the frontend should send API requests
  - Examples: `https://api.yourdomain.com`, `https://your-railway-app.up.railway.app`
  - Default (if not set): Uses `window.location.origin` (same domain as frontend)

- **`VITE_API_TIMEOUT`** (Optional)
  - API request timeout in milliseconds
  - Default: `30000` (30 seconds)

### Backend (Runtime)
These variables are read at runtime and **must** be set in the deployment environment:

- **`ALLOWED_ORIGINS`** (CRITICAL)
  - Comma-separated list of frontend domains that can make API requests
  - Examples: `https://app.yourdomain.com,https://www.yourdomain.com,https://your-railway-app.up.railway.app`
  - Must include all frontend domains/URLs

- **`NODE_ENV`**
  - Set to `production` for deployed apps
  - Controls security headers, logging level, etc.

- **`PORT`**
  - Which port the API server listens on
  - Default: `8080` on Railway, `3000` on VPS/local

---

## Troubleshooting

### Still Seeing Blank Page After Deployment?

**Step 1: Check Frontend Build**
```bash
# Verify VITE_API_URL was embedded in build
grep -r "VITE_API_URL" artifacts/nextrade/dist/ | head -1
# Should show your API URL, not just "undefined"
```

**Step 2: Check Network Requests**
1. Open your app in browser
2. Press F12 (DevTools)
3. Go to Network tab
4. Try to sign in
5. Look for `/api/auth/session` request
6. Check:
   - Does it go to the correct API URL?
   - Is it returning 401/403/200 or is it failing with CORS error?

**Step 3: Check Backend Logs**
```bash
# Railway
railway logs

# VPS/PM2
pm2 logs

# Docker
docker-compose logs api

# Render
Check render.com dashboard → Logs
```

**Step 4: Verify CORS Settings**
```bash
# The backend must allow your frontend's origin
# Check ALLOWED_ORIGINS includes your frontend domain
# Use the getAllowedOrigins debug endpoint (if available)
```

### API Endpoint Returning 401/403?
- This is normal after sign-in - you need to verify the session is being stored in cookies
- Check browser DevTools → Application → Cookies for `xpfx_sid` cookie

### Network Error / Cannot Reach API?
- Verify `VITE_API_URL` in your frontend build is correct
- Verify the API is actually running and accessible at that URL
- Check firewall rules allow access to the API endpoint
- Verify DNS resolves to the correct IP address

### CORS Error in Browser Console?
- Backend's `ALLOWED_ORIGINS` doesn't include your frontend domain
- Add your frontend domain to `ALLOWED_ORIGINS` on the backend
- Redeploy the backend
- Test again

---

## Quick Deploy Checklist

For **each platform** where you deploy:

- [ ] Set `VITE_API_URL` to correct API endpoint URL
- [ ] Set `ALLOWED_ORIGINS` to include the frontend domain
- [ ] Set all required secrets (SESSION_SECRET, JWT_SECRET, etc.)
- [ ] Set `NODE_ENV=production`
- [ ] Trigger build/deployment
- [ ] Wait for build to complete
- [ ] Open app in browser
- [ ] Sign up for test account
- [ ] Sign in
- [ ] Verify dashboard loads (not blank page)
- [ ] Check browser DevTools → Network for API calls
- [ ] Run verification test: `node tests/e2e-deployment-verification.test.mjs <url>`

---

## Need Help?

If you still see a blank page:

1. **Check the fixes are deployed**: Look at recent git commits to verify the changes are in your repository
2. **Check logs**: Look at your platform's logs for errors
3. **Verify environment variables**: Double-check all values in your platform's dashboard
4. **Test locally first**: `npm run build && npm start` to ensure it works locally
5. **Clear cache**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
6. **Try incognito mode**: Some browser extensions can interfere

---

## Files Changed

- `artifacts/nextrade/src/main.tsx` - Initialize API base URL
- `artifacts/admin-portal/src/main.tsx` - Initialize API base URL
- `vercel.json` - Update to use placeholder for API URL
- `DEPLOYMENT/RAILWAY_ENV_PRODUCTION.env` - Add VITE_API_URL
- `DEPLOYMENT/VERCEL_ENV_PRODUCTION.env` - Add VITE_API_URL
- `DEPLOYMENT/VPS_ENV_PRODUCTION.env` - Add VITE_API_URL
- `DEPLOYMENT_FIX_GUIDE.md` - This file (deployment instructions)

---

## Code Changes Summary

### nextrade/src/main.tsx
```typescript
// Before: API base URL was never set
createRoot(document.getElementById("root")!).render(<App />);

// After: API base URL is initialized from environment
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
if (apiUrl) {
  setBaseUrl(apiUrl);
}
createRoot(document.getElementById("root")!).render(<App />);
```

### admin-portal/src/main.tsx
Same change as nextrade.

---

**Last Updated:** 2026-08-14  
**Status:** Ready for Production Deployment
