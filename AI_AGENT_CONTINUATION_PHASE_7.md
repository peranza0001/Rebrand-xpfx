# AI Agent Continuation Guide — Phase 7 & Beyond

**Status Date**: 2026-08-16  
**Latest Commit**: `e6ee03b` — Phase 6: Middleware stability fixes  
**Branch**: `main` (production-ready)

---

## Executive Summary

This is a **regulated fintech forex & broker trading platform** built for production-grade security and compliance. The project has completed **6 phases** of enterprise hardening and is now ready for the next level of work.

### Current Production State ✅
- ✅ **Phase 1**: Security hardening (Helmet, CORS, CSP, rate limiting)
- ✅ **Phase 2**: Health checks & metrics (Kubernetes-ready, Prometheus)
- ✅ **Phase 3**: Auth hardening (RBAC, account lockout, session timeout)
- ✅ **Phase 4**: Compliance scaffolding (KYC/AML provider abstraction, audit logs)
- ✅ **Phase 5**: Resilience & observability (multi-region failover helpers, Sentry-ready APM)
- ✅ **Phase 6**: Middleware stability (auth contracts fixed, CSRF double-application hang resolved)

### Build Status
```bash
npm run build --workspace=artifacts/api-server  # ✅ Passes
npm test                                         # ⚠️ Long timeout (see Testing below)
```

---

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js 20.x + TypeScript
- **Framework**: Express.js (API server)
- **Database**: PostgreSQL + Prisma ORM + Drizzle
- **Frontend**: Next.js (artifacts/nextrade)
- **Admin Portal**: Separate portal (artifacts/admin-portal)
- **Deployment**: Railway, Vercel, Docker Compose
- **Observability**: Pino logging, Prometheus metrics, Sentry-ready hooks

### Directory Structure
```
artifacts/
  ├── api-server/         # Main Express API
  │   ├── src/
  │   │   ├── app.ts      # Main Express app, middleware orchestration
  │   │   ├── routes/     # Route modules (auth, kyc-aml, audit, etc.)
  │   │   └── lib/        # Core services (session, RBAC, compliance, etc.)
  │   └── build.mjs       # esbuild compilation
  ├── nextrade/           # Frontend SPA
  └── admin-portal/       # Admin dashboard
lib/
  └── db/                 # Database connection & schema
tests/
  ├── app-readiness.test.mjs      # Health checks & security tests
  ├── production-env.test.mjs      # Env validation
  ├── demo-auth.test.mjs           # Demo auth flow
  └── ...
```

### Key API Endpoints
```
# Authentication
POST   /api/auth/login
POST   /api/auth/signup
POST   /api/auth/logout
POST   /api/auth/verify-otp
GET    /api/auth/demo

# Compliance & KYC/AML
POST   /api/verify/kyc/verify/start
GET    /api/verify/kyc/verify/status/:verificationId
POST   /api/verify/aml/screen
GET    /api/verify/compliance/status
GET    /api/verify/compliance/can-trade

# Audit & Admin
GET    /api/audit/events
POST   /api/audit/event
GET    /api/admin/*

# Monitoring
GET    /health, /healthz, /livez, /readyz
GET    /metrics (Prometheus exposition format)
GET    /api/monitoring/status
GET    /api/monitoring/apm
GET    /api/monitoring/test-error
```

---

## Current Implementation Details

### Authentication & Authorization (Phase 3)
**File**: [artifacts/api-server/src/routes/auth.ts](artifacts/api-server/src/routes/auth.ts)

- ✅ Session-based auth with signed cookies
- ✅ Account lockout after 5 failed attempts (15-min duration)
- ✅ Session idle timeout (30 min) + max lifetime (24 hours)
- ✅ RBAC middleware (`requireAdminRole()`, `requireRole()`)
- ✅ Password reset flow with token-based verification

**Key Middleware**: [artifacts/api-server/src/lib/session.ts](artifacts/api-server/src/lib/session.ts)
- `attachSession()` - Resolves session from signed cookie
- `requireAuth()`, `requireFullAuth()`, `requireAdmin()` - Auth guards
- `setSessionCookie()`, `clearSessionCookie()` - Session management

### KYC/AML Compliance (Phase 4)
**File**: [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts)

- ✅ Provider-agnostic abstraction layer
- ✅ Mocked Onfido, Complyadvantage, and Socure providers
- ✅ Fallback to mock providers if env vars not set
- ⏳ **NOT YET INTEGRATED**: Real provider APIs (need credentials)

**Compliance Status Tracking**: [artifacts/api-server/src/lib/compliance-status.ts](artifacts/api-server/src/lib/compliance-status.ts)
- Tracks KYC, AML, document verification, and approval status
- Provides `getUserComplianceStatus()` for frontend

### Audit Logging (Phase 4)
**File**: [artifacts/api-server/src/lib/audit-log.ts](artifacts/api-server/src/lib/audit-log.ts)

- ✅ Signed audit trail with HMAC chain hashing
- ✅ Tamper-detection via `verifyAuditChain()`
- ✅ Exposed via `/api/audit/events`
- ⏳ **ENHANCEMENT NEEDED**: Database persistence (currently in-memory)

### Multi-Region & Failover (Phase 5)
**File**: [artifacts/api-server/src/lib/multi-region.ts](artifacts/api-server/src/lib/multi-region.ts)

- ✅ Region status tracking
- ✅ Failover promotion/demotion helpers
- ⏳ **NOT YET INTEGRATED**: Real Railway/Vercel multi-region setup

### Observability & APM (Phase 5)
**File**: [artifacts/api-server/src/lib/observability.ts](artifacts/api-server/src/lib/observability.ts)

- ✅ Sentry-ready error capture hooks
- ✅ Request metric tracking
- ✅ Unhandled exception & promise rejection handlers
- ⏳ **NOT YET INTEGRATED**: Live Sentry account

### Security Hardening (Phase 1-2)
**File**: [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts)

- ✅ Helmet.js security headers
- ✅ CORS with origin validation
- ✅ Double-CSRF protection (csrf-csrf library)
- ✅ Rate limiting (global, auth, live-chat)
- ✅ No-store cache headers on sensitive endpoints
- ✅ HTTPS redirect (production only)
- ✅ Content Security Policy (CSP)

---

## Known Issues & Fixes (Phase 6)

**Fixed in Last Commit** (`e6ee03b`):
1. ✅ Auth middleware contract — removed `()` invocation from route usage
2. ✅ CSRF double-application hang — excluded `/api/csrf-token` from global middleware

**Still TODO**:
- In-memory store persistence (sessions, audit logs) → needs Redis or DB upgrade
- KYC/AML provider credentials → needs live API keys
- Sentry integration → needs DSN and account setup
- Multi-region deployment → needs Railway app configuration

---

## Testing & Validation

### Quick Test
```bash
npm run build --workspace=artifacts/api-server  # Validates TypeScript & build
```

### Full Test Suite (⚠️ Long timeout)
```bash
npm test  # Runs app-readiness, production-env, demo-auth, etc.
```
**Note**: Full suite can take 5-10 minutes due to test server lifecycle. Individual tests are fast; the hang is in teardown or specific CSRF tests.

### Manual Server Start
```bash
cd artifacts/api-server
NODE_ENV=development npm run dev  # Watch mode (if available)
# or
npm run build && node dist/app.js
```

---

## Next Phases (Phase 7 & Beyond)

### **Phase 7: Real Provider Integration** (Recommended Next)
**Objective**: Wire live KYC/AML vendors instead of mocks.

**Steps**:
1. **Onfido Integration**
   - Obtain API key from [Onfido Console](https://onfido.com)
   - Update [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts) line ~50
   - Add `ONFIDO_API_KEY` to `.env`
   - Test with sample user flow

2. **Complyadvantage Integration**
   - Get API key from Complyadvantage
   - Implement AML screening in [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts)
   - Add `COMPLYADVANTAGE_API_KEY` to `.env`

3. **Test Coverage**
   - Add integration tests to `tests/kyc-aml-integration.test.mjs`
   - Validate compliance status flows
   - Test fallback behavior when provider is down

**Files to Modify**:
- [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts) (main implementation)
- [artifacts/api-server/src/routes/kyc-aml.ts](artifacts/api-server/src/routes/kyc-aml.ts) (routes — already functional)
- `.env`, `.env.production.example` (credentials)
- `tests/kyc-aml-integration.test.mjs` (new test file)

**Estimated Effort**: 4-6 hours  
**Commit Message Pattern**: `feat: add Phase 7 real Onfido/Complyadvantage KYC/AML integration`

---

### **Phase 8: Data Persistence Upgrade** (Parallel/After Phase 7)
**Objective**: Move from in-memory stores to Redis/PostgreSQL for scalability.

**Current In-Memory Stores**:
- Sessions: `Map` in [artifacts/api-server/src/lib/store.ts](artifacts/api-server/src/lib/store.ts)
- Audit logs: Array in [artifacts/api-server/src/lib/audit-log.ts](artifacts/api-server/src/lib/audit-log.ts)
- KYC verification results: `Map` in [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts)

**Steps**:
1. Add Redis client to `lib/db/redis-client.ts`
2. Update session middleware to use Redis with DB fallback
3. Persist audit logs to PostgreSQL
4. Cache KYC results in Redis with TTL

**Files to Create/Modify**:
- `lib/db/redis-client.ts` (new)
- [artifacts/api-server/src/lib/db-client.ts](artifacts/api-server/src/lib/db-client.ts) (update)
- [artifacts/api-server/src/lib/session.ts](artifacts/api-server/src/lib/session.ts) (enhance)
- [artifacts/api-server/src/lib/audit-log.ts](artifacts/api-server/src/lib/audit-log.ts) (enhance)
- `prisma/schema.prisma` (add AuditLog, KYCVerification tables)

**Estimated Effort**: 6-8 hours  
**Commit Message Pattern**: `feat: Phase 8 Redis and PostgreSQL persistence layer upgrade`

---

### **Phase 9: End-to-End Compliance Testing**
**Objective**: Validate complete regulatory workflows.

**Test Scenarios**:
1. User signup → KYC verification → AML screening → trade approval
2. Audit trail integrity → verify chain signatures
3. Session security → lockout, timeout, logout
4. Admin workflows → user approval, compliance overrides

**Files to Create**:
- `tests/e2e-compliance.test.mjs` (full workflow)
- `tests/regulatory-validation.test.mjs` (data validation)

**Estimated Effort**: 3-4 hours

---

### **Phase 10: Multi-Region Deployment**
**Objective**: Actual Railway/Vercel configuration for failover.

**Steps**:
1. Create secondary Railway project (`xpresspro-fx-api-secondary`)
2. Update `railway.json` with multi-app config
3. Configure DNS failover
4. Test region status API endpoints
5. Implement actual failover logic

**Files to Modify**:
- [railway.json](railway.json)
- [docker-compose.yml](docker-compose.yml)
- [artifacts/api-server/src/lib/multi-region.ts](artifacts/api-server/src/lib/multi-region.ts) (enhance)

**Estimated Effort**: 4-6 hours

---

### **Phase 11: Performance Optimization**
**Objective**: Database indexing, caching, query optimization.

**Areas**:
- Add indexes on `userId`, `verificationId`, audit query columns
- Cache user compliance status in Redis
- Optimize auth rate limiter storage
- Profile API endpoints under load

**Estimated Effort**: 3-4 hours

---

## Getting Started (New Agent)

### 1. Verify Current State
```bash
# Pull latest
git pull origin main

# Verify build
npm run build --workspace=artifacts/api-server

# Check git history
git log --oneline -10
```

### 2. Understand the Codebase
- **Start**: Read [README.md](README.md)
- **Architecture**: See `artifacts/api-server/src/app.ts` (middleware ordering)
- **Routes**: Explore `artifacts/api-server/src/routes/index.ts`
- **Services**: Review `artifacts/api-server/src/lib/` (one per concern)

### 3. Run Local Tests
```bash
npm run build --workspace=artifacts/api-server  # Fast validation
npm test                                         # Full suite (slow)
```

### 4. Pick Your Phase
- **Phase 7** ← Recommended: Quick win with high impact (real providers)
- **Phase 8** ← Foundation: Persistence for scale
- **Phase 9** ← Compliance: Risk mitigation
- **Phase 10** ← Infrastructure: Resilience
- **Phase 11** ← Performance: Optimization

### 5. Follow the Strict Rule
**ALWAYS commit and push to `origin main` after each atomic change or phase:**
```bash
git add -A
git commit -m "feat: Phase X [description]

- Change 1
- Change 2
- etc."
git push origin main
```

---

## Environment Variables

### Required (All Environments)
```
NODE_ENV=production              # or development
SESSION_SECRET=<random-secret>   # Session signing key
COOKIE_SECRET=<random-secret>    # Cookie signing key
ALLOWED_ORIGINS=https://example.com,https://app.example.com
```

### Optional (Provider Integration)
```
ONFIDO_API_KEY=<onfido-key>                    # Phase 7
COMPLYADVANTAGE_API_KEY=<complyadvantage-key> # Phase 7
SOCURE_API_KEY=<socure-key>                    # Phase 7
SENTRY_DSN=<sentry-dsn>                        # Phase 5 enhancement
REDIS_URL=redis://localhost:6379              # Phase 8
```

See `.env.production.example` for full list.

---

## Key Files Reference

| File | Purpose | Phase |
|------|---------|-------|
| [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts) | Main Express app, middleware orchestration | 1-2 |
| [artifacts/api-server/src/routes/auth.ts](artifacts/api-server/src/routes/auth.ts) | Auth endpoints, login/logout/signup | 3 |
| [artifacts/api-server/src/lib/session.ts](artifacts/api-server/src/lib/session.ts) | Session middleware, auth guards | 3 |
| [artifacts/api-server/src/lib/kyc-provider.ts](artifacts/api-server/src/lib/kyc-provider.ts) | KYC/AML provider abstraction | 4, 7 |
| [artifacts/api-server/src/routes/kyc-aml.ts](artifacts/api-server/src/routes/kyc-aml.ts) | KYC/AML endpoints | 4 |
| [artifacts/api-server/src/lib/audit-log.ts](artifacts/api-server/src/lib/audit-log.ts) | Audit trail, signed chain | 4, 8 |
| [artifacts/api-server/src/lib/multi-region.ts](artifacts/api-server/src/lib/multi-region.ts) | Region status, failover helpers | 5, 10 |
| [artifacts/api-server/src/lib/observability.ts](artifacts/api-server/src/lib/observability.ts) | APM, error capture, Sentry hooks | 5 |
| [artifacts/api-server/src/routes/monitoring.ts](artifacts/api-server/src/routes/monitoring.ts) | Health & monitoring endpoints | 5 |

---

## Important Notes

1. **Middleware Order Matters**: See [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts) line ~240+ for correct ordering
2. **CSRF Protection**: GET requests bypass CSRF; POST/PUT/PATCH/DELETE are protected or skipped for trusted origins
3. **In-Memory Limits**: Current stores will lose data on restart — Phase 8 upgrades this
4. **Provider Fallback**: KYC/AML default to mocks if env vars missing (good for testing, bad for production)
5. **Audit Chain**: Breaking the audit log chain will be detected by `verifyAuditChain()` — useful for compliance audits

---

## Success Criteria for Next Phase

When Phase 7 (Provider Integration) is complete:
- ✅ KYC verification works with real Onfido API
- ✅ AML screening works with real Complyadvantage API
- ✅ Tests pass for provider integration
- ✅ Build succeeds
- ✅ Commit pushed to `origin main`

---

**Questions?** Refer to the phase-specific sections above or review the most recent commit (`e6ee03b`) for patterns and style.

**Good luck! 🚀**
