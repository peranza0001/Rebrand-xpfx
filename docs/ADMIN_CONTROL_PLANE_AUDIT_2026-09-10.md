# XpressPro FX Admin Control Plane Audit

Date: 2026-09-10
Scope: repository implementation and documented live deployment endpoints

## Audit result

The platform has a substantial admin portal and a broad Express route surface. The local API, customer frontend, and admin frontend production builds pass. The documented live endpoints could not be validated from this environment: the Railway admin hostname presents a TLS certificate mismatch, and `api.xpressprofx.com` does not resolve.

## Already present and working locally

- Admin login/session guard and handler-level `requireAdmin` protection on the main admin routes.
- Dashboard statistics, user list/detail, account status controls, KYC decisions, deposit and withdrawal review, P2P merchant controls, live chat, mailbox, notifications, billing, gas-fee workflows, assets, trades, and platform settings.
- User account checklist and investment-plan activation data structures.
- Connected-wallet data model and user/admin wallet routes.
- Signed in-memory audit event chain and a persisted PostgreSQL audit-log schema.
- KYC/AML provider abstraction with internal mock providers when external credentials are absent.
- CSRF middleware, security headers, rate limiting, and session authentication.

## Partial or risky wiring

- Platform settings, assets, trades, sessions, and most user operation state are process-memory backed; restart durability is incomplete.
- The audit-log route reads the signed in-memory chain while the database audit schema is not the authoritative writer for all admin operations.
- Several legacy admin mutations use `logActivity`; they do not consistently write the signed audit chain with structured before/after payloads.
- External provider fallback exists for KYC/AML scaffolding, but provider fallback is not uniformly enforced across OTP, mail, payment rails, and settlement workflows.
- Connected-wallet flows model an address and balance, but a production MetaMask-style connection requires browser wallet-provider integration and verified on-chain transaction handling; this was not verifiable against the unavailable live API.
- The public provisioning-status endpoint is intentional for startup diagnostics and does not expose admin credentials, but it should remain limited to non-sensitive readiness data.

## Missing before a production-complete control plane

- Durable, transactional persistence for platform control settings, catalog state, copy-trading rules, trade-manager risk parameters, and admin actions.
- Dedicated admin pages and APIs for lead-trader management, copy-trading rules/status, live/demo risk controls, feature flags, mailer configuration, announcements, and provider health/fallback policy.
- Uniform provider fallback orchestration for KYC, AML, OTP, email, payment rails, and wallet/settlement operations.
- Full end-to-end browser/provider tests for KYC, deposits, withdrawals, wallet connection, AI chat escalation, investment activation, and every on-behalf action.
- Live deployment TLS/DNS correction and authenticated smoke tests against the production API.

## Implemented in this continuation

- Extended the existing platform settings contract and OpenAPI schema with provider fallback flags, copy-trading policy, trade-manager risk controls, and the requested professional network/processing fee schedule: 65 / 55 / 95 / 135 / 75 / 35.
- Added server-side Zod validation and signed audit-chain recording for platform settings updates.
- Added grouped controls to the existing Admin Settings page and wired them through the existing authenticated API mutation.
- Verified API, shared-contract, customer frontend, and admin frontend production builds.

This audit intentionally distinguishes implemented local wiring from production claims that require database, browser-wallet, provider, and live-deployment verification.
