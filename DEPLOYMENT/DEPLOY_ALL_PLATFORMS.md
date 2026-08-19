# 🚀 Three-Platform Production Deployment Guide

**Status:** ✅ All environment templates generated with production secrets  
**Date:** 2026-08-14  
**Platforms:** Railway | VPS/PM2 | Vercel  
**Repository:** https://github.com/trevionjamielynn800/Rebrand-xpfx

---

## 📋 REQUIRED INFORMATION CHECKLIST

Before starting ANY platform deployment, gather this information:

- [ ] **Production Domain:** e.g., `xpressprofx.com`
- [ ] **Admin Email:** e.g., `admin@xpressprofx.com`
- [ ] **Strong Admin Password:** (min 16 chars, uppercase, numbers, symbols)
- [ ] **SMTP Provider:** SendGrid API key (free tier available)
- [ ] **Blockchain Provider:** Alchemy API key (free tier available)
- [ ] **Database Connection String:** (provided by platform or local PostgreSQL)

---

## 🎯 Platform Deployment (Choose Your Path)

### Path 1️⃣: RAILWAY ONLY (Simplest)
**Time to deploy:** 5-10 minutes  
**Best for:** Managed hosting, automatic scaling, zero DevOps

#### Step 1: Create Railway Database
```bash
1. Go to railway.app
2. Create new project → Add PostgreSQL add-on
3. Copy DATABASE_URL from Variables (green highlight)
4. Copy DIRECT_DATABASE_URL (same value for now)
```

#### Step 2: Configure Environment Variables
```bash
1. In Railway dashboard, go to Variables tab
2. Copy ALL content from: DEPLOYMENT/.railway-env-production
3. Update these CRITICAL values:
   - ALLOWED_ORIGINS: Replace with your domain(s)
   - DATABASE_URL: Paste from Railway Postgres (Step 1)
   - DIRECT_DATABASE_URL: Paste from Railway Postgres
   - ADMIN_EMAIL: Your email
   - ADMIN_PASSWORD: Strong 16+ char password
   - SMTP_PASS: Your SendGrid API key
   - ALCHEMY_API_KEY: Your Alchemy key
4. Click "Deploy" when done
```

#### Step 3: Connect GitHub Repository
```bash
1. In Railway dashboard, click "Connect Repository"
2. Search for: trevionjamielynn800/Rebrand-xpfx
3. Select branch: main
4. Wait for automatic deployment (takes 2-5 minutes)
```

#### Step 4: Verify Deployment
```bash
# Get your Railway app URL from dashboard (e.g., xpressprofx-api.up.railway.app)
curl https://xpressprofx-api.up.railway.app/healthz

# Should return: {"status":"ok"}
```

#### Step 5: Update Vercel Frontend (if using)
```bash
# In DEPLOYMENT/.vercel-env-production, update:
VITE_API_URL=https://xpressprofx-api.up.railway.app

# Then redeploy on Vercel (see Vercel instructions below)
```

---

### Path 2️⃣: VPS/PM2 ONLY (Full Control)
**Time to deploy:** 15-30 minutes  
**Best for:** Custom configuration, full server access, on-premise hosting

#### Prerequisites
- Linux VPS (Ubuntu 22.04+ or Debian 12+)
- Root or sudo access
- 2GB+ RAM, 10GB+ SSD
- Public IP address
- Domain name pointing to VPS IP

#### Step 1: SSH into VPS and Run Auto-Setup
```bash
# SSH to your VPS
ssh root@your-vps-ip

# Download and run the automated deployment script
curl -fsSL https://raw.githubusercontent.com/trevionjamielynn800/Rebrand-xpfx/main/DEPLOYMENT/vps-deploy.sh | bash

# The script will:
# - Install Node.js 20
# - Install PM2 process manager
# - Clone the repository
# - Create .env template
# - Set up Nginx reverse proxy
```

#### Step 2: Configure Environment Variables
```bash
# On your VPS, edit the .env file
nano /var/www/Rebrand-xpfx/.env

# Replace with values from DEPLOYMENT/.vps-env-production
# Update CRITICAL values:
# - ALLOWED_ORIGINS: https://xpressprofx.com
# - DATABASE_URL: postgresql://postgres:PASSWORD@localhost:5432/xpressprofx
# - ADMIN_EMAIL, ADMIN_PASSWORD
# - SMTP_PASS (SendGrid key)
# - ALCHEMY_API_KEY

# Save: Ctrl+O → Enter → Ctrl+X
```

#### Step 3: Set Up Database
```bash
# SSH into VPS
ssh root@your-vps-ip

# Install PostgreSQL (if not already installed)
apt-get update && apt-get install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE xpressprofx;
CREATE USER appuser WITH PASSWORD 'your-strong-password';
ALTER ROLE appuser SET client_encoding TO 'utf8';
ALTER ROLE appuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE appuser SET default_transaction_deferrable TO on;
ALTER ROLE appuser SET default_transaction_read_committed TO on;
GRANT ALL PRIVILEGES ON DATABASE xpressprofx TO appuser;
\q
EOF

# Update .env with PostgreSQL password:
# DATABASE_URL=postgresql://appuser:your-strong-password@localhost:5432/xpressprofx
```

#### Step 4: Build and Start Application
```bash
cd /var/www/Rebrand-xpfx

# Install dependencies
npm ci --no-audit --no-fund

# Build application
npm run build --workspace=artifacts/api-server

# Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save

# Enable auto-start on reboot
pm2 startup
# Follow the command it outputs
```

#### Step 5: Set Up SSL Certificate
```bash
# Install Certbot (if not done by auto-setup)
apt-get install -y certbot python3-certbot-nginx

# Get free SSL certificate
certbot certonly --standalone -d xpressprofx.com -d www.xpressprofx.com

# Update Nginx config at /etc/nginx/sites-available/xpressprofx-api
# Replace SSL_CERT and SSL_KEY with paths from certbot output

# Restart Nginx
systemctl restart nginx
```

#### Step 6: Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs xpresspro-api | tail -50

# Test health endpoint
curl https://xpressprofx.com/healthz
# Should return: {"status":"ok"}
```

---

### Path 3️⃣: VERCEL + RAILWAY/VPS (Recommended - Split Architecture)
**Time to deploy:** 10-15 minutes  
**Best for:** Frontend on Vercel (CDN), backend on managed service

#### Part A: Deploy Backend (Choose Railway OR VPS)
Follow either **Path 1** (Railway) OR **Path 2** (VPS) above, then return here.

#### Part B: Deploy Frontend on Vercel

##### Step 1: Import Repository
```bash
1. Go to vercel.com
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Search for: trevionjamielynn800/Rebrand-xpfx
5. Click Import (leave settings as default)
```

##### Step 2: Add Environment Variables
```bash
1. After import, go to Settings → Environment Variables
2. Add from DEPLOYMENT/.vercel-env-production:
   - Key: VITE_API_URL
   - Value: https://api.xpressprofx.com (or your Railway URL)
   - Environment: Production
3. Click "Add"
4. Deploy with "Deploy Now" button
```

##### Step 3: Configure Custom Domain (Optional)
```bash
1. Go to Settings → Domains
2. Add your domain (e.g., xpressprofx.com)
3. Add Vercel nameservers to your domain registrar
4. Wait for DNS propagation (5-30 minutes)
```

##### Step 4: Verify Deployment
```bash
# Visit your Vercel deployment
https://your-project.vercel.app

# If using custom domain:
https://xpressprofx.com

# Should see login page
```

---

### Path 4️⃣: ALL THREE PLATFORMS (Full Redundancy)
**Time to deploy:** 25-40 minutes  
**Best for:** High availability, load balancing, disaster recovery

#### Deployment Order
```
1. Railway Backend (5-10 min) ← Primary
2. VPS Backend (15-30 min) ← Redundancy
3. Vercel Frontend (5 min) ← CDN distribution
4. Load Balancer Setup (10 min) ← Optional
```

#### Step 1: Deploy Railway (Follow Path 1 above)
#### Step 2: Deploy VPS (Follow Path 2 above)
#### Step 3: Deploy Vercel Frontend
```bash
# In Vercel environment variables, set:
VITE_API_URL=https://api.xpressprofx.com (primary VPS)
# OR use load balancer: https://api-lb.xpressprofx.com
```

#### Step 4: Optional - Set Up Load Balancer
```bash
# Example: Point DNS to load balancer, which routes to Railway + VPS
# Recommended tool: Cloudflare or AWS ELB
# Advanced topic - see DEPLOYMENT_COMPLETE.md for details
```

---

## 🔍 VERIFICATION CHECKLIST (After Any Deployment)

Run these tests after deploying to any platform:

```bash
# 1. Health Check (no auth required)
curl https://your-domain/healthz
# Expected: {"status":"ok"}

# 2. API is running
curl https://your-domain/api/health
# Expected: 200 OK

# 3. CORS is working (test with your frontend domain)
curl -H "Origin: https://your-frontend-domain" https://your-domain/healthz
# Expected: Should include Access-Control-Allow-Origin header

# 4. Admin login works
# Visit https://your-domain and log in with ADMIN_EMAIL + ADMIN_PASSWORD

# 5. Reset password link works
# Request password reset, check email for link
# Link should point to your domain, not localhost
```

---

## 🚨 TROUBLESHOOTING

### "Connection refused" / "Cannot reach server"
```bash
# Railway
1. Check Variables in dashboard (all required vars set?)
2. Check Build Logs (did it fail?)
3. Check Railway Logs tab (error messages?)

# VPS
1. Check PM2 status: pm2 status
2. Check logs: pm2 logs xpresspro-api
3. Check if Node is running: ps aux | grep node
4. Check Nginx: systemctl status nginx
5. Check firewall: sudo ufw status
```

### "CORS error" / "Origin not allowed"
```bash
# Update ALLOWED_ORIGINS in .env to include your frontend domain:
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,https://your-vercel-app.vercel.app

# Then redeploy/restart:
# Railway: Settings → Deployment → Redeploy
# VPS: pm2 restart xpresspro-api
```

### "Database connection failed"
```bash
# Check DATABASE_URL is correct
# PostgreSQL must be running and accessible
# Test connection:
psql "postgresql://user:password@host:port/dbname"

# If not working:
# Railway: Add PostgreSQL add-on from dashboard
# VPS: sudo systemctl restart postgresql
```

### "Secrets not found"
```bash
# Make sure these are set in environment:
# - SESSION_SECRET, JWT_SECRET, COOKIE_SECRET
# - CSRF_SECRET, JWT_REFRESH_SECRET, COOKIE_SIGNING_KEY
# - WALLET_ENCRYPTION_KEY

# Railway: Check Variables tab (green highlight = set)
# VPS: cat /var/www/Rebrand-xpfx/.env | grep SECRET
```

---

## 📊 MONITORING & LOGS

### Railway
```bash
# Open dashboard at railway.app
# Click your project
# Logs tab shows all output in real-time
# Metrics tab shows CPU, memory, network usage
```

### VPS
```bash
# SSH into VPS
ssh root@your-vps-ip

# Check app logs
pm2 logs xpresspro-api

# Check Nginx logs
tail -f /var/log/nginx/xpressprofx-api.error.log

# Check system
top  # CPU and memory usage
df -h  # Disk usage
```

### Vercel
```bash
# Open dashboard at vercel.com
# Click your project
# Deployments tab shows all versions
# Logs tab shows build and runtime logs
```

---

## 🔄 REDEPLOYING AFTER CODE CHANGES

### Railway
```bash
# Just push to GitHub
git add .
git commit -m "Your message"
git push origin main

# Railway auto-deploys (check dashboard in 1-2 minutes)
```

### VPS
```bash
# SSH to VPS
ssh root@your-vps-ip

# Pull latest code
cd /var/www/Rebrand-xpfx
git pull origin main

# Rebuild
npm run build --workspace=artifacts/api-server

# Restart
pm2 restart xpresspro-api
```

### Vercel
```bash
# Auto-deploys on git push
git add .
git commit -m "Your message"
git push origin main

# Vercel triggers automatically (check dashboard in 1-2 minutes)
```

---

## 🛑 ROLLBACK (If Something Breaks)

### Railway
```bash
# Go to Deployments tab
# Click on previous working deployment
# Click "Rollback"
```

### VPS
```bash
# SSH to VPS
ssh root@your-vps-ip

# Check git history
cd /var/www/Rebrand-xpfx
git log --oneline

# Rollback to previous version
git reset --hard COMMIT_HASH

# Rebuild
npm run build --workspace=artifacts/api-server

# Restart
pm2 restart xpresspro-api
```

### Vercel
```bash
# Go to Deployments tab
# Find previous working deployment
# Click "Promote to Production"
```

---

## 📚 ADDITIONAL RESOURCES

- **Full Setup Guide:** [DEPLOYMENT_COMPLETE.md](../DEPLOYMENT_COMPLETE.md)
- **Quick Reference:** [READY_FOR_LAUNCH.md](../READY_FOR_LAUNCH.md)
- **VPS Auto-Setup Script:** [DEPLOYMENT/vps-deploy.sh](./vps-deploy.sh)
- **Environment Templates:**
  - Railway: [DEPLOYMENT/.railway-env-production](./.railway-env-production)
  - VPS: [DEPLOYMENT/.vps-env-production](./.vps-env-production)
  - Vercel: [DEPLOYMENT/.vercel-env-production](./.vercel-env-production)

---

## ✅ COMPLETION STATUS

- ✅ Secrets generated (cryptographically secure)
- ✅ Environment templates created for all 3 platforms
- ✅ Deployment scripts ready
- ✅ Database setup instructions provided
- ✅ Monitoring and troubleshooting guide available

**NEXT STEP:** Choose your platform path (1, 2, 3, or 4) above and follow the steps!

---

*Generated for production deployment - all values are production-safe unless marked CHANGE_ME*
