# XpressPro FX Production Readiness Evidence

Date: 2026-09-10
Branch: `fix/production-readiness-20260909`
Repository: `peranza0001/Rebrand-xpfx`

This is a current evidence report, not an acceptance declaration. Older completion reports are not treated as proof when current checks contradict them.

## Verified Evidence

| Area | Evidence | Result |
| --- | --- | --- |
| Git branch | `git status --short --branch` | Branch is clean and tracks `origin/fix/production-readiness-20260909`. |
| npm policy | `find . -name 'pnpm-lock.yaml' -o -name 'package-lock.json'` | One `package-lock.json`; no `pnpm-lock.yaml` found. |
| TypeScript | `npm run typecheck` | Passed on 2026-09-09. |
| API build | `npm run build --workspace=artifacts/api-server` | Passed on 2026-09-09. |
| Repository tests | `npm test` | Passed on 2026-09-09; the readiness suite reported 13 passing tests. |
| Production environment tests | `node --import tsx tests/production-env.test.mjs` | Passed 14/14 after Sentry runtime dependencies were made explicit. |
| Apex domain | `curl -L -I https://xpressprofx.com` | HTTP 200 from Vercel. DNS resolves to `216.198.79.1`. |
| Wallet provider metadata | `auth-siwe.ts`, `connect-wallet.tsx` | Injected wallets and WalletConnect now send and persist distinct provider types. |
| Admin withdrawal identity | `routes/admin.ts` | Withdrawal responses now include owning user name and email. |
| Mail sender | `lib/email.ts`, `routes/mailbox.ts` | Default sender is `noreply@xpressprofx.com`. |
| Railway build configuration | `railway.json`, root `package.json` | Removed cache/.vite cleanup; build tools are regular dependencies; `npm ci`, predeploy, API build, and client build pass locally. |
| Frontend builds | `npm run build:frontend:xpadmin` | NexTrade and admin portal production builds pass with Vite 7.3.6. |
| Static quality/security | `npm run lint`, `npm audit --omit=dev` | Lint passes; production audit reports 0 vulnerabilities. |
| Admin provider addresses | `admin-extended.ts`, `db-persist.ts` | Per-user address updates now upsert to `deposit_addresses` and write an admin activity entry. |
| Support receipt | `routes/support.ts` | Ticket creation sends a receipt through the existing SendGrid/SMTP/audit email layer. |

## Not Proven or Failing

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Upstream PR and green CI | Existing production-readiness upstream PR is open; current API access was rate-limited when checking its latest status. | PR exists; current remote check status not proven |
| `www.xpressprofx.com` | DNS lookup and curl fail with host resolution error. | Not complete; requires DNS/provider change |
| Frontend production build | `npm run build:frontend:xpadmin` now passes with Vite 7.3.6; non-fatal sourcemap/chunk warnings remain. | Proven locally |
| Full wallet E2E | No executed user-to-admin-to-database WalletConnect flow exists. | Not proven |
| Durable admin provider address changes | Admin address endpoint now upserts to the existing `deposit_addresses` table and logs activity; a live PostgreSQL restart test is still absent. | Implemented; live persistence not proven |
| Durable investment activation | Plan activation and subscription state are still in-memory in the primary flow. | Not complete |
| Crypto and copy-trading execution | `crypto-orders.ts` exposes `pending_stub`/`provider: stub`; copy trading uses internal simulation paths. | Not complete |
| Installment funding | No complete implementation and dedicated durable tests were found. | Not complete |
| Support email acknowledgement | Support ticket creation now sends an immediate registered-email receipt; durable delayed queue timing is not implemented. | Implemented with timing limitation |
| Production mail delivery | SendGrid/SMTP support exists, but no real provider delivery or mailbox receipt was proven from the live domain. | Not proven |
| Auth/database restart E2E | Local tests use in-memory or test persistence adapters; no current clean production database restart proof exists. | Not proven |

## Changes Published On This Branch

- `dedc3bae` `fix: wire admin withdrawal user details`
- `83f7b7bc` `fix: preserve wallet provider in siwe`
- `0f4c17f7` `email: use canonical noreply sender`
- `a6dfa5ce` `fix: stabilize railway build tooling`
- `97e8e19f` `admin: persist provider deposit addresses`
- `eb510199` `email: acknowledge support tickets`

## Acceptance Decision

The final acceptance checklist is **not complete**. The evidence supports the local API, frontend, Railway, admin-address, email, lint, audit, and test improvements above, but it does not support claims of full live production readiness, complete provider integrations, durable investment operations, a working `www` domain, live PostgreSQL restart proof, or current green upstream PR checks.
