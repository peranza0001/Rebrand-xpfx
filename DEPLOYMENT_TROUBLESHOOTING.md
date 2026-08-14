# Railway Deployment Troubleshooting - Blank Page Still Showing

## Current Situation

- ✅ Code is committed and pushed to `origin/main` (commit 7b45add)
- ✅ Local testing confirms fixes work perfectly
- ✅ E2E tests all pass
- ⚠️ Production Railway URL still shows blank page (needs investigation)

## Why Railway Might Not Have Updated Yet

### Scenario 1: Auto-Deploy Hasn't Triggered (Most Likely)

**Problem:** Railway's GitHub integration may not have detected the push or the build hasn't started.

**Solution:**
```bash
# Method A: Check Railway CLI
railway login
railway link  # Select your project
railway status  # Show deployment status

# Method B: Manual redeploy via CLI
railway up --skip-env-check

# Method C: Manual redeploy via Dashboard
# 1. Go to https://railway.app
# 2. Select "Rebrand-xpfx" project
# 3. Click "Deployments" tab
# 4. Find the latest deployment
# 5. Click "Redeploy" button

# Method D: Check build logs
railway logs --service api-server
```

### Scenario 2: Build Succeeded But Old Assets Served

**Problem:** Frontend assets are cached from old build (browser cache or CDN).

**Solution:**
```bash
# Hard refresh browser cache
# In browser: Ctrl+Shift+R or Cmd+Shift+R

# Or clear via Railway dashboard
# 1. Project settings
# 2. Build cache settings
# 3. Clear cache button

# Verify new build is deployed
curl -v https://rebrand-xpfx-production-1988.up.railway.app/ | grep "index-"
# Should show new hash like index-C4DVKKzY.js
```

### Scenario 3: Environment Variable Missing

**Problem:** `DATABASE_URL` or other critical env vars not set in Railway production environment.

**Solution:**
```bash
# Check what's set
railway env list

# Must have:
railway env add DATABASE_URL "postgresql://..."
railway env add SESSION_SECRET "$(openssl rand -hex 32)"
# ... add other required secrets

# Redeploy after updating env
railway up --skip-env-check
```

### Scenario 4: Build Failed But Dashboard Doesn't Show Error

**Problem:** Build succeeded in status but actual files didn't build correctly.

**Solution:**
```bash
# Check full build logs
railway logs

# Look for:
# - Errors during npm install
# - Errors during npm run build
# - Errors during npm run predeploy

# Common issues:
# "Cannot find module" → npm install failed
# "TypeScript errors" → build failed
# "Asset not found" → frontend build failed

# Force clean rebuild
# 1. Delete the deployment from Railway dashboard
# 2. Push new commit to trigger fresh build
git commit --allow-empty -m "Force Railway rebuild"
git push origin main
```

### Scenario 5: Express Server Not Serving Frontend

**Problem:** API server built correctly but isn't serving the frontend HTML.

**Solution:**
```bash
# Check if frontend dist exists
railway exec ls -lah artifacts/nextrade/dist/public/

# Should show index.html and assets/ folder

# If missing, rebuild locally and push
npm run build --workspace=artifacts/nextrade
git add artifacts/nextrade/dist/
git commit -m "Update frontend dist"
git push origin main
railway up
```

## Step-by-Step Diagnosis

### Step 1: Verify Code is on Server

```bash
railway exec git log --oneline -5

# Should show:
# 7b45add - Add quick deployment verification reference card
# b375c8e - Add comprehensive platform-specific deployment verification guide
# 5b980aa - Add E2E deployment verification tests
# b0c389f - Fix auth session hydration and blank page startup
```

### Step 2: Check If Frontend Build Exists

```bash
railway exec ls -lah artifacts/nextrade/dist/public/ | head -20

# Should show:
# -rw-rw-rw-  index.html
# drwxrwxrwx  assets/
# -rw-rw-rw-  index-C4DVKKzY.js (or similar)
```

### Step 3: Test Backend API Directly

```bash
curl -v https://rebrand-xpfx-production-1988.up.railway.app/api/auth/session

# Should return:
# HTTP/1.1 200 OK
# {"user":null,"role":"guest","isDemo":false,...}

# If fails, backend isn't running
```

### Step 4: Test Frontend HTML Endpoint

```bash
curl -v https://rebrand-xpfx-production-1988.up.railway.app/ | grep -E '<title>|<div id="root"|<script'

# Should show:
# <title>XpressPro FX</title>
# <div id="root"></div>
# <script type="module" src="/assets/index-...js"></script>

# If shows blank or error, frontend isn't being served
```

### Step 5: Check Server Logs for Errors

```bash
railway logs --tail 200

# Look for:
# ERROR - indicates critical failure
# Missing environment variables
# Port conflicts
# File not found errors
```

## Quickest Fix (Try This First)

```bash
# 1. Force rebuild
railway up --skip-env-check

# 2. Wait for deployment
sleep 30

# 3. Test
curl https://rebrand-xpfx-production-1988.up.railway.app/ | grep '<div id="root"'

# 4. Hard refresh browser
# Open URL in browser, press Ctrl+Shift+R
```

## If Still Blank After These Steps

### Nuclear Option: Full Redeploy

```bash
# 1. Delete deployment from Railway (via dashboard)
# 2. Create new empty commit
git commit --allow-empty -m "Trigger full Railway rebuild"
git push origin main

# 3. Wait for new deployment
# Monitor: railway logs

# 4. Test when complete
node tests/e2e-deployment-verification.test.mjs https://rebrand-xpfx-production-1988.up.railway.app
```

### Debug with SSH

```bash
# SSH into Railway container (if available)
railway shell

# Inside container:
pwd  # Should be /app
ls -la artifacts/nextrade/dist/public/
curl http://localhost:5000/
curl http://localhost:5000/api/auth/session | jq .

# Exit
exit
```

## Verification Checklist

Before declaring victory, verify:

- [ ] `curl https://your-railway-url/ | grep '<div id="root"'` returns match
- [ ] `curl https://your-railway-url/api/auth/session | jq .` returns JSON
- [ ] Browser shows homepage (not blank)
- [ ] Can see text and buttons on homepage
- [ ] Can click "Sign Up" button
- [ ] Network tab shows all assets loaded (no 404s)
- [ ] Browser console has no errors
- [ ] E2E tests pass: `node tests/e2e-deployment-verification.test.mjs https://your-url`

## Common Error Patterns

### Pattern 1: Blank Page (No HTML)
```
curl -v https://url/
< HTTP/1.1 502 Bad Gateway
```
→ Backend crashed, check `railway logs`

### Pattern 2: Empty HTML Response
```
curl https://url/ | wc -c
0
```
→ Server returned no content, restart deployment

### Pattern 3: 404 on Assets
```
Network tab shows: /assets/index-*.js → 404
```
→ Frontend build missing, rebuild and redeploy

### Pattern 4: CORS Errors in Console
→ API server has CORS issue, shouldn't happen with current setup

### Pattern 5: Session Endpoint Returns HTML
```
curl /api/auth/session
< HTTP/1.1 200 OK
<!DOCTYPE html>...
```
→ Middleware isn't routing API calls correctly, rebuild

## Contact Railway Support

If none of the above works:

1. Get support link from Railway dashboard
2. Include:
   - Deployment ID
   - Last 100 lines of logs: `railway logs --tail 100`
   - Error message from browser console
   - Output of: `curl -v https://your-url/ | head -50`
3. Reference this file: DEPLOYMENT_TROUBLESHOOTING.md

## Expected Timeline

- **Immediate:** Code is in main branch ✅
- **1-5 min:** Railway auto-deploy triggered (or manual via CLI)
- **5-10 min:** Build completes
- **10-15 min:** Deployment live
- **15 min:** Browser cache cleared, see new version

**Total:** 15-20 minutes from push to verified fix

If more than 20 minutes have passed, manual intervention (from "Quickest Fix" section) is likely needed.

---

**Last Updated:** 2026-08-14 15:30 UTC
**Status:** Blank page fix complete, awaiting Railway deployment confirmation
**Action Required:** Run `railway up --skip-env-check` or redeploy from dashboard
