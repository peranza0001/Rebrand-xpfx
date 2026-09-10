# XpressPro FX Production Readiness Evidence

Date: 2026-09-09
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

## Not Proven or Failing

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Upstream PR and green CI | No PR exists yet for `fix/production-readiness-20260909`; no current green PR check is available. | Not complete |
| `www.xpressprofx.com` | DNS lookup and curl fail with host resolution error. | Not complete; requires DNS/provider change |
| Frontend production build | `npm run build:frontend:xpadmin` reaches Vite and exits with `Bus error` / exit 135 in this environment. | Not proven |
| Full wallet E2E | No executed user-to-admin-to-database WalletConnect flow exists. | Not proven |
| Durable admin provider address changes | `/admin/users/:userId/crypto-addresses` mutates in-memory `cryptoAddresses` and has no durable write/audit path. | Not complete |
| Durable investment activation | Plan activation and subscription state are still in-memory in the primary flow. | Not complete |
| Crypto and copy-trading execution | `crypto-orders.ts` exposes `pending_stub`/`provider: stub`; copy trading uses internal simulation paths. | Not complete |
| Installment funding | No complete implementation and dedicated durable tests were found. | Not complete |
| Support email acknowledgement | Support ticket creation creates an in-app auto-reply but does not schedule/send the required delayed email acknowledgement. | Not complete |
| Production mail delivery | SendGrid/SMTP support exists, but no real provider delivery or mailbox receipt was proven from the live domain. | Not proven |
| Auth/database restart E2E | Local tests use in-memory or test persistence adapters; no current clean production database restart proof exists. | Not proven |

## Changes Published On This Branch

- `dedc3bae` `fix: wire admin withdrawal user details`
- `83f7b7bc` `fix: preserve wallet provider in siwe`
- `0f4c17f7` `email: use canonical noreply sender`

## Acceptance Decision

The final acceptance checklist is **not complete**. The evidence supports the local API/auth/email improvements above, but it does not support claims of full live production readiness, full frontend build readiness, complete provider integrations, durable investment/admin operations, a working `www` domain, or a merge-ready upstream PR.
