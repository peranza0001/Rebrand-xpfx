# XpressPro FX Admin Control Plane Audit

Date: 2026-09-10
Repository: `peranza0001/Rebrand-xpfx`
Branch: `fix/production-readiness-20260909`
Live apex: `https://xpressprofx.com`

This audit was completed before the next code change. It compares the repository implementation, deployment configuration, current admin routes, and observable live domains.

## Working

- npm workspaces with one `package-lock.json`; no `pnpm-lock.yaml` exists.
- Railway build command is simplified to `npm ci --include=dev`, predeploy, and build. A current `npm ci --include=dev --no-audit --no-fund --ignore-scripts` completed with 941 packages.
- API typecheck, API build, frontend builds, lint, tests, and production audit have passed in the current branch history.
- Admin routes cover user management, KYC, deposits, withdrawals, banks, cards, promotions, billing, platform settings, assets, P2P, notifications, live chat, wallets, and activity.
- Admin withdrawal decisions enforce gas-fee, deadline, connected-wallet, and balance gates.
- SIWE wallet verification validates nonce, domain, URI, chain, signature, and preserves MetaMask versus WalletConnect provider metadata.
- Admin per-user crypto deposit addresses now use the existing `deposit_addresses` persistence model and create an audit activity entry.
- Support ticket creation sends a receipt through the existing SendGrid/SMTP/audit email layer.
- The apex live domain returned HTTP 200 during this audit.

## Partial or Risky

- `www.xpressprofx.com` does not resolve in DNS, so the second required live domain is not available.
- Admin platform settings, catalog, demo configuration, and several investment controls remain primarily in-memory and are not proven across a process restart.
- Investment subscriptions and catalog activation lack a complete PostgreSQL-backed restart test.
- Email has SendGrid/SMTP support, but real provider delivery and domain authentication cannot be proven without production credentials/DNS.
- Support receipt email is immediate; a durable delayed queue for a three-to-five-minute autoresponse is not implemented.
- Crypto order and copy-trading paths intentionally return `stub`/`pending_stub` or `internal_simulation` when no regulated execution provider is configured. They correctly avoid pretending that simulated execution is live.
- No complete live authenticated user-to-admin-to-database E2E exists for KYC, deposits, wallet connection, investment activation, and withdrawal.

## Missing or Confirmed Defect

- `/api/admin/provisioning-status` was registered without `requireAdmin`, exposing operational provisioning state to unauthenticated callers. This is a high-confidence authorization defect and is the first fix after this audit.
- Full provider fallback semantics for KYC, payment rails, and broker execution are not implemented as real external-provider replacements. Admin review and approval exist for several workflows, but admin-as-provider behavior must remain explicit and auditable rather than silently fabricating provider verification.

## Live Evidence

- `https://xpressprofx.com`: HTTP 200.
- `https://www.xpressprofx.com`: DNS resolution failure during the audit.
- Repository CI/deployment manifests: Railway, Vercel, Procfile, PM2 ecosystem configuration, and GitHub Actions are present.

## Audit Decision

The repository is locally buildable and the Railway historical install failure is addressed, but the platform is not yet proven as fully live enterprise-ready. The next implementation priorities are authorization hardening, durable admin settings/investment state, authenticated end-to-end tests, and external DNS/provider configuration.
