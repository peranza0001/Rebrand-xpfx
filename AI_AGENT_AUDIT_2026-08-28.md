# XpressPro FX Audit - 2026-08-28

## Scope

This audit covers the consolidated deployment, email, UX, investment-plan, and live-chat requirements against the repository state available in this workspace.

## Verified Locally

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build:all` passes for the API, client library, NexTrade, admin portal, and API schemas.
- `npm run predeploy` passes.
- Existing application-readiness, production-environment, demo-auth, secrets, runtime-bootstrap, API-route, money-precision, live-chat persistence, and investment-plan tests pass.
- The API health payload now exposes `commitSha` from `RAILWAY_GIT_COMMIT_SHA`, `GIT_COMMIT_SHA`, or `SOURCE_VERSION`, allowing a live deployment to be compared with `git rev-parse origin/main`.
- A regression test covers the live-chat widget's open/close toggle, unread increment, durable history fetch, and visitor-profile persistence behavior at the source-contract level.

## Itemized UX Status

Live status is `not verified` for every item because Railway/Vercel dashboard access and a confirmed live URL are not available in this workspace.

| Requirement | Repository status | Live status |
| --- | --- | --- |
| `/` home | Present and routed | Not verified |
| `/about` | Present and routed | Not verified |
| `/trade` | Related trading surface exists; exact path not verified | Not verified |
| `/copy-trading` | Related copy-trading surface exists; exact path not verified | Not verified |
| `/contact` | Present and routed | Not verified |
| `/buy` | Related buy flow exists; exact path not verified | Not verified |
| `/sell` | Related sell flow exists; exact path not verified | Not verified |
| `/stocks` | Stocks market data exists; exact path not verified | Not verified |
| `/shares` | No dedicated route confirmed | Not verified |
| `/commodities` | Commodities market data exists; exact path not verified | Not verified |
| `/signals` | Signals components exist; exact path not verified | Not verified |
| `/register` | Signup route exists | Not verified |
| `/login` | Login route exists | Not verified |
| `/dashboard/markets` | Dashboard market surface exists; exact nested route not verified | Not verified |
| `/dashboard/support` | Support/livechat surfaces exist; exact nested route not verified | Not verified |
| `/legal/privacy` | Legal page exists; exact nested route not verified | Not verified |
| `/legal/terms` | Legal page exists; exact nested route not verified | Not verified |
| Live ticker strip | Present in public home/market components | Not verified |
| Portfolio value with percent change | Present in dashboard components | Not verified |
| Itemized transaction ledger | Related transaction/wallet surfaces exist; exact UX not verified | Not verified |
| Four-step onboarding | Related onboarding/checklist surfaces exist; exact four-step rendering not verified | Not verified |
| Testimonials | Present in public home source | Not verified |
| FAQ | Present through support/livechat FAQ prompts | Not verified |
| Every-fee-shown-upfront motif | Fee surfaces exist; complete cross-route coverage not verified | Not verified |
| Operational status line | Health/status APIs exist; public status-line rendering not verified | Not verified |
| Portfolio Allocation | Present in source | Not verified |
| Risk Calculator | Present in source | Not verified |
| Market Sentiment | Present in source | Not verified |
| AI Assistant | Present in source | Not verified |
| Trade Journal | Present in source | Not verified |
| Social Trading | Present in source | Not verified |
| Alerts | Present in source | Not verified |
| Mobile View | Present in source | Not verified |
| Analytics | Present in source | Not verified |
| Compliance | Present in source | Not verified |

## Investment Plans: Current Gap

- The 12-plan catalog and in-memory calculation engine exist in source.
- The active API route still stores `activePlanSubscription` in the in-memory `UserData` object and derives a projected balance. It is not a durable Prisma investment ledger.
- No active scheduler invokes `processDailyTick`.
- The current Prisma schema contains legacy investment/SmartVest tables, but the new engine's investment records, fee ledger, rank gating, WalletAdapter, and PerformanceSource implementations are not integrated into that schema.
- Therefore the new 12-tier system must not be reported as production-ready or real-capital-backed until schema, migration, wallet-ledger transactionality, scheduler, admin queue, and live verification are completed.
- No production database query was run: owner-controlled database credentials and a confirmed production connection were not available in this workspace. No old records were deleted or migrated.

## SendGrid and Deployment: External Blockers

- The application recognizes SendGrid configuration and falls back to SMTP or a local audit stub. Local validation reports that no production email provider is configured in this environment.
- SendGrid key validity/account status cannot be checked without owner-controlled Railway environment access and must not be inferred from local configuration.
- Railway project dashboard, deploy logs, actual service URL, and live commit SHA cannot be verified from this workspace. The new health `commitSha` field is the evidence hook for the owner-controlled live check.
- No real email was sent, no vendor contract was configured, and no live-money or identity verification action was performed.

## Live Chat

- First-party `/api/live-chat` routes, Socket.IO namespace, durable persistence helpers, consent notice, escalation logic, unread state, and responsive widget are present in source.
- Local persistence and route tests exist and pass.
- A browser-level Playwright test against the confirmed live URL remains outstanding because no confirmed live URL or browser test harness was available in this workspace.

## Required Owner-Controlled Follow-Up

1. Confirm the canonical Railway service URL in the Railway dashboard.
2. Compare that deployment's `/health.commitSha` with `git rev-parse origin/main` and inspect the latest deploy logs.
3. Query the production database read-only for legacy investment counts before any migration.
4. Validate SendGrid key status through the provider's read-only API; rotate only through the owner-controlled secret manager if invalid.
5. Complete the durable investment schema/ledger/scheduler integration before enabling new real-capital subscriptions.# XpressPro FX implementation audit

Date: 2026-08-28

## Stack and domain reconciliation

`https://www.xpressprofx.com` is a separate Vercel-hosted Next.js deployment. Its responses include `server: Vercel`, `x-nextjs-prerender`, `x-matched-path`, and Next router `vary` headers. This repository is an Express/TypeScript API with React/Vite frontends under `artifacts/`. The domain is therefore not the same deployed stack; this repository is the staging/rebuild target for a UX merge.

The live site exposes the confirmed route families `/buy`, `/sell`, `/stocks`, `/shares`, `/commodities`, `/signals`, `/copy-trading`, `/about`, `/trade`, `/register`, `/login`, `/dashboard/markets`, `/dashboard/support`, `/legal/privacy`, and `/legal/terms`. The Vite app currently has public `/markets`, `/education`, `/calendar`, `/about`, `/contact`, and `/legal` routes plus authenticated product flows. The route merge remains incomplete.

## Status table

| Requirement | Status | Action |
|---|---|---|
| Domain and stack reconciliation | Fully verified | Keep the live Next.js site as the UX reference and merge its routes into this Vite product |
| Live chat and human escalation | Implemented but needs update | Durable claim/release assignment and delivery state now exist; canned responses, internal notes, and a live PostgreSQL restart test remain |
| Contact form | Partially implemented | Contact submission now uses the support-ticket API for authenticated users; anonymous durable intake remains a separate schema decision |
| WhatsApp support | Not verified | No business number exists in repository/live HTML; do not invent a number, obtain the approved business number |
| Demo start/account/order/reset | Implemented but needs update | Added durable demo orders, awaited fill/settlement writes, startup restoration, and restart-style fixture coverage; a live PostgreSQL restart test remains deployment validation |
| UX merge | Partially implemented | Add missing live-site routes and consolidate shared public navigation/content |
| RBAC | Partially implemented | Existing `requireAdmin`/`requireFullAuth` gates need a complete route-by-route authorization audit |
| Password reset, lockout, timeout | Partially implemented | Password reset and timeout code exist; account lockout and complete enforcement need verification and tests |
| KYC/AML | Partially implemented | Provider interfaces and KYC routes exist; funds-movement enforcement and provider-backed decisions need verification |
| Financial precision | Not compliant with requested bar | Demo and forex paths still use JavaScript number arithmetic; migrate critical money paths to decimal arithmetic |
| Durable compliance audit | Partially implemented | Audit routes/models exist; append-only integrity and complete critical-action coverage need verification |
| 2FA and identity claims | Partially implemented | Production password login now requires OTP before session creation; durable PIN-based 2FA and end-to-end production tests remain |
| Error tracking/metrics/health | Partially implemented | Sentry, Prometheus, readiness and health paths exist; production deployment checks need end-to-end validation |
| Critical regression coverage | Partially implemented | Existing auth/chat tests pass; add durable demo start/order/fill/PnL/reset regression |

## Gap analysis and compliance holds

### Live chat

The repository contains a persistent widget, CSRF handling, local FAQ responses, AI fallback, escalation keyword detection, persisted chat message/ticket helpers, Socket.IO notifications, business-hours routing, and adversarial chatbot tests. Conversation claim/release assignment and message delivery status now persist through the root Prisma chat tables, and a fixture regression verifies restoration after the in-process state is discarded. Canned responses, internal notes, delivery retry acknowledgements, and a live PostgreSQL restart test remain open.

### Demo trading

`/auth/demo` provisions a Prisma `TradingAccount` when available. Demo orders now have a durable `demo_orders` table and API migration; placement, fill/cancellation, and automatic settlement await persistence, and open orders are restored during simulation startup. Filled trades are restored by the existing startup hydration path. The regression suite uses an injected database fixture to prove write/read restoration across a simulated process boundary; a deployment-level restart against a real PostgreSQL instance remains external validation.

### UX merge

The live domain and this repository are separate products. The Vite app has reusable public layout and several public pages, but its navigation does not yet represent every live route. The live ticker, transparent ledger, onboarding, testimonials, FAQ, contact, WhatsApp, and operational-status motifs need to be reconciled into the existing design system without dropping the existing dashboard, P2P, SmartVest, KYC, wallet, admin, and enterprise components.

### Compliance flag requiring human review

The live `/trade` behavior described in the supplied prompt uses leverage plus a fixed duration/expiry and displays a predetermined payout outcome before opening. This is structurally similar to binary-option-style fixed-odds trading. It must receive explicit legal/compliance sign-off before any extension or launch. The repository also contains `expectedProfit` fields and fixed-expiry order concepts; these require the same review. No work in this session expands those mechanics.

### Public security claims

Production password login now issues and requires an email OTP before creating a session; OTP delivery failure fails closed. The separate PIN feature is still in-memory and is not enforced as a durable second factor, so any claim covering PIN-based 2FA remains unverified. Identity verification is now enforced server-side on withdrawals, wallet transfers, crypto buy/sell, asset purchases, live forex order entry, and connected-wallet sends. Provider-backed KYC/AML and end-to-end production tests remain required before certification.

## Work completed in this session

- Confirmed the live domain is a separate Vercel/Next.js deployment.
- Added `POST /demo/start`, requiring an isolated demo session and awaited durable demo-account provisioning.
- Replaced the fake contact-form timeout with a real support-ticket API request and truthful success/failure handling.
- Required production non-demo password logins to complete email OTP verification before session creation.
- Added durable demo-order persistence, startup restoration, and restart-style regression coverage.
- Added durable live-chat assignment claim/release state, delivery status, and workflow regression coverage.
- API build, frontend build, repository typecheck, demo-auth tests, and live-chat safety tests pass.

## Prioritized next implementation plan

1. Complete DB-backed demo account/order/ledger state and restart regression.
2. Make critical persistence APIs return failure status and ensure financial routes await them.
3. Add durable live-chat queue assignment, agent presence, delivery/retry states, and audit events.
4. Verify 2FA and KYC gates on every funds and authentication route; correct claims before launch.
5. Merge the live public routes and support channels, using an approved WhatsApp business number.
6. Migrate critical financial calculations to decimal arithmetic and expand risk-limit tests.
7. Finish immutable audit integrity, provider interfaces, deployment checks, and CI coverage.

This document is an audit record, not legal, regulatory, security, or production-readiness certification.
