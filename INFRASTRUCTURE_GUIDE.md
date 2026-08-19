# 🏗️ XpressPro FX — Complete Infrastructure Guide

**Date**: 2026-08-15  
**Status**: Production Ready  
**Environment**: Railway (Primary) + Docker Compose (Local Dev)  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Infrastructure](#deployment-infrastructure)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Data Infrastructure](#data-infrastructure)
5. [Real-Time Infrastructure](#real-time-infrastructure)
6. [Observability & Monitoring](#observability--monitoring)
7. [Security Infrastructure](#security-infrastructure)
8. [Scaling & Performance](#scaling--performance)
9. [Disaster Recovery](#disaster-recovery)
10. [Operations Runbook](#operations-runbook)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CDN / Edge                                   │
│              (Cloudflare / Vercel Edge Network)                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐     ┌───────▼──────────┐
│  Frontend App    │     │   Static Files   │
│  (Vite + React)  │     │   (CSS, JS, IMG) │
│  Vercel or       │     │   CDN Cached     │
│  Railway         │     │                  │
└───────┬──────────┘     └──────────────────┘
        │
        │ HTTP/WebSocket
        │
┌───────▼──────────────────────────────────────────────────────────┐
│                    Load Balancer (Railway)                        │
└───────┬──────────────────────────────────────────────────────────┘
        │
        │ Reverse Proxy / Rate Limiting
        │
┌───────▼──────────────────────────────────────────────────────────┐
│                   API Gateway / Express                            │
│  ✓ Authentication  ✓ CORS  ✓ CSP  ✓ Rate Limiting              │
└───────┬──────────────────────────────────────────────────────────┘
        │
        ├─────────────────┬───────────────────┬──────────────────┐
        │                 │                   │                  │
┌───────▼────────┐  ┌────▼──────────┐  ┌───▼─────────┐  ┌──────▼──────┐
│ PostgreSQL DB  │  │ Redis Cache   │  │  Socket.IO  │  │  File Store │
│ (User data,    │  │ (Sessions,    │  │  (Real-time │  │  (Uploads)  │
│  Trades,       │  │   Rate limit)  │  │   Prices,   │  │             │
│  Chat)         │  │                │  │   Chat)     │  │             │
└────────────────┘  └────────────────┘  └─────────────┘  └─────────────┘
```

### Core Components

| Component | Technology | Purpose | Status |
|-----------|-----------|---------|--------|
| **Frontend** | Vite + React + TypeScript | Trading dashboard, chat widget, admin panel | ✅ Live |
| **API Server** | Express + Node.js | REST endpoints, WebSocket gateway | ✅ Live |
| **Database** | PostgreSQL 16 | Persistent data storage | ✅ Live |
| **Cache Layer** | Redis 7 | Session storage, rate limiting, caching | ✅ Live |
| **Real-Time** | Socket.IO | Price feeds, chat, orders | ✅ Live |
| **Deployment** | Railway + Docker | Container orchestration | ✅ Live |
| **CI/CD** | GitHub Actions | Automated testing, building, deploying | ✅ Live |

---

## Deployment Infrastructure

### 1. Railway Production Environment

**Current Configuration:**
```yaml
Project: rebrand-xpfx-production-1988
URL: https://rebrand-xpfx-production-1988.up.railway.app
Region: North America (default)
Node Version: 20.x
```

**Railway Configuration File:**
```json
{
  "build": {
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "NODE_ENV=production node artifacts/api-server/dist/index.mjs",
    "healthcheckPath": "/healthz",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Environment Variables Required:**
```
# Database
DATABASE_URL=postgresql://user:password@host/db

# Security
SESSION_SECRET=<32-char-random-string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-password>

# Features
DEMO_AUTH_ENABLED=false
AI_INTEGRATIONS_OPENAI_API_KEY=<optional>

# Email
SENDGRID_API_KEY=<optional>
SMTP_HOST=<optional>
SMTP_PORT=<optional>
SMTP_USER=<optional>
SMTP_PASSWORD=<optional>

# Integrations
MOONPAY_API_KEY=<optional>
ALCHEMY_API_KEY=<optional>
```

**How to Deploy to Railway:**
```bash
# 1. Install Railway CLI
npm install -g railway

# 2. Login
railway login

# 3. Connect to project
railway link rebrand-xpfx-production-1988

# 4. Deploy
railway up

# 5. Monitor
railway logs -f
railway status
```

### 2. Local Development Environment

**Docker Compose Setup:**
```bash
# Start all services
docker-compose up -d

# Services created:
# - api (http://localhost:3000)
# - postgres (localhost:5432)
# - redis (localhost:6379)

# Verify health
docker-compose ps
docker-compose logs -f api

# Stop all
docker-compose down
docker-compose down -v  # Also remove volumes
```

**Local Development Variables:**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://xpressprofx:postgres@localhost:5432/xpressprofx
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev-secret-do-not-use-in-production
```

### 3. Frontend Deployment Options

**Option A: Vercel (Recommended for Frontend)**
```json
{
  "buildCommand": "npm run build --workspace=artifacts/nextrade",
  "outputDirectory": "artifacts/nextrade/dist/public",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://rebrand-xpfx-production-1988.up.railway.app/api/:path*"
    }
  ]
}
```

**Option B: Railway (API + Frontend)**
Both frontend and API served from single Railway app (current setup)

**Option C: Self-Hosted Docker**
Use `infrastructure/docker/Dockerfile` to build and deploy anywhere

---

## CI/CD Pipeline

### GitHub Actions Workflow

**Files:**
- `.github/workflows/ci.yml` — Continuous Integration
- `.github/workflows/deploy.yml` — Production Deployment
- `.github/workflows/verify-production.yml` — Post-deployment verification
- `.github/workflows/db-migrate.yml` — Database migration
- `.github/workflows/e2e-smoke.yml` — Smoke testing

### Continuous Integration Pipeline

```
┌─────────────────────────────────────┐
│  Push to main / Pull Request        │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 1. Code Checkout             │
│    - Node 20.x setup         │
│    - Dependencies cache      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 2. Validation                │
│    ✓ Prisma schema validate  │
│    ✓ Security audit (npm)    │
│    ✓ Audit-ci (strict)       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 3. Quality Checks            │
│    ✓ TypeScript strict       │
│    ✓ ESLint                  │
│    ✓ Unit tests              │
│    ✓ Production env check    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 4. Build                     │
│    ✓ API server (esbuild)    │
│    ✓ Frontend (Vite)         │
│    ✓ Admin portal (Vite)     │
│    ✓ Type definitions        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 5. Artifact Storage          │
│    - 7 day retention         │
│    - Ready for deploy        │
└──────────────────────────────┘
```

### Deployment Pipeline

```
┌─────────────────────────────────────┐
│  Main branch push (after CI pass)   │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 1. Security Audit            │
│    - npm audit high          │
│    - audit-ci strictness     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 2. Quality & Type Checks     │
│    - TypeScript              │
│    - Linting                 │
│    - Test suite              │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 3. Build Production Bundle   │
│    - All workspaces          │
│    - Optimized output        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 4. Deploy to Railway         │
│    - Automatic via webhook   │
│    - Health check            │
│    - Blue-green ready        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 5. Verify Production         │
│    - Smoke tests             │
│    - Route health            │
│    - Database connection     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ✅ Deployment Complete       │
│ Live on production URL       │
└──────────────────────────────┘
```

### Running Workflows Manually

```bash
# Trigger deployment
gh workflow run deploy.yml

# View workflow runs
gh run list

# View specific run logs
gh run view <run-id> --log

# Cancel workflow
gh run cancel <run-id>
```

---

## Data Infrastructure

### PostgreSQL Database

**Current Setup:**
- **Host**: Railway managed Postgres
- **Version**: PostgreSQL 16 (Alpine)
- **User**: xpressprofx
- **Database**: xpressprofx

**Schema Management:**
```bash
# View schema
npx prisma studio

# Create migration
npx prisma migrate dev --name <migration_name>

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

**Database Tables:**
```sql
-- User Management
users
  ├─ id, username, email, password_hash
  ├─ fullName, kycVerified, buyVerified
  ├─ role (admin, user, vip, etc.)
  └─ createdAt, updatedAt

-- Sessions & Auth
sessions
  ├─ id (session ID)
  ├─ userId (foreign key)
  ├─ expiresAt
  └─ createdAt

-- Trading Data
positions
  ├─ id, userId, symbol
  ├─ type (long/short), entryPrice, currentPrice
  ├─ leverage, pnl, pnlPercent
  └─ openTime, closeTime

trades
  ├─ id, userId, symbol
  ├─ status (active, completed, cancelled)
  ├─ amount, profit
  └─ timestamps

-- Live Chat
chat_messages
  ├─ id, userId, content
  ├─ isFromUser, isBot, escalated
  ├─ adminId (if handled by admin)
  └─ timestamps

admin_chats
  ├─ userId, status (open, closed, resolved)
  ├─ lastMessage, messageCount
  └─ timestamps

-- Wallets & Deposits
wallets
  ├─ userId, type (main, savings, etc.)
  ├─ balance, currency
  └─ timestamps

deposits
  ├─ userId, amount, method
  ├─ status (pending, confirmed, rejected)
  └─ reference, timestamps
```

**Backup Strategy:**
```bash
# Manual backup
pg_dump postgresql://user:password@host/db > backup-$(date +%Y%m%d).sql

# Automated backup (Railway)
# ✅ Railway auto-backups daily
# ✅ Retention: 30 days default
# ✅ Access via Railway dashboard

# Restore from backup
psql postgresql://user:password@host/db < backup-20260815.sql
```

### Redis Cache

**Current Setup:**
- **Host**: Railway managed Redis
- **Version**: Redis 7 (Alpine)
- **Memory**: 256 MB (configurable)
- **Persistence**: AOF enabled

**Usage Patterns:**
```javascript
// Session storage
redis.set(`session:${sessionId}`, userData, 'EX', 86400)

// Rate limiting
redis.incr(`rate:${userId}:${minute}`)

// Cache data
redis.setex(`cache:prices:${symbol}`, 60, priceData)

// Real-time presence
redis.zadd(`online_users`, timestamp, userId)
```

**Monitoring Redis:**
```bash
# Connect to Redis CLI
redis-cli -h <host> -p 6379

# Check memory usage
INFO memory

# List keys
KEYS *

# Monitor operations
MONITOR
```

---

## Real-Time Infrastructure

### Socket.IO Namespaces

**Configuration:**
```typescript
// /demo-trading namespace
// ├─ Purpose: Price feeds, order confirmation, position updates
// ├─ Events: price_update, order_filled, position_opened
// └─ Rate: 1 message per second per client

// /live-chat namespace
// ├─ Purpose: Support messages, admin replies
// ├─ Events: message, escalated, reply
// └─ Rate: Unlimited

// /prices namespace
// ├─ Purpose: Market data broadcast
// ├─ Events: subscribe, unsubscribe, price_update
// └─ Rate: 1 second intervals
```

**Connection Flow:**
```
Client
  │
  ├─ Connects to /prices
  │   ├─ Auth via SESSION_COOKIE
  │   ├─ Emits: subscribe(['EUR/USD', 'GBP/USD', ...])
  │   └─ Listens: price_update
  │
  ├─ Connects to /demo-trading
  │   ├─ Auth via SESSION_COOKIE
  │   ├─ Emits: join_instrument('EUR/USD')
  │   └─ Listens: price_update
  │
  └─ Connects to /live-chat
      ├─ Auth via SESSION_COOKIE
      ├─ Emits: send_message, join_conversation
      └─ Listens: message, reply
```

---

## Observability & Monitoring

### Logging Strategy

**Structured Logging:**
```typescript
// Using pino logger (JSON format)
logger.info({ userId, action: 'login_success' }, 'User logged in');
logger.error({ err, userId }, 'Trade execution failed');
logger.warn({ duration_ms: 2500 }, 'Slow query detected');
```

**Log Levels:**
- **DEBUG**: Development only; verbose operation details
- **INFO**: Normal operations; user actions, trades, deployments
- **WARN**: Degraded performance; missing optional features; retries
- **ERROR**: Failed operations; exceptions; service issues
- **FATAL**: System failures; unrecoverable errors

**Log Destinations:**
```
Railway Logs → Dashboard
         ↓
   File Stream (optional)
         ↓
   Elasticsearch (recommended)
         ↓
   Kibana / ELK Stack
```

**View Logs:**
```bash
# Railway logs
railway logs -f

# Filter by service
railway logs -f --service api

# View error logs only
railway logs | grep ERROR
```

### Metrics & Monitoring

**Key Metrics to Track:**

| Metric | Target | Tool |
|--------|--------|------|
| **Availability** | 99.9% uptime | Railway dashboard |
| **Response Time** | <200ms (p95) | Prometheus + Grafana |
| **Error Rate** | <0.1% | Application logs |
| **WebSocket Connections** | <1000 concurrent | Socket.IO dashboard |
| **Database Latency** | <50ms (p95) | PostgreSQL slow query log |
| **Cache Hit Rate** | >80% | Redis INFO |
| **CPU Usage** | <70% peak | Railway metrics |
| **Memory Usage** | <80% peak | Railway metrics |

**Health Checks:**
```bash
# API health
curl https://rebrand-xpfx-production-1988.up.railway.app/healthz

# Database health
curl https://rebrand-xpfx-production-1988.up.railway.app/healthz/db

# Metrics endpoint
curl https://rebrand-xpfx-production-1988.up.railway.app/metrics
```

**Prometheus Metrics Endpoint:**
```
GET /metrics

Outputs:
# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v20.x.x"} 1

# HTTP request metrics
http_requests_total{method="POST",route="/api/auth/login",status="200"} 1234
http_request_duration_seconds{method="GET",route="/dashboard",le="0.5"} 450
```

### Alerting Rules

**Set up alerts for:**
1. Service down (HTTP 5xx errors)
2. High error rate (>1% in 5 min)
3. High latency (p95 > 1s)
4. Database connection pool exhausted
5. Redis memory usage >90%
6. Disk usage >85%
7. Failed deployments
8. Security audit failures

---

## Security Infrastructure

### Authentication & Authorization

**Session Management:**
```
┌─────────────────────────────────────┐
│  User Login                         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Verify Credentials                 │
│  ✓ Username/Email check             │
│  ✓ bcrypt password verify           │
│  ✓ Account status check             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Create Session                     │
│  ✓ Generate SESSION_ID              │
│  ✓ Store in Redis (24h TTL)         │
│  ✓ Set HttpOnly cookie              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Return to Client                   │
│  ✓ Set-Cookie header                │
│  ✓ Secure flag (HTTPS only)         │
│  ✓ HttpOnly flag (JS can't access)  │
│  ✓ SameSite=Lax (CSRF protection)   │
└─────────────────────────────────────┘
```

### Rate Limiting

**Implementation:**
```javascript
// Redis-based rate limiter
const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 60 * 1000,      // 1 minute
  max: 30,                   // 30 requests per window
  standardHeaders: true,     // Return RateLimit headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Apply to routes
app.post('/api/live-chat', limiter, liveChatHandler);
```

**Rate Limit Headers:**
```
RateLimit-Limit: 30
RateLimit-Remaining: 25
RateLimit-Reset: 1691234567
```

### CORS & CSRF Protection

**CORS Configuration:**
```javascript
const allowedOrigins = [
  'https://rebrand-xpfx-production-1988.up.railway.app',
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'http://localhost:3000',  // Dev only
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**CSRF Protection:**
```javascript
// Token endpoint
GET /api/csrf-token
→ Returns: { token: '...', headerName: 'X-CSRF-Token' }

// Use in forms
<form method="POST" action="/api/trades">
  <input type="hidden" name="csrfToken" value="{{ csrfToken }}">
</form>

// Use in AJAX
fetch('/api/trades', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

### Content Security Policy (CSP)

**Current Policy:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' https:
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
img-src 'self' data: https:
connect-src 'self' https: wss:
font-src 'self' data: https://fonts.googleapis.com
object-src 'none'
frame-ancestors 'none'
form-action 'self'
base-uri 'self'
upgrade-insecure-requests
```

---

## Scaling & Performance

### Horizontal Scaling Strategy

**Current State:**
- Single Railway instance (1 dyno)
- Autoscaling available

**Scaling Plan:**

| Users | Instances | Database | Redis | Notes |
|-------|-----------|----------|-------|-------|
| <500 | 1x | Standard | 256MB | Current state |
| 500-2k | 2-3x | Standard+ | 512MB | Load balancing |
| 2k-10k | 5-10x | Advanced | 1GB | Replica setup |
| 10k+ | 10+x | Enterprise | 2GB+ | Geo-distribution |

**Scaling Commands:**
```bash
# Increase Railway resources
railway env:update DYNO_TYPE=standard-2x

# Scale to multiple instances
railway scale web=3

# Monitor scaling
railway logs -f | grep scaling
```

### Performance Optimization

**Frontend Optimization:**
```javascript
// Code splitting
import { lazy, Suspense } from 'react';
const DemoTradingPage = lazy(() => import('./pages/demo-trading'));

// Image optimization
<img 
  src="image.jpg" 
  srcSet="image-small.jpg 480w, image.jpg 800w"
  loading="lazy"
/>

// Bundle analysis
npm run build
npx vite-bundle-visualizer
```

**Backend Optimization:**
```javascript
// Connection pooling
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query caching
const cachedResult = await redis.get(`query:${hash}`);
if (!cachedResult) {
  const result = await db.query(sql);
  await redis.setex(`query:${hash}`, 300, JSON.stringify(result));
  return result;
}

// Index optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_positions_userId_status ON positions(userId, status);
```

### CDN Strategy

**Static Asset Caching:**
```
Frontend Build
  ├─ HTML (Cache-Control: max-age=0)
  ├─ JS/CSS (Cache-Control: max-age=31536000, immutable)
  ├─ Images (Cache-Control: max-age=604800)
  └─ Fonts (Cache-Control: max-age=2592000)
```

**Recommended CDN Setup:**
1. **Vercel (if using Vercel for frontend)** — Automatic
2. **Cloudflare (recommended)** — Add as CNAME, cache everything
3. **AWS CloudFront** — Origin: Railway, Cache rules per asset type

---

## Disaster Recovery

### Backup Strategy

**Daily Backups:**
```bash
# Automated (Railway)
✅ Database backups: Daily, 30-day retention
✅ Configuration snapshots: Git commits

# Manual backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql.gz

# Backup storage location
~/backups/ (local)
S3 bucket (recommended)
GitHub Releases (small databases)
```

### Recovery Procedures

**Database Recovery:**
```bash
# 1. Restore from Railway backup
railway database restore <backup-id>

# 2. Or restore from manual backup
psql $DATABASE_URL < backup-20260815.sql
npx prisma migrate deploy

# 3. Verify integrity
npx prisma studio
SELECT COUNT(*) FROM users;
```

**Application Recovery:**
```bash
# 1. Redeploy previous working version
git revert <commit-hash>
git push origin main
# Railway auto-redeploys

# 2. Or manual rollback
railway deploy --detach <previous-build-id>

# 3. Verify services
curl https://rebrand-xpfx-production-1988.up.railway.app/healthz
```

### Incident Response

**Response Matrix:**

| Incident | Severity | Response Time | Action |
|----------|----------|---------------|--------|
| API timeout | High | 5 min | Check database, restart service |
| Database down | Critical | 1 min | Failover to backup, restore |
| Memory leak | High | 10 min | Restart service, investigate logs |
| Data corruption | Critical | 1 min | Restore from backup, verify |
| Security breach | Critical | 1 min | Revoke credentials, audit logs |
| DDoS attack | High | 5 min | Enable Cloudflare, increase limits |

**Post-Incident Checklist:**
- [ ] Root cause analysis (RCA) documented
- [ ] Timeline of events recorded
- [ ] Customer communication sent
- [ ] Code fix implemented
- [ ] Tests added to prevent recurrence
- [ ] Monitoring rule added to detect early
- [ ] Team debriefing scheduled

---

## Operations Runbook

### Daily Operations

**Morning Checklist:**
```bash
# 1. Health check
railway status
curl https://rebrand-xpfx-production-1988.up.railway.app/healthz

# 2. View logs for errors
railway logs -f | grep -i error
railway logs -f | grep -i warn

# 3. Check metrics
# → Visit Railway dashboard
# → Check CPU, Memory, Network

# 4. Database check
npx prisma studio
# → Verify recent transactions
# → Check active connections
```

**Weekly Operations:**

```bash
# 1. Run security audit
npm audit

# 2. Check for performance regressions
# → Compare metrics with baseline
# → Review slow query log

# 3. Backup verification
# → Test restore from backup

# 4. Dependency updates
npm outdated
npm update --save
```

**Monthly Operations:**

```bash
# 1. Security patch review
npm audit fix

# 2. Performance optimization review
# → Analyze unused dependencies
# → Review bundle size

# 3. Capacity planning
# → Review traffic trends
# → Plan for scaling

# 4. Disaster recovery drill
# → Test backup restore
# → Verify failover procedures
```

### Common Troubleshooting

**Issue: API timeout**
```bash
# 1. Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# 2. Check active connections
SELECT count(*) FROM pg_stat_activity;

# 3. Restart service
railway restart web

# 4. Scale if needed
railway scale web=2
```

**Issue: Memory leak**
```bash
# 1. Monitor memory
railway logs | grep "memory usage"

# 2. Identify leaking code
node --inspect artifacts/api-server/dist/index.mjs
# → Use Chrome DevTools for profiling

# 3. Deploy fix
git push origin main

# 4. Verify resolution
railway logs -f | grep "memory"
```

**Issue: WebSocket disconnections**
```bash
# 1. Check Socket.IO health
# → Look for "connection" and "disconnect" logs
railway logs | grep Socket.IO

# 2. Verify CORS is correct
# → Check browser console for CORS errors

# 3. Restart Socket.IO server
railway restart

# 4. Client should auto-reconnect
```

---

## Infrastructure Checklist

### Production Ready ✅

- [x] Application deployed to Railway
- [x] Database configured (PostgreSQL)
- [x] Redis cache configured
- [x] Socket.IO real-time working
- [x] Health checks configured
- [x] HTTPS/TLS enabled
- [x] CORS properly configured
- [x] Rate limiting active
- [x] CSRF protection enabled
- [x] CSP headers set
- [x] Logging configured
- [x] Error monitoring enabled
- [x] Backups configured
- [x] CI/CD pipelines active

### Recommended Enhancements

- [ ] APM tool (Datadog, New Relic)
- [ ] Centralized logging (ELK, CloudWatch)
- [ ] CDN setup (Cloudflare, Vercel)
- [ ] Staging environment
- [ ] Load testing suite
- [ ] Chaos engineering tests
- [ ] Multi-region deployment
- [ ] Backup to S3
- [ ] Incident management tool (PagerDuty)
- [ ] Synthetic monitoring

---

## Infrastructure Costs

### Current Setup (Estimated Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Railway App | 1x Standard | $7-12 |
| Railway Database | PostgreSQL 16 | $15 |
| Railway Redis | 256MB | $5 |
| GitHub Actions | 2000 min/month | Free |
| **Total** | | **~$27-32/month** |

### Scaled Setup (For 10k+ users)

| Service | Usage | Cost |
|---------|-------|------|
| Railway App | 5-10x | $50-100 |
| Railway Database | Advanced | $50-100 |
| Railway Redis | 1GB | $15-25 |
| CDN (Cloudflare) | Pro | $20 |
| Monitoring (Datadog) | APM | $30-50 |
| **Total** | | **~$165-295/month** |

---

## Support & Resources

### Documentation
- [Railway Docs](https://docs.railway.app)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Socket.IO Guide](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)

### Getting Help
1. **Logs**: `railway logs -f`
2. **Status**: `railway status`
3. **Dashboard**: railway.app/dashboard
4. **GitHub Issues**: Create issue in repository
5. **Community**: Railway Discord

---

**Last Updated**: 2026-08-15  
**Status**: Production Ready  
**Next Review**: 2026-09-15
