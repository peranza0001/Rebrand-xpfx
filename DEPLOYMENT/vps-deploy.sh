#!/bin/bash
#
# XpressPro FX — Automated VPS Deployment Script
# Usage: bash vps-deploy.sh
#
# This script sets up a complete production environment on Ubuntu/Debian VPS
# including Node.js, PM2, Nginx, PostgreSQL client, SSL with Let's Encrypt, and the app.
#

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  XpressPro FX — VPS Production Deployment                    ║"
echo "║  Target: Ubuntu/Debian 20.04+                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use: sudo bash vps-deploy.sh)"
fi

# Step 1: Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Step 2: Install dependencies
log_info "Installing build tools and utilities..."
apt-get install -y curl git build-essential wget nano htop

# Step 3: Install Node.js 20
log_info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js and npm
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
log_info "Node.js installed: $NODE_VERSION"
log_info "npm installed: $NPM_VERSION"

# Step 4: Install PM2 globally
log_info "Installing PM2..."
npm install -g pm2

# Step 5: Install Nginx
log_info "Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# Step 6: Install PostgreSQL client (for remote DB connections)
log_info "Installing PostgreSQL client..."
apt-get install -y postgresql-client

# Step 7: Install Certbot for SSL
log_info "Installing Certbot for SSL/TLS..."
apt-get install -y certbot python3-certbot-nginx

# Step 8: Clone repository
log_info "Cloning repository..."
if [ ! -d "/var/www/Rebrand-xpfx" ]; then
  mkdir -p /var/www
  cd /var/www
  git clone https://github.com/peranza0001/Rebrand-xpfx.git
  cd Rebrand-xpfx
else
  cd /var/www/Rebrand-xpfx
  git pull origin main
fi

# Step 9: Set permissions
log_info "Setting directory permissions..."
chown -R $SUDO_USER:$SUDO_USER /var/www/Rebrand-xpfx

# Step 10: Install dependencies
log_info "Installing Node.js dependencies..."
sudo -u $SUDO_USER npm ci --no-audit --no-fund

# Step 11: Build the application
log_info "Building the application..."
sudo -u $SUDO_USER npm run build

# Step 12: Create .env file (user fills in values)
log_info "Creating .env file template..."
if [ ! -f "/var/www/Rebrand-xpfx/.env" ]; then
  cp DEPLOYMENT/VPS_ENV_PRODUCTION.env .env
  log_warn "⚠️  IMPORTANT: Edit /var/www/Rebrand-xpfx/.env with your production secrets"
  log_warn "    vim /var/www/Rebrand-xpfx/.env"
  log_warn "    Then run: sudo pm2 start ecosystem.config.cjs --env production"
else
  log_warn ".env file already exists, skipping template creation"
fi

# Step 13: Create logs directory
log_info "Creating logs directory..."
mkdir -p /var/www/Rebrand-xpfx/logs
chown -R $SUDO_USER:$SUDO_USER /var/www/Rebrand-xpfx/logs

# Step 14: PM2 startup hook
log_info "Setting up PM2 to auto-start on system boot..."
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# Step 15: Create Nginx configuration
log_info "Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/xpressprofx << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name xpressprofx.com www.xpressprofx.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name xpressprofx.com www.xpressprofx.com;

    # SSL certificates (to be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/xpressprofx.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/xpressprofx.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to PM2 app
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no redirect)
    location /healthz {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/xpressprofx /etc/nginx/sites-enabled/xpressprofx
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if nginx -t; then
  log_info "Nginx configuration is valid"
  systemctl reload nginx
else
  log_error "Nginx configuration test failed"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Installation Complete!                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure environment variables:"
echo "   sudo nano /var/www/Rebrand-xpfx/.env"
echo ""
echo "2. Start the application:"
echo "   cd /var/www/Rebrand-xpfx"
echo "   sudo pm2 start ecosystem.config.cjs --env production"
echo "   sudo pm2 save"
echo ""
echo "3. Setup SSL certificate (replace xpressprofx.com with your domain):"
echo "   sudo certbot certonly --nginx -d xpressprofx.com -d www.xpressprofx.com"
echo ""
echo "4. Verify deployment:"
echo "   curl http://127.0.0.1:3000/healthz"
echo "   curl https://xpressprofx.com/healthz"
echo ""
echo "5. Monitor logs:"
echo "   pm2 logs xpresspro-api"
echo ""
echo "📚 Documentation:"
echo "   - Full guide: /var/www/Rebrand-xpfx/DEPLOYMENT_COMPLETE.md"
echo "   - PM2 status: pm2 status"
echo "   - PM2 monit: pm2 monit"
echo ""
