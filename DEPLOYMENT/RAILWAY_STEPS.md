# Railway deployment and migration steps

This document describes the exact commands, required secrets, and recommended CI steps to safely apply Prisma migrations, build artifacts, and redeploy the API server on Railway.

Required Railway/project secrets
- `NPM_CONFIG_PRODUCTION=false` — Railway Variable. Prevents deprecated npm `production` configuration from being inherited during install, build, and start.
- `DATABASE_URL` — private connection string for the PostgreSQL instance used by the API server.
- `SESSION_SECRET` — secret used to sign session cookies.
- `CSRF_SECRET` (optional) — used by CSRF middleware if configured separately.
- `RAILWAY_API_KEY` or `RAILWAY_TOKEN` — for CLI-driven deployments (optional if you use Railway UI).
- `PRODUCTION_URL` — public URL used for smoke tests.
- `SMOKE_EMAIL`, `SMOKE_PASSWORD` — credentials used by smoke/E2E tests.

Safe deployment checklist (manual)
1. Ensure `main` branch is up to date and CI artifacts are built.
2. In Railway Variables, set `NPM_CONFIG_PRODUCTION=false`, then trigger a new deployment.
3. Backup the production database (Railway and Postgres provide snapshot features).
4. Run migrations against production DB:

```bash
# from repo root
export DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
npx prisma migrate deploy --schema=artifacts/api-server/prisma/schema.prisma

# regenerate prisma client
npx prisma generate --schema=artifacts/api-server/prisma/schema.prisma
```

5. Build API and frontends (or let CI build and upload artifacts):

```bash
npm ci
npm run build --workspace=artifacts/api-server
npm run build --workspace=artifacts/nextrade
npm run build --workspace=artifacts/admin-portal
```

6. Redeploy / restart the Railway service so the new code picks up schema/client changes.
   - Option A (Railway UI): Open your Railway project, trigger a redeploy or rebuild, or update the service to a new commit.
   - Option B (Railway CLI): Login and run `railway up` or use the Railway GitHub integration to deploy.

Railway CLI example (optional)
1. Install Railway CLI: `curl -sSL https://railway.app/install.sh | sh` (follow official instructions).
2. Login using the API key:

```bash
railway login --apiKey "$RAILWAY_API_KEY"
```

3. Select the project (or use `--projectId`) and run `railway up` from the repo root. Note: exact CLI commands and flags can vary with Railway CLI versions.

Automated CI pattern (recommended)
- Use the existing workflow `.github/workflows/migrate-and-build.yml` to run migrations and build artifacts as a single atomic job.
- After that job uploads artifacts, add an additional job (or separate workflow) that downloads the artifacts and performs the deployment (Railway CLI or your preferred deploy mechanism).

Example GitHub Action job snippet (deploy stage) — replace `RAILWAY_API_KEY`/`RAILWAY_PROJECT_ID` with secrets:

```yaml
- name: Deploy to Railway
  uses: railwayapp/railway-action@v1
  with:
    apiKey: ${{ secrets.RAILWAY_API_KEY }}
    projectId: ${{ secrets.RAILWAY_PROJECT_ID }}
    # additional inputs may be required depending on action version
```

Post-deploy verification
1. Hit health endpoints:
   - `GET /healthz`
   - `GET /api/healthz`
   Expect JSON `{ status: 'ok' }` and HTTP 200.
2. Obtain CSRF token: `GET /api/csrf-token` — must return a token.
3. Run the E2E smoke test (CI workflow `E2E Smoke (Production)` or locally):

```bash
PRODUCTION_URL="https://your.app" SMOKE_EMAIL="smoke@example.com" SMOKE_PASSWORD="secret" node scripts/e2e-smoke.mjs
```

If the smoke test fails with schema/Prisma errors (e.g. `P2022` missing column), re-run migrations and confirm that the `prisma migrate deploy` step completed successfully against the same `DATABASE_URL` used by the production service.

Troubleshooting notes
- If the API errors referencing `dist` code differences, ensure you rebuilt the API after running `prisma generate` and that the deployed `dist` files correspond to the source that generated the Prisma client.
- If sessions are not persisting after restart, confirm the session store is persisted to the database (check `sessions` table) and `SESSION_SECRET` did not change.

Contact and escalation
- If deployment fails, capture Railway logs (Logs → Service → Recent Deployments) and paste the error into a GitHub issue. Keep a copy of the failing SQL error and the output of `npx prisma migrate status --schema=artifacts/api-server/prisma/schema.prisma`.

---

If you want, I can now:
- attempt to push the remaining local commits from this environment (may hit sandbox limitations), or
- provide a ready-to-run GitHub Actions deploy job tailored to your Railway setup if you give `RAILWAY_PROJECT_ID` and confirm the action variant to use, or
- walk you through running the migration and smoke tests step-by-step while you run commands in your terminal.
