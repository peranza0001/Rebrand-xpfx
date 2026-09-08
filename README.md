# XpressPro FX

XpressPro FX is an npm workspace monorepo for the XpressPro FX website and API.
The production entrypoint is an Express API server that also serves the built
Nextrade frontend.

## Source Of Truth

The canonical repository is:

`https://github.com/trevionjamielynn800/Rebrand-xpfx`

Use the `main` branch. Import and deploy from this GitHub repository when a
platform offers both GitHub and a provider-specific import. A Vercel project
link does not change the GitHub source of truth.

Every platform must build from the current checked-out commit. Enable automatic
deploys from `main` in the platform settings, or manually redeploy after each
push. Do not deploy an old preview, fork, or Vercel snapshot.

## Stack

- Node.js 20 or newer
- npm 10 or newer
- npm workspaces
- Express API in `artifacts/api-server`
- Vite/React website in `artifacts/nextrade`
- Shared packages in `lib/`
- PostgreSQL for production persistence

This repository uses npm only. The canonical lockfile is the root
`package-lock.json`; do not mix pnpm, yarn, or additional root lockfiles.

## Install And Run

From the repository root:

```bash
npm ci
npm run build
npm start
```

The API listens on `PORT` or its default port and serves the frontend from
`artifacts/nextrade/dist/public`. The health endpoint is `/healthz`.

For a smaller website/API deployment used by Replit:

```bash
npm ci
npm run build:replit
npm run replit:start
```

`replit:start` builds the API, shared client, and Nextrade website, then starts
the single API process. Production deployments must provide `DATABASE_URL` and
other credentials through platform secrets or environment variables.

## Development

```bash
npm run dev:api
npm run dev:nextrade
npm run dev:admin
```

The development frontend proxies `/api` requests to the API. Run the API and
frontend together when testing authenticated or realtime workflows.

## Platform Configuration

### Replit

Use **Import from GitHub**, select `trevionjamielynn800/Rebrand-xpfx`, and use
the `main` branch. Do not use **Import from Vercel**. The repository `.replit`
file defines the npm build and run commands. If Replit suggests a Vercel port
migration, skip it and use the existing `.replit` configuration. Store secrets
in Replit Secrets.

### Vercel

`vercel.json` deploys the Nextrade frontend and rewrites `/api/*` to the API
service configured by the Vercel project. Set `VITE_API_URL` or the configured
API environment value in Vercel; do not commit provider URLs or credentials.
Keep the Vercel project connected to this GitHub repository and `main` branch.

### Railway and Railpack

`railway.json` and `railpack.json` use the root npm lockfile, build the current
workspace outputs, start `artifacts/api-server/dist/index.mjs`, and check
`/healthz`. Set production secrets in Railway variables.

### VPS, Docker, and Procfile

Build from the repository root with `npm ci && npm run build`, then start:

```bash
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The Docker and PM2 configurations use the same API entrypoint. Never bake
`.env` files or secrets into an image.

## Environment

Copy `.env.example` for local development. Production requires at least a
PostgreSQL `DATABASE_URL`, `NODE_ENV=production`, and a public `PORT` supplied
by the hosting platform. Use platform secret storage for API keys, session
secrets, payment credentials, and mail credentials.

## Verification

```bash
npm ci
npm run build:replit
curl http://127.0.0.1:$PORT/healthz
```

A successful deployment should return HTTP 200 from `/healthz` and serve the
website at `/`.

Additional Replit details are in [docs/REPLIT.md](docs/REPLIT.md).
