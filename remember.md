# XpressPro FX — AI Model Memory & Quick Reference

**Last Updated**: 2026-08-13  
**For**: Any AI model continuing work on this project

---

## 🎯 PROJECT ESSENCE (Read First!)

**XpressPro FX** is an **enterprise-grade forex trading platform** with:
- Real-time trading engine (forex, crypto, commodities)
- Multi-currency wallet management (USD, EUR, GBP, BTC, ETH)
- Investment management (managed accounts, fund managers)
- Admin governance with mandatory approval workflows
- KYC/AML compliance framework
- Payment processing (Moonpay, Paystack, Coinbase)
- P2P trading and messaging
- Demo trading (risk-free practice accounts)

**Type**: Fintech Platform (Broker + Trading Infrastructure)  
**Status**: Production-Ready, Enterprise Grade  
**Deployment**: Railway (primary), Docker, VPS, Render, Replit  

---

## 📊 PROJECT STRUCTURE AT A GLANCE

```
Rebrand-xpfx/
├── artifacts/                    # Main application code
│   ├── api-server/              # Express.js backend (port 8082)
│   │   ├── src/app.ts           # Express setup & middleware
│   │   ├── src/index.ts         # Server entry point
│   │   └── src/routes/          # API endpoints (35+ route groups)
│   ├── nextrade/                # React frontend (port 5173)
│   ├── admin-portal/            # Admin UI (port 5175)
│   └── mockup-sandbox/          # Demo/testing
│
├── lib/                          # Shared libraries
│   ├── api-client-react/        # React query client
│   ├── api-spec/                # OpenAPI specification
│   ├── api-zod/                 # Zod validation schemas
│   └── db/                      # Database utilities
│
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema (15+ tables)
│   └── migrations/              # Version-controlled DB migrations
│
├── scripts/                      # Utility scripts
│   ├── e2e-otp-test.mjs        # OTP testing
│   ├── smoke-test.mjs           # Health checks
│   └── predeploy.mjs            # Pre-deployment validation
│
├── tests/                        # Test suites
│   ├── app-readiness.test.mjs
│   ├── auth-flow.test.mjs
│   ├── auth-throttle.test.mjs
│   ├── db-connection.test.mjs
│   ├── production-env.test.mjs
│   └── ...
│
├── docs/                         # 📚 FULL DOCUMENTATION
│   ├── PRD.md                   # Product Requirements Document
│   ├── TECH_STACK.md            # Technology stack details
│   ├── ARCHITECT.md             # System architecture
│   ├── RULES.md                 # Development standards
│   └── REMEMBER.md              # Quick reference guide
│
├── .github/workflows/            # GitHub Actions CI/CD
├── railway.json                  # Railway deployment config
├── docker-compose.yml            # Self-hosted Docker setup
├── package.json                  # Root workspace config
└── README.md                     # Project overview
```

---

## 🚀 QUICKSTART COMMANDS

### Setup (First Time)
```bash
git clone https://github.com/trevionjamielynn800/Rebrand-xpfx.git
cd Rebrand-xpfx
npm ci                           # Use ci for production
cp .env.example .env             # Fill in DATABASE_URL
npx prisma migrate deploy        # Run database migrations
```

### Development
```bash
# Terminal 1: Backend API
npm --workspace=artifacts/api-server run dev      # http://localhost:8082

# Terminal 2: Frontend UI
npm --workspace=artifacts/nextrade run dev        # http://localhost:5173

# Terminal 3: Admin Portal
npm --workspace=artifacts/admin-portal run dev    # http://localhost:5175
```

### Build & Test
```bash
npm run build                    # Build all workspaces
npm run lint                     # ESLint check
npm run typecheck                # TypeScript validation
npm test                         # Full test suite
npm run predeploy                # Production readiness check
```

### Database
```bash
# View current schema
npx prisma studio               # Opens Prisma UI at http://localhost:5555

# Create migration (after schema.prisma change)
npx prisma migrate dev --name descriptive_name

# Reset database (dev only - DESTRUCTIVE)
npx prisma migrate reset
```

---

## 🏗️ CRITICAL ARCHITECTURE PATTERNS

### Auth Flow (Session-Based)
1. User POST `/api/auth/login` with email + password
2. Server validates against bcryptjs hash (12 rounds)
3. Session created + stored in database
4. Session ID sent as HTTP-only cookie
5. All requests check session validity
6. Logout clears session

### Request Lifecycle (9 Steps)
1. **Routing**: Express matches URL to handler
2. **Auth**: Session/JWT validation
3. **Parsing**: Body/query parameters
4. **Validation**: Zod runtime schema check
5. **Authorization**: User permissions check
6. **Processing**: Business logic execution
7. **Database**: Prisma queries
8. **Response**: JSON serialization
9. **Logging**: Pino logger records event

### WebSocket Flow (Real-Time Updates)
- Socket.io connection established on login
- Namespaces: `/trades`, `/wallets`, `/notifications`
- Client joins room based on user ID
- Server broadcasts updates via room
- Client updates React state → re-render

### Admin Approval Workflow (CRITICAL RULE)
```
User Initiates Withdrawal
    ↓
Status: PENDING_APPROVAL
    ↓
Admin reviews + approves (optional 2FA/OTP)
    ↓
Status: APPROVED
    ↓
Processing begins (blockchain/bank)
    ↓
Status: COMPLETED / FAILED
```

### Data Flow: Trading
```
User Places Order (UI)
    ↓ POST /api/trades/orders
Express validates + inserts Prisma
    ↓
Order created with status PENDING
    ↓
Price engine updates (WebSocket)
    ↓
Order matches/fills
    ↓
Trade history updated
    ↓
Socket.io broadcasts to client
    ↓
React state updates → UI reflects change
```

---

## 📋 DATABASE SCHEMA (Core Tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, email, password_hash, status |
| `wallets` | User fund storage | id, user_id, currency, balance |
| `trades` | Trading history | id, user_id, pair, type, amount, status |
| `kyc_documents` | ID verification | id, user_id, doc_type, status |
| `withdrawals` | Withdrawal requests | id, user_id, amount, status (PENDING_APPROVAL) |
| `deposits` | Deposit history | id, user_id, amount, status |
| `bank_accounts` | User bank info | id, user_id, account_number |
| `managers` | Fund managers | id, user_id, commission_rate |
| `managed_accounts` | Managed portfolios | id, manager_id, investor_id |
| `sessions` | Auth sessions | id, user_id, created_at, expires_at |
| `otp_codes` | One-time passwords | id, user_id, code, expires_at |
| `notifications` | User messages | id, user_id, type, content |
| `admin_approvals` | Admin actions | id, type, target_id, status |

See `/docs/ARCHITECT.md` for full schema details.

---

## 🔐 SECURITY CHECKLIST

### ABSOLUTE RULES (Non-Negotiable)
1. ✅ **All withdrawals require admin approval** (compliance)
2. ✅ **No plaintext passwords** (bcryptjs salt 12)
3. ✅ **No sensitive data in logs** (redact PII)
4. ✅ **Session validation on every request**
5. ✅ **CSRF protection** (double-submit cookie pattern)
6. ✅ **Rate limiting** on auth endpoints (5 attempts / 15 min)
7. ✅ **Input validation** (Zod schemas) before processing
8. ✅ **Environment secrets in vault** (never in code)
9. ✅ **CORS whitelist** (not `*`)
10. ✅ **HTTPS only** in production

### Headers & Protection
- Helmet security headers
- Content-Security-Policy set
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

---

## 📡 API ENDPOINTS (35+ Groups)

### Auth Endpoints
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/logout`
- POST `/api/auth/otp/request`
- POST `/api/auth/otp/verify`
- POST `/api/auth/refresh`

### Trading Endpoints
- GET `/api/trades`
- POST `/api/trades/orders`
- GET `/api/trades/history`
- PUT `/api/trades/orders/:id`
- DELETE `/api/trades/orders/:id`

### Wallet Endpoints
- GET `/api/wallets`
- POST `/api/wallets/transfer`
- GET `/api/wallets/:id/balance`
- POST `/api/wallets/connect-external`

### Admin Endpoints
- GET `/api/admin/approvals`
- POST `/api/admin/approvals/:id/approve`
- POST `/api/admin/approvals/:id/reject`
- GET `/api/admin/users`
- PUT `/api/admin/users/:id/status`

See `/docs/REMEMBER.md` for complete endpoint list with examples.

---

## 🔧 TECH STACK SUMMARY

| Layer | Tech | Version |
|-------|------|---------|
| **Runtime** | Node.js | 20+ |
| **Language** | TypeScript | 5.3+ |
| **Backend** | Express.js | 4.x |
| **ORM** | Prisma | 5.x |
| **Database** | PostgreSQL | 14+ |
| **Frontend** | React | 19 |
| **Build** | Vite | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **UI Components** | Radix UI | Latest |
| **Validation** | Zod | 3.x |
| **HTTP Client** | React Query | 5.x |
| **Real-Time** | Socket.io | 4.x |
| **Logging** | Pino | Latest |
| **Testing** | Vitest | Latest |
| **Linting** | ESLint | 8.x |

See `/docs/TECH_STACK.md` for full details on all 50+ dependencies.

---

## 📚 DOCUMENTATION FILES

Read these in the `/docs/` folder:

| File | Read When | Contains |
|------|-----------|----------|
| **PRD.md** | Understanding features | Features, user personas, business rules, success metrics |
| **TECH_STACK.md** | Technical decisions | Dependencies, performance targets, known issues |
| **ARCHITECT.md** | System design | Architecture diagram, data flows, module relationships |
| **RULES.md** | Writing code | Coding standards, patterns, security, git workflow |
| **REMEMBER.md** | Quick lookup | Commands, endpoints, troubleshooting |

---

## ⚠️ COMMON MISTAKES (Don't Do These!)

1. ❌ Using `any` type in TypeScript (strict mode enforced)
2. ❌ Committing `.env` or secrets to git
3. ❌ Skipping input validation (always use Zod)
4. ❌ Direct database queries (always use Prisma)
5. ❌ Missing error handling in async functions
6. ❌ Creating withdrawals without approval status
7. ❌ Using plaintext passwords (bcryptjs required)
8. ❌ CORS `*` wildcard (whitelist domains)
9. ❌ Logging sensitive data (PII, tokens, passwords)
10. ❌ Missing TypeScript types on function params

---

## 🚨 PRE-DEPLOYMENT CHECKLIST

Run before deploying to production:

```bash
# 1. Code Quality
npm run lint          # No linting errors
npm run typecheck     # No TypeScript errors
npm test              # All tests pass

# 2. Environment
npm run predeploy     # Validates config & env vars

# 3. Database
npx prisma migrate status  # All migrations applied

# 4. Security
npm audit --audit-level=high  # No high vulnerabilities

# 5. Build
npm run build         # Production build successful
```

---

## 🎓 ARCHITECTURE MENTAL MODEL

Think of XpressPro FX as **3 layers**:

### 1. **API Layer** (Express.js Backend)
- Routes handle HTTP requests
- Validates input with Zod
- Queries database via Prisma
- Broadcasts updates via Socket.io
- Returns JSON responses

### 2. **Data Layer** (Prisma + PostgreSQL)
- 15+ tables with relationships
- Version-controlled migrations
- Runtime type-safe queries
- Automatic schema validation

### 3. **UI Layer** (React Frontend)
- Components render data
- React Query manages server state
- Socket.io listens for updates
- Vite for fast builds
- Tailwind for styling

**Data Flow**: User Action → React → Fetch API → Express → Prisma → DB → Socket.io → React Update → UI

---

## 📞 GETTING HELP

1. **Feature questions**: Check `/docs/PRD.md`
2. **Technical decisions**: Check `/docs/TECH_STACK.md`
3. **System design**: Check `/docs/ARCHITECT.md`
4. **Code standards**: Check `/docs/RULES.md`
5. **Quick commands**: Check `/docs/REMEMBER.md`
6. **Test failures**: Check `/tests/` folder
7. **Deployment issues**: Check `DEPLOYMENT/` folder

---

## 🎯 NEXT STEPS FOR NEW DEVELOPERS

1. ✅ Clone repo: `git clone ...`
2. ✅ Install deps: `npm ci`
3. ✅ Setup env: `cp .env.example .env` + fill DATABASE_URL
4. ✅ Run migrations: `npx prisma migrate deploy`
5. ✅ Start dev: 3 terminals for API, UI, Admin
6. ✅ Read `/docs/RULES.md` (coding standards)
7. ✅ Read `/docs/ARCHITECT.md` (system design)
8. ✅ Run tests: `npm test`
9. ✅ Make first PR

---

## 📌 KEY DATES & VERSIONS

- **Project Created**: 2024 (enterprise rebranding)
- **Current Version**: 1.0.0
- **Last Updated**: 2026-08-13
- **Node Version**: 20+ required
- **OTP Fix Deployed**: 2026-08-11
- **Database**: PostgreSQL with Prisma ORM

---

**This is your quick reference. For deep dives, see the `/docs/` folder! 🚀**
