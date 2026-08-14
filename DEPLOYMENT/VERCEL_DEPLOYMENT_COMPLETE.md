# 🎨 Vercel Deployment - Complete Step-by-Step Guide

**Status**: Ready for Immediate Deployment  
**Time Required**: 20-30 minutes  
**Platform**: Vercel.com  

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before starting, verify you have:

- [ ] Vercel account created (vercel.com)
- [ ] GitHub repository connected to Vercel
- [ ] Production domain registered
- [ ] DNS access/configuration rights
- [ ] API endpoint URL from Railway deployment (e.g., https://api.yourdomain.com)
- [ ] SSL certificate ready (Vercel provides auto SSL)

---

## 🔗 STEP 1: Connect GitHub Repository (5 min)

### Option A: Using Vercel Dashboard (Easiest)

```bash
# 1. Go to vercel.com
# 2. Click "New Project"
# 3. Click "Import Git Repository"
# 4. Search for "Rebrand-xpfx"
# 5. Click "Import"
# 6. Grant Vercel access to GitHub
# 7. Done! Vercel now syncs with your repo
```

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project to Vercel
cd /workspaces/Rebrand-xpfx
vercel link

# Follow prompts:
# - Create new Vercel project
# - Set project name: rebrand-xpfx
# - Set root directory: ./
# - Build command: npm run build (Vercel detects this)
# - Output directory: artifacts/nextrade/dist
```

---

## ⚙️ STEP 2: Configure Build Settings (5 min)

### In Vercel Dashboard

Navigate to: **Project Settings → Build & Development Settings**

```
Root Directory: ./
Build Command: npm run build --workspace=artifacts/nextrade
Output Directory: artifacts/nextrade/dist
Install Command: npm install
Development Command: npm run dev --workspace=artifacts/nextrade
```

### Via vercel.json (Already in repo)

The repository already has `vercel.json` configured. Verify it contains:

```json
{
  "buildCommand": "npm run build --workspace=artifacts/nextrade",
  "outputDirectory": "artifacts/nextrade/dist",
  "installCommand": "npm install"
}
```

---

## 🔑 STEP 3: Set Environment Variables (10 min)

### Via Vercel Dashboard

Navigate to: **Project Settings → Environment Variables**

Add these variables:

```bash
# Frontend API Configuration
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000

# Optional: Analytics
VITE_GA_ID=G_your_google_analytics_id

# Optional: Feature Flags
VITE_ENABLE_DEMO_AUTH=true
VITE_ENABLE_ADVANCED_TRADING=true
```

### Via Vercel CLI

```bash
vercel env add VITE_API_URL
# Enter: https://api.yourdomain.com

vercel env add VITE_API_TIMEOUT
# Enter: 30000
```

---

## 🚀 STEP 4: Deploy (Automatic or Manual) - 10 min

### Option A: Automatic Deploy (Recommended)

```bash
# Just push to main - Vercel auto-deploys
git push origin main

# Vercel automatically:
# 1. Detects changes
# 2. Runs build command
# 3. Deploys to CDN
# 4. Creates preview URL
# 5. Updates production

# Monitor at: vercel.com/dashboard/[project]
# Status: Building → Ready ✓
```

### Option B: Manual Deploy

```bash
# Deploy current branch
vercel deploy

# Deploy to production
vercel deploy --prod

# View deployment:
vercel ls
```

---

## 📍 STEP 5: Configure Custom Domain (5 min)

### In Vercel Dashboard

Navigate to: **Settings → Domains**

```bash
# 1. Click "Add Domain"
# 2. Enter: app.yourdomain.com (or yourdomain.com)
# 3. Choose: "Use nameservers" or "Add DNS record"

# If using nameservers:
# Update your domain registrar to point to Vercel nameservers

# If using DNS record (faster):
# Add CNAME record: 
#   Name: app (or @)
#   Value: cname.vercel.com

# Vercel auto-configures SSL (Let's Encrypt)
# Wait 1-5 minutes for DNS to propagate

# Verify:
curl -I https://app.yourdomain.com
# Expected: 200 OK
```

---

## ✅ STEP 6: Connect API Endpoint (2 min)

After Railway backend is live:

```bash
# Update environment variable with actual API URL
vercel env add VITE_API_URL https://api.yourdomain.com

# Redeploy to apply
vercel deploy --prod
```

---

## 🔍 STEP 7: Verify Deployment (5 min)

```bash
# Check frontend loads
curl https://app.yourdomain.com
# Expected: 200 OK with HTML

# Check environment variable loaded
curl https://app.yourdomain.com/config.js
# Expected: VITE_API_URL is set correctly

# Test API connectivity
# Open browser DevTools → Network tab
# Navigate to https://app.yourdomain.com
# Check API calls succeed

# Check SSL/TLS
curl -v https://app.yourdomain.com
# Expected: SSL certificate valid

# Check performance
# Lighthouse score should be 90+
```

---

## 📊 POST-DEPLOYMENT CHECKLIST

After successful deployment:

```bash
✅ Frontend loading: https://app.yourdomain.com
✅ API URL configured: VITE_API_URL environment variable set
✅ API responding: Network tab shows successful API calls
✅ SSL/TLS valid: curl shows valid certificate
✅ Custom domain working: https://app.yourdomain.com resolves
✅ Build fast: < 60 seconds
✅ Performance good: Lighthouse 90+
✅ No errors: Console shows no errors
✅ Responsive: Works on mobile/tablet/desktop
✅ Dark mode: Theme toggle works
```

---

## 🔄 REDEPLOYMENT / UPDATES

To deploy code changes:

```bash
# Option 1: Automatic (recommended)
git commit -m "Your changes"
git push origin main
# Vercel auto-deploys

# Option 2: Manual
vercel deploy --prod

# Option 3: Redeploy last commit
vercel redeploy

# Option 4: Rollback to previous
vercel rollback
```

---

## 🛡️ SECURITY AFTER DEPLOYMENT

```bash
# 1. Verify HTTPS only:
curl -v http://app.yourdomain.com
# Expected: 308 redirect to https://

# 2. Check security headers:
curl -I https://app.yourdomain.com
# Expected: Content-Security-Policy, X-Frame-Options, etc.

# 3. Verify API endpoint in frontend:
# DevTools → Network → API calls go to https://api.yourdomain.com
# NOT to localhost or staging URL

# 4. Check no secrets in frontend code:
grep -r "secret\|password\|key" artifacts/nextrade/dist/
# Expected: No matches (secrets only in backend)
```

---

## 🚨 TROUBLESHOOTING

### Build Fails: "npm ERR!"

```bash
# Check build logs in Vercel dashboard
# Common causes:
# 1. TypeScript error: npm run type-check
# 2. Missing dependencies: npm install
# 3. Import path wrong: Check imports match file locations

# View full logs:
vercel logs [deployment-url]

# Retry:
git push origin main
```

### Blank Page / 404 Error

```bash
# Verify output directory is correct:
# Should be: artifacts/nextrade/dist

# Check in Vercel dashboard:
# Settings → Build & Development → Output Directory

# Common fix:
# Change to: artifacts/nextrade/dist

# Redeploy:
vercel deploy --prod
```

### API Calls Failing (CORS Error)

```bash
# Verify VITE_API_URL is set to correct production URL
vercel env show VITE_API_URL

# Should output: https://api.yourdomain.com (NOT localhost)

# Update if needed:
vercel env add VITE_API_URL https://api.yourdomain.com

# Redeploy:
vercel deploy --prod
```

### Environment Variables Not Loading

```bash
# Verify variables are set for Production:
vercel env show

# Make sure you added to Production (not just Preview)

# Redeploy to apply:
vercel deploy --prod --force

# Check in browser:
# DevTools → Application → Environment vars
```

### Custom Domain Not Working

```bash
# Check DNS status in Vercel dashboard:
# Settings → Domains → Check status

# If pending:
# Wait 5-10 minutes for DNS propagation

# If failed:
# Update DNS record with correct CNAME value

# Manual test:
nslookup app.yourdomain.com
# Should resolve to vercel's servers
```

---

## 📈 MONITORING & ANALYTICS

### View Deployments
```bash
vercel ls
```

### View Logs
```bash
vercel logs [project-name]
```

### View Analytics
```bash
# In Vercel dashboard:
# Analytics → Web Vitals
# Shows performance metrics
```

### View Usage
```bash
# In Vercel dashboard:
# Settings → Usage & Billing
# Shows current bandwidth/build minutes
```

---

## 💾 PREVIEW DEPLOYMENTS

Vercel creates preview deployments for pull requests:

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git push origin feature/new-feature

# Create Pull Request on GitHub

# Vercel automatically:
# 1. Creates preview deployment
# 2. Runs builds
# 3. Posts comment with preview URL
# 4. Allows testing before merge

# After testing, merge PR to main
# Vercel deploys to production
```

---

## 🆘 SUPPORT RESOURCES

- [Vercel Docs](https://vercel.com/docs)
- [Next.js/React Deploy](https://vercel.com/docs/frameworks/react)
- [Environment Variables](https://vercel.com/docs/deployments/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Support](https://vercel.com/support)

---

## ✨ NEXT STEPS

After Vercel deployment is successful:

1. **Test End-to-End** (see VERIFICATION_CHECKLIST.md)
2. **Set Up Email Service** (SendGrid configuration)
3. **Enable Monitoring** (Sentry error tracking)
4. **Configure Analytics** (Google Analytics 4)
5. **Load Testing** (verify performance at scale)

---

**Last Updated**: 2026-08-14  
**Status**: Ready for Deployment
