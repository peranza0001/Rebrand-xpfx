# XpressPro FX — Quick Reference (remember.md)

**Version**: 1.0.0  
**Last Updated**: 2026-08-13  
**Use this for**: Quick lookup, shortcuts, and common commands

---

## TL;DR - 60-Second Overview

**XpressPro FX** is an enterprise forex trading platform with:
- **Backend**: Express.js + Prisma ORM + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Structure**: npm workspace monorepo
- **Deployment**: Railway (primary), Docker, VPS
- **Key Features**: Trading, wallets, KYC, admin approvals, P2P, managed accounts

---

## Quick Start (Developer Setup)

### 1. Install & Setup
```bash
git clone https://github.com/alfredgrace904-ops/Rebranded-xpfx.git
cd Rebranded-xpfx
npm install
cp .env.example .env
# Fill in DATABASE_URL and other env vars
```

### 2. Database Setup (First Time Only)
```bash
# Run migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Or reset (dev only, destroys data)
DATABASE_URL="..." npx prisma migrate reset
```

### 3. Build
```bash
npm run build
# Or just API: npm run build:api
# Or just frontend: npm run build:frontend
```

### 4. Develop
```bash
# Terminal 1: API server (port 8082)
npm --workspace=artifacts/api-server run dev

# Terminal 2: Nextrade UI (port 5173)
npm --workspace=artifacts/nextrade run dev

# Terminal 3: Admin portal (port 5175)
npm --workspace=artifacts/admin-portal run dev
```

### 5. Test & Validate
```bash
npm test              # Run full test suite
npm run lint          # Check code quality
npm run typecheck     # TypeScript validation
npm run predeploy     # Production readiness check
```

---

## Essential Environment Variables

### Database
```env
DATABASE_URL=postgresql://user:pass@host/db
DIRECT_DATABASE_URL=postgresql://user:pass@host/db  # for migrations
```

### Security (GENERATE UNIQUE VALUES)
```env
SESSION_SECRET=<32+ random chars>
JWT_SECRET=<32+ random chars>
WALLET_ENCRYPTION_KEY=<hex string>
ADMIN_PASSWORD=<strong password>
```

### External APIs
```env
SENDGRID_API_KEY=<your key>
ALCHEMY_API_KEY=<your key>
MOONPAY_API_KEY=<your key>
OPENAI_API_KEY=<your key>
```

### Platform
```env
NODE_ENV=development|production
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5175  # dev
LOG_LEVEL=info|debug
ENABLE_DEMO_AUTH=true
```

---

## File Locations Quick Map

| What | Where |
|------|-------|
| API code | `artifacts/api-server/src/` |
| API routes | `artifacts/api-server/src/routes/` |
| API services | `artifacts/api-server/src/lib/` |
| Database schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` |
| User UI | `artifacts/nextrade/src/` |
| Admin UI | `artifacts/admin-portal/src/` |
| Shared types | `lib/api-zod/src/` |
| Tests | `tests/` |
| Deployment | `DEPLOYMENT/` |
| Config files | root `railpack.json`, `railway.json`, `docker-compose.yml` |

---

## Common Commands

### Build & Deploy
```bash
npm run build              # Build everything
npm run build:api          # Just backend
npm run build:frontend     # Just frontend
npm run predeploy          # Production validation
npm run start              # Start production server
npm run start:prod         # With NODE_ENV=production
```

### Development
```bash
npm run dev                # Dev mode all workspaces
npm run dev:api            # Just API dev
npm run dev:nextrade       # Just user app
npm run dev:admin          # Just admin app
```

### Testing & Quality
```bash
npm test                   # Full test suite
npm run test:enterprise    # Auth flow tests
npm run test:db-connection # Database connectivity
npm run lint               # ESLint
npm run typecheck          # TypeScript
npm audit --audit-level=high  # Security audit
```

### Database
```bash
# Migrations
DATABASE_URL="..." npx prisma migrate dev      # Create new
DATABASE_URL="..." npx prisma migrate deploy   # Apply production
DATABASE_URL="..." npx prisma migrate reset    # Reset (dev only)

# Introspection
DATABASE_URL="..." npx prisma db pull          # Sync schema from DB
DATABASE_URL="..." npx prisma generate         # Regenerate client
```

### Utilities
```bash
npm run generate:secrets   # Generate random values for env
npm run healthcheck        # Health check API
npm run pm2:start          # Start via PM2 (VPS)
npm run pm2:save           # Save PM2 process list
```

---

## API Endpoints (By Feature)

### Authentication
```
POST   /api/auth/register              Register new user
POST   /api/auth/login                 Login (session)
POST   /api/auth/logout                Logout
POST   /api/auth/otp/send              Request OTP (email)
POST   /api/auth/otp/verify            Verify OTP
POST   /api/auth/password/change       Change password
POST   /api/auth/password/reset        Password reset
POST   /api/auth/pin/set               Set login PIN
```

### Trading
```
GET    /api/trades                     List user trades
POST   /api/trades                     Create new trade
GET    /api/trades/:id                 Get trade details
PUT    /api/trades/:id                 Update trade (cancel, etc.)
GET    /api/demo-trading               Demo trading endpoints
GET    /api/assets                     List tradeable assets
GET    /api/assets/:symbol             Get asset quote
```

### Wallets
```
GET    /api/wallets                    List wallets
POST   /api/wallets                    Create wallet
GET    /api/wallets/:id                Get wallet details
PUT    /api/wallets/:id                Update wallet
DELETE /api/wallets/:id                Delete wallet
POST   /api/connected-wallets          Connect external wallet
GET    /api/connected-wallets          List connected wallets
```

### KYC & Compliance
```
POST   /api/kyc/documents              Upload KYC document
GET    /api/kyc/documents              List submissions
GET    /api/kyc/status                 Get KYC verification status
```

### Withdrawals (ADMIN APPROVAL REQUIRED)
```
POST   /api/withdrawals                Request withdrawal
GET    /api/withdrawals                List withdrawals
GET    /api/admin/withdrawals          [ADMIN] All withdrawals
PUT    /api/admin/withdrawals/:id/approve   [ADMIN] Approve
PUT    /api/admin/withdrawals/:id/reject    [ADMIN] Reject
```

### Admin
```
GET    /api/admin/users                List all users
GET    /api/admin/users/:id            User details
PUT    /api/admin/users/:id            Update user
POST   /api/admin/users/:id/disable    Disable account
GET    /api/admin/platform-config      Platform settings
PUT    /api/admin/platform-config      Update settings
```

### Real-Time (WebSocket)
```
Socket.io Namespaces:
- /trading        Order updates, trades
- /notifications  User alerts
- /chat           P2P messages
- /quotes         Live price updates
```

---

## API Response Format

### Success (2xx)
```json
{
  "id": "uuid",
  "status": "completed",
  "data": {}
}
```

### Error (4xx, 5xx)
```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "details": {
    "userId": "invalid-uuid"
  }
}
```

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Database Schema (Key Tables)

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, email, password_hash, account_tier |
| `sessions` | Active sessions | id, user_id, expires_at |
| `wallets` | User crypto wallets | id, user_id, address, balance |
| `trades` | Trading orders | id, user_id, symbol, quantity, side, status |
| `bank_accounts` | User bank info | id, user_id, account_number, currency |

### Compliance Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `kyc_documents` | KYC submissions | id, user_id, doc_type, status, reviewed_at |
| `admin_reps` | Admin users | id, email, is_active |
| `admin_otp` | Admin OTP codes | id, email, code, expires_at, used |

### Payment Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `withdrawals` | Withdrawal requests | id, user_id, amount, status, approved_at |
| `deposits` | Deposit records | id, user_id, amount, status |
| `card_requests` | Debit card requests | id, user_id, status, approved_at |

### Social/Investment Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `managers` | Fund managers | id, name, performance, total_clients |
| `messages` | P2P messages | id, sender_id, recipient_id, content |
| `notifications` | User alerts | id, user_id, type, read |

---

## Troubleshooting Cheat Sheet

### Build Fails
```bash
# Check Node version
node --version  # Should be >=20.0.0

# Clean & rebuild
rm -rf node_modules package-lock.json
npm install
npm run build

# Check TypeScript
npx tsc --noEmit
```

### Database Connection Error
```bash
# Test connection
DATABASE_URL="..." npm run test:db-connection

# Check connection string format
# postgresql://user:password@host:5432/database

# If Prisma client not generated
npm run build
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use different port
PORT=8080 npm run dev
```

### Session/Auth Issues
```bash
# Clear cookies in browser dev tools

# Check SESSION_SECRET is set
echo $SESSION_SECRET

# Verify cookie settings
# HttpOnly: true, Secure: true (prod), SameSite: strict
```

### OTP Not Sending
```bash
# Check SENDGRID_API_KEY
echo $SENDGRID_API_KEY

# Verify SMTP_FROM email is verified in SendGrid

# Check logs
LOG_LEVEL=debug npm run dev:api
```

### Prisma Migrations Failed
```bash
# Rollback last migration
DATABASE_URL="..." npx prisma migrate resolve --rolled-back "migration_name"

# Retry specific migration
DATABASE_URL="..." npx prisma migrate deploy
```

---

## Deployment Checklist

### Before Deploying to Production
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript passes: `npm run typecheck`
- [ ] Production checks pass: `npm run predeploy`
- [ ] Environment variables configured
- [ ] Database backups taken
- [ ] Code reviewed and approved
- [ ] PR merged to main
- [ ] Git tag created (v1.0.0, etc.)

### Deployment Commands

#### Railway
```bash
# Push to main branch (auto-deploys)
git push origin main

# Manually trigger deployment
railway deploy
```

#### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f api
```

#### VPS with PM2
```bash
npm run pm2:start
npm run pm2:save

# Monitor processes
pm2 list
pm2 logs xpresspro-api
pm2 restart xpresspro-api
```

---

## Key Principles to Remember

### ✅ DO
- Use TypeScript strict mode
- Validate all inputs with Zod
- Log errors with full context
- Use environment variables for config
- Commit migrations to version control
- Test database interactions
- Review code before merging
- Document public functions
- Use semantic versioning
- Create detailed commit messages

### 🚫 DON'T
- Commit `.env` files
- Log sensitive data (passwords, API keys)
- Hardcode secrets in code
- Change business logic without approval
- Skip TypeScript strict checks
- Use `any` type
- Catch errors silently
- Mix concerns in functions
- Deploy without tests passing
- Use `console.log` in production code

---

## Architecture Mental Model

```
CLIENT (React)
    ↓
NGINX / API Gateway
    ↓
EXPRESS ROUTES
    ↓
SERVICE LAYER (business logic)
    ↓
DATABASE (PostgreSQL)
    ↓
EXTERNAL APIs (Alchemy, SendGrid, etc.)
```

**Flow**:
1. Client sends request
2. Validation & auth middleware
3. Route handler calls service
4. Service queries database & external APIs
5. Response returned to client
6. WebSocket for real-time updates

---

## Important Dates & Milestones

| Event | Date | Notes |
|-------|------|-------|
| OTP Persistence Fix | 2026-08-11 | Migration required for signup payload |
| Current Version | 1.0.0 | Production ready |
| Node.js Support | Until 2027 | v20 LTS active until April 2026 |

---

## Related Documentation

- **PRD.md** - Product requirements & features
- **TECH_STACK.md** - Detailed technology choices
- **ARCHITECT.md** - System architecture & design
- **RULES.md** - Development standards
- **COPILOT-INSTRUCTIONS.md** - AI assistant guidelines
- **QUICKSTART.md** - Detailed setup guide
- **PRODUCTION_CHECKLIST.md** - Deployment security

---

## Contact & Support

| Issue | Resource |
|-------|----------|
| Feature request | Create GitHub issue |
| Bug report | Create GitHub issue with reproduction |
| Security issue | Email security@company.com (if applicable) |
| Deployment help | See DEPLOYMENT/README.md |
| Database help | See Prisma docs |
| API design | See RULES.md (API Design section) |

---

## Keyboard Shortcuts (VS Code)

```
Ctrl+Shift+P     Command palette
Ctrl+F           Find in file
Ctrl+H           Find and replace
Ctrl+/           Toggle comment
Ctrl+Shift+F     Search across workspace
Ctrl+`           Toggle terminal
F12              Go to definition
Shift+F12        Find all references
```

---

## Next Steps for New Developers

1. Read this file (you're here!)
2. Review PRD.md for feature understanding
3. Review TECH_STACK.md for tech details
4. Run local setup (Quick Start section)
5. Read RULES.md for code standards
6. Review existing code in `artifacts/api-server/src/routes/`
7. Run tests to verify setup
8. Pick a small task to start contributing

---

**Last Updated**: 2026-08-13  
**Status**: ✅ Verified and current
