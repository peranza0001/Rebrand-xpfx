# architect.md — System Architecture Reference

**→ Full documentation is in [/docs/ARCHITECT.md](/docs/ARCHITECT.md)**

This is a quick reference. For complete architecture details, see the main file above.

---

## System Architecture Overview

### Deployment-Safe Architecture

The API is intentionally designed to fail safe rather than fail hard when a deployment environment is missing non-essential production values. Local bootstrapping is covered by generated secrets, while core security and auth values remain required in production.

- Demo auth is off by default in production.
- Allowed origins are normalized and deduplicated to support custom domains plus local and preview hosts.
- Reset-password links resolve from the active request host, which keeps the live custom domain working correctly.
- Health and readiness checks are separated so `/readyz` remains platform-safe while deeper DB checks live at `/healthz/db`.

### 3-Tier Architecture
```
Frontend Layer (React + Vite)
    ↓
Application Layer (Express.js + Node.js)
    ↓
Data Layer (PostgreSQL + Prisma ORM)
```

### Monorepo Structure
```
/artifacts
  ├── api-server/          # Express backend (port 8082)
  ├── nextrade/            # Trading UI (port 5173)
  ├── admin-portal/        # Admin UI (port 5175)
  └── mockup-sandbox/      # Demo/testing

/lib
  ├── api-spec/           # OpenAPI definition
  ├── api-zod/            # Shared Zod validation schemas
  ├── api-client-react/   # React HTTP client
  └── db/                 # Database utilities
```

---

## Core Data Flows

### 1. Authentication Flow
```
User Input (Email + Password)
    ↓
POST /api/auth/login
    ↓
Validate credentials (bcryptjs)
    ↓
Create session (encrypted cookie)
    ↓
Set HTTP-only cookie
    ↓
Client stores cookie automatically
    ↓
All future requests include session
```

### 2. Trading Flow
```
User places order (UI)
    ↓
POST /api/trades/orders with Zod validation
    ↓
Express validates request
    ↓
Check user balance & permissions
    ↓
Insert trade record (Prisma)
    ↓
Update wallet balance
    ↓
Emit WebSocket update (Socket.io)
    ↓
React client receives update → re-render
```

### 3. Withdrawal (Admin Approval) Flow
```
User requests withdrawal
    ↓
Create withdrawal record (status: PENDING_APPROVAL)
    ↓
Notify admins via Socket.io & email
    ↓
Admin reviews in admin portal
    ↓
Admin OTP verification (time-limited)
    ↓
POST /api/admin/approvals/:id/approve
    ↓
Update withdrawal status to APPROVED
    ↓
Process payment (bank transfer/crypto)
    ↓
Update status to COMPLETED/FAILED
    ↓
Notify user (WebSocket + email)
```

### 4. Real-Time Update Flow
```
Server event triggers (order fill, withdrawal approved, etc.)
    ↓
Identify affected user(s)
    ↓
Emit Socket.io event to user's room
    ↓
Client receives WebSocket message
    ↓
Update React state
    ↓
Component re-renders with new data
```

---

## Database Schema (15+ Core Tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, email, password_hash, verified |
| `sessions` | Active user sessions | id, user_id, created_at, expires_at |
| `wallets` | User fund storage | id, user_id, currency, balance |
| `trades` | Trading history | id, user_id, pair, type, amount, status |
| `kyc_documents` | ID verification | id, user_id, doc_type, status |
| `withdrawals` | Withdrawal requests | id, user_id, amount, status, admin_id |
| `deposits` | Deposit history | id, user_id, amount, status |
| `bank_accounts` | User bank info | id, user_id, account_number |
| `cards` | Debit card requests | id, user_id, card_type, status |
| `managers` | Fund managers | id, user_id, bio, commission_rate |
| `managed_accounts` | Managed portfolios | id, manager_id, investor_id |
| `otp_codes` | One-time passwords | id, user_id, code, expires_at |
| `admin_approvals` | Admin actions | id, type, target_id, status, admin_id |
| `notifications` | User messages | id, user_id, type, content |
| `messages` | P2P chat | id, sender_id, recipient_id, content |

---

## API Endpoints (35+ Groups)

### Core Groups
- `/api/auth` - Login, register, logout, OTP
- `/api/users` - Profile, account, settings
- `/api/trades` - Order management, history
- `/api/wallets` - Balance, transfers, crypto
- `/api/withdrawals` - Withdrawal requests
- `/api/deposits` - Deposit processing
- `/api/kyc` - Document verification
- `/api/p2p` - Peer-to-peer trading
- `/api/admin` - Platform governance
- `/api/managers` - Fund manager profiles
- `/api/cards` - Debit card requests
- `/api/billing` - Invoicing, payments
- `/api/notifications` - Alerts, messages
- `/api/support` - Help tickets, live chat
- `/api/webhooks` - Payment processor events

### Full list with examples in [/docs/ARCHITECT.md](/docs/ARCHITECT.md)

---

## Request Processing Pipeline

### 9-Step Request Lifecycle
1. **Routing** - Express matches URL to handler
2. **Authentication** - Validate session/JWT
3. **Parsing** - Extract body/query parameters
4. **Validation** - Zod schema check
5. **Authorization** - Check user permissions
6. **Processing** - Business logic
7. **Database** - Prisma queries
8. **Response** - JSON serialization
9. **Logging** - Pino logger records event

---

## Module Responsibilities

| Module | Purpose | Routes |
|--------|---------|--------|
| **Trading** | Order execution, history | /trades, /wallets |
| **Auth** | User login, registration | /auth |
| **Admin** | Platform governance | /admin |
| **KYC** | Document verification | /kyc |
| **Payments** | Deposits, withdrawals | /deposits, /withdrawals |
| **Investment** | Fund managers | /managers |
| **P2P** | User-to-user trading | /p2p |
| **Notifications** | Alerts, messages | /notifications |

---

## Security Architecture (4-Layer)

### Layer 1: Transport Security
- HTTPS/TLS encryption
- Helmet security headers
- CORS whitelist

### Layer 2: Authentication
- Session-based auth (HTTP-only cookies)
- Password hashing (bcryptjs, salt 12)
- OTP for admin access

### Layer 3: Input Validation
- Zod schema validation (runtime)
- CSRF protection (double-submit)
- Rate limiting

### Layer 4: Authorization
- User permissions checks
- Role-based access (user, admin)
- Resource ownership validation

---

## Scaling Considerations

### Horizontal Scaling
- Stateless API servers (sessions in DB)
- Load balancer (nginx/Railway)
- Database connection pooling
- Redis for caching (optional)

### Vertical Scaling
- Node.js clustering (PM2)
- Database query optimization
- WebSocket connection limits

### Performance Optimization
- Frontend: Vite code splitting, lazy loading
- Backend: Database indexes, query optimization
- Real-time: Socket.io room management
- Caching: HTTP cache headers, Redis

---

## Deployment Architecture

### Railway Deployment (Recommended)
```
Railway Project
├── PostgreSQL database (managed)
├── Node.js service (auto-scaling)
├── Environment variables (vaulted)
└── SSL/TLS certificates (automatic)
```

### Docker Deployment
```
docker-compose.yml with:
├── Node.js API container
├── PostgreSQL container
├── Redis container (optional)
├── nginx reverse proxy
└── Certbot (SSL certificates)
```

### VPS Deployment
```
PM2 clustering with:
├── API instances (4-8 processes)
├── PostgreSQL database
├── nginx reverse proxy
├── systemd service
└── logrotate for logs
```

---

## Real-Time Architecture (Socket.io)

### Connection Flow
1. Client connects on login (handshake)
2. Join user-specific room (`user:${userId}`)
3. Join feature rooms (`trading`, `notifications`)
4. Listen for server events

### Event Types
- **trading**: Order updates, price changes
- **notifications**: Alerts, messages
- **admin**: Approval requests, user actions
- **chat**: P2P messages

### Fallback
- Primary: WebSocket
- Fallback: Long-polling (HTTP)
- Auto-reconnect with exponential backoff

---

## 📖 Read the Full Architecture

[→ See /docs/ARCHITECT.md for complete system design, database schema, and more](/docs/ARCHITECT.md)
