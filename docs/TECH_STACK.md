# XpressPro FX — Technology Stack Documentation

**Version**: 1.0.0  
**Last Updated**: 2026-08-13  
**Runtime**: Node.js 20+

---

## Overview

This document details the complete technology stack, architecture, and design decisions for XpressPro FX.

---

## Runtime & Package Management

### Node.js Ecosystem
| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | ≥20.0.0 | JavaScript runtime |
| **npm** | ≥10.0.0 | Package manager (NOT pnpm) |
| **TypeScript** | 5.4.5 | Language (strict mode) |

**Key Decision**: Monorepo using **npm workspaces** (NOT pnpm). The `pnpm-lock.yaml` file must be removed if present, as it breaks Railway builds.

---

## Backend Stack

### HTTP Framework
```
express: ^4.19.2
├── middleware: helmet, cors, compression, cookie-parser, morgan
├── validation: express-validator, zod
├── rate limiting: express-rate-limit
├── async error handling: express-async-errors
└── CSRF protection: csrf-csrf ^4.0.3
```

**Location**: `artifacts/api-server/src/`

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `bcryptjs` | ^2.4.3 | Password hashing (PBKDF2 + bcrypt) |
| `jsonwebtoken` | ^9.0.2 | JWT tokens (optional API auth) |
| `helmet` | ^7.1.0 | HTTP security headers |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `csrf-csrf` | ^4.0.3 | CSRF token generation/validation |
| `express-rate-limit` | ^7.3.1 | Rate limiting (DDoS protection) |

### Database & ORM
```
prisma: 5.14.0
├── provider: postgresql
├── migrations: Automatic with prisma migrate
├── schema: artifacts/api-server/prisma/schema.prisma
└── client: @prisma/client ^5.14.0

drizzle-orm: ^0.45.2 (Alternative ORM, optional)
└── drizzle-zod: ^0.8.3 (Type generation)
```

**Database**: PostgreSQL 14+  
**Connection Pool**: Built-in via pg/Prisma  
**Migrations**: Version-controlled in `prisma/migrations/`

### Data Validation & Schemas
```
zod: ^3.23.8
├── Runtime validation (request/response)
├── Type inference (TypeScript)
└── Custom error messages
```

**Usage**: API schemas in `lib/api-zod/src/generated/`

### Real-Time Communication
```
socket.io: ^4.8.3
├── WebSocket protocol
├── Fallback: long-polling
├── Rooms: Per-user, per-trade messaging
└── Namespaces: /chat, /trading, /notifications
```

**Location**: `artifacts/api-server/src/lib/realtime.ts`

### Logging & Observability
| Package | Purpose |
|---------|---------|
| `pino` | ^9.2.0 - Fast structured logging |
| `pino-http` | ^10.2.0 - HTTP request logging |
| `pino-pretty` | ^11.2.1 - Pretty console output |
| `prom-client` | ^14.0.1 - Prometheus metrics |

**Log Levels**: `debug`, `info`, `warn`, `error`  
**Output**: JSON-structured logs (prod), pretty-printed (dev)

### Email & Communication
```
nodemailer: ^9.0.5
└── SMTP integration (SendGrid, custom)
```

**Use Cases**: OTP delivery, notifications, password resets

### Blockchain Integration
```
ethers: ^6.0.0
├── Web3 provider (Alchemy, Infura)
├── Wallet operations
├── Smart contract interaction
└── Gas estimation
```

### External Services
| Service | Provider | Use Case |
|---------|----------|----------|
| **On-Ramp** | Moonpay | Fiat → Crypto conversion |
| **Payments** | Paystack | Card processing (Africa) |
| **Crypto Payments** | Coinbase Commerce | Crypto deposit processor |
| **AI/Chat** | OpenAI API | Market analysis, chatbot |
| **Email** | SendGrid | Transactional email |

### Utilities
| Package | Purpose |
|---------|---------|
| `uuid` | ^14.0.1 - UUID generation |
| `dotenv` | ^16.4.5 - Environment config |
| `pg` | ^8.20.0 - PostgreSQL driver |

---

## Frontend Stack

### Core Framework
```
react: 19.1.0
├── jsx/tsx syntax
├── Hooks-based components
└── Functional components only
```

**Build Tool**: Vite (hot module reload, fast builds)

### UI Component Library
```
@radix-ui/react-*: Latest versions
├── Unstyled, accessible component primitives
├── Keyboard navigation built-in
├── ARIA attributes automatic
└── Headless design (styling via CSS)

lucide-react: ^0.545.0
└── Icon library (450+ icons)

class-variance-authority: ^0.7.1
├── CSS-in-JS variant system
└── Type-safe class names
```

### Styling
- **Framework**: Tailwind CSS (utility-first)
- **Theme Support**: `next-themes` (light/dark mode)
- **CSS**: Custom CSS modules + Tailwind utilities

### State Management & Data Fetching
```
@tanstack/react-query: ^5.0.0
├── Server state management
├── Caching & synchronization
├── Background refetching
└── Optimistic updates
```

**HTTP Client**: Native `fetch` API (via React Query)

### Utilities
| Package | Purpose |
|---------|---------|
| `date-fns` | ^3.6.0 - Date/time formatting |
| `clsx` | ^2.1.1 - Conditional CSS classes |
| `cmdk` | ^1.1.1 - Command palette component |
| `qrcode` | ^1.0.1 - QR code generation |
| `embla-carousel-react` | ^8.6.0 - Carousel/slider |

### API Client
```
@workspace/api-client-react: ^0.0.0 (Internal)
├── React-specific bindings
├── Type-safe API methods
└── Zod schema validation
```

---

## Shared Libraries (npm Workspaces)

### `lib/api-zod`
- **Purpose**: API schemas and types
- **Tech**: Zod, TypeScript
- **Exports**: Validated request/response schemas
- **Usage**: Both backend and frontend

### `lib/db`
- **Purpose**: Database utilities
- **Tech**: Drizzle-orm, Prisma, Zod
- **Exports**: Connection config, schema definitions
- **Usage**: Shared DB connection logic

### `lib/api-client-react`
- **Purpose**: React-specific API client
- **Tech**: React Query, Zod, fetch
- **Exports**: Hooks for API calls
- **Usage**: Frontend data fetching

---

## DevOps & Deployment

### Build Tools
| Tool | Purpose |
|------|---------|
| `tsc` (TypeScript) | Type checking & compilation |
| `tsx` | TypeScript execution (development) |
| `vite` | Frontend bundling & dev server |
| `esbuild` | Fast JavaScript bundler |

### Package Management
- **Lock File**: `package-lock.json` (NOT `pnpm-lock.yaml`)
- **Strategy**: npm v10+ with workspaces
- **CI/CD**: GitHub Actions (`.github/workflows/`)

### Deployment Platforms
| Platform | Config File | Use Case |
|----------|-------------|----------|
| **Railway** | `railway.json` | Primary (Node.js optimized) |
| **Render** | `render.yaml` | Alternative cloud |
| **Docker** | `docker-compose.yml`, `Dockerfile` | Self-hosted |
| **Replit** | `replit.md` | Rapid prototyping |
| **VPS** | `ecosystem.config.cjs`, `nginx.conf` | Manual deployment |

### Database Migrations
```
prisma migrate:
├── Version control: prisma/migrations/
├── Auto-applied on: npm run predeploy
└── Rollback: Supported (with data backups)
```

### Infrastructure (Docker Compose)
```yaml
services:
  - api: Express.js API server
  - postgres: PostgreSQL 16-alpine
  - redis: Redis (caching, rate limiting, BullMQ)
  - nginx: Reverse proxy + SSL termination
  - certbot: Let's Encrypt SSL auto-renewal
```

---

## Configuration Management

### Environment Variables
**Template**: `DEPLOYMENT/LOCAL_ENV_TEMPLATE.env`

Critical Variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db
DIRECT_DATABASE_URL=(for Prisma migrations)

# Security
SESSION_SECRET=<32+ char random string>
JWT_SECRET=<32+ char random string>
WALLET_ENCRYPTION_KEY=<32 byte hex>
ADMIN_PASSWORD=<strong password>

# External APIs
SENDGRID_API_KEY=<API key>
ALCHEMY_API_KEY=<API key>
MOONPAY_API_KEY=<API key>
OPENAI_API_KEY=<API key>

# Platform
ALLOWED_ORIGINS=https://app.domain.com,https://admin.domain.com
NODE_ENV=production
PORT=3000
```

### Development Configuration
- **Hot Reload**: Enabled via `tsx watch` and Vite
- **Source Maps**: Enabled for debugging
- **Logging**: Pretty-printed JSON (dev), structured (prod)

### Production Configuration
- **SSL/TLS**: Enforced via nginx or Railway
- **Compression**: gzip enabled
- **Health Checks**: `/healthz`, `/readyz` endpoints
- **Metrics**: Prometheus `/metrics` endpoint

---

## Testing Infrastructure

### Test Runners
| Test Suite | Command | Coverage |
|-----------|---------|----------|
| App Readiness | `npm run test` | Server startup |
| Production Env | `npm run test` | Environment validation |
| Auth Flow | `npm run test:enterprise` | Authentication |
| DB Connection | `npm run test:db-connection` | Database connectivity |
| Smoke Tests | `scripts/smoke-test.mjs` | Production sanity checks |

### Test Types
- **Unit**: Individual function/method tests
- **Integration**: Multi-component interaction tests
- **E2E**: Full user flow tests (auth, trading, withdrawals)
- **Smoke**: Critical path verification (post-deployment)

---

## Code Quality & Linting

### ESLint Configuration
- **Parser**: `@typescript-eslint/parser`
- **Rules**: 
  - `no-console: warn` (catch debug logs)
  - `@typescript-eslint/no-unused-vars` (with underscore exception)
  - `react-hooks/exhaustive-deps: off` (allow intentional skips)
- **Ignored**: `dist/`, `node_modules/`, `coverage/`, `build/`

### TypeScript Configuration
- **Strict Mode**: `true` (strict type checking)
- **Target**: ES2020
- **Module**: ESNext
- **Source Maps**: Enabled

### Formatting
- **Prettier**: Not configured (optional, team preference)
- **Manual Formatting**: Follow existing conventions

---

## Security Stack

### Authentication Layers
1. **Password Auth**: bcrypt with salt rounds = 12
2. **Session Auth**: Secure cookie-based sessions
3. **OTP Auth**: Email-based one-time passwords (admin)
4. **JWT Auth**: Optional for API clients
5. **CSRF Protection**: Double-submit cookie pattern

### Encryption
- **At Rest**: AES-256 (wallet keys, sensitive data)
- **In Transit**: TLS 1.3 (all connections)
- **Key Management**: Platform secrets manager (Railway, Render, Vault)

### Rate Limiting
- **Auth Endpoints**: 5 requests/15 minutes (per IP)
- **API Endpoints**: 100 requests/hour (per user)
- **WebSocket**: 10 messages/second
- **Implementation**: `express-rate-limit` + Redis

---

## Performance Optimization

### Frontend
- **Code Splitting**: Per-route lazy loading
- **Bundle Size**: <200KB gzipped
- **Caching**: React Query (1 hour default)
- **Images**: WebP format, lazy loading

### Backend
- **Database**: Connection pooling (20-30 connections)
- **Caching**: Redis (sessions, rate limiting, leaderboards)
- **Compression**: gzip on all responses (>1KB)
- **CDN**: Optional for static assets

### Monitoring
- **APM**: Optional (Sentry, New Relic)
- **Logs**: Structured JSON via Pino
- **Metrics**: Prometheus (CPU, memory, request latency)
- **Health Checks**: `/healthz` (always responds 200)

---

## Dependency Management

### Key Dependencies by Category

**Security**:
- `helmet` - HTTP headers
- `cors` - CORS handling
- `csrf-csrf` - CSRF tokens
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens

**Database**:
- `prisma` + `@prisma/client` - ORM
- `drizzle-orm` - Alternative ORM
- `pg` - PostgreSQL driver

**API & Validation**:
- `express` - HTTP framework
- `zod` - Schema validation
- `express-validator` - Input validation

**Real-Time**:
- `socket.io` - WebSockets

**UI** (Frontend):
- `react` - UI framework
- `@radix-ui/*` - Components
- `tailwindcss` - Styling
- `@tanstack/react-query` - State management

**DevOps**:
- `tsx` - TypeScript runner
- `vite` - Build tool
- `esbuild` - Bundler

### Overrides (Dependency Resolution)
```json
{
  "brace-expansion": "2.1.4",
  "minimatch": "7.4.9",
  "esbuild": "0.28.1",
  "@esbuild-kit/core-utils": { "esbuild": "0.28.1" }
}
```

**Reason**: Security fixes for deep dependencies

---

## Version & Compatibility

### Node.js Support
- **Minimum**: v20.0.0
- **Recommended**: v20 LTS (active support until April 2026)
- **Future**: Will upgrade to v22 LTS (April 2025)

### TypeScript Support
- **Version**: 5.4.5+
- **Target**: ES2020
- **Strict Mode**: Enabled
- **No Type-Only Imports**: Use `import type {...}` pattern

### Browser Support (Frontend)
- **Chrome/Edge**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Mobile**: iOS 14+, Android 8+

---

## Known Issues & Workarounds

### date-fns Fix
- **Issue**: date-fns tree-shaking causes large bundles
- **Fix**: `scripts/fix-date-fns.mjs` auto-runs during bootstrap
- **Impact**: Reduces bundle size by ~40KB

### Prisma Not Generated
- **Issue**: First-time builds may fail if Prisma client not generated
- **Fix**: Auto-run `prisma generate` in postinstall
- **Command**: `npm install` will auto-generate

### pnpm Lock File
- **Issue**: `pnpm-lock.yaml` breaks Railway builds
- **Fix**: Remove file, use `package-lock.json` only
- **Command**: `rm pnpm-lock.yaml` before deployment

---

## References

- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-best-practices/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
