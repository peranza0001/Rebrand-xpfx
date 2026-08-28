# XpressPro FX implementation audit

Date: 2026-08-28

## Stack and domain reconciliation

`https://www.xpressprofx.com` is a separate Vercel-hosted Next.js deployment. Its responses include `server: Vercel`, `x-nextjs-prerender`, `x-matched-path`, and Next router `vary` headers. This repository is an Express/TypeScript API with React/Vite frontends under `artifacts/`. The domain is therefore not the same deployed stack; this repository is the staging/rebuild target for a UX merge.

The live site exposes the confirmed route families `/buy`, `/sell`, `/stocks`, `/shares`, `/commodities`, `/signals`, `/copy-trading`, `/about`, `/trade`, `/register`, `/login`, `/dashboard/markets`, `/dashboard/support`, `/legal/privacy`, and `/legal/terms`. The Vite app currently has public `/markets`, `/education`, `/calendar`, `/about`, `/contact`, and `/legal` routes plus authenticated product flows. The route merge remains incomplete.

## Status table

| Requirement | Status | Action |
|---|---|---|
| Domain and stack reconciliation | Fully verified | Keep the live Next.js site as the UX reference and merge its routes into this Vite product |
| Live chat and human escalation | Partially implemented | Preserve current widget and guardrails; add durable queue assignment, delivery state, and admin workflow |
| Contact form | Partially implemented | Contact submission now uses the support-ticket API for authenticated users; anonymous durable intake remains a separate schema decision |
| WhatsApp support | Not verified | No business number exists in repository/live HTML; do not invent a number, obtain the approved business number |
| Demo start/account/order/reset | Partially implemented | `/demo/start` now awaits durable account provisioning; order state and reload source-of-truth still need DB-backed completion |
| UX merge | Partially implemented | Add missing live-site routes and consolidate shared public navigation/content |
| RBAC | Partially implemented | Existing `requireAdmin`/`requireFullAuth` gates need a complete route-by-route authorization audit |
| Password reset, lockout, timeout | Partially implemented | Password reset and timeout code exist; account lockout and complete enforcement need verification and tests |
| KYC/AML | Partially implemented | Provider interfaces and KYC routes exist; funds-movement enforcement and provider-backed decisions need verification |
| Financial precision | Not compliant with requested bar | Demo and forex paths still use JavaScript number arithmetic; migrate critical money paths to decimal arithmetic |
| Durable compliance audit | Partially implemented | Audit routes/models exist; append-only integrity and complete critical-action coverage need verification |
| Error tracking/metrics/health | Partially implemented | Sentry, Prometheus, readiness and health paths exist; production deployment checks need end-to-end validation |
| Critical regression coverage | Partially implemented | Existing auth/chat tests pass; add durable demo start/order/fill/PnL/reset regression |

## Gap analysis and compliance holds

### Live chat

The repository contains a persistent widget, CSRF handling, local FAQ responses, AI fallback, escalation keyword detection, persisted chat message/ticket helpers, Socket.IO notifications, business-hours routing, and adversarial chatbot tests. The current implementation still hydrates an in-memory per-user conversation and mirrors persistence into it, while admin queue assignment, claim state, canned responses, internal notes, delivery acknowledgements, and retry state are not fully represented as durable workflow data.

### Demo trading

`/auth/demo` provisions a Prisma `TradingAccount` when available, but the demo trading engine continues to use `userData`, in-memory order queues, and floating-point arithmetic as the active source of truth. Several balance/transaction persistence calls are fire-and-forget. `/demo/start` now provides an explicit durable startup contract and fails closed if account provisioning fails. A complete DB-backed order state machine and restart regression remain outstanding.

### UX merge

The live domain and this repository are separate products. The Vite app has reusable public layout and several public pages, but its navigation does not yet represent every live route. The live ticker, transparent ledger, onboarding, testimonials, FAQ, contact, WhatsApp, and operational-status motifs need to be reconciled into the existing design system without dropping the existing dashboard, P2P, SmartVest, KYC, wallet, admin, and enterprise components.

### Compliance flag requiring human review

The live `/trade` behavior described in the supplied prompt uses leverage plus a fixed duration/expiry and displays a predetermined payout outcome before opening. This is structurally similar to binary-option-style fixed-odds trading. It must receive explicit legal/compliance sign-off before any extension or launch. The repository also contains `expectedProfit` fields and fixed-expiry order concepts; these require the same review. No work in this session expands those mechanics.

### Public security claims

The claims “2FA enforced server-side” and “Identity verified before funds move” are **not certified by this audit**. The repository contains OTP/PIN/auth and KYC code, but the claims require route-by-route proof that every protected authentication and funds-movement path enforces them and that the resulting state is durable. Until that verification and tests exist, the claims should be treated as unverified P0 release blockers.

## Work completed in this session

- Confirmed the live domain is a separate Vercel/Next.js deployment.
- Added `POST /demo/start`, requiring an isolated demo session and awaited durable demo-account provisioning.
- Replaced the fake contact-form timeout with a real support-ticket API request and truthful success/failure handling.
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
