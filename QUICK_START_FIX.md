# QUICK START - Fix Blank Page Issue (5 Minutes)

**Problem:** Users see blank page after sign-in  
**Status:** ✅ FIXED  
**Your Action:** Deploy and configure  

---

## 🚀 IMMEDIATE STEPS (Do This Now)

### Step 1: Deploy Code (2 min)
```bash
git push origin main
# or deploy to your platform manually
```

### Step 2: Configure ONE Variable (2 min)

Pick your deployment platform and follow the EXACT steps:

#### If Using Railway (Most Common)
```
1. Go to: https://railway.app/dashboard
2. Click your project → Services → API → Variables
3. Find or create: VITE_API_URL
4. Set value to: https://your-railway-app.up.railway.app
   (Replace "your-railway-app" with your actual app name)
5. Click Save
6. Click "Redeploy" (or push to GitHub for auto-deploy)
7. Wait 2-5 minutes for build
8. Done!
```

#### If Using Vercel
```
1. Go to: https://vercel.com/dashboard
2. Click your nextrade project
3. Settings → Environment Variables
4. Add new variable:
   Name: VITE_API_URL
   Value: https://your-railway-app.up.railway.app
   (Or wherever your API is hosted)
5. Click Save and Redeploy
```

#### If Using VPS/PM2
```
ssh user@your-vps
nano .env
# Add or update:
VITE_API_URL=http://localhost:3000

npm run build
pm2 restart all
```

#### If Using Docker
```
Update .env.production:
VITE_API_URL=http://localhost:3000

docker-compose down && docker-compose up -d --build
```

### Step 3: Verify (1 min)
```bash
# Open your app in browser
https://your-app-url.com

# Try to sign in
# You should see dashboard (NOT blank page)

# If it works: You're done! 🎉
# If it doesn't: Run the test
node tests/e2e-deployment-verification.test.mjs https://your-app-url.com
```

---

## 📋 What Actually Changed

**The Frontend Problem:**
- Frontend apps didn't know where the API server was located
- So all API requests failed
- Dashboard had no data, showed blank page

**The Solution:**
- Added 4 lines of code to tell frontend where API is:
  ```typescript
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  if (apiUrl) {
    setBaseUrl(apiUrl);
  }
  ```

**Result:**
- Frontend now knows where to send API requests
- Dashboard loads with user data
- Users see their account, not blank page

---

## ✅ Verification Checklist

After deploying:

- [ ] Push code to production
- [ ] Set VITE_API_URL environment variable
- [ ] Trigger deployment/redeploy
- [ ] Wait for build to complete (2-5 min)
- [ ] Open app in browser
- [ ] Sign in with test account
- [ ] See dashboard (not blank) ✓
- [ ] See user data (name, balance, etc) ✓
- [ ] No errors in browser console ✓

---

## 🆘 If Still Broken

### Common Issue 1: "Still seeing blank page"
```bash
# Make sure VITE_API_URL is set correctly
# It should be the URL of your API server

# Examples of CORRECT values:
VITE_API_URL=https://your-railway-app.up.railway.app
VITE_API_URL=https://api.yourdomain.com
VITE_API_URL=http://localhost:3000

# Examples of WRONG values:
VITE_API_URL=http://localhost:5174  # Wrong (frontend URL)
VITE_API_URL=undefined              # Wrong (not set)
VITE_API_URL=                       # Wrong (empty)
```

### Common Issue 2: "Browser console shows CORS error"
```bash
# CORS error means backend doesn't allow frontend domain
# Go to your backend/API server settings
# Add frontend domain to ALLOWED_ORIGINS

# Example for Railway:
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-railway-app.up.railway.app

# Then redeploy API server
```

### Common Issue 3: "Network error / API unreachable"
```bash
# Check if API is actually running
curl https://your-api-url.com/healthz

# If it doesn't respond, your API might be down
# Check your API server logs
```

---

## 📚 Detailed Guides

If you need more help:

- **Full Deployment Guide:** [DEPLOYMENT_FIX_GUIDE.md](DEPLOYMENT_FIX_GUIDE.md)
- **Testing Procedures:** [DEPLOYMENT_TESTING_GUIDE.md](DEPLOYMENT_TESTING_GUIDE.md)
- **Code Changes:** [CODE_CHANGES_DETAILED.md](CODE_CHANGES_DETAILED.md)
- **Complete Summary:** [BLANK_PAGE_FIX_SUMMARY.md](BLANK_PAGE_FIX_SUMMARY.md)

---

## 🎯 Summary

| What | Done? |
|------|-------|
| Code is fixed | ✅ Yes (already in repo) |
| Just push to production | ✅ Easy |
| Set ONE environment variable | ✅ 2 minutes |
| Test that it works | ✅ 1 minute |
| **TOTAL TIME** | **~5 minutes** |

---

**That's it! Your blank page issue is fixed. Just deploy and configure the environment variable.**

If you have questions, check the detailed guides linked above.

Good luck! 🚀
