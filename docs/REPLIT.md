# Replit Import and Run Guide

## Import

Import this repository through Replit's GitHub importer. Do not use `Import from Vercel`.
If Replit suggests the "Port imported Vercel app to Replit" task, skip it and use the
repository's `.replit` run configuration.

## Why Vercel Imports Were Triggered

- The repository contains a root `vercel.json` with Vercel build and rewrite settings.
- The Vercel file names a frontend output directory and a Vercel-specific build script.
- Existing deployment files mention Vercel alongside Railway and the API server.
- Replit could see the frontend as a Vite app while the root was not declaring a run command.
- The old `.replit` file had modules but no explicit `run`, `build`, or npm packager settings.
- Replit's Vercel heuristic could therefore choose a migration workflow instead of the repo's monorepo workflow.
- The project is actually an npm workspace monorepo with an Express API serving the built frontend.
- The explicit `.replit` configuration now identifies that normal Node entrypoint.

## Commands

Run these from the repository root:

```bash
npm install
npm run build:replit
NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The configured Replit run command is:

```bash
npm run replit:start
```

That command builds `artifacts/api-server`, `lib/api-client-react`,
`artifacts/nextrade`, and the `/xpadmin` admin portal, then starts the API. The
API serves the user frontend from `artifacts/nextrade/dist/public` and the
admin portal from `artifacts/admin-portal/dist/public`. Replit deployment uses
`npm run build:replit` and the same start command, with `/healthz` as the health
check.

Use Replit Secrets for database credentials, API keys, session secrets, payment
provider credentials, and other environment-specific values. Do not put secrets
in `.replit`, `.env` committed files, or source code.

## Package Manager

This repository uses npm only. The canonical lockfile is the root
`package-lock.json`; there is no `pnpm-lock.yaml` or `yarn.lock`. Use `npm ci` for
clean CI installs and do not mix pnpm with npm workspaces.

## Other Deployments

`vercel.json` remains available for the Vercel frontend deployment. Railway,
VPS, and Procfile deployments continue to use the existing API build and start
paths. No Vercel-specific shim is required to build or boot locally or on Replit.
