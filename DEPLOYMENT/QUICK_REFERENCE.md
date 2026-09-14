# 🎯 QUICK DEPLOYMENT REFERENCE CARD

**Generated:** 2026-08-14  
**Status:** ✅ Ready to Deploy  
**Repository:** https://github.com/trevionjamielynn800/Rebrand-xpfx

---

## 🔐 PRODUCTION SECRETS (DO NOT COMMIT OR SHARE)

```
SESSION_SECRET=<generate-and-store-outside-git>
JWT_SECRET=<generate-and-store-outside-git>
COOKIE_SECRET=<generate-and-store-outside-git>
CSRF_SECRET=<generate-and-store-outside-git>
JWT_REFRESH_SECRET=<generate-and-store-outside-git>
COOKIE_SIGNING_KEY=<generate-and-store-outside-git>
WALLET_ENCRYPTION_KEY=<generate-and-store-outside-git>
```

---

## ⚡ FAST DEPLOY (Choose One)

### 🚀 RAILWAY (5 min)
```bash
1. railway.app → New Project → Add PostgreSQL
2. Variables tab → Add from DEPLOYMENT/.railway-env-production
3. Update: DATABASE_URL, ALLOWED_ORIGINS, ADMIN_*, SMTP_*, ALCHEMY_*
4. Connect GitHub → Wait for auto-deploy
5. Verify: curl https://[app].up.railway.app/healthz
```

### 🖥️ VPS/PM2 (20 min)
```bash
1. SSH to VPS: ssh root@your-vps-ip
2. Run: curl -fsSL https://raw.githubusercontent.com/trevionjamielynn800/Rebrand-xpfx/main/DEPLOYMENT/vps-deploy.sh | bash
3. Edit .env: nano /var/www/Rebrand-xpfx/.env
4. Setup PostgreSQL & update DATABASE_URL
5. Start: pm2 start ecosystem.config.cjs --env production
6. SSL: certbot certonly --standalone -d xpressprofx.com
7. Verify: curl https://xpressprofx.com/healthz
```

### 🎨 VERCEL (5 min)
```bash
1. vercel.com → Import Repository → trevionjamielynn800/Rebrand-xpfx
2. Environment Variables → Add VITE_API_URL=[backend-url]
3. Deploy → Wait 2-3 minutes
4. Visit: https://your-project.vercel.app
```

---

## ✅ VERIFICATION TESTS

```bash
# Health check (no auth needed)
curl https://your-domain/healthz

# Admin login test
# Visit https://your-domain → Login with ADMIN_EMAIL + ADMIN_PASSWORD

# Reset password test
# Request password reset → Check email for link
# Link should use production domain, not localhost
```

---

## 📁 FILES GENERATED

| File | Purpose |
|------|---------|
| `DEPLOYMENT/.railway-env-production` | Railway env template (with secrets) |
| `DEPLOYMENT/.vps-env-production` | VPS env template (with secrets) |
| `DEPLOYMENT/.vercel-env-production` | Vercel env template |
| `DEPLOYMENT/DEPLOY_ALL_PLATFORMS.md` | Full deployment guide |
| `DEPLOYMENT/vps-deploy.sh` | Auto-setup script for VPS |

---

## 🔧 CRITICAL FIELDS (UPDATE BEFORE DEPLOY)

| Field | Example | Notes |
|-------|---------|-------|
| `ALLOWED_ORIGINS` | https://xpressprofx.com,https://www.xpressprofx.com | Your domain(s) |
| `DATABASE_URL` | postgresql://user:pass@host/dbname | Platform-specific |
| `ADMIN_EMAIL` | admin@xpressprofx.com | Your email |
| `ADMIN_PASSWORD` | MyP@ssw0rd123! (16+ chars) | Strong password! |
| `SMTP_PASS` | SG.your_sendgrid_key_here | SendGrid API key |
| `ALCHEMY_API_KEY` | alchemy_pk_... | From alchemy.com |

---

## 🚨 TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| "Cannot reach server" | Check health endpoint, see logs |
| "CORS error" | Update ALLOWED_ORIGINS to include frontend domain |
| "Database connection failed" | Verify DATABASE_URL, ensure PostgreSQL is running |
| "Login fails" | Check ADMIN_EMAIL and ADMIN_PASSWORD are set |
| "Email not sending" | Verify SMTP_PASS (SendGrid key) is correct |

---

## 📊 MONITORING

```bash
# Railway: Check logs at railway.app dashboard
# VPS: pm2 logs xpresspro-api
# Vercel: Check logs at vercel.com dashboard
```

---

## 🔄 REDEPLOY AFTER CODE CHANGES

```bash
# Railway: Just git push origin main (auto-deploys)
# VPS: git pull && npm run build && pm2 restart xpresspro-api
# Vercel: Just git push origin main (auto-deploys)
```

---

## 📞 NEED HELP?

See full guides:
- [DEPLOYMENT/DEPLOY_ALL_PLATFORMS.md](./DEPLOY_ALL_PLATFORMS.md)
- [DEPLOYMENT_COMPLETE.md](../DEPLOYMENT_COMPLETE.md)
- [READY_FOR_LAUNCH.md](../READY_FOR_LAUNCH.md)
