# Tier 8: VPS Deployment & Regression Testing Guide ✅

## Overview
This guide covers deploying the XpressProFX application on a self-hosted VPS (Virtual Private Server) such as AWS EC2, DigitalOcean, Linode, or any Linux-based infrastructure.

## Prerequisites
- Linux server (Ubuntu 22.04 LTS recommended)
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for caching/sessions)
- Nginx or Apache (reverse proxy)
- SSL certificates (Let's Encrypt recommended)
- 2GB+ RAM, 20GB+ disk space

## Server Setup

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Create Application User
```bash
# Create dedicated app user
sudo useradd -m -s /bin/bash xpfx
sudo usermod -aG sudo xpfx

# Set up SSH key for deployment
# Copy your public key to ~/.ssh/authorized_keys
```

### 3. Database Setup
```bash
# Connect to PostgreSQL as admin
sudo -u postgres psql

# Create database and user
CREATE DATABASE xpfx_production;
CREATE USER xpfx_user WITH PASSWORD 'change_me_secure_password';
ALTER ROLE xpfx_user SET client_encoding TO 'utf8';
ALTER ROLE xpfx_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE xpfx_user IN DATABASE xpfx_production GRANT ALL PRIVILEGES ON DATABASE xpfx_production TO xpfx_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO xpfx_user;
\q

# Run migrations
npm run migrate --workspace=lib/db
```

### 4. Clone & Setup Application
```bash
cd /home/xpfx
git clone https://github.com/yourusername/Rebrand-xpfx.git app
cd app

# Install dependencies
npm install

# Create .env file (use .env.example as template)
cp .env.example .env

# Edit .env with production values:
# DATABASE_URL=postgresql://xpfx_user:password@localhost:5432/xpfx_production
# NODE_ENV=production
# PORT=3000
# ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# FRONTEND_URL=https://app.yourdomain.com
# SESSION_SECRET=<generate with: openssl rand -hex 32>
# COOKIE_SECRET=<generate with: openssl rand -hex 32>
```

## Build & Deploy

### 5. Build Application
```bash
# Build API server
npm run build --workspace=artifacts/api-server

# Build frontend
npm run build --workspace=artifacts/nextrade

# Build admin portal
BASE_PATH=/xpadmin npm run build --workspace=artifacts/admin-portal
```

### 6. Start Application with PM2
```bash
# Create PM2 ecosystem.config.js (already in repo)
# Start processes
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Enable PM2 startup
sudo pm2 startup systemd -u xpfx --hp /home/xpfx
```

## Nginx Configuration

### 7. Configure Reverse Proxy
```bash
# Create Nginx config
sudo vim /etc/nginx/sites-available/xpfx

# Add configuration:
upstream api_server {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;
  
  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com www.yourdomain.com;

  # SSL certificates (get from Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;

  # API proxying
  location /api {
    proxy_pass http://api_server;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
  }

  # Socket.IO proxying
  location /socket.io {
    proxy_pass http://api_server/socket.io;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_redirect off;
  }

  # Static files
  location / {
    root /home/xpfx/app/artifacts/nextrade/dist/public;
    try_files $uri $uri/ /index.html;
  }

  # Admin portal
  location /xpadmin {
    root /home/xpfx/app/artifacts/admin-portal/dist/public;
    try_files $uri $uri/ /index.html;
  }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/xpfx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Enable SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured by default
```

## Environment Configuration

### 9. Production Environment Variables
```bash
# Core
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://xpfx_user:password@localhost:5432/xpfx_production

# Security
SESSION_SECRET=<32-byte hex>
COOKIE_SECRET=<32-byte hex>
COOKIE_SIGNING_KEY=${COOKIE_SECRET}

# Frontend URLs
PUBLIC_APP_URL=https://app.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Email
SENDGRID_API_KEY=<your-sendgrid-key>
SMTP_FROM=support@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-password>

# Payment Gateways
PAYSTACK_SECRET_KEY=<paystack-secret>
PAYSTACK_PUBLIC_KEY=<paystack-public>
MOONPAY_API_KEY=<moonpay-key>
MOONPAY_SECRET_KEY=<moonpay-secret>
COINBASE_API_KEY=<coinbase-key>
COINBASE_API_SECRET=<coinbase-secret>

# Blockchain
ALCHEMY_API_KEY=<alchemy-key>

# AI/Chat
AI_INTEGRATIONS_OPENAI_API_KEY=<openai-key>
```

## Monitoring & Maintenance

### 10. Health Checks
```bash
# Check API health
curl https://yourdomain.com/api/healthz

# Check database connection
curl https://yourdomain.com/api/healthz/db

# Check readiness
curl https://yourdomain.com/api/readyz

# View PM2 status
pm2 status
pm2 logs
```

### 11. Backup Strategy
```bash
# Daily database backup
0 2 * * * pg_dump xpfx_production > /backups/xpfx_$(date +\%Y\%m\%d).sql

# S3 backup (optional)
aws s3 sync /backups s3://your-backup-bucket/xpfx-db/
```

### 12. Log Rotation
```bash
# Create logrotate config
sudo vim /etc/logrotate.d/xpfx

# Add:
/home/xpfx/app/logs/*.log {
  daily
  missingok
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 xpfx xpfx
  sharedscripts
}
```

## Regression Testing Checklist

### API Health Checks
- [ ] GET /healthz → 200 OK
- [ ] GET /healthz/db → 200 OK (DB connected)
- [ ] GET /api/readyz → 200 OK (ready for traffic)

### Authentication Flow
- [ ] POST /auth/signup → 200 OTP challenge
- [ ] POST /auth/verify-otp → 200 with session cookie
- [ ] GET /auth/me → 200 with user object
- [ ] POST /auth/logout → 200 and clears session

### Session Management
- [ ] Session cookie (xpfx_sid) present and httpOnly
- [ ] CSRF token endpoint (GET /api/csrf-token) works
- [ ] CSRF validation enforced (POST without token → 403)

### CORS & Security
- [ ] Allowed origins accept requests
- [ ] Disallowed origins return CORS error
- [ ] Security headers present (HSTS, X-Frame-Options, etc.)
- [ ] Trust proxy respects X-Forwarded-* headers

### Trading Features
- [ ] GET /trading pages load
- [ ] Socket.IO /prices namespace connects
- [ ] Real-time price updates flow

### Live Chat
- [ ] POST /api/live-chat sends message
- [ ] AI response received
- [ ] Escalation triggers notification
- [ ] Admin can reply

### Money Operations
- [ ] POST /deposits creates deposit
- [ ] Account tier validation works
- [ ] Payment gateway integration ready

### Admin Features
- [ ] Admin login works
- [ ] Admin panel loads
- [ ] User suspension/unsuspension works
- [ ] Deposit approval flow works

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Verify connection string
PGPASSWORD=password psql -h localhost -U xpfx_user -d xpfx_production -c "SELECT 1"

# Check disk space
df -h
```

### PM2 Issues
```bash
# View detailed logs
pm2 logs

# Check process memory usage
pm2 monit

# Restart processes
pm2 restart all

# Graceful reload (zero-downtime)
pm2 reload all
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Reload nginx
sudo systemctl reload nginx
```

### SSL Certificate Issues
```bash
# Check certificate expiration
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

## Performance Optimization

### Memory Management
- Monitor with: `pm2 monit`
- Increase Node heap if needed: `--max-old-space-size=4096`

### Database Optimization
- Enable query logging: `log_statement='all'` in postgresql.conf
- Create indexes on frequently queried columns
- Run VACUUM regularly: `VACUUM ANALYZE;`

### Caching
- Consider Redis for session caching
- Set appropriate cache headers on static files

## Security Hardening

### Firewall Setup
```bash
# UFW (Uncomplicated Firewall)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Rate Limiting
- Configured in app.ts: Global (100/15min), Auth (30/15min)
- Adjust if needed via environment or app.ts code

### Database Security
- Use strong passwords
- Restrict PostgreSQL to localhost only
- Enable SSL for remote connections if needed

---

**Deployment Status**: COMPLETE ✅
**Tested On**: Ubuntu 22.04 LTS
**Next**: Run regression test checklist and proceed to Tier 9
