# XpressPro FX — Quick Start Guide

## Prerequisites
- Node.js 20 LTS
- npm 10+
- PostgreSQL database (Neon recommended for cloud)

## Run Locally (Development)

### 1. Clone and install
```bash
git clone https://github.com/ambermarshallofficialchat94-droid/Rebranded-xpfx.git
cd Rebranded-xpfx
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Fill in all required values:
#   DATABASE_URL=postgresql://user:pass@host/db
#   DIRECT_DATABASE_URL=(same or direct connection string for Prisma)
#   SESSION_SECRET=<random 32+ char string>
#   WALLET_ENCRYPTION_KEY=<encryption key>
#   API_PROXY_TARGET=http://localhost:8082 (for frontend dev)
#   And all other secrets in .env.example
```

### 3. Apply database migrations (first time only, or after schema updates)
```bash
# Only needed after initial clone, schema changes, or after pulling updates with migration files
# (e.g., OTP persistence fix on 2026-08-11)
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 4. Build
```bash
npm run build --workspace=artifacts/api-server
```

### 5. Start (dev mode with watch)
```bash
# In separate terminals:

# Terminal 1: API server (port 8082)
npm --workspace=artifacts/api-server run dev

# Terminal 2: Nextrade frontend (port 5173)
npm --workspace=artifacts/nextrade run dev

# Terminal 3: Admin portal (port 5175)
npm --workspace=artifacts/admin-portal run dev
```

Or use VS Code Run & Debug to start all at once.

### 6. Open in browser
- **User app:** http://localhost:5173 (after login, redirects authenticated users)
- **Admin:** http://localhost:5175

## IMPORTANT: Routes and Authentication

- **Always open the root URL first** (`http://localhost:5173` or `http://localhost:5175`)
- Do NOT open `/dashboard` or protected routes directly — you'll receive HTTP 401 without a session
- The app redirects unauthenticated users to `/login`
- Log in first; the dashboard becomes accessible after authentication

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `SESSION_SECRET` | Signed session/cookie secret (required, min 32 chars in production) |
| `WALLET_ENCRYPTION_KEY` | Encryption key for wallet secrets |
| `API_PROXY_TARGET` | API proxy target for frontends (dev only, default: `http://localhost:8082`) |
| `NODE_ENV` | `development` or `production` |
| `LOG_LEVEL` | Pino log level: `debug`, `info`, `warn`, `error` |

## Health Check Endpoints

All public, no auth required:

- `GET /healthz` — Basic liveness probe
- `GET /healthz/db` — DB connectivity (returns 200 if DB reachable, 503 if not)
- `GET /admin/provisioning-status` — Admin setup status
- `GET /metrics` — Prometheus metrics (port 8082)

## Database Migrations

### Check status (safe, read-only)
```bash
DATABASE_URL="postgresql://..." npx prisma migrate status
```

### Apply pending migrations (destructive, manual-only)
```bash
# Only run this deliberately after reviewing `migrate status`
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**NEVER** run migrations automatically in startup code. They are applied only by explicit command.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **API returns 401** | Expected on protected routes without valid session. Redirect to login. |
| **POST /api/auth/login fails** | Verify DATABASE_URL is set and database is reachable. |
| **Frontend can't reach API** | Check `API_PROXY_TARGET` in `.env` and Vite proxy config. |
| **Build fails: "Cannot find module @workspace/*"** | Run `npm install` at repo root. |
| **CORS error from frontend** | API CORS is configured in `artifacts/api-server/src/app.ts`. Check `ALLOWED_ORIGINS`. |
