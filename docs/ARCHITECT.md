# XpressPro FX — Architecture Documentation

**Version**: 1.0.0  
**Last Updated**: 2026-08-13  
**Architecture Style**: Monorepo + Microservices-Ready

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND TIER (Vite + React)            │
├─────────────────────┬──────────────────┬───────────────────┤
│  NeXTrade           │  Admin Portal     │  Mockup Sandbox   │
│  (User Trading)     │  (Platform Mgmt)  │  (Demo/Testing)   │
└─────────────────────┴──────────────────┴───────────────────┘
           ↓                    ↓                    ↓
           └────────────────────┬────────────────────┘
                                │
                       ┌────────▼────────┐
                       │   API Gateway   │
                       │  (nginx/Railway)│
                       └────────┬────────┘
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                      APPLICATION TIER                        │
├─────────────────────────────────────────────────────────────┤
│              Express.js API Server (Node.js)                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Routes (35+ endpoint groups)                       │   │
│  │  ├── /api/auth         (login, register, OTP)      │   │
│  │  ├── /api/users        (profile, account)          │   │
│  │  ├── /api/trades       (order management)          │   │
│  │  ├── /api/wallets      (balance, deposit, crypto)  │   │
│  │  ├── /api/withdrawals  (bank transfers + approval) │   │
│  │  ├── /api/kyc          (document verification)     │   │
│  │  ├── /api/p2p          (peer trading)              │   │
│  │  ├── /api/admin        (platform governance)       │   │
│  │  ├── /api/managers     (fund managers)             │   │
│  │  ├── /api/cards        (debit card requests)       │   │
│  │  ├── /api/webhooks     (payment processor events)  │   │
│  │  └── [24 more routes...]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                   │   │
│  │  ├── Helmet (security headers)                      │   │
│  │  ├── CORS (cross-origin access)                     │   │
│  │  ├── Rate Limiting (DDoS protection)                │   │
│  │  ├── CSRF Protection                                │   │
│  │  ├── Session Authentication                         │   │
│  │  ├── Request Logging (Pino)                         │   │
│  │  ├── Compression (gzip)                             │   │
│  │  └── Error Handling                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Service Layer                                      │   │
│  │  ├── Session Management (cookies, JWT)             │   │
│  │  ├── OTP Generation & Validation                    │   │
│  │  ├── Wallet Encryption (AES-256)                    │   │
│  │  ├── Trading Engine (simulation + real)             │   │
│  │  ├── Admin Approval Workflow                        │   │
│  │  ├── KYC Document Processing                        │   │
│  │  ├── Email/Notification Delivery                    │   │
│  │  ├── Gas Fee Estimation (blockchain)                │   │
│  │  ├── Integration Services (Moonpay, Paystack)       │   │
│  │  ├── Real-Time Updates (Socket.io)                  │   │
│  │  └── Analytics & Reporting                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebSocket (Socket.io)                              │   │
│  │  ├── /chat (P2P messaging)                          │   │
│  │  ├── /trading (order updates)                       │   │
│  │  ├── /notifications (user alerts)                   │   │
│  │  └── /quotes (real-time prices)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           ↓                      ↓
    ┌──────▼──────┐      ┌──────▼──────┐
    │ PostgreSQL  │      │    Redis    │
    │ (Prisma)    │      │ (Caching)   │
    │             │      │             │
    │ ├─ Users    │      │ ├─ Sessions │
    │ ├─ Trades   │      │ ├─ Rate     │
    │ ├─ Wallets  │      │ │  Limits   │
    │ ├─ KYC      │      │ ├─ Leaderb. │
    │ ├─ Assets   │      │ └─ BullMQ   │
    │ └─ Admin Log│      └─────────────┘
    └─────────────┘
           ↓
    External Services:
    • Alchemy (Blockchain provider)
    • SendGrid (Email)
    • Moonpay (On-ramp)
    • Paystack (Payments)
    • Coinbase Commerce (Crypto)
    • OpenAI (AI/Chat)
```

---

## Directory Structure

### Root Level
```
Rebrand-xpfx/
├── artifacts/              # Production-ready applications
│   ├── api-server/        # Express.js backend
│   ├── nextrade/          # Main trading UI (Vite + React)
│   ├── admin-portal/      # Admin management interface
│   ├── mockup-sandbox/    # Demo/testing sandbox
│   └── db/                # Database lib (shared)
├── lib/                   # Reusable libraries
│   ├── api-zod/          # API schemas & validation
│   ├── api-client-react/ # React API client
│   ├── api-spec/         # OpenAPI specifications
│   └── db/               # Database utilities
├── .github/workflows/     # CI/CD pipelines
├── scripts/              # Utility scripts
├── tests/                # Integration & E2E tests
├── prisma/              # Database schema & migrations
├── DEPLOYMENT/          # Deployment configs & guides
├── infrastructure/      # Docker & server configs
├── package.json         # Root workspace manifest
├── tsconfig.json        # TypeScript config
└── [Config files]
```

### API Server (`artifacts/api-server/`)
```
src/
├── app.ts               # Express app setup, middleware
├── index.ts             # Server entry point, startup sequence
├── lib/                 # Internal utilities
│   ├── session.ts       # Session/cookie management
│   ├── auth-throttle.ts # Rate limiting for auth
│   ├── db-client.ts     # Database connection
│   ├── logger.ts        # Pino logging setup
│   ├── otp.ts           # One-time password generation
│   ├── wallet-encryption.ts  # AES-256 encryption
│   ├── blockchain.ts    # Ethers.js integration
│   ├── email.ts         # SendGrid integration
│   ├── openai-client.ts # OpenAI API
│   ├── realtime.ts      # Socket.io setup
│   ├── billing.ts       # Payment processing
│   ├── account-tiers.ts # Account tier logic
│   ├── referral-rewards.ts # Referral system
│   └── [20+ more libs]
├── routes/              # API endpoint handlers (35+ files)
│   ├── index.ts         # Route aggregator
│   ├── auth.ts          # /api/auth
│   ├── users.ts         # /api/users
│   ├── trades.ts        # /api/trades
│   ├── wallets.ts       # /api/wallets
│   ├── withdrawals.ts   # /api/withdrawals
│   ├── admin.ts         # /api/admin
│   └── [29 more route files]
├── middlewares/         # Custom middleware (reserved for future)
└── types/              # Type definitions

prisma/
├── schema.prisma       # Database schema (Prisma)
└── migrations/         # Versioned database migrations
    ├── 001_init/
    ├── 002_add_otp_payload/
    └── [version controlled]

build.mjs              # Custom build script
package.json          # API dependencies
tsconfig.json         # TypeScript config
```

### Frontend Applications

#### NeXTrade (`artifacts/nextrade/`)
```
src/
├── main.tsx            # React entry point
├── App.tsx             # Root component
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Trading.tsx
│   ├── Wallets.tsx
│   └── [more pages]
├── components/         # Reusable UI components
│   ├── Chart.tsx
│   ├── OrderForm.tsx
│   └── [more components]
├── hooks/             # Custom React hooks
├── styles/            # Global CSS & Tailwind
└── utils/             # Helper functions

index.html            # HTML template
vite.config.ts        # Vite build config
package.json          # Dependencies
tsconfig.json         # TypeScript config
```

#### Admin Portal (`artifacts/admin-portal/`)
```
src/
├── main.tsx           # React entry point
├── pages/             # Admin pages
│   ├── Dashboard.tsx
│   ├── UserManagement.tsx
│   ├── KYCReview.tsx
│   ├── WithdrawalApprovals.tsx
│   └── [admin features]
├── components/        # Admin-specific components
└── hooks/            # Admin hooks

[similar structure to NeXTrade]
```

---

## Data Flow Patterns

### Authentication Flow
```
User Input (Email/Password)
    ↓
POST /api/auth/login
    ↓
Express Route Handler
    ↓
validate schema (zod)
    ↓
find user (Prisma)
    ↓
compare password (bcryptjs)
    ↓
generate session (uuid)
    ↓
store session (PostgreSQL)
    ↓
set secure cookie (httpOnly, sameSite=strict)
    ↓
return user object + 200 OK
```

### Trading Flow
```
User Submits Trade Order
    ↓
POST /api/trades
    ↓
Validate auth (session)
    ↓
Validate order schema (zod)
    ↓
Check account balance (Prisma query)
    ↓
Simulate/Execute trade
    ↓
Store trade record (Prisma)
    ↓
Broadcast WebSocket update (Socket.io)
    ↓
Emit notification
    ↓
Return order details
```

### Admin Approval Workflow
```
User Requests Withdrawal
    ↓
POST /api/withdrawals
    ↓
Validate amount & bank account
    ↓
Create withdrawal request (status: pending)
    ↓
Emit notification to admin
    ↓
Return pending status to user
    ↓
[Admin reviews in Admin Portal]
    ↓
Admin clicks Approve/Reject
    ↓
PUT /api/admin/withdrawals/:id/approve
    ↓
Validate admin session (OTP required)
    ↓
Update status (approved/rejected)
    ↓
Call payment processor (Paystack, bank API)
    ↓
Emit notification to user
    ↓
Update wallet balance
```

### Real-Time Update Flow
```
Price Update from Exchange
    ↓
API fetch or WebSocket feed
    ↓
Store in Redis cache
    ↓
Broadcast to Socket.io room /quotes
    ↓
Frontend receives update
    ↓
React state updates
    ↓
Component re-renders
```

---

## Module Responsibilities

### API Server Modules

| Module | Responsibility |
|--------|-----------------|
| `auth.ts` | Login, register, password reset, OTP |
| `users.ts` | Profile management, settings, KYC status |
| `trades.ts` | Order creation, execution, history |
| `wallets.ts` | Balance queries, deposits, crypto transfers |
| `withdrawals.ts` | Withdrawal requests (requires admin approval) |
| `kyc.ts` | Document upload, verification status |
| `admin.ts` | User management, platform config, approvals |
| `p2p.ts` | Peer trading, escrow, disputes |
| `managers.ts` | Manager profiles, managed accounts |
| `notifications.ts` | User alerts, preferences |
| `webhooks.ts` | Payment processor callbacks, event handling |
| `demo-trading.ts` | Demo account orders & simulation |
| `billing.ts` | Invoice generation, payment tracking |
| `support.ts` | Help tickets, support requests |

### Service Layer Modules

| Service | Responsibility |
|---------|-----------------|
| `session.ts` | Secure session/cookie handling |
| `wallet-encryption.ts` | AES-256 encryption/decryption |
| `otp.ts` | OTP generation, validation, expiration |
| `email.ts` | SendGrid integration, email templates |
| `realtime.ts` | Socket.io namespaces, room management |
| `blockchain.ts` | Ethers.js, gas estimation, wallet ops |
| `account-tiers.ts` | Account tier limits, feature access |
| `referral-rewards.ts` | Referral tracking, reward logic |
| `auth-throttle.ts` | Rate limiting for login attempts |
| `billing.ts` | Payment processing, invoice logic |

### Database Schema (Prisma)

**Key Tables**:
- `users` - User accounts
- `sessions` - Active user sessions
- `wallets` - User cryptocurrency wallets
- `trades` - Trading orders (executed/pending)
- `bank_accounts` - User bank account info
- `kyc_documents` - KYC submissions & status
- `withdrawals` - Withdrawal requests + status
- `deposits` - Deposit records
- `asset_catalog` - Trading assets (forex pairs, crypto)
- `managers` - Investment manager profiles
- `admin_reps` - Admin user accounts
- `admin_otp` - Admin login OTPs
- `messages` - P2P messaging
- `notifications` - User notifications
- `card_requests` - Debit card applications
- `connected_wallets` - External crypto wallets
- `OtpCode` - User OTP codes for auth

---

## Request Processing Pipeline

### Typical Request Lifecycle

```
1. Client sends HTTP request
   ├─ POST /api/trades
   ├─ Headers: Authorization, Content-Type
   └─ Body: JSON with order details

2. Express receives request
   ├─ Logs request (morgan)
   ├─ Decompresses body (compression)
   └─ Parses JSON (express.json)

3. CORS Middleware
   ├─ Check origin (whitelist)
   ├─ Allow or reject
   └─ Add CORS headers

4. Rate Limiting
   ├─ Check Redis counter
   ├─ Increment counter
   ├─ Return 429 if exceeded
   └─ Continue if OK

5. Session/Auth Middleware
   ├─ Parse cookie
   ├─ Find session in PostgreSQL
   ├─ Validate session expiry
   ├─ Set req.user (or 401)
   └─ Continue to handler

6. CSRF Protection
   ├─ Check CSRF token
   ├─ Return 403 if invalid
   └─ Continue if valid

7. Route Handler
   ├─ Validate request schema (zod)
   ├─ Check authorization (tier, role)
   ├─ Execute business logic
   ├─ Query/update database (Prisma)
   ├─ Call external APIs if needed
   └─ Return response

8. Response Processing
   ├─ Serialize to JSON
   ├─ Apply compression (gzip)
   ├─ Set headers (Helmet)
   ├─ Send status + body
   └─ Log response (pino)

9. Error Handling
   ├─ Catch errors from handler
   ├─ Log error (pino)
   ├─ Return error response (JSON)
   └─ Status: 400, 401, 403, 500, etc.
```

---

## Scaling Considerations

### Horizontal Scaling (Multiple Instances)
- Load balancer in front (Railway, Render, nginx)
- Shared PostgreSQL database
- Shared Redis cache
- Session affinity NOT required (stateless sessions)
- WebSocket scaling via Socket.io adapter (Redis)

### Database Optimization
- Connection pooling: 20-30 connections per instance
- Read replicas for reporting/analytics
- Partitioning by date for large tables (trades, messages)
- Indexes on frequently queried columns

### Caching Strategy
- Redis for: sessions, rate limits, leaderboards, hot assets
- Frontend React Query: 1-hour default cache
- Invalidate cache on: user action, admin update

### Worker Processes
- BullMQ for async jobs (email, webhooks, reports)
- Background worker separate from API server (optional)
- Task retry logic with exponential backoff

---

## Security Architecture

### Authentication Layers
1. **Password-based**: Email + bcrypt
2. **Session-based**: Secure HttpOnly cookies
3. **OTP**: Admin 2FA via email
4. **JWT**: Optional for API clients

### Authorization
- Role-based access control (RBAC) in routes
- Account tier checks in middleware
- Database-level access control (user_id filters)

### Data Protection
- Encryption at rest: AES-256 for wallet keys
- Encryption in transit: TLS 1.3
- Secrets in platform vaults (Railway, Render)
- No secrets in code or logs

### Input Validation
- Zod schemas for all endpoints
- TypeScript strict mode
- No dynamic SQL (Prisma prevents SQL injection)
- CSRF tokens on state-changing requests

---

## Performance Optimization

### Frontend
- Code splitting per route
- Lazy loading images
- React Query caching
- Tailwind CSS optimized

### Backend
- Database connection pooling
- Redis caching (sessions, rates, assets)
- Gzip compression on responses
- Index optimization on PostgreSQL
- Batch operations where possible

### Observability
- Structured logging (Pino JSON)
- Request tracing (correlation IDs)
- Error tracking (Sentry optional)
- Metrics (Prometheus `/metrics`)

---

## Deployment Architecture

### Development Environment
- Local PostgreSQL (Docker or manual)
- Local Node.js processes
- Hot reload enabled
- Full logging output

### Staging Environment
- Railway PostgreSQL service
- Railway Node.js service
- Same config as production
- Separate subdomain (staging.domain.com)

### Production Environment
- Railway PostgreSQL (managed)
- Railway Node.js (auto-scaling)
- Redis for caching
- nginx reverse proxy + SSL
- Database backups (daily)
- Monitoring & alerting

---

## Disaster Recovery

### Backup Strategy
- PostgreSQL: Daily automated backups (14-day retention)
- Redis: Optional (not critical, rebuilds from DB)
- Application: Stored in git with tagged releases

### Rollback Procedure
- Revert to previous Railway deployment
- Run Prisma migrate on previous schema version
- Verify health checks pass
- Restore from backup if data corruption

### High Availability
- Multi-region deployments (future)
- Database replication (future)
- Geographic load balancing (future)

---

## Integration Points

### External APIs
| Service | Endpoint | Purpose |
|---------|----------|---------|
| Alchemy | `https://eth-mainnet.alchemyapi.io` | Blockchain provider |
| SendGrid | `https://api.sendgrid.com/v3/mail/send` | Email delivery |
| Moonpay | `https://api.moonpay.com` | Fiat ↔ Crypto |
| Paystack | `https://api.paystack.co` | Card payments |
| Coinbase | `https://api.commerce.coinbase.com` | Crypto payments |
| OpenAI | `https://api.openai.com/v1` | AI/Chat |

### Webhooks Received
- **Moonpay**: Transaction status updates
- **Paystack**: Payment confirmations
- **Coinbase Commerce**: Charge updates
- **Bank**: Payment settlement notifications

---

## Future Architectural Improvements

### Short-term
- Separate background worker process (BullMQ)
- Redis cluster for high availability
- Database read replicas for reporting

### Medium-term
- Event-driven architecture (event sourcing)
- GraphQL API layer (alongside REST)
- Microservices split (auth, trading, payments)
- API gateway (Kong, Ambassador)

### Long-term
- Kubernetes orchestration
- Multi-region deployment
- Distributed tracing (Jaeger)
- Service mesh (Istio)
- CQRS pattern (separate read/write models)
