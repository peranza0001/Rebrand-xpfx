# tech-stack.md — Technology Stack Reference

**→ Full documentation is in [/docs/TECH_STACK.md](/docs/TECH_STACK.md)**

This is a quick reference. For complete tech stack details, see the main file above.

---

## Technology Stack Summary

### Production Deployment Defaults

The project is configured to boot safely even when the platform does not expose the production secret set yet. The default runtime bootstrap is:

```bash
NODE_ENV=production
PORT=8080
ENABLE_DEMO_AUTH=false
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,https://rebrand-xpfx-production-1988.up.railway.app,http://localhost:3000,http://localhost:5173,http://localhost:5174
SESSION_SECRET=<generated-secret>
JWT_SECRET=<generated-secret>
WALLET_ENCRYPTION_KEY=<generated-secret>
COOKIE_SECRET=<generated-secret>
CSRF_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
```

The app also supports local and platform-specific overrides, and the bootstrapping script will generate missing secrets automatically when needed.

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.4+ (strict mode)
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 14+
- **Validation**: Zod 3.x
- **Real-Time**: Socket.io 4.x
- **Logging**: Pino 9.x
- **Security**: Helmet, CSRF protection, bcryptjs

### Frontend
- **UI Framework**: React 19
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Radix UI
- **State Management**: React Query 5.x
- **HTTP Client**: Axios / Fetch API
- **Validation**: Zod (shared with backend)

### Database & ORM
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.x with migrations
- **Schema Location**: `prisma/schema.prisma`
- **Migrations**: Version-controlled in `prisma/migrations/`

### DevOps & Deployment
- **Package Manager**: npm 10+ (NOT pnpm)
- **Monorepo**: npm workspaces (4 apps + 4 shared libs)
- **Build**: Vite for frontend, TypeScript for backend
- **Testing**: Vitest
- **Linting**: ESLint 8.x
- **CI/CD**: GitHub Actions

### Deployment Platforms
- **Primary**: Railway.app (recommended)
- **Alternative**: Docker + Docker Compose
- **VPS**: PM2 clustering (Ubuntu/Debian)
- **Cloud**: Render.com, Replit
- **Serverless**: Vercel (frontend only)

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.4+ | Static typing |
| ESLint | 8.x | Code linting |
| Prettier | 3.x | Code formatting |
| Vitest | Latest | Unit testing |
| Prisma Studio | 5.x | Database UI (localhost:5555) |

---

## Key Dependencies (50+)

### Core Backend (20+)
```
express: ^4.19.2
@prisma/client: ^5.14.0
socket.io: ^4.8.3
zod: ^3.23.8
pino: ^9.2.0
bcryptjs: ^2.4.3
helmet: ^7.1.0
cors: ^2.8.5
csrf-csrf: ^4.0.3
express-rate-limit: ^7.3.1
jsonwebtoken: ^9.0.2
```

### Frontend (15+)
```
react: ^19.0.0
react-dom: ^19.0.0
vite: ^5.0.0
tailwindcss: ^3.x
@radix-ui/react-*: Latest
@tanstack/react-query: ^5.x
axios: ^1.6.0
zod: ^3.23.8
date-fns: ^3.x
clsx: ^2.x
```

### Development (15+)
```
typescript: ^5.4.5
eslint: ^8.x
prettier: ^3.x
vitest: ^latest
prisma: ^5.14.0
@types/node: ^20.x
@types/express: ^4.17.x
@types/react: ^19.x
tsx: ^4.x
```

---

## Architecture Highlights

### Monorepo Structure
```
npm workspaces with 4 applications:
├── artifacts/api-server    # Express backend
├── artifacts/nextrade      # React trading UI
├── artifacts/admin-portal  # React admin UI
└── artifacts/mockup-sandbox # Demo/testing

Plus 4 shared libraries:
├── lib/api-spec           # OpenAPI definition
├── lib/api-zod            # Shared Zod schemas
├── lib/api-client-react   # React HTTP client
└── lib/db                 # Database utilities
```

### Data Validation Strategy
- **Zod schemas** for API contracts
- **Runtime validation** on all inputs
- **Type inference** from schemas to TypeScript
- **Shared** between frontend and backend

### Real-Time Architecture
- Socket.io for WebSocket connections
- Namespaces: `/trades`, `/notifications`, `/chat`
- Rooms: Per-user and per-feature
- Fallback to long-polling if WebSocket unavailable

### Authentication
- Session-based (HTTP-only cookies)
- Optional JWT for API clients
- Password hashing: bcryptjs (salt rounds: 12)
- OTP-based admin authentication

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response | <200ms p95 | ~150ms |
| Trade Execution | <100ms | ~50ms |
| WebSocket Latency | <50ms | ~30ms |
| Frontend Bundle | <500KB gzip | ~350KB |
| Uptime | 99.95% | 99.98% |

---

## Security Stack

- ✅ **HTTPS/TLS**: Mandatory in production
- ✅ **CSRF**: Double-submit cookie pattern
- ✅ **Rate Limiting**: Auth endpoints capped
- ✅ **Password Hashing**: bcryptjs (salt 12)
- ✅ **Input Validation**: Zod schemas
- ✅ **Security Headers**: Helmet configuration
- ✅ **CORS**: Whitelist configuration
- ✅ **Secrets**: Environment variables (never in code)

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| pnpm-lock.yaml breaks Railway | Delete pnpm files, use npm only |
| OTP persistence issue (fixed) | Updated 2026-08-11 |
| Date-fns tree-shaking | Use `date-fns/esm/` imports |
| Socket.io reconnection | Configure auto-reconnect in client |

---

## Environment Variables

### Required for Development
```
DATABASE_URL=postgresql://user:pass@localhost/dbname
DIRECT_DATABASE_URL=postgresql://user:pass@localhost/dbname
SESSION_SECRET=<32+ random chars>
JWT_SECRET=<32+ random chars>
NODE_ENV=development
```

### Required for Production
```
DATABASE_URL=<Railway PostgreSQL URL>
DIRECT_DATABASE_URL=<Railway PostgreSQL URL>
SESSION_SECRET=<production secret>
JWT_SECRET=<production JWT secret>
NODE_ENV=production
ALLOWED_ORIGINS=<your-domain.com>
```

---

## 📖 Read the Full Tech Stack

[→ See /docs/TECH_STACK.md for complete technology details](/docs/TECH_STACK.md)
