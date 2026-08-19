# 🚀 Production Deployment Guide — XpressPro FX

**Status:** Repository deployment configuration complete and verified.
**Last Updated:** 2026-08-14
**Build Commits:**
- `3492223` — Production auth origins and reset password host resolution
- `481fc7f` — Configure Railway and PM2 production deployment
- `6d7e323` — Configure Vercel frontend deployment
- `1d87470` — Fix Railway monorepo build lock

---

## Quick Reference

| Target | Config File | Status | Next Step |
|--------|-------------|--------|-----------|
| **Railway** | [railway.json](railway.json) | ✅ Ready | Set env vars → redeploy |
| **VPS/PM2** | [ecosystem.config.cjs](ecosystem.config.cjs) | ✅ Ready | SSH → clone → build → start |
| **Vercel** | [vercel.json](vercel.json) | ✅ Ready | Connect repo → build → deploy |

---

## 1️⃣ Railway Deployment

### Setup
1. Log in to [railway.app](https://railway.app)
2. Create or select your project
3. Connect this GitHub repo (trevionjamielynn800/Rebrand-xpfx)
4. Add a new service → GitHub repo

### Environment Variables
Copy and paste into Railway dashboard under "Variables":

```
NODE_ENV=production
PORT=8080
ENABLE_DEMO_AUTH=false
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,https://your-railway-app.up.railway.app

SESSION_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
COOKIE_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CSRF_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
COOKIE_SIGNING_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
WALLET_ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

DATABASE_URL=postgresql://user:pass@host:5432/dbname
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/dbname

ADMIN_EMAIL=admin@xpressprofx.com
ADMIN_PASSWORD=<strong production password>
ADMIN_NOTIFY_EMAIL=alerts@xpressprofx.com

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid api key>
SMTP_FROM=no_reply@xpressprofx.com
SMTP_SECURE=false

ALCHEMY_API_KEY=<alchemy api key>
REFERRAL_REWARD_USD=500
LOG_LEVEL=info
```

### Deploy
```bash
# Trigger automatic build from repo
git push origin main
```

Or manually in Railway dashboard: click "Deploy" button.

### Verify
```bash
curl https://your-railway-app.up.railway.app/healthz
```

Expected response:
```json
{
  "status": "ok",
  "service": "XpressPro FX API",
  "environment": "production"
}
```

---

## 2️⃣ VPS / PM2 Deployment

### Prerequisites
- Ubuntu/Debian VPS with SSH access
- Node.js 20+ and npm 10+
- PostgreSQL (local or remote connection string)

### Installation Script
Run on your VPS:

```bash
#!/bin/bash
set -e

# Update system
sudo apt update
sudo apt install -y curl git build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone repo
cd /var/www
sudo git clone https://github.com/peranza0001/Rebrand-xpfx.git
cd Rebrand-xpfx
sudo git checkout main

# Install dependencies
sudo npm ci --no-audit --no-fund

# Create .env file
sudo tee .env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
ENABLE_DEMO_AUTH=false
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5174

SESSION_SECRET=replace-with-strong-secret
JWT_SECRET=replace-with-strong-secret
COOKIE_SECRET=replace-with-strong-secret
CSRF_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-secret
COOKIE_SIGNING_KEY=replace-with-strong-secret
WALLET_ENCRYPTION_KEY=replace-with-64-char-hex

DATABASE_URL=postgresql://postgres:yourpass@localhost:5432/xpressprofx
DIRECT_DATABASE_URL=postgresql://postgres:yourpass@localhost:5432/xpressprofx

ADMIN_EMAIL=admin@xpressprofx.com
ADMIN_PASSWORD=StrongAdminPass123!
ADMIN_NOTIFY_EMAIL=alerts@xpressprofx.com
REFERRAL_REWARD_USD=500
LOG_LEVEL=info
EOF

# Build
sudo npm run build

# Start with PM2
sudo pm2 start ecosystem.config.cjs --env production
sudo pm2 save
sudo pm2 startup
```

### Nginx Reverse Proxy Setup
```bash
sudo tee /etc/nginx/sites-available/xpressprofx > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name xpressprofx.com www.xpressprofx.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/xpressprofx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Setup (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d xpressprofx.com -d www.xpressprofx.com
```

### Verify
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs xpresspro-api

# Test endpoint
curl http://127.0.0.1:3000/healthz
```

---

## 3️⃣ Vercel Frontend Deployment

### Setup
1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Select this repo: `trevionjamielynn800/Rebrand-xpfx`
3. Framework: **Other** (custom)
4. Build command: `npm ci --no-audit --no-fund && npm run prepare:runtime-secrets && npm run build --workspace=artifacts/nextrade`
5. Output directory: `artifacts/nextrade/dist/public`

### Environment Variables
In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

### API-side CORS
Ensure your API has this in its ALLOWED_ORIGINS:

```env
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,https://your-vercel-project.vercel.app
```

### Deploy
Push to repo and Vercel will auto-deploy:

```bash
git push origin main
```

Or manually click "Deploy" in Vercel dashboard.

### Verify
```bash
curl https://your-vercel-project.vercel.app/
```

---

## Environment Variable Generation

Generate secure random secrets (run locally):

```bash
# 32-byte hex (256-bit) secrets
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('COOKIE_SIGNING_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 64-byte hex (512-bit) wallet encryption key
node -e "console.log('WALLET_ENCRYPTION_KEY=' + require('crypto').randomBytes(64).toString('hex'))"
```

---

## Production Checklist

- [ ] Database provisioned (PostgreSQL)
- [ ] All secrets generated and stored securely
- [ ] ALLOWED_ORIGINS set correctly for your domain
- [ ] ADMIN_EMAIL and ADMIN_PASSWORD set
- [ ] SMTP credentials (SendGrid) configured
- [ ] Blockchain provider (Alchemy) API key added
- [ ] Railway service deployed and running
- [ ] VPS deployed with PM2 and Nginx
- [ ] Vercel frontend deployed
- [ ] SSL/TLS configured (Let's Encrypt on VPS, auto on Railway/Vercel)
- [ ] Health check endpoints responding
- [ ] CORS headers verified for frontend-API communication
- [ ] Admin login tested
- [ ] Reset password link tested
- [ ] Database migrations applied
- [ ] Monitoring/logs configured

---

## Health Check Endpoints

### Railway
```bash
curl https://your-railway-app.up.railway.app/healthz
curl https://your-railway-app.up.railway.app/healthz/db
```

### VPS
```bash
curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/healthz/db
```

### Frontend (Vercel)
```bash
curl https://your-vercel-project.vercel.app/
```

---

## Logs & Debugging

### Railway
- Dashboard → Service → Logs

### VPS / PM2
```bash
# View all logs
pm2 logs

# View specific app
pm2 logs xpresspro-api

# View with line count
pm2 logs xpresspro-api --lines 100

# Clear logs
pm2 flush
```

### Vercel
- Dashboard → Deployments → click deployment → Logs

---

## Rollback

### Railway
Click "Rollback" in deployment history.

### VPS / PM2
```bash
# View saved instances
pm2 save

# Restart
pm2 restart xpresspro-api

# Rollback to previous version (if Git history preserved)
cd /var/www/Rebrand-xpfx
git log --oneline | head -5
git reset --hard <commit-hash>
npm run build
pm2 restart xpresspro-api
```

### Vercel
Click "Rollback" in deployment history.

---

## Support

For issues:
1. Check the [DEPLOYMENT/README.md](DEPLOYMENT/README.md) for detailed guides
2. Review [DEPLOYMENT/RAILWAY_STEPS.md](DEPLOYMENT/RAILWAY_STEPS.md) for Railway-specific steps
3. Check logs (see Logs & Debugging section above)
4. Verify all environment variables are set correctly
5. Ensure ALLOWED_ORIGINS includes your actual domain and preview URLs

---

**Repository:** https://github.com/peranza0001/Rebrand-xpfx
**Deployment Config Last Updated:** 2026-08-14
**API Version:** 1.0.0
