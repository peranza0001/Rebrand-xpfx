# XpressPro FX - Critical Systems Analysis

**Generated**: 2026-08-13  
**Scope**: Complete codebase exploration of payment, security, compliance, and admin control systems

---

## EXECUTIVE SUMMARY

XpressPro FX is a **production-grade fintech platform** with comprehensive financial controls built around these core principles:

1. **Mandatory Admin Approval**: ALL withdrawals require multi-stage admin review before funds leave the platform
2. **Encryption at Rest**: Wallet credentials (seed phrases, private keys) encrypted with AES-256-GCM
3. **Immutable Audit Trails**: All sensitive operations logged permanently (append-only)
4. **Tier-Based Compliance**: Account tiers (TIER_0 to TIER_8) gate features by KYC status
5. **On-Chain Verification**: Deposits and gas fees verified against blockchain via Alchemy/Infura
6. **Real-Time Monitoring**: Admin alerts, Prometheus metrics, structured logging throughout

---

## 1. PAYMENT & FINANCIAL PROCESSING

### 1.1 Payment Processor Integrations

#### Moonpay (Buy Crypto On-Ramp)
- **Files**: 
  - Routes: [artifacts/api-server/src/routes/moonpay.ts](artifacts/api-server/src/routes/moonpay.ts)
  - Webhook: Included in [artifacts/api-server/src/routes/webhooks.ts](artifacts/api-server/src/routes/webhooks.ts)
- **Endpoints**:
  - `POST /api/moonpay/initiate` → Generate hosted checkout URL
  - `POST /api/webhooks/moonpay` → Process transaction completion
- **Security**:
  - HMAC-SHA256 signature verification on webhook
  - Timing-safe comparison prevents timing attacks
  - Credential gating: requires verified bank account
  - Sandbox fallback if API key not configured
- **Config**: `MOONPAY_API_KEY`, `MOONPAY_SECRET_KEY`, `MOONPAY_WEBHOOK_SECRET`
- **Features**:
  - Marks user as `buyVerified` on first purchase
  - Integrates with account tier system
  - Sanctions screening via `MOONPAY_UNSUPPORTED_COUNTRIES`

#### Coinbase Commerce
- **Files**: [artifacts/api-server/src/routes/coinbase.ts](artifacts/api-server/src/routes/coinbase.ts)
- **Purpose**: Exchange wallet connectivity
- **Config**: `COINBASE_API_KEY`, `COINBASE_API_SECRET`, `COINBASE_WEBHOOK_SECRET`

#### Paystack
- **Files**: [artifacts/api-server/src/routes/paystack.ts](artifacts/api-server/src/routes/paystack.ts)
- **Status**: Health check endpoint only (primary payment processing external)
- **Config**: `PAYSTACK_SECRET`, `PAYSTACK_PUBLIC`, `PAYSTACK_WEBHOOK_SECRET`

### 1.2 Deposit Processing

**Primary File**: [artifacts/api-server/src/routes/deposits.ts](artifacts/api-server/src/routes/deposits.ts)

**User Routes**:
- `GET /api/deposits` → User's deposit history
- `POST /api/deposits` → Create new deposit request

**Admin Routes** ([admin-deposits.ts](artifacts/api-server/src/routes/admin-deposits.ts)):
- `GET /api/admin/deposits` → All deposits from all users
- `PATCH /api/admin/deposits/:depositId/approve` → Credit user's main wallet
- `PATCH /api/admin/deposits/:depositId/reject` → Reject with reason

**Deposit Methods**: `crypto_wallet`, `bank_transfer`, `card`

**On-Chain Verification**:
- Crypto deposits verified via `verifyOnChainPayment()` (Alchemy RPC)
- Checks: sender address, receiver address, amount, asset
- Replay prevention: `claimTxHash()` prevents double-spending same tx

**Account Tier Gating**:
- Fiat deposits require tier permission check via `canPerformAction()`
- TIER_0 cannot deposit fiat (demo only)
- TIER_1+ can deposit via Moonpay
- TIER_2+ can deposit via bank transfer

### 1.3 Withdrawals (MANDATORY ADMIN APPROVAL)

**Primary Files**:
- [artifacts/api-server/src/routes/withdrawals.ts](artifacts/api-server/src/routes/withdrawals.ts) - User request
- [artifacts/api-server/src/routes/withdrawal-gas-fee.ts](artifacts/api-server/src/routes/withdrawal-gas-fee.ts) - Gas fee workflow
- [artifacts/api-server/src/routes/admin.ts](artifacts/api-server/src/routes/admin.ts#L176) - Admin decision

**The Universal Gas-Fee Gate** (Core Compliance):

Every withdrawal goes through a 4-stage process:

1. **User Request**
   ```
   POST /api/withdrawals
   - Validates KYC status (must be approved)
   - Validates destination (must be connected wallet)
   - Holds funds: amount moved to pendingBalance
   - Creates transaction record (status: pending)
   - Sends admin alert
   - Response: Withdrawal record with status="awaiting_gas_fee"
   ```

2. **Admin Sets Gas Fee**
   ```
   POST /admin/withdrawals/:withdrawalId/set-gas-fee
   - Admin specifies ETH amount + deadline (minutes from now)
   - User notified of requirement with deadline
   - Status remains "awaiting_gas_fee"
   ```

3. **User Funds Gas Fee On-Chain**
   ```
   POST /withdrawals/:withdrawalId/mark-gas-fee-funded
   - User sends ETH to PLATFORM_RECEIVING_ADDRESS
   - User submits tx hash to mark as funded
   - Server verifies on-chain:
     - TX exists and is confirmed
     - Sender = user's connected ETH wallet
     - Receiver = platform address
     - Amount = required gas fee
   - Replay prevention: tx hash claimed in database
   - Status remains "awaiting_gas_fee" (not yet approved)
   ```

4. **Admin Reviews & Approves**
   ```
   POST /admin/withdrawals/:withdrawalId/decision
   {
     "decision": "approve" | "reject",
     "reason": "optional rejection message"
   }
   
   If APPROVE (4 hard gates checked):
   ✓ Gas fee amount is non-zero
   ✓ User has marked gas fee as funded (gasFeeFundedAt set)
   ✓ Gas fee deadline hasn't passed
   ✓ User's connected ETH wallet has sufficient balance
   
   Then:
   - Gas fee deducted from user's connected ETH wallet
   - Status = "approved"
   - Held funds released for processing
   - User notified
   
   If REJECT:
   - Status = "rejected"
   - Rejection reason stored
   - Held funds returned to main wallet
   - User notified
   ```

5. **Automatic Expiration**
   ```
   If deadline passes:
   - Status = "expired"
   - Held funds refunded to main wallet
   - User can request new withdrawal
   ```

**Withdrawal States**:
- `pending` → `awaiting_gas_fee` → `approved` → (external processing)
- `pending` → `awaiting_gas_fee` → `rejected` (by admin)
- `awaiting_gas_fee` → `expired` (if deadline passes)
- `awaiting_gas_fee` → `cancelled` (by user)

### 1.4 Billing & Monthly Fees

**File**: [artifacts/api-server/src/routes/billing.ts](artifacts/api-server/src/routes/billing.ts)

**User Routes**:
- `GET /api/billing/me` → Current cycle, rates, history, overdue status
- `POST /api/billing/pay` → Settle one or more charges from main wallet

**Admin Routes** ([admin.ts](artifacts/api-server/src/routes/admin.ts#L470)):
- `GET /api/admin/billing` → All users' billing status
- `PATCH /api/admin/billing` → Update default billing rates
- `PATCH /api/admin/billing/users/:userId` → User-specific rate override
- `POST /api/admin/billing/users/:userId/mark-paid` → Manual settlement

**Billing Cycle**: Monthly, with per-user rate configuration and history tracking

---

## 2. SECURITY & ENCRYPTION

### 2.1 Password Hashing

**Implementation**: 
- Algorithm: Scrypt (Node.js native) with bcryptjs fallback
- Salt Rounds: `SALT_ROUNDS=12` (configurable, recommended 12+)
- Storage: `StoredUser.passwordHash` in [lib/store.ts](artifacts/api-server/src/lib/store.ts#L200)
- Verification: Constant-time comparison via `timingSafeEqual()`

**Usage**:
```typescript
// On registration
const hash = hashPassword(plaintext);  // Uses scrypt + base64
storedUser.passwordHash = hash;

// On login
const match = verifyPassword(plaintext, storedUser.passwordHash);  // Constant-time
if (!match) recordLoginFailure(email);
```

### 2.2 Session Management

**File**: [artifacts/api-server/src/lib/session.ts](artifacts/api-server/src/lib/session.ts)

**Cookie Details**:
- Name: `xpfx_sid`
- Type: Signed, httpOnly, secure in production
- Storage: In-memory `sessions` map + optional Drizzle/Prisma persistence
- Expiration: 30 days (`maxAge: 1000 * 60 * 60 * 24 * 30`)
- SameSite: 
  - Production: `none` (allows cross-origin for mobile apps)
  - Development: `lax` (prevents CSRF in dev)
- Secure Flag: Set to `true` in production (HTTPS only)

**Session Flow**:
1. Login succeeds → `setSessionCookie()` stores signed cookie
2. Request arrives → `attachSession()` middleware reads and validates cookie
3. `req.userId` and `req.storedUser` attached if valid
4. `requireAuth()` middleware enforces auth for protected routes
5. Logout → `clearSessionCookie()` removes cookie + deletes from store

**Signing Secret**:
```
Priority: COOKIE_SECRET > COOKIE_SIGNING_KEY > SESSION_SECRET > random-32-bytes
Production: REQUIRED (fails startup without it)
Development: Auto-generated random if missing (for development only)
```

### 2.3 Wallet Encryption (AES-256-GCM)

**File**: [artifacts/api-server/src/lib/wallet-encryption.ts](artifacts/api-server/src/lib/wallet-encryption.ts)

**Algorithm**: AES-256-GCM (NIST-approved authenticated encryption)

**Key Management**:
- Source: `WALLET_ENCRYPTION_KEY` environment variable
- Format: 64 hexadecimal characters (32 bytes)
- Validation: Checked at startup; must be exactly 64 chars
- Generation: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

**Encryption Format**: 
```
enc:v1:{iv_hex}:{authTag_hex}:{ciphertext_hex}
```
- Prefix: `enc:v1:` for version identification
- IV: 12-byte random nonce per encryption
- Auth Tag: 16-byte GCM authentication tag
- Ciphertext: AES-encrypted data

**Backward Compatibility**:
- Legacy plain-text values (no `enc:v1:` prefix) auto-detected
- Returned unchanged for gradual migration
- Run [scripts/encrypt-wallets.mjs](scripts/encrypt-wallets.mjs) to migrate existing data

**Use Cases**:
- Seed phrases stored in `connected_wallets.seed_phrase`
- Private keys stored encrypted
- Never transmitted in plaintext via API

### 2.4 API Key Handling

**File**: [artifacts/api-server/src/lib/env.ts](artifacts/api-server/src/lib/env.ts)

**Strategy**:
- All keys read from environment variables at startup
- Trimmed and validated
- Multiple aliases supported for deployment platform compatibility
- Fallback to sandbox/test values if production keys not configured
- Never logged or returned in API responses

**Structure**:
```typescript
export const env = {
  // Critical (production required)
  DATABASE_URL,
  COOKIE_SECRET || COOKIE_SIGNING_KEY || SESSION_SECRET,
  WALLET_ENCRYPTION_KEY,
  
  // Service APIs (sandbox fallback)
  MOONPAY_API_KEY,
  COINBASE_API_KEY,
  PAYSTACK_SECRET,
  ALCHEMY_API_KEY,
  SENDGRID_API_KEY,
  
  // Webhook secrets
  MOONPAY_WEBHOOK_SECRET,
  COINBASE_WEBHOOK_SECRET,
  PAYSTACK_WEBHOOK_SECRET,
  WEBHOOK_SECRET_GLOBAL
};
```

### 2.5 CORS Implementation

**File**: [artifacts/api-server/src/lib/cors.ts](artifacts/api-server/src/lib/cors.ts)

**Configuration**:
- Source: `ALLOWED_ORIGINS` env var (comma-separated URLs) or `REPLIT_DOMAINS`
- Normalization: Parses protocol, hostname, port; ignores trailing slashes
- Production: Requires explicit allowlist; denies unknown origins with 403
- Development: Accepts any origin (configurable)

**Enforcement** ([app.ts](artifacts/api-server/src/app.ts#L220)):
```typescript
// Middleware checks req.headers.origin against allowlist
// Returns 403 CORS policy violation if not allowed
// Logs mismatches for debugging
```

### 2.6 CSRF Protection

**Implementation**: 
- Library: `csrf-csrf` (double-token pattern)
- Tokens: Derived from session cookie
- Header: `X-CSRF-Token` required for state-changing requests
- Method: Checked on POST/PUT/DELETE routes

**Special Cases**:
- Health check endpoints bypass CSRF (needed for platform probes)
- Webhook routes verify signature instead (raw body signed)

### 2.7 Rate Limiting

**File**: [artifacts/api-server/src/lib/auth-throttle.ts](artifacts/api-server/src/lib/auth-throttle.ts)

**Login Throttling**:
- Max 5 failed attempts per email
- 15-minute lockout after threshold
- Counter resets after 15 minutes of inactivity

**OTP Throttling**:
- Max 10 OTP requests per hour per email
- Max 50 per hour per IP address (5x email limit)
- 15-second minimum between resends
- Separate window tracking per email/IP

**Implementation**:
- In-memory tracking (suitable for single-process)
- Best-effort protection (no distributed locking)
- **Note**: Redis-based rate limiting recommended for production scaling

### 2.8 Helmet Security Headers

**Headers Configured**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS in production)
- `Content-Security-Policy` (configurable)

### 2.9 SSL/TLS Configuration

**HTTPS Redirect** ([app.ts](artifacts/api-server/src/app.ts#L40)):
- Automatic 301 redirect to HTTPS in production
- Respects `X-Forwarded-Proto` header for reverse proxy compatibility
- Health endpoints exempt (needed for platform probes)

**Secure Cookies**:
- `secure` flag only set in production (HTTPS required)
- `sameSite` set to `none` in production (cross-origin allowed)
- `httpOnly` always set (JavaScript cannot access)

**Trust Proxy**:
- Set to `1` for single-level reverse proxy (Nginx, load balancer)
- Trusts `X-Forwarded-*` headers for client IP/protocol detection

---

## 3. COMPLIANCE & KYC/AML

### 3.1 KYC Document Verification

**File**: [artifacts/api-server/src/routes/kyc.ts](artifacts/api-server/src/routes/kyc.ts)

**User Routes**:
- `GET /api/kyc` → Get current KYC status
- `POST /api/kyc` → Submit verification documents

**Admin Routes** ([admin.ts](artifacts/api-server/src/routes/admin.ts#L176)):
- `POST /api/admin/kyc/:userId/decision` → Approve/reject submission

**Document Fields**:
```typescript
{
  userId: string,
  status: "not_submitted" | "pending" | "approved" | "rejected",
  idType: string,           // "passport", "driver_license", etc.
  idNumber: string,         // Document number
  addressLine1: string,     // Street address
  city: string,             // City/municipality
  country: string,          // ISO country code
  rejectionReason: string | null,  // Admin feedback if rejected
  submittedAt: timestamp | null,   // User submission time
  decidedAt: timestamp | null      // Admin review time
}
```

**Workflow**:
1. User submits: status → `pending`, `submittedAt` set
2. Admin reviews: status → `approved`/`rejected`, `decidedAt` set
3. If approved: `StoredUser.user.kycVerified = true`, withdrawal enabled
4. If rejected: `StoredUser.user.kycVerified = false`, feedback provided

**Enforcement**:
- Users cannot withdraw without KYC approval
- Checked on withdrawal request: `if (!u.kycVerified && data.kyc.status !== "approved")`

### 3.2 AML/Sanctions Screening

**Implementation**: 
- Sanctions country list via `MOONPAY_UNSUPPORTED_COUNTRIES` env var
- JSON array of ISO-3166-1 alpha-2 country codes
- Blocks crypto buy initiation for users in sanctioned countries
- Wallet connection restricted by country

**Integration Point**: Moonpay integration checks country before issuing checkout URL

### 3.3 Account Tier System

**File**: [artifacts/api-server/src/lib/account-tiers.ts](artifacts/api-server/src/lib/account-tiers.ts)

**Tier Structure** (TIER_0 to TIER_8):

| Tier | Name | KYC | Daily Trading | Daily Withdrawal | P2P | Fiat | Leverage |
|------|------|-----|----------------|------------------|-----|------|----------|
| 0 | Demo | No | Demo only | $0 | No | No | No |
| 1 | Verified | No | $500 | $200 | No | Yes | No |
| 2 | Full KYC | Yes | $10,000 | $5,000 | Yes | Yes | No |
| 3+ | Premium | Yes | Unlimited | Unlimited | Yes | Yes | Yes |

**Enforcement**:
- `canPerformAction(tier, feature)` checks before operation
- Returns false if tier lacks permission
- Features affected:
  - `liveTrading` - Real vs demo-only
  - `p2pEnabled` - Peer trading access
  - `fiatDepositsEnabled` - Bank deposit access
  - `fiatWithdrawalsEnabled` - Bank payout access
  - `leverageEnabled` - Margin/leverage trading
  - `smartvestEnabled` - Investment features
  - `referralEnabled` - Referral rewards

### 3.4 Data Retention Policies

**Audit Logs** ([lib/db/schema/audit-logs.ts](lib/db/src/schema/audit-logs.ts)):
- Immutable (append-only, no deletes)
- Stored in `audit_logs` table
- Fields: `userId`, `adminId`, `action`, `detail`, `payload`, `ipAddress`, `createdAt`
- Example actions: `deposit.approve`, `kyc.submit`, `withdrawal.request`, `admin.kyc.decision`

**OTP Codes**:
- Expiry: 10 minutes (`OTP_TTL_MS = 600000`)
- Max attempts: 5
- Stored in `otp_codes` table with timestamp

**Sessions**:
- Expiry: 30 days
- Stored in `sessions` table
- Checked on each request; cleaned up if expired

**Activity Log** (in-memory):
- Truncated to 500 entries (FIFO)
- Persists for current server session only
- Critical activities also logged to database

**Transaction History**:
- Permanent in database
- Full audit trail with timestamp, amount, status, description
- Used for reconciliation and compliance reporting

---

## 4. CRITICAL FINANCIAL FLOWS

### 4.1 Trading/Order Execution

**Trade Record Structure**:
```typescript
{
  id: string,
  pair: string,              // "BTC/USDT"
  type: "long" | "short",
  status: "active" | "completed" | "cancelled",
  entryPrice: number,
  currentPrice: number,
  targetPrice: number,
  amount: number,
  currency: string,          // Base currency (USD)
  profit: number,            // Realized profit
  expectedProfit: number,    // Target profit
  managerId: string | null,  // Investment manager (if managed)
  createdAt: timestamp,
  completedAt: timestamp | null
}
```

**Execution Modes**:
1. **User-Initiated**: User places order in NeXTrade UI
2. **Manager-Initiated**: Investment manager executes on user's behalf
3. **Demo**: Simulated execution with fake price feeds
4. **Real**: Requires live trading tier and KYC approval

**Gating**:
- Demo users: Cannot place real trades
- Non-KYC users: Cannot open real positions
- Tier-based: Trading limit per tier applied daily
- Locked accounts: `tradingLocked` flag prevents order creation

### 4.2 Wallet Balance Management

**Wallet Types**:
- `main` - Primary USD/fiat wallet
- `trading` - Dedicated for trade execution
- `social` - Referral rewards and social features

**Balance Fields**:
```typescript
{
  balance: number,          // Available balance
  pendingBalance: number,   // Held during approval (withdrawals)
  currency: string,         // USD, EUR, ETH, etc.
  address: string,          // Blockchain address (if applicable)
  label: string,            // User-friendly name
  type: "main" | "trading" | "social"
}
```

**Operations**:
- Deposit: Credits `balance` in main wallet
- Withdrawal: Moves amount to `pendingBalance` until approval
- Trade: Debits from appropriate wallet on execution
- Transfer: Moves between user wallets
- Fee: Deducts platform/gas fees

### 4.3 Withdrawal Approval Workflow (Detailed)

See **Section 1.3** above for complete specification of the 4-stage withdrawal process.

**Key Insight**: The gas-fee gate is the central compliance mechanism ensuring no withdrawal happens without explicit admin intervention.

### 4.4 Fund Transfer & Settlement

**P2P Transfers** ([routes/p2p.ts](artifacts/api-server/src/routes/p2p.ts)):
- Peer-to-peer with escrow holding
- Buyer sends funds to platform escrow
- Seller confirms receipt
- Platform releases funds when both parties agree
- Dispute resolution: 72-hour window, admin can settle

**Blockchain Settlement**:
- On-chain payments verified before crediting wallet
- Alchemy/Infura RPC used for verification
- Gas fees charged separately from transaction amount
- Replay prevention: tx hash claimed after first use

**Error Handling**:
- Validation: All amounts/destinations checked via Zod schemas
- Balance checks: Pre-transaction verification
- Concurrency: In-memory atomicity; Redis needed for distributed systems
- Rollback: Rejected ops return held funds
- Logging: All ops logged with status and reason

---

## 5. DATA PROTECTION

### 5.1 Sensitive Data Encryption at Rest

**Wallet Credentials**:
- Seed phrases: AES-256-GCM encrypted in `connected_wallets.seed_phrase`
- Private keys: Encrypted storage
- Recovery: Decryption only on admin request or user export

**Passwords**:
- Scrypt hashing (in-memory) with salt factor 12
- Never stored plaintext
- One-way hash comparison

**OTP Codes**:
- In-memory only during validity period
- Never logged in production
- Deleted after use or expiry

**Session Tokens**:
- 32-byte random tokens
- Stored in signed cookies (tamper-proof)
- Cannot be decoded; only server knows session mapping

### 5.2 Database Security

**PostgreSQL Connection**:
- TLS enforced: `sslmode=require` in production
- Connection pooling: Prisma (10 connections default)
- No native column-level encryption (rely on application layer)

**Backup Strategy**:
- Assumed encrypted by hosting provider (Railway, Render)
- Backups should be encrypted at rest and in transit
- Regular backup testing recommended

### 5.3 PII Handling & Masking

**Stored Unencrypted**:
- Full name, email, country (necessary for operations)
- User ID (UUID, non-identifiable)

**Masked in APIs**:
- Bank account: Shows only `last4` digits
- Card numbers: Never stored; masked in responses
- Phone: Optional, admin-controlled

**Logging Redaction** ([lib/logger.ts](artifacts/api-server/src/lib/logger.ts)):
```typescript
redact: [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']"
]
```

**API Response Filtering**:
- Seed phrases: Never returned in user-facing endpoints
- Private keys: Stripped unless admin-only endpoint
- Function `toPublicConnectedWallet()` removes credentials

### 5.4 Audit Trail Logging

**In-Memory Activity Log** ([lib/store.ts](artifacts/api-server/src/lib/store.ts#L880)):
```typescript
// Truncated to 500 entries, examples:
logActivity({
  actorId: userId,
  actorName: fullName,
  action: "withdrawal.request",
  detail: "Requested 1000 USD via crypto_wallet"
});
```

**Persistent Audit Logs** ([lib/db/schema/audit-logs.ts](lib/db/src/schema/audit-logs.ts)):
```typescript
// Table: audit_logs
id: uuid,              // Unique identifier
userId: uuid,          // Actor (user or null)
adminId: uuid,         // Admin performing action (if different)
action: text,          // "deposit.approve", "kyc.submit", etc.
detail: text,          // Human-readable description
payload: jsonb,        // Structured data (before/after, request body)
ipAddress: text,       // Client IP at time of action
createdAt: timestamp   // Server time
```

**Immutability**: No UPDATE or DELETE operations allowed; append-only

**Example Actions**:
- `auth.login` - User login
- `auth.logout` - User logout
- `kyc.submit` - KYC submission
- `admin.kyc.decision` - Admin KYC review
- `deposit.request` - Deposit initiated
- `admin.deposit.approve` - Admin approves deposit
- `withdrawal.request` - Withdrawal requested
- `withdrawal.gas_fee_funded` - User funds gas fee
- `admin.withdrawal.set_gas_fee` - Admin sets fee
- `admin.withdrawal.decision` - Admin approves/rejects
- `admin.bank.verification` - Admin verifies bank account

**Database Persistence** ([lib/db-persist.ts](artifacts/api-server/src/lib/db-persist.ts)):
```typescript
persistTransaction(id, walletId, userId, {
  type: "withdrawal",
  amount: -1000,
  currency: "USD",
  status: "pending",
  description: "Withdrawal to 0x9aF2...F1A2"
});
```

### 5.5 Data Segregation by User

**In-Memory Storage**:
- `userData: Map<userId, UserData>` - Per-user data keyed by ID
- `users: Map<userId, StoredUser>` - User accounts

**Access Control**:
- Auth middleware enforces `req.userId` context
- `requireAuth()` ensures user is authenticated
- `requireAdmin()` ensures user has admin role
- Admin queries loop through all users but filter results

**No Cross-User Access**:
- Users cannot access other users' wallets
- Users cannot modify other users' KYC status
- Admin queries filtered by permission level

**Session-Based**:
- User identity via signed cookie (`xpfx_sid`)
- User context (`req.userId`, `req.storedUser`) attached on each request
- Deleted/disabled users cannot authenticate

---

## 6. CONFIGURATION & ENVIRONMENT

### 6.1 Production vs Development

| Setting | Production | Development |
|---------|-----------|-------------|
| `NODE_ENV` | `production` | `development` |
| `LOG_LEVEL` | `info` | `debug` |
| Logging Format | JSON only | Pretty-printed text |
| HTTPS Redirect | Enforced | Skipped |
| Cookie SameSite | `none` | `lax` |
| Cookie Secure | `true` | `false` |
| Demo Auth | Default disabled | Default enabled |
| Database | Required | Optional (in-memory fallback) |
| Secrets | All required | Fallback to sandbox/test |

### 6.2 Secrets Management

**Storage Locations**:
1. **Railway**: Platform secrets manager (GUI)
2. **VPS**: `/etc/xpresspro/.env` (file-based, restricted permissions)
3. **Docker**: Environment injected at runtime
4. **Replit**: Secrets tab UI
5. **Local Dev**: `.env` file (never commit)

**Critical Secrets** (production required):
```
COOKIE_SECRET or COOKIE_SIGNING_KEY or SESSION_SECRET
DATABASE_URL
WALLET_ENCRYPTION_KEY (recommended)
```

**Service Secrets** (sandbox fallback if missing):
```
MOONPAY_API_KEY              → Sandbox if missing
MOONPAY_SECRET_KEY
COINBASE_API_KEY             → Test mode if missing
COINBASE_API_SECRET
PAYSTACK_SECRET              → Test mode if missing
ALCHEMY_API_KEY              → Public RPC if missing
INFURA_API_KEY               → Fallback RPC
SENDGRID_API_KEY             → Stub email if missing
OPENAI_API_KEY               → Degraded features if missing
```

**Generation Script** ([scripts/generate-secrets.mjs](scripts/generate-secrets.mjs)):
```bash
npm run generate:secrets     # Generate random secrets for dev
```

### 6.3 Database Connection Pooling

**Prisma** ([lib/db-persist.ts](artifacts/api-server/src/lib/db-persist.ts)):
- Built-in connection pooling
- Default: 10 connections (configurable)
- Automatic reconnection on failure
- Connection URL: `DATABASE_URL` env var

**Drizzle** ([lib/db-client.ts](artifacts/api-server/src/lib/db-client.ts)):
- Pool size: 10 (hardcoded, can be customized)
- Connection reuse optimized
- Supports both Postgres and other databases

**Dual Support**:
- App can use Prisma and Drizzle simultaneously
- Prisma for runtime operations
- Drizzle for migrations and schema

### 6.4 Rate Limiting Configuration

**Login Throttle**:
- Max failures: 5 per email
- Lockout duration: 15 minutes
- Reset window: 15 minutes of inactivity

**OTP Throttle**:
- Email limit: 10 per hour
- IP limit: 50 per hour (5x email limit)
- Resend throttle: 15 seconds minimum

**Storage**: In-memory maps (Phase-2 protection level)

**Scaling Note**: For production scaling, integrate Redis for distributed rate limiting

### 6.5 Feature Flags

**Demo Mode**:
- Global: `ENABLE_DEMO_AUTH` env var (default `true` if unset)
- Per-user: `StoredUser.demoMode` flag
- Effect: Bypasses KYC for demo trading

**Trading Lock**:
- Per-user: `StoredUser.tradingLocked` flag
- Admin-controlled
- Effect: Prevents order creation

**Account Tier**:
- Calculated from KYC status, email verification, bank account
- Determines feature access dynamically
- Used in: Deposit methods, daily limits, P2P access, leverage

**Gas Fee Policy** ([lib/gas-fee-gate.ts](artifacts/api-server/src/lib/gas-fee-gate.ts)):
- Per-action configuration (deposit, withdrawal, P2P)
- Admin-configurable thresholds
- Enforced at request time

---

## 7. MONITORING & LOGGING

### 7.1 Transaction Logging

**Logged Transactions**:
- Wallet debits/credits
- Deposits (all stages)
- Withdrawals (request → approval → completion)
- Trades (open/close/profit calculation)
- Fees (subscription, gas, platform)
- P2P transactions (orders, disputes, settlements)

**Fields**:
```typescript
{
  id: uuid,
  walletId: uuid,        // Which wallet affected
  userId: uuid,          // User owner
  type: "deposit" | "withdrawal" | "trade_profit" | "fee" | ...,
  amount: number,        // Positive or negative
  currency: string,      // USD, EUR, ETH, etc.
  status: "completed" | "pending" | "failed",
  description: string,   // Human-readable details
  createdAt: timestamp   // When recorded
}
```

**Storage**:
- Dual write: In-memory store + database
- Persistence via `persistTransaction()`
- Queryable in user's transaction history

### 7.2 Error Tracking

**Optional**: Sentry integration via `SENTRY_DSN`

**Default**: Pino logging to stdout/file
```typescript
// Errors logged with full context
logger.error({ err, userId, context }, "error message");
```

**Structured Logging**: JSON format (production) or pretty-printed (dev)

**Log Levels**: `debug`, `info`, `warn`, `error` (configurable via `LOG_LEVEL`)

### 7.3 Security Event Logging

**Login Events** ([auth.ts](artifacts/api-server/src/routes/auth.ts)):
- Successful login: Session created, user ID logged
- Failed login: Attempt recorded, counter incremented
- Lockout: When 5 failures reached, account locked for 15 minutes

**Admin Actions** ([admin.ts](artifacts/api-server/src/routes/admin.ts)):
- User management: View, disable, suspend, flag operations logged
- KYC decisions: Approve/reject logged with reason
- Withdrawal approvals: Complete workflow logged
- Billing actions: Rate changes, manual settlements logged

**KYC Events**:
- Submission: Logged with document types, country
- Admin decision: Approve/reject logged with timestamp
- Rejection reason: Stored for user reference

**Withdrawal Events**:
- Request: Logged with amount, method, destination
- Gas fee set: Admin action logged with amount, deadline
- Gas fee funded: On-chain verification logged
- Approval/rejection: Admin decision logged

**Account Flags**:
- Flag applied: Admin action logged with reason
- Flag changed: Previous/new values logged
- Flag removed: Removal logged with admin name

### 7.4 Performance Monitoring

**Prometheus Metrics** ([app.ts](artifacts/api-server/src/app.ts#L260)):
- Endpoint: `GET /metrics` (Prometheus exposition format)
- Default metrics: CPU, memory, Node.js GC, event loop lag
- Custom metrics: HTTP requests, response times, error rates

**Health Checks**:
- `GET /health` → 200 OK with status payload
- `GET /healthz/db` → Database connectivity status
- `GET /readyz` → Readiness probe (Kubernetes)
- `GET /livez` → Liveness probe (Kubernetes)

**Response Format**:
```json
{
  "status": "ok",
  "service": "XpressPro FX API",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-08-13T10:00:00Z",
  "uptime": 3600,
  "memory": { "rss": ..., "heapUsed": ... }
}
```

### 7.5 Real-Time Alerts

**Admin Alerts** ([lib/notify.ts](artifacts/api-server/src/lib/notify.ts)):
- In-memory array: `adminAlerts`
- Routes:
  - `GET /admin/alerts` → Get all alerts
  - `POST /admin/alerts/read-all` → Mark as read

**Alert Triggers**:
- New withdrawal request
- Gas fee funded (awaiting admin review)
- KYC submitted
- High-risk transaction flag
- P2P disputes
- Account suspension events
- Deposit received
- Trade opened

**Alert Structure**:
```typescript
{
  id: string,
  kind: string,          // "withdrawal.requested", etc.
  title: string,         // "New withdrawal request"
  body: string,          // "User requested $1000..."
  severity: "info" | "warning" | "error",
  userId: string,        // Associated user
  userEmail: string,
  linkUrl: string,       // Deep link to action page
  read: boolean,
  createdAt: timestamp
}
```

**Notification Settings** ([admin-notifications.ts](artifacts/api-server/src/routes/admin-notifications.ts)):
- Per-event email toggle
- Routes:
  - `GET /admin/notification-settings` → Get toggles
  - `PATCH /admin/notification-settings` → Update toggles
- Examples:
  - `withdrawalGasFeeRequired` → Send email when user must fund gas
  - `withdrawalApproved` → Send email on approval
  - `kycApproved` → Send email on KYC approval
  - `accountSuspended` → Send email on suspension

---

## 8. ADMIN CONTROLS

### 8.1 Admin Approval Workflows

#### Withdrawal Approvals
See **Section 1.3** for detailed specification.

#### KYC Document Reviews
- **Route**: `POST /admin/kyc/:userId/decision`
- **Decision**: `approve` or `reject`
- **Actions**:
  1. Update `data.kyc.status` to `approved`/`rejected`
  2. Set `StoredUser.user.kycVerified` flag
  3. Store `rejectionReason` if rejected
  4. Send user notification (in-app + email if enabled)
  5. Log activity with all details
  6. Alert: Real-time admin notification if awaiting decision

#### Deposit Approvals
- **Route**: `PATCH /admin/deposits/:depositId/approve`
- **Actions**:
  1. Credit user's main wallet
  2. Create transaction record
  3. Update deposit status to `completed`
  4. Send user notification
  5. Log activity

#### Billing Mark-as-Paid
- **Route**: `POST /admin/billing/users/:userId/mark-paid`
- **Inputs**: List of charge keys to settle
- **Actions**:
  1. Mark charges `paid = true`
  2. Record `paidAt` timestamp
  3. Recompute cycle totals
  4. Debit user's main wallet
  5. Log activity

### 8.2 User Account Management

**File**: [routes/admin.ts](artifacts/api-server/src/routes/admin.ts)

**Routes**:
- `GET /admin/users` → List all users with summary stats
- `GET /admin/users/:userId` → Full user detail
- `POST /admin/users/:userId/wallet-adjust` → Credit/debit wallet
- `POST /admin/users/:userId/disable` → Prevent login
- `POST /admin/users/:userId/suspend` → Read-only mode
- `POST /admin/users/:userId/flag` → Set risk flag

**User Summary Fields**:
```typescript
{
  id: uuid,
  email: string,
  fullName: string,
  country: string,
  role: "user" | "admin" | "demo",
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected",
  balance: number,                    // Total wallet balance
  merchant: boolean,                  // P2P merchant approved
  tradingLocked: boolean,             // Admin trading lock
  accountFlag: string | null,         // Risk flag (e.g., "fraud_review")
  suspended: boolean,                 // Read-only mode
  disabled: boolean,                  // Cannot authenticate
  createdAt: timestamp
}
```

**Wallet Adjustment**:
```typescript
POST /admin/users/:userId/wallet-adjust
{
  "walletId": "w_main",
  "delta": 100,                      // Positive: credit, negative: debit
  "note": "Manual adjustment - refund"
}
```

### 8.3 Transaction Dispute Resolution

**P2P Disputes** ([routes/p2p.ts](artifacts/api-server/src/routes/p2p.ts)):
- User opens dispute on P2P order
- 72-hour resolution window
- Admin can settle dispute (favor buyer/seller)
- Funds held in escrow until resolved
- High-value disputes auto-escalate to senior admin
- Admin and users exchange messages in ticket

### 8.4 Compliance Reporting

**Activity Log Export**:
- Route: `GET /admin/activity`
- Returns: Last 100 activity log entries
- Sortable: By timestamp (newest first)

**Audit Trail**:
- Full immutable log in `audit_logs` table
- Never deleted (compliance requirement)
- Queryable by user, admin, action, date range

**Withdrawal Reports**:
- Route: `GET /admin/withdrawals?status=pending|awaiting_gas_fee|approved|rejected`
- All withdrawals from all users
- Sortable: By creation date, amount, status

**KYC Status Reports**:
- Route: `GET /admin/users`
- Includes all users' KYC statuses
- Filterable: By tier, verification status

**Billing Reports**:
- Route: `GET /admin/billing`
- User-by-user billing cycles
- Charge history and payment status
- Rate overrides per user

### 8.5 Risk Management Controls

**Account Flags**:
- Admin-set string value (e.g., `fraud_review`, `watchlist`, `high_risk`)
- Visible in:
  - User list (admin console)
  - User detail page
  - Withdrawal queue
- Effect: Can block trading/withdrawals based on flag
- Logged: When applied, changed, removed

**Account Suspension**:
- `StoredUser.suspended = true`
- Effect: Read-only across platform
- User can view data but not modify
- Cannot create orders, withdraw funds, submit forms

**Account Disabling**:
- `StoredUser.disabled = true`
- Effect: Cannot authenticate (login fails)
- Strongest restriction level
- Logged: When applied and by which admin

**Trading Lock**:
- `StoredUser.tradingLocked = true`
- Effect: User cannot create orders
- Other platform features remain accessible
- Used for investigation periods

**Demo Mode Lock**:
- `StoredUser.demoMode = true`
- Effect: Forces demo-only trading
- Bypasses KYC requirement for trading
- Used for educational accounts

**Merchant Status**:
- Approve/reject P2P merchant applications
- Route: `POST /api/p2p/merchant-application` (user)
- Admin review: Manual approval workflow
- Status: `pending` | `approved` | `rejected`

### 8.6 Admin Authentication

**File**: [routes/auth.ts](artifacts/api-server/src/routes/auth.ts)

**Multi-Admin Support**:
- Multiple admin accounts via `ADMIN_EMAIL`, `ADMIN_PASSWORD` env vars
- Additional admins in `admin_reps` table
- Each admin has independent session

**OTP Verification** (for sensitive operations):
- Store: `admin_otp` table
- Code: 6-digit, expires 10 minutes
- Max attempts: 5
- Lockout: 15 minutes after threshold

**Session**:
- Same cookie-based system as users
- `req.storedUser.role === "admin"` enforces admin-only routes
- `requireAdmin()` middleware checks role

**Rate Limiting**:
- Login throttle: 5 failures → 15-minute lockout
- OTP throttle: 10 per hour per email, 50 per IP

---

## CRITICAL SECURITY CONSTANTS

### Password Security
```
SALT_ROUNDS = 12              // Bcrypt iterations
```

### Session Security
```
SESSION_COOKIE_NAME = "xpfx_sid"
SESSION_COOKIE_MAXAGE = 30 days
SESSION_SECURE = true (production)
SESSION_SAMSITE = "none" (production), "lax" (dev)
SESSION_HTTPONLY = true (always)
```

### Encryption Security
```
WALLET_ENCRYPTION_ALGORITHM = "aes-256-gcm"
WALLET_ENCRYPTION_KEY_SIZE = 32 bytes (64 hex chars)
WALLET_ENCRYPTION_IV_SIZE = 12 bytes
WALLET_ENCRYPTION_TAG_SIZE = 16 bytes
```

### Rate Limiting
```
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MS = 15 * 60 * 1000 (15 minutes)

OTP_MAX_PER_HOUR = 10 (per email)
OTP_MAX_PER_HOUR_IP = 50 (per IP)
OTP_RESEND_THROTTLE_MS = 15 * 1000 (15 seconds)
OTP_TTL_MS = 10 * 60 * 1000 (10 minutes)
OTP_MAX_ATTEMPTS = 5
```

### Withdrawal Gas Fee
```
STATUS_CHANGES = pending → awaiting_gas_fee → approved/rejected/expired/cancelled
GAS_FEE_DEADLINE = Admin-configurable (minutes)
```

---

## KEY FILE LOCATIONS REFERENCE

### Authentication & Session
- [artifacts/api-server/src/routes/auth.ts](artifacts/api-server/src/routes/auth.ts) - Login, signup, OTP
- [artifacts/api-server/src/lib/session.ts](artifacts/api-server/src/lib/session.ts) - Session middleware
- [artifacts/api-server/src/lib/auth-throttle.ts](artifacts/api-server/src/lib/auth-throttle.ts) - Rate limiting
- [artifacts/api-server/src/lib/otp.ts](artifacts/api-server/src/lib/otp.ts) - OTP generation/verification

### Financial Processing
- [artifacts/api-server/src/routes/deposits.ts](artifacts/api-server/src/routes/deposits.ts) - Deposits
- [artifacts/api-server/src/routes/withdrawals.ts](artifacts/api-server/src/routes/withdrawals.ts) - Withdrawal requests
- [artifacts/api-server/src/routes/withdrawal-gas-fee.ts](artifacts/api-server/src/routes/withdrawal-gas-fee.ts) - Gas fee workflow
- [artifacts/api-server/src/routes/admin-deposits.ts](artifacts/api-server/src/routes/admin-deposits.ts) - Admin deposit approval
- [artifacts/api-server/src/routes/moonpay.ts](artifacts/api-server/src/routes/moonpay.ts) - Moonpay integration
- [artifacts/api-server/src/routes/billing.ts](artifacts/api-server/src/routes/billing.ts) - Billing/subscriptions

### Security & Encryption
- [artifacts/api-server/src/lib/wallet-encryption.ts](artifacts/api-server/src/lib/wallet-encryption.ts) - AES-256-GCM
- [artifacts/api-server/src/lib/cors.ts](artifacts/api-server/src/lib/cors.ts) - CORS enforcement
- [artifacts/api-server/src/lib/env.ts](artifacts/api-server/src/lib/env.ts) - Environment config
- [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts) - Security headers, HTTPS redirect

### Admin & Compliance
- [artifacts/api-server/src/routes/admin.ts](artifacts/api-server/src/routes/admin.ts) - Admin panel routes
- [artifacts/api-server/src/routes/kyc.ts](artifacts/api-server/src/routes/kyc.ts) - KYC verification
- [artifacts/api-server/src/routes/admin-notifications.ts](artifacts/api-server/src/routes/admin-notifications.ts) - Admin alerts
- [lib/db/src/schema/audit-logs.ts](lib/db/src/schema/audit-logs.ts) - Audit trail schema

### Data Access & Logging
- [artifacts/api-server/src/lib/store.ts](artifacts/api-server/src/lib/store.ts) - In-memory data store
- [artifacts/api-server/src/lib/db-persist.ts](artifacts/api-server/src/lib/db-persist.ts) - Database persistence
- [artifacts/api-server/src/lib/logger.ts](artifacts/api-server/src/lib/logger.ts) - Logging configuration
- [artifacts/api-server/src/lib/notify.ts](artifacts/api-server/src/lib/notify.ts) - Notifications & alerts

---

## PRODUCTION DEPLOYMENT CHECKLIST

- [ ] All required env vars set (COOKIE_SECRET, DATABASE_URL, WALLET_ENCRYPTION_KEY)
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] ALLOWED_ORIGINS configured for frontend domains
- [ ] SSL/TLS certificate installed (HTTPS required in production)
- [ ] Admin account created via env vars
- [ ] Moonpay/payment processor API keys configured
- [ ] Sentry DSN configured for error tracking (optional)
- [ ] Rate limiting confirmed (login throttle, OTP throttle)
- [ ] Backup strategy established (database, secrets)
- [ ] Health checks monitored: `/health`, `/metrics`
- [ ] Audit logs retention policy documented
- [ ] Admin on-call process established
- [ ] Withdrawal gas-fee policy configured
- [ ] Account tier thresholds reviewed
- [ ] Feature flags verified (demo mode disabled if needed)
- [ ] Logging level set to `info` (production)

---

## CONCLUSION

XpressPro FX implements a **compliance-first architecture** with:
- ✅ **Mandatory admin approval** for all withdrawals via universal gas-fee gate
- ✅ **AES-256-GCM encryption** for wallet credentials at rest
- ✅ **Immutable audit trails** (append-only database logs)
- ✅ **Tier-based compliance gating** (KYC status determines features)
- ✅ **On-chain verification** (Alchemy-backed payment proofs)
- ✅ **Real-time monitoring** (Prometheus, admin alerts, structured logging)
- ✅ **Strong session security** (signed httpOnly cookies, 30-day expiry)
- ✅ **CSRF protection** (double-token pattern)
- ✅ **Rate limiting** (login throttle, OTP throttle)
- ✅ **Helmet security headers** (CSP, HSTS, X-Frame-Options)

This design prioritizes **financial safety and regulatory compliance** over rapid iteration, making it suitable for regulated fintech deployments.
