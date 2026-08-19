# 🚀 DEPLOYMENT QUICK START CARD

**Goal**: Get from code to production in 4-8 hours  
**Platforms**: Railway (backend) + Vercel (frontend)  
**Target**: https://api.yourdomain.com + https://app.yourdomain.com  

---

## ⏰ 20-MINUTE FAST TRACK

```bash
# 1. Generate secrets (5 min)
node -e "const crypto = require('crypto'); console.log(JSON.stringify({
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  JWT_SECRET: crypto.randomBytes(32).toString('base64'),
  CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
  WALLET_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
}, null, 2))"

# Save output to secure location (password manager)

# 2. Railway: Set environment variables (5 min)
# - Go to railway.app/project/[id]/settings
# - Add: SESSION_SECRET, JWT_SECRET, CSRF_SECRET, WALLET_ENCRYPTION_KEY
# - Add: NODE_ENV=production, DATABASE_URL=<your_db_url>
# - Add: ALLOWED_ORIGINS=https://yourdomain.com

# 3. Railway: Deploy backend (5 min)
git push origin main
# Auto-deploys to Railway

# 4. Vercel: Set environment variables (2 min)
# - Go to vercel.com/dashboard/[project]/settings
# - Add: VITE_API_URL=https://api.yourdomain.com

# 5. Vercel: Deploy frontend (3 min)
vercel deploy --prod

# Total: 20 MINUTES TO PRODUCTION ✨
```

---

## 📋 DETAILED CHECKLIST

### BEFORE DEPLOYMENT (30 min preparation)

```
INFRASTRUCTURE:
□ Provision PostgreSQL database (15+ compatible)
□ Get DATABASE_URL connection string
□ Test database connection: psql "your_connection_string"
□ Verify database is accessible from Railway

DOMAINS & DNS:
□ Domain registered (yourdomain.com)
□ DNS access/control available
□ Subdomains planned: app.yourdomain.com, api.yourdomain.com
□ DNS records will be configured after deployment

PLATFORM ACCOUNTS:
□ Railway account created & logged in
□ Vercel account created & logged in
□ GitHub connected to both platforms
□ Billing method added to both

SECRETS:
□ Generate 4 random secrets (use script above)
□ Save to password manager or secure vault
□ NEVER commit to git or share

DOCUMENTATION:
□ Read DEPLOYMENT/RAILWAY_DEPLOYMENT_COMPLETE.md
□ Read DEPLOYMENT/VERCEL_DEPLOYMENT_COMPLETE.md
□ Bookmark DEPLOYMENT/VERIFICATION_CHECKLIST.md
```

### PHASE 1: BACKEND DEPLOYMENT (15 min)

```
STEP 1: Railway Setup (5 min)
□ Go to railway.app/dashboard
□ Create "New Project"
□ Select "Deploy from GitHub"
□ Choose: trevionjamielynn800/Rebrand-xpfx
□ Grant access

STEP 2: Environment Variables (5 min)
□ Project Settings → Variables
□ Add SESSION_SECRET from your secrets
□ Add JWT_SECRET from your secrets
□ Add CSRF_SECRET from your secrets
□ Add WALLET_ENCRYPTION_KEY from your secrets
□ Add NODE_ENV=production
□ Add DATABASE_URL=<your_db_url>
□ Add ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

STEP 3: Deploy (5 min)
□ git push origin main
□ Watch railway.app/project/[id]/deployments
□ Wait for "Deployed ✓"
□ Copy API URL (usually api.[project].railway.app)
```

### PHASE 2: FRONTEND DEPLOYMENT (15 min)

```
STEP 1: Vercel Setup (5 min)
□ Go to vercel.com/dashboard
□ "New Project" → "Import Git Repository"
□ Search for "Rebrand-xpfx"
□ Click "Import"
□ Grant access

STEP 2: Environment Variables (5 min)
□ Project Settings → Environment Variables
□ Add VITE_API_URL=<railway_api_url>
  (e.g., https://api.yourdomain.com)
□ Set to Production environment

STEP 3: Deploy (5 min)
□ vercel deploy --prod
□ OR: just push changes (auto-deploys)
□ Copy frontend URL
```

### PHASE 3: DOMAIN CONFIGURATION (10 min)

```
STEP 1: Connect API Domain
□ Railway dashboard → Project Settings → Domains
□ Add: api.yourdomain.com
□ Choose: Use DNS records (faster)
□ Add CNAME: api → cname-railway.com

STEP 2: Connect Frontend Domain
□ Vercel dashboard → Settings → Domains
□ Add: app.yourdomain.com
□ Choose: Use DNS records
□ Add CNAME: app → cname-vercel.com

STEP 3: Wait for DNS
□ DNS propagation: 5-30 minutes
□ Verify: nslookup api.yourdomain.com
□ SSL certificates auto-generate (Let's Encrypt)
```

### PHASE 4: VERIFICATION (15 min)

```
STEP 1: Health Checks
□ curl https://api.yourdomain.com/healthz
  Expected: {"status":"ok"}
□ curl https://app.yourdomain.com
  Expected: 200 OK with HTML

STEP 2: Run Verification Script
□ node scripts/production-health-check.mjs https://api.yourdomain.com
□ Expected: ✓ All checks pass, Health Score 100%

STEP 3: Test in Browser
□ Open https://app.yourdomain.com
□ Verify dashboard loads
□ Open DevTools → Network tab
□ Verify API calls go to https://api.yourdomain.com
□ Check console for no errors

STEP 4: Security Check
□ curl -I https://api.yourdomain.com
□ Verify security headers present
□ Check HTTPS enforced: curl http://api.yourdomain.com
□ Should redirect to https://
```

---

## 📚 DETAILED GUIDES

For comprehensive instructions, see:

| Task | Guide |
|------|-------|
| Backend Deployment | [RAILWAY_DEPLOYMENT_COMPLETE.md](RAILWAY_DEPLOYMENT_COMPLETE.md) |
| Frontend Deployment | [VERCEL_DEPLOYMENT_COMPLETE.md](VERCEL_DEPLOYMENT_COMPLETE.md) |
| Verification | [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) |
| Full Overview | [PRODUCTION_IMPLEMENTATION_GUIDE.md](../PRODUCTION_IMPLEMENTATION_GUIDE.md) |

---

## 🆘 QUICK TROUBLESHOOTING

### "API not responding"
```
→ Check Railway logs: railway logs --follow
→ Verify DATABASE_URL is set
→ Redeploy: git push origin main
```

### "Frontend shows blank page"
```
→ Check Vercel logs: vercel logs
→ Verify VITE_API_URL environment variable
→ Redeploy: vercel deploy --prod
```

### "CORS errors in browser console"
```
→ Verify ALLOWED_ORIGINS set correctly in Railway
→ Should include frontend URL: https://app.yourdomain.com
→ Redeploy: git push origin main
```

### "Database connection failed"
```
→ Verify DATABASE_URL is correct in Railway
→ Test manually: psql "your_database_url"
→ Make sure sslmode=require in URL
```

### "SSL certificate not valid"
```
→ DNS not propagated yet (wait 5-30 min)
→ Or domain not added to platform (add in Settings → Domains)
```

---

## 🎯 SUCCESS CRITERIA

### Deployment Complete When:
```
✅ git push origin main completes
✅ Railway shows "Deployed ✓"
✅ Vercel shows "Deployed ✓"
✅ curl https://api.yourdomain.com/healthz returns {"status":"ok"}
✅ https://app.yourdomain.com loads without errors
✅ DevTools Network tab shows API calls to correct URL
✅ No red errors in browser console
```

### Now Safe to Announce:
```
✅ Run full verification checklist (VERIFICATION_CHECKLIST.md)
✅ All checks pass (no red ✗ marks)
✅ Performance acceptable (< 200ms API, < 3s load)
✅ Ready for user traffic
```

---

## 🔒 SECURITY REMINDERS

```
⚠️  SAVE SECRETS SECURELY
   - Use password manager
   - Never commit to git
   - Rotate quarterly

⚠️  CHANGE DEFAULT CREDENTIALS
   - ADMIN_EMAIL / ADMIN_PASSWORD
   - Change immediately after first login

⚠️  VERIFY HTTPS
   - All connections must be https://
   - HTTP should redirect to HTTPS

⚠️  CHECK SECURITY HEADERS
   - curl -I https://api.yourdomain.com
   - Look for: Strict-Transport-Security, CSP, X-Frame-Options
```

---

## 📞 GETTING HELP

If something goes wrong:

1. **Check logs**
   - Railway: `railway logs --follow`
   - Vercel: `vercel logs`

2. **Run verification**
   - `node scripts/production-health-check.mjs https://api.yourdomain.com`

3. **Check documentation**
   - Detailed guides in DEPLOYMENT/ folder
   - Architecture at docs/ARCHITECT.md

4. **Platform support**
   - Railway: docs.railway.app
   - Vercel: vercel.com/docs

---

## ✨ YOU'RE DONE!

After Phase 4 Verification passes:

```
🎉 PRODUCTION LIVE 🎉

Next priorities:
1. Set up email (SendGrid)
2. Configure monitoring (Sentry, GA4)
3. Enable payment integrations
4. Train support team
5. Monitor first 24 hours closely
```

---

**Printed**: 2026-08-14  
**Print this and keep handy during deployment**
