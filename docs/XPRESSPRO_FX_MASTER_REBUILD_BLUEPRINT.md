# XpressPro FX Master Rebuild Blueprint

**Purpose:** one portable, implementation-ready blueprint for a real hybrid fintech forex broker, trading, investment, crypto, wallet, copy-trading, and support platform.

**Product name:** XpressPro FX

**Scope:** rebuild the product from scratch while preserving the useful behavior represented by the current monorepo. This document is the complete product, architecture, data, API, UX, security, delivery, and acceptance contract. No production behavior may be represented only by a static UI or in-memory map.

**Non-negotiable operating principle:** PostgreSQL is the source of truth for users, sessions, money, orders, ledgers, support conversations, audit events, and configuration. Memory may be a bounded cache or realtime fanout only after durable persistence succeeds.

---

## 1. How To Use This Blueprint

1. Create a TypeScript monorepo with one API process, one browser application, shared contracts, database migrations, and automated tests.
2. Implement the sections in the build order in Section 14. Do not begin frontend polish until the vertical slice in Section 15 passes.
3. Select any Postgres-compatible provider. The application reads `DATABASE_URL` at runtime and optionally `DIRECT_DATABASE_URL` for migrations. Railway Postgres, Neon, Supabase, AWS RDS, Render Postgres, Fly Postgres, and self-hosted Postgres are equivalent provider choices.
4. Select any deployment host. The API must run as a normal Node process on `PORT`; the frontend must build to static SPA assets or use an explicitly documented SSR process. No application logic may depend on Railway, Vercel, or a vendor hostname.
5. Copy only the environment variable names from Section 11 into the host secret manager. Never commit a real `.env`, password, API token, seed phrase, private key, CVV, or PIN.
6. For every feature, implement the API transaction and persistence before the screen. A button is incomplete until it has validation, authorization, durable write, error state, idempotency behavior where relevant, and a real test.
7. Run the acceptance suite after every vertical slice. A phase is complete only after test, migration, build, deploy smoke, and git commit/push gates pass.
8. Use the current repository map in Section 17 for parity and migration discovery, but treat this blueprint as the improved target design.

### Definition of working
A user action is working only when the server validates it, the database records it, the response reports its real outcome, a restart can reload it, and the UI displays success or a clear error. Simulated/demo behavior must be labelled and isolated from live money.

### Definition of production-ready
Production-ready means technically deployable, observable, recoverable, secure within the implemented scope, and tested. It does not by itself grant a brokerage, payments, money-transmitter, CFD, investment, KYC/AML, or custody license. Legal and compliance approval remains mandatory before accepting real customer money.

---

## 2. Product Vision

XpressPro FX is a friendly hybrid broker desk for users who want forex and multi-asset trading, managed investment plans, crypto rails, copy trading, education, and human support in one calm workspace. It should feel like a guided financial cockpit rather than an intimidating terminal.

### User roles

- **Visitor:** can view markets, education, pricing, risk disclosures, legal pages, status, and contact flows. Visitor support may use a rate-limited pre-auth intake that stores only a consented session and contact details.
- **Registered user:** can manage profile, verify identity, use demo mode, view permitted markets, fund accounts, place allowed trades, subscribe to investments, use copy trading, and contact support.
- **KYC-pending user:** can complete verification and use only the features permitted by jurisdiction and risk policy.
- **Verified user:** can access approved live financial actions subject to region, limits, sanctions, risk, and suitability controls.
- **Demo user:** receives isolated simulated balances and orders. Demo data can never settle, withdraw, or mix with live ledgers.
- **Support agent:** can handle assigned conversations and tickets without financial admin powers.
- **Compliance officer:** can review KYC/AML, sanctions, regions, risk flags, and evidence.
- **Finance operator:** can reconcile deposits, withdrawals, fees, payment webhooks, and ledger exceptions under dual control.
- **Trader/portfolio operator:** can manage approved symbols, execution adapters, pricing health, and risk controls.
- **Administrator:** can manage users, configuration, permissions, audit, operational health, and emergency controls. Admin actions require strong authentication and immutable audit records.
- **Platform owner:** can manage deployment and secrets outside the application; no application endpoint should expose raw secrets.

### Experience principles

- Beginner-safe language with advanced detail available on demand.
- Show available, pending, held, and settled balances separately.
- Show risk before confirmation, not after a loss.
- Every real-money action has a review screen, idempotency key, receipt, status timeline, and support reference.
- Every demo or simulated feature is visibly labelled `Demo` or `Simulated`.
- Never imply guaranteed profits, risk-free returns, or regulatory approval that does not exist.

---

## 3. Full Feature List And Rebuild Priority

Priority meanings: **P0** blocks safe account use; **P1** required for launch scope; **P2** valuable launch enhancement; **P3** optional expansion.

| Feature | Priority | Required working behavior |
|---|---:|---|
| Email/password auth, OTP, password reset | P0 | Durable user row, unique normalized email, password hash, verified state, rate limits, clear errors. |
| Session bootstrap and logout | P0 | Durable sessions, secure cookies, bounded request timeout, guest/auth/error states, no infinite spinner. |
| User profile and preferences | P0 | Read/write durable profile with authorization and audit trail. |
| Database health and migrations | P0 | Host-neutral Postgres, SSL support, startup migration policy, `/healthz/db`. |
| User dashboard | P1 | Real balances from ledger, pending actions, risk notices, market snapshot, activity timeline. |
| Isolated demo account | P1 | Simulated balance/order engine, expiry, reset, no live withdrawal or ledger mixing. |
| Live forex trading | P1 | Provider adapter, quote freshness, pre-trade risk, order state machine, fills, fees, audit. |
| Multi-asset trading | P1 | Asset catalog, permissions, precision, market hours, slippage and provider status. |
| Wallet deposit/withdrawal | P1 | Address/payment intent, confirmations, limits, ledger entries, review and reconciliation. |
| Crypto buy/sell | P1 | Optional provider adapters, webhook verification, idempotency, soft-off when keys absent. |
| Web3 injected wallet and SIWE | P1 | Public address only, nonce binding, signature verification, no key custody. |
| WalletConnect/Reown | P2 | Enabled only with public project ID; disabled state without it; no boot crash. |
| Investment plans/SmartVest | P1 | Suitability/disclaimer, subscription, valuation, fees, redemption rules, ledger postings. |
| Copy trading | P1 | Leader discovery, risk disclosures, allocation, follow/stop, simulated or real adapter, history. |
| KYC/AML and sanctions | P1 | Provider adapter, local pending state, manual review fallback, evidence retention, decisions. |
| Region and product restrictions | P1 | Server-side jurisdiction gates, not only hidden UI controls. |
| P2P marketplace | P2 | Listings, escrow state, chat, dispute, payment evidence, moderation, limits. |
| Referrals | P2 | Consent, attribution, anti-abuse, pending/approved rewards, ledger-backed settlement. |
| Education | P1 | Lessons, quizzes, risk literacy, progress persistence, no investment promises. |
| Live chat chatbot | P1 | Durable conversations, deterministic fallback, optional AI, timeout, escalation. |
| Human live chat | P1 | Agent queue, presence, assignment, replies, receipts, realtime and reload recovery. |
| Tickets and mailbox | P1 | Durable threads, attachments policy, SLA status, internal notes, email notifications. |
| Notifications | P1 | Durable in-app notifications, email optional, preferences, delivery status. |
| Admin moderation | P1 | Suspend, restrict, review, evidence, dual control, audit. |
| Operational healthchecks | P0 | Liveness, readiness, DB, dependencies, metrics, structured logs, alerting. |
| Statements and exports | P1 | Ledger-derived statements, timezone/currency clarity, export audit. |
| Billing and fees | P1 | Fee schedules, invoices/receipts, payment status, reconciliation. |
| Analytics and reporting | P2 | Product analytics without exposing financial secrets or sensitive data. |

---

## 4. Recommended Portable Architecture

```text
Browser SPA (React/Vite)
        |
        | HTTPS REST + Socket.IO/WSS, credentials include
        v
Node API (Express or Fastify)
  auth / policy / validation / services / adapters / jobs
        |
        +--> PostgreSQL (DATABASE_URL runtime, DIRECT_DATABASE_URL migrations)
        +--> Redis optional (rate limits, queues, presence; DB fallback for critical state)
        +--> Provider adapters optional (email, KYC, payment, pricing, execution, AI)
        +--> Object storage optional (documents; signed URLs only)
```

### Boundaries

- **Transport:** HTTP routes, WebSocket events, request IDs, status codes, error envelopes.
- **Policy:** authentication, role, region, KYC, suitability, limits, demo/live separation.
- **Domain services:** auth, ledger, orders, wallets, investments, support, compliance.
- **Repositories:** Prisma or Drizzle queries. Repositories own transactions and never silently discard write errors.
- **Adapters:** payment, broker/execution, quote, KYC/AML, email, AI, wallet connectors. Each adapter exposes `configured`, `health`, and `execute` behavior.
- **Jobs:** webhook processing, notification delivery, reconciliation, quote snapshots, statement generation. Jobs are idempotent and retryable.
- **Realtime:** publish after commit; reconnect and refetch after missed events.
- **Observability:** structured logs, metrics, traces, audit logs, dependency health.

### Source of truth rules

- Postgres is authoritative for users, credentials metadata, sessions, ledgers, orders, fills, balances, chat, tickets, notifications, compliance decisions, configuration, and audit.
- In-memory values may hold a short-lived cache, request state, or WebSocket presence. They must never be the only successful write path in production.
- A response that says `success` must follow a committed transaction or explicitly say `accepted/pending` with a durable job record.

---

## 5. Technology Options

### Recommended implementation

- Node.js 20+ and npm 10+.
- TypeScript 5.x with strict mode.
- Express 5 or Fastify for the API. Express mirrors the current project; Fastify is acceptable if middleware behavior is covered.
- React 19 or current stable React with Vite and Wouter/React Router.
- TanStack Query for server state, with explicit `retry`, timeout, stale, and error policies.
- Prisma for migrations and typed relational queries, or Drizzle for a single consistent repository layer. Do not maintain two competing schemas without generated parity checks.
- PostgreSQL 15+ or provider-compatible current version.
- Socket.IO or native WebSocket for chat and optional prices.
- Zod for request/response validation and shared contracts.
- Argon2id preferred for password hashes; bcrypt acceptable only with a strong cost and migration plan.
- Pino or equivalent structured logger.
- Vitest/Node test runner/Playwright for unit, integration, and browser tests.
- Docker for reproducible API builds; static frontend artifact for host portability.

### Design choices

- Use SQL transactions for account creation, ledger postings, order state transitions, chat acknowledgement, and webhook idempotency.
- Use an outbox table for notifications and realtime events that must not be lost.
- Use an adapter interface for optional vendors. Missing keys produce `not_configured` and a safe UI state, never import-time crashes.
- Keep the provider URL parser generic. Never branch on `railway.internal`, `neon.tech`, or another hostname in business logic.

---

## 6. Complete Logical Data Model

All IDs are UUIDs unless stated. Every mutable table has `created_at`, and relevant tables have `updated_at`. Store timestamps in UTC. Use numeric/decimal types for money, never binary floating point.

### Identity and access

- `users`: `id`, `email_normalized` unique, `email_display`, `password_hash`, `email_verified_at`, `phone_verified_at`, `status`, `role`, `full_name`, `username` unique, `country`, `region`, `kyc_status`, `risk_level`, `created_at`, `updated_at`, `last_login_at`, `deleted_at`.
- `user_profiles`: `user_id`, avatar reference, locale, timezone, preferences JSON with schema validation.
- `sessions`: random opaque `id` or hashed token, `user_id`, `expires_at`, `revoked_at`, `created_at`, IP hash, user-agent summary, device label. Never store bearer tokens in plaintext if avoidable.
- `otp_challenges`: `id`, normalized email, `user_id` nullable for signup, intent, code hash, payload reference/encrypted temporary payload, attempts, expires_at, consumed_at.
- `roles`, `permissions`, `role_permissions`, `user_roles`: RBAC, with admin changes audited.
- `password_reset_tokens`: hashed token, user, expiry, consumed timestamp.

### Money and accounting

- `financial_accounts`: user, account type (`live`, `demo`, `margin`, `investment`, `copy`), currency, status, limits.
- `ledger_accounts`: double-entry account nodes for user cash, asset custody, fees, broker clearing, suspense, and liabilities.
- `ledger_transactions`: immutable transaction header, idempotency key unique, source type/id, status, posted_at, created_by.
- `ledger_entries`: transaction, ledger account, currency, signed decimal amount, reference, metadata. Enforce balanced debit/credit transaction in one DB transaction.
- `cash_balances`: derived or materialized balance by financial account/currency with version and updated timestamp.
- `holds`: account, amount, currency, reason, source, expiry, released_at.
- `fee_schedules`, `fee_charges`, `invoices`, `payment_intents`, `payment_events`, `reconciliation_items`.

### Trading

- `instruments`: symbol, asset class, base/quote, precision, trading hours, region availability, status.
- `quotes`: instrument, bid, ask, provider, quoted_at, expires_at, source sequence.
- `orders`: account, client idempotency key unique per user/account, instrument, side, order type, quantity, price, stop/take-profit, leverage, status, demo flag, submitted_at.
- `fills`: order, provider execution ID unique, quantity, price, fee, liquidity source, filled_at.
- `positions`: account/instrument, signed quantity, average price, realized PnL, unrealized snapshot, margin, version.
- `risk_limits`, `margin_snapshots`, `market_sessions`, `provider_orders`, `provider_events`.
- `trade_journal`, `alerts`, `watchlists`.

### Wallets and crypto

- `wallets`: user/account, wallet type, public address, network, label, status. Public address only.
- `wallet_connections`: user, address, connector, chain ID, verified_at, disconnected_at.
- `siwe_nonces`: nonce hash, user, address, domain, URI, chain ID, issued/expiry/consumed timestamps.
- `assets`, `asset_balances`, `deposit_addresses`, `deposit_requests`, `withdrawal_requests`, `blockchain_transactions`, `confirmation_events`.
- `wallet_ledger_entries`: links blockchain activity to double-entry ledger.
- Never create columns for private keys, seed phrases, CVV, or PIN. Do not accept them in API bodies.

### Investments and copy trading

- `investment_plans`: name, strategy, risk, currency, min/max, fees, status, disclosures, version.
- `investment_subscriptions`: user/account, plan, principal, units, status, suitability evidence, subscribed/redeemed timestamps.
- `investment_valuations`, `investment_transactions`, `investment_disclosures`.
- `copy_leaders`: profile, strategy, risk, performance snapshots, status, suspension reason.
- `copy_relationships`: follower, leader, allocation percentage, limits, status, started/stopped.
- `copy_events`: source signal, follower action, simulated/live flag, status, notional, timestamps.

### Compliance and operations

- `kyc_cases`, `kyc_documents`, `kyc_provider_events`, `aml_screenings`, `sanctions_matches`, `suitability_answers`, `region_restrictions`, `consents`.
- `audit_logs`: actor, action, entity, entity ID, before/after redacted JSON, request ID, IP hash, timestamp.
- `admin_actions`, `emergency_controls`, `feature_flags`, `platform_config_versions`.

### Support and communication

- `conversations`: user/visitor session, channel, assigned agent, status, priority, escalation, created/updated/closed timestamps.
- `chat_messages`: conversation, sender type, sender ID nullable for bot, content, attachment references, idempotency key, read timestamp, created timestamp.
- `support_tickets`: user/conversation, subject, status, priority, SLA timestamps, category, assigned agent.
- `ticket_events`, `ticket_internal_notes`, `message_attachments`, `notification_preferences`, `notifications`, `email_deliveries`, `webhook_events`.
- Visitor chat requires a consented visitor session and must not silently create an account. Convert to a user only after verified signup.

### Integrity constraints

- Normalize emails before every lookup and unique constraint.
- Foreign keys use explicit delete behavior.
- Money and status changes are transactionally coupled to ledger entries.
- Webhooks have provider event ID unique constraints.
- Every write endpoint accepts or generates an idempotency key where duplicate requests could move money or create support messages.

---

## 7. Full API Contract

All routes are under `/api`. JSON errors use `{ error, code, requestId, details? }`. Never return stack traces or hashes. Every authenticated response includes no secrets.

### System

- `GET /healthz` liveness, no dependency requirement.
- `GET /readyz` process readiness.
- `GET /healthz/db` database connectivity and migration status without connection details.
- `GET /metrics` protected or network-restricted metrics.

### Authentication

- `POST /auth/signup`: validate, normalize, create pending OTP challenge. Never create a durable user before verification unless the pending row is explicit.
- `POST /auth/verify-otp`: verify single-use challenge, transactionally insert user and initial accounts, create durable session only after commit.
- `POST /auth/resend-otp`: throttled resend.
- `POST /auth/login`: password check against durable user, create durable session, return user/session summary.
- `GET /auth/session`: always returns quickly with guest, authenticated user, or bounded error. Never hang.
- `POST /auth/logout`: revoke durable session and clear cookie.
- `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`.
- `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-all`.
- `GET /csrf-token` and CSRF validation on unsafe browser requests.

### Profile and notifications

- `GET/PATCH /users/me`.
- `GET /users/me/activity`.
- `GET/PATCH /users/me/preferences`.
- `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`.
- `GET /messages`, `POST /messages` for durable profile mailbox messages.

### Markets and trading

- `GET /assets`, `GET /forex/instruments`, `GET /forex/quotes`, `GET /markets/status`.
- `GET /accounts`, `GET /accounts/:id/balances`, `GET /accounts/:id/positions`.
- `POST /orders` with idempotency key, risk disclosure, and account type.
- `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`.
- `GET /trades`, `GET /statements`, `GET /trades/:id/receipt`.
- `POST /demo/start`, `POST /demo/reset`, `GET /demo/state`.
- Live order requests must return a real state (`accepted`, `rejected`, `pending_provider`, `filled`, `cancelled`) and never pretend a provider fill.

### Wallets, deposits, withdrawals, crypto

- `GET /wallets`, `POST /wallets/connect`, `DELETE /wallets/:id`.
- `POST /auth/siwe/nonce`, `POST /auth/siwe/verify` with EIP-4361 domain/URI/address/chain/time binding.
- `GET /deposits`, `POST /deposits/intents`, `GET /deposits/:id`.
- `GET /withdrawals`, `POST /withdrawals`, `POST /withdrawals/:id/cancel`.
- `GET /crypto/assets`, `POST /crypto/orders`, `GET /crypto/orders/:id`.
- `POST /providers/:provider/webhook` raw-body signature verification and idempotent event handling.
- If provider keys are absent, endpoints return a clear `not_configured` response or use explicitly labelled simulation; they never crash boot.

### Investments and copy trading

- `GET /investment-plans`, `GET /investment-plans/:id`.
- `POST /investment-subscriptions`, `GET /investment-subscriptions`, `POST /investment-subscriptions/:id/redeem`.
- `GET /copy-trading/leaders`, `GET /copy-trading/history`.
- `POST /copy-trading/leaders/:id/follow` with allocation and disclosure acknowledgement.
- `DELETE /copy-trading/leaders/:id/follow`, `POST /copy-trading/leaders/:id/stop`.
- Copy events are stored whether simulated or live and are labelled in every response.

### KYC and support

- `GET /kyc/status`, `POST /kyc/cases`, `POST /kyc/documents`, `GET /kyc/cases/:id`.
- `GET /support/tickets`, `POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages`.
- `GET /live-chat`, `POST /live-chat`, `GET /live-chat/status` for authenticated users.
- Visitor pre-auth support: `POST /visitor-chat/sessions`, `POST /visitor-chat/sessions/:id/messages`, with abuse controls and consent.
- `GET /auth/session` is used before rendering protected UI; chat cannot silently assume a user.

### Admin

- `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/users/:id/suspend`, `POST /admin/users/:id/restore`.
- `GET /admin/live-chats`, `POST /admin/live-chats/:userId/reply`, `POST /admin/presence/heartbeat`.
- `GET /admin/tickets`, `POST /admin/tickets/:id/assign`, `POST /admin/tickets/:id/close`.
- `GET /admin/kyc`, `POST /admin/kyc/:id/decision`, `GET /admin/aml`.
- `GET /admin/deposits`, `POST /admin/deposits/:id/reconcile`, `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/approve`.
- `GET /admin/orders`, `POST /admin/orders/:id/review`, `GET /admin/audit`.
- `GET /admin/providers/health`, `GET/PATCH /admin/config`, `POST /admin/emergency-controls`.
- Every admin mutation requires role, CSRF, step-up auth where material, reason, idempotency, and audit record.

---

## 8. Frontend User App And Original UX

### Route map

Public: `/`, `/markets`, `/education`, `/calendar`, `/about`, `/contact`, `/legal`, `/login`, `/signup`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/demo-trading`.

Authenticated: `/dashboard`, `/wallets`, `/trades`, `/trading`, `/demo-trading`, `/assets`, `/deposits`, `/withdrawals`, `/investment-plans`, `/smartvest`, `/copy-trading`, `/p2p`, `/kyc`, `/messages`, `/support`, `/settings`, `/statements`, `/referrals`, `/education`.

Admin: `/admin`, `/admin/live-chat`, `/admin/users`, `/admin/kyc`, `/admin/finance`, `/admin/audit`, `/admin/config`.

### Session gate pattern

1. App starts with an explicit `sessionState: checking` and a visible branded loading shell, never a blank page.
2. `GET ${VITE_API_URL}/api/auth/session` uses `credentials: include`, an `AbortController` timeout of 10-15 seconds, and `retry: false` for the bootstrap query.
3. `success` with user renders protected routes; `success` with guest renders public routes; `error` renders a recoverable error with retry and sign-in actions.
4. Route guards wait for `checking` to resolve. They never redirect based on undefined data.
5. Cross-origin cookie deployment requires `Secure`, `SameSite=None`, correct CORS origin, and HTTPS. Same-origin development can use `Lax`.
6. After login/verification, invalidate the session query and navigate only after the API response and cookie are confirmed.

### Design system: “Signal Garden”

Create an original visual identity built around a dark ink canvas, warm chartreuse signal marks, coral risk indicators, cool sky data highlights, and generous white space. Avoid copying IB, IG, TradingView, or generic dashboard templates.

- Typography: expressive editorial display face for section titles plus a highly legible sans for numbers and forms; use a bundled or licensed font, not a default system-only stack.
- Layout: a calm left “navigation spine,” a central “decision canvas,” and a right “signal rail” for context, alerts, and next actions. Collapse to a stacked mobile flow.
- Dashboard: show a single “today at a glance” strip, balance composition, exposure map, open risk, market pulses, and one guided next action. Do not bury new users in cards.
- Trading: combine a friendly order composer, explainable risk preview, chart, positions, and a confirmation receipt. Advanced controls expand only when requested.
- Wallets: separate cash, pending, available, and crypto balances. Make network, fee, destination, and settlement status explicit.
- Investments: show goal, horizon, risk band, fee, liquidity, and scenario ranges before subscribe.
- Support: the chat widget must state whether it is AI, human, offline, or escalated; show conversation history, timestamps, delivery state, retry, and ticket reference.
- Motion: page-load reveal, order confirmation state, and message delivery pulse only. Respect reduced motion.
- Accessibility: keyboard navigation, labels, focus states, contrast, screen-reader status, responsive text, and no information conveyed by color alone.
- Buttons must perform real API operations. Disabled states explain configuration or permission, never conceal a broken route.

### Livechat UX contract

- Visitor sees a consented pre-auth support entry point.
- Authenticated user sees durable conversation history after reload.
- User message enters `sending`, then `sent` only after server persistence; bot enters `received` after persistence.
- AI timeout uses deterministic fallback and reports AI unavailable without blocking human escalation.
- Human request creates a durable escalation/ticket and shows ticket ID.
- Agent reply is persisted before Socket.IO broadcast.
- Reconnect causes refetch, deduplication by message ID, and no lost messages.

---

## 9. Admin Panel

### Operations

- Overview: API, database, queue, provider, pricing, email, and realtime health.
- User operations: search, view profile, session management, restriction, suspension, restore, export, deletion workflow.
- Compliance: KYC queue, document review, AML/sanctions results, region restrictions, suitability evidence.
- Finance: deposits, withdrawals, holds, ledger/reconciliation exceptions, fees, statements.
- Trading: order monitor, provider health, execution states, rejected orders, emergency pause.
- Investments: plan versions, subscriptions, valuations, redemption queue, disclosures.
- Copy trading: leaders, performance evidence, suspended leaders, follower allocations, simulated/live status.
- Support: live presence, conversation queue, assignment, internal notes, SLA, escalation, canned responses, email delivery status.
- Configuration: feature flags, maintenance mode, allowed regions, limits, provider status. Version every change.
- Audit: immutable, filterable, exportable audit events with redaction.

### Admin route map

`/admin` overview; `/admin/users`; `/admin/users/:id`; `/admin/kyc`; `/admin/aml`; `/admin/finance/deposits`; `/admin/finance/withdrawals`; `/admin/finance/reconciliation`; `/admin/trading`; `/admin/investments`; `/admin/copy-trading`; `/admin/live-chat`; `/admin/tickets`; `/admin/providers`; `/admin/config`; `/admin/audit`.

Admin UI must hide unavailable provider actions behind a visible `Not configured` state and must never claim an email, payment, execution, or KYC action completed without a durable result.

---

## 10. Realtime

- Namespace or channel `/live-chat`; rooms `admins`, `conv:<conversationId>`, and optional `user:<id>`.
- Authenticate the Socket.IO handshake with the same secure session or short-lived realtime token. Verify room membership server-side.
- Events: `conversation.joined`, `message.persisted`, `message.failed`, `agent.presence`, `ticket.updated`, `notification.created`, optional `quote.updated`.
- Publish only after the database transaction commits. Use an outbox or replay cursor for events missed during disconnect.
- Client reconnects with exponential backoff, then refetches conversation history and deduplicates by ID.
- Presence is ephemeral and may use Redis or memory; it must not determine whether a chat message is stored.
- Optional prices are marked stale when quote age exceeds the instrument threshold. Never present cached prices as live.

---

## 11. Environment Template

All values below are placeholders. Put real values only in the hosting platform secret manager.

### Required API variables

```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
APP_NAME=XpressProFX
PUBLIC_APP_URL=https://app.example.com
API_PUBLIC_URL=https://api.example.com
VITE_API_URL=https://api.example.com
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
DATABASE_URL=postgresql://user:password@host.example.com:5432/xpressprofx?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:password@host.example.com:5432/xpressprofx?sslmode=require
SESSION_SECRET=replace_with_64_plus_random_characters
JWT_SECRET=replace_with_64_plus_random_characters
JWT_REFRESH_SECRET=replace_with_64_plus_random_characters
CSRF_SECRET=replace_with_64_plus_random_characters
COOKIE_SIGNING_KEY=replace_with_64_plus_random_characters
ENABLE_DEMO_AUTH=false
```

`DATABASE_URL` is the runtime connection and may be a pooled Neon URL. `DIRECT_DATABASE_URL` is optional and is preferred for migrations when present. Both are standard Postgres URLs; no hostname is special-cased. For Railway, Neon, Supabase, AWS RDS, Render, Fly, or self-hosted Postgres, set the same variables with that provider's URLs. Preserve `sslmode=require` when the provider requires SSL. Do not put credentials in frontend `VITE_*` variables.

### Admin and email

```dotenv
ADMIN_EMAIL=ops@example.com
ADMIN_PASSWORD=replace_with_strong_secret
ADMIN_NOTIFY_EMAIL=ops@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=replace_with_secret
SMTP_PASS=replace_with_secret
SMTP_FROM=support@example.com
SMTP_SECURE=false
SENDGRID_API_KEY=
```

### Optional providers

```dotenv
OPENAI_MODEL=gpt-4.1-mini
AI_INTEGRATIONS_OPENAI_API_KEY=
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
SENTRY_DSN=
ALCHEMY_API_KEY=
INFURA_API_KEY=
VITE_WALLETCONNECT_PROJECT_ID=
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
COINBASE_API_KEY=
COINBASE_API_SECRET=
COINBASE_WEBHOOK_SECRET=
MOONPAY_API_KEY=
MOONPAY_SECRET_KEY=
MOONPAY_WEBHOOK_SECRET=
ONFIDO_API_URL=
ONFIDO_API_KEY=
TRULIOO_API_URL=
TRULIOO_API_KEY=
COMPLY_ADVANTAGE_API_URL=
COMPLY_ADVANTAGE_API_KEY=
REDIS_URL=
OBJECT_STORAGE_URL=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=
```

Missing optional keys must set adapter status to `not_configured`, disable only that capability, and keep the API and UI bootable. Never use placeholder vendor strings as if they were active credentials.

---

## 12. Portable Deployment Recipes

### Generic Docker/VPS

1. Provision Postgres and obtain runtime and optional direct URLs.
2. Build with `npm ci` and `npm run build`.
3. Run migrations with `DIRECT_DATABASE_URL` or `DATABASE_URL` using `npx prisma migrate deploy`.
4. Start one API process with `NODE_ENV=production node artifacts/api-server/dist/index.mjs`.
5. Serve SPA assets through a CDN or reverse proxy and proxy `/api` and `/socket.io` to the API, or set `VITE_API_URL` to the API public origin.
6. Terminate TLS at the proxy, forward `X-Forwarded-Proto`, configure health probes, restart policy, logs, backups, and alerting.

### Railway

- Add a Postgres service or external Postgres URL; set `DATABASE_URL` and optional `DIRECT_DATABASE_URL` in the API service variables.
- Set `PORT` from the platform or allow the process to read it.
- Do not hardcode `railway.internal`; it is merely one possible runtime URL.
- Deploy API and frontend as separate services if desired; add both public origins to `ALLOWED_ORIGINS`.

### Vercel frontend

- Build the SPA with `VITE_API_URL=https://api.example.com`.
- Set the API origin in the project environment, not a secret server key.
- Add the Vercel production and preview origins intentionally to API CORS.
- Ensure cookie attributes and HTTPS support cross-origin credentials.
- Socket.IO must use the API origin, not a relative URL that accidentally targets the Vercel host.

### Render/Fly/VPS alternatives

- Run the same Node start command and health probes.
- Use any managed or self-hosted Postgres URL.
- Set `PUBLIC_APP_URL`, `VITE_API_URL`, `ALLOWED_ORIGINS`, secrets, and `PORT` through the platform.
- Configure rolling deploys only after migrations are backward-compatible.

### Backup and recovery

- Automated encrypted Postgres backups, tested restore, point-in-time recovery where available.
- Object storage lifecycle and encryption for KYC documents.
- Document RPO/RTO and run a restore drill before live money.

---

## 13. Security And Safety

- Passwords: Argon2id/bcrypt hash only; never log or return passwords.
- Sessions: opaque random IDs, signed/httpOnly/Secure cookies, correct SameSite, rotation/revocation, expiry, device metadata redacted.
- CSRF: synchronizer token or signed double-submit for browser mutations; validate Origin/Referer policy.
- CORS: exact allowed origins from env; credentials only with explicit origins; never `*` with credentials.
- Rate limits: signup, OTP, login, password reset, chat, webhooks, order placement, withdrawals, and admin actions. Use Redis when distributed; safe local fallback for non-critical throttling.
- Input: Zod validation, parameterized queries, output encoding, file type/size limits, malware scanning for documents.
- Secrets: host secret manager only; rotation runbook; no secrets in git, logs, client bundles, URLs, or error messages.
- Web3: verify SIWE signature and nonce; persist public address only. Never request or store private keys, seed phrases, PINs, CVV, or full card data.
- Payments: use provider-hosted tokenization; store provider IDs and last-four metadata only where permitted.
- Money: double-entry ledger, decimal arithmetic, idempotency, reconciliation, holds, approval workflows, no client-supplied balance.
- Webhooks: raw body signature verification, timestamp tolerance, event ID uniqueness, replay protection, durable processing state.
- AI: no financial decisions, no invented balances or approvals, redact sensitive data, timeout, fallback, moderation, human escalation.
- KYC/AML: least privilege, retention policy, provider isolation, manual fallback, no bypass through frontend flags.
- Audit: immutable append-only event records for auth, money, compliance, admin, config, and support actions.
- Monitoring: alert on failed migrations, DB saturation, auth anomalies, webhook failures, ledger imbalance, queue backlog, repeated 5xx, and chat persistence failures.

---

## 14. Step-By-Step Build Order

1. Establish monorepo, strict TypeScript, lint, test, build, Docker, and environment validation.
2. Create one canonical Postgres schema and migration pipeline. Add DB connectivity, SSL parser, migration checks, `/healthz/db`, and backup documentation.
3. Implement repository interfaces and transaction helper. Add integration tests against disposable Postgres.
4. Implement signup, OTP, durable user insert, unique email, login, durable session, logout, password reset, and hydration. Prove restart before any dashboard work.
5. Implement frontend session bootstrap with timeout, guest/auth/error states, route gate, cross-origin cookies, and browser tests. Prove no white screen.
6. Implement user profile, account creation, notifications, mailbox, audit, and preferences.
7. Implement demo account and isolated simulated order engine with explicit labels.
8. Implement instruments, quotes, risk service, order state machine, fills, positions, fees, and ledger. Add provider adapter only after deterministic local integration passes.
9. Implement wallets, deposits, withdrawals, payment intents, reconciliation, and public-address Web3/SIWE flow.
10. Implement KYC/AML, region rules, suitability, disclosures, and admin review.
11. Implement investment plans/SmartVest and copy trading with disclosures and durable histories.
12. Implement livechat, tickets, chatbot adapter/fallback, human queue, Socket.IO, outbox, email notifications, and reload/reconnect proof.
13. Implement P2P, referrals, education, analytics, statements, and billing.
14. Implement admin panel, permissions, step-up auth, emergency controls, provider health, and audit views.
15. Add load, security, browser, migration, backup/restore, disaster recovery, and live smoke suites.
16. Deploy to a staging host with a real Postgres database. Create a test user, inspect the row, restart, login, chat, and reconcile.
17. Promote only after compliance/legal approval, secrets rotation, monitoring, restore drill, and operator signoff.

### Per-phase gate

`npm test` or focused tests -> build -> migration check -> smoke -> `git status` -> commit -> `git pull origin main --rebase` -> `git push origin main` -> record hash. Never force-push.

---

## 15. Acceptance Tests

### P0 identity and persistence

- Signup with a unique email returns OTP challenge, not an authenticated success.
- OTP verification commits a user row with normalized unique email, password hash, verified timestamp, initial account, and audit event in one transaction.
- Query database by test user ID and email; report only ID/count/status, never hashes.
- Same email cannot create a second user, including case/whitespace variants.
- Login reads the database row, validates password, writes a session row, and returns authenticated status.
- Restart API, hydrate, submit `GET /auth/session` with the session cookie, and receive the same user.
- Revoked/expired session returns guest quickly.
- Database unavailable during signup/verify/session creation returns explicit 5xx; no in-memory-only success.
- `DATABASE_URL` works with a generic SSL Postgres URL, Neon pooled URL, Railway URL, and a local test URL. No provider hostname is required by code.

### P0 UI

- Cold load with fast API renders dashboard/public page.
- Stalled session request resolves within timeout to a recoverable error.
- Session 401/guest renders login/public page, not blank white.
- Login success invalidates session query and renders dashboard.
- Hard refresh preserves session or redirects cleanly to login.
- Cross-origin Vercel UI calls API origin and receives credentialed CORS response.

### Money and trading

- Demo and live accounts cannot share balances or withdrawals.
- Every order has idempotency, risk check, durable state transition, and audit record.
- Ledger transaction balances exactly; duplicate webhook/order cannot double-post.
- Provider missing returns not configured/simulated status, never fake live fill.
- Deposit and withdrawal lifecycle survives restart and reconciliation.

### Wallet and Web3

- Injected wallet connects, public address persists, SIWE invalid/replayed/expired nonce returns 401.
- No API, database, logs, bundle, or tests contain private key/seed/PIN/CVV storage.
- WalletConnect missing project ID leaves app functional with disabled explanation.

### Support/chat

- Visitor chat is consented and rate-limited.
- Authenticated user message is not marked sent until database write succeeds.
- Bot fallback works without AI key and times out safely with AI key.
- Human escalation creates durable conversation/ticket and notification attempt.
- Admin sees messages after restart, replies persist before broadcast, and user receives reply after refetch/reconnect.
- Chat history is identical before and after API restart.
- Email provider missing does not break chat; email delivery shows pending/disabled status.

### Deployment and operations

- Optional email, AI, payment, KYC, blockchain, Redis, Sentry, and WalletConnect keys absent: API boots and only affected capability is disabled.
- `GET /healthz` is live; `GET /readyz` reflects dependencies; `GET /healthz/db` verifies database.
- Migration deploy uses direct URL when present and does not print credentials.
- Build artifacts are reproducible, frontend API origin is configurable, and Docker starts on arbitrary `PORT`.
- Backup restore reproduces users, sessions, ledger, chat, tickets, and audit data.

---

## 16. Anti-Regression Checklist

- Never use `Map` as the production source of truth for users, sessions, money, chat, tickets, notifications, or orders.
- Never call a persistence function with `void` and then send success for a critical operation.
- Never return success when Prisma/Drizzle is absent or write failed.
- Never select `DIRECT_DATABASE_URL` as runtime by accident when `DATABASE_URL` is a pooled runtime URL; migration code may prefer direct.
- Never hardcode Railway, Neon, Vercel, Render, or internal DNS names in application logic.
- Never strip required SSL parameters without explicitly configuring the client for SSL.
- Never let a session query retry forever or render a blank page while `undefined` remains unresolved.
- Never use relative API or Socket.IO URLs when the frontend and API can be deployed separately.
- Never broadcast a chat/order/ledger event before durable commit.
- Never hydrate users or chat only through a Prisma delegate when the runtime repository is Drizzle; keep one canonical repository or tested parity fallback.
- Never treat a placeholder or revoked provider key as configured.
- Never expose raw database errors, hashes, tokens, or provider secrets.
- Never treat demo fills, simulated copy events, or cached quotes as live execution.
- Never request or store CVV, PIN, private key, seed phrase, or full card number.
- Never allow client-side flags to bypass KYC, region, role, limits, or emergency controls.
- Never add a static support UI without an actual persisted message route and restart test.
- Never mark a phase complete without fresh executable evidence and a pushed commit hash.

---

## 17. Current Repository Reference Map

The current monorepo is a parity/reference source, not permission to preserve defects.

### API and persistence

- `artifacts/api-server/src/index.ts`: startup, environment validation, Prisma initialization, hydration, realtime startup.
- `artifacts/api-server/src/app.ts`: Express middleware, security headers, CORS, CSRF, route mounting, health behavior.
- `artifacts/api-server/src/routes/index.ts`: route aggregation.
- `artifacts/api-server/src/routes/auth.ts`: signup, OTP verification, login, logout, session, session management.
- `artifacts/api-server/src/routes/auth-password.ts`: password reset and origin handling.
- `artifacts/api-server/src/routes/auth-siwe.ts`: SIWE nonce and signature verification.
- `artifacts/api-server/src/routes/live-chat.ts`: user/admin chat, AI reply, escalation, email reply.
- `artifacts/api-server/src/routes/copy-trading.ts`: durable copy leader/follow/history API.
- `artifacts/api-server/src/routes/trades.ts`, `forex.ts`, `crypto-orders.ts`, `demo-trading.ts`: trading surfaces.
- `artifacts/api-server/src/routes/wallets.ts`, `deposits.ts`, `withdrawals.ts`, `moonpay.ts`, `coinbase.ts`, `digital-payments.ts`: wallet/payment surfaces.
- `artifacts/api-server/src/routes/kyc.ts`, `kyc-aml.ts`: identity and compliance.
- `artifacts/api-server/src/routes/support.ts`, `messages.ts`, `mailbox.ts`, `webhooks.ts`: support communications.
- `artifacts/api-server/src/routes/admin*.ts`, `admin.ts`, `audit.ts`, `monitoring.ts`: operations.
- `artifacts/api-server/src/lib/db-client.ts`: Drizzle runtime client and pool.
- `artifacts/api-server/src/lib/db-persist.ts`: Prisma/Drizzle persistence bridge; rebuild should simplify this to one canonical repository.
- `artifacts/api-server/src/lib/hydrate.ts`: startup hydration; ensure it cannot wipe or skip durable rows.
- `artifacts/api-server/src/lib/session.ts`: secure cookie and session middleware.
- `artifacts/api-server/src/lib/env.ts`, `startup-env.ts`, `connection-config.ts`: environment contract and Postgres setup.
- `artifacts/api-server/src/lib/openai-client.ts`: optional AI adapter and fallback.
- `artifacts/api-server/src/lib/realtime.ts`: Socket.IO chat namespace and events.
- `artifacts/api-server/prisma/schema.prisma`: modern Prisma model surface.
- `prisma/schema.prisma`: legacy/compatibility model surface with users, sessions, wallets, conversations, chat, trades, investments, and financial tables.
- `lib/db/src/schema`: Drizzle tables and shared database schema.

### Frontend

- `artifacts/nextrade/src/App.tsx`: route tree, query client, auth provider, livechat widget.
- `artifacts/nextrade/src/lib/auth.tsx`: session provider and route gate.
- `artifacts/nextrade/src/pages/login.tsx`, `signup.tsx`, `verify-otp.tsx`: auth UX.
- `artifacts/nextrade/src/pages/dashboard.tsx`, `trading.tsx`, `trades.tsx`, `demo-trading.tsx`: trading UX.
- `artifacts/nextrade/src/pages/wallets.tsx`, `connect-wallet.tsx`, `deposits.tsx`, `withdrawals.tsx`: money and Web3 UX.
- `artifacts/nextrade/src/pages/investment-plans.tsx`, `smartvest.tsx`, `managers.tsx`: investment/copy UX.
- `artifacts/nextrade/src/pages/kyc.tsx`, `support.tsx`, `messages.tsx`, `admin-live-chat.tsx`: compliance/support UX.
- `artifacts/nextrade/src/components/live-chat-widget.tsx`: user chat surface.
- `lib/api-client-react`: generated client and shared fetch behavior.
- `lib/api-zod`: generated contracts and schemas.

### Verification and deployment

- `tests/auth-flow.test.mjs`, `sessions.test.mjs`, `auth-throttle.test.mjs`: auth/session behavior.
- `tests/db-connection-config.test.mjs`, `startup-env.test.mjs`, `production-env.test.mjs`: provider/config behavior.
- `tests/app-readiness.test.mjs`, `e2e-live-production.test.mjs`, `e2e-deployment-verification.test.mjs`: health/deploy smoke.
- `tests/demo-trading*.test.mjs`, `investment-plans.test.mjs`, `kyc-aml-providers.test.mjs`, `wallet-transfer-core.test.mjs`: feature slices.
- `scripts/ensure-db-ready.mjs`: startup migration gate.
- `scripts/validate-production-env.mjs`: production environment validation.
- `scripts/healthcheck.mjs`, `production-health-check.mjs`, `production-smoke.mjs`: operational checks.
- `docs/NEXT_AGENT_HANDOFF.md`: current implementation history, pushed hashes, blockers, and evidence.

Known current-project failure patterns that the rebuild must avoid: successful UI operations with no durable row, memory-first auth, unbounded frontend session loading, provider-specific database assumptions, relative cross-origin chat URLs, optional-provider startup crashes, and chat persistence that is acknowledged before storage.

---

## 18. Package And Version Appendix

Use current stable versions at implementation time, pinned with a lockfile and reviewed through security updates. The following baseline mirrors the current project and is a compatibility recommendation, not a license to remain stale:

- Node.js `>=20`.
- npm `10.x` with workspaces.
- TypeScript `5.x` strict.
- React `19.x`, React DOM `19.x`, Vite current stable.
- Express `5.x` or Fastify current stable.
- Prisma `5.x+` or current supported Prisma; `@prisma/client` must match Prisma CLI.
- Drizzle ORM and `pg` current compatible releases if Drizzle is selected.
- Zod `4.x` or current stable with generated API contracts.
- TanStack Query `5.x`.
- Socket.IO `4.x`.
- `ethers` `6.x` for address/signature verification; `@walletconnect/ethereum-provider` current compatible release, optional.
- OpenAI SDK current supported release, optional and server-only.
- Pino current supported release.
- Argon2 current supported release or bcrypt with documented cost.
- Playwright current supported release for browser smoke.
- ESLint current supported release plus TypeScript and React hooks plugins.
- `decimal.js` or database decimal types for money calculations.
- Redis client current supported release, optional.

### Version policy

- Run `npm audit`/dependency scanning in CI.
- Pin production lockfile and rebuild on security updates.
- Test Prisma migrations against a disposable Postgres version and the selected provider.
- Verify Node, browser, OpenSSL, and provider TLS compatibility before promotion.
- Record package updates in the same single blueprint only if the blueprint is being revised; implementation changes belong in code and tests, not hidden in documentation.

---

## Final Build Contract

A team may declare the rebuild complete only when the product boots with optional vendors absent, accepts any configured Postgres-compatible URL, writes a durable user during verified signup, logs in after restart without a white page, persists chat and support activity across restart, separates demo from live money, exposes real error states, passes the acceptance suite, passes security review, survives backup restore, and has received compliance/legal approval for its intended jurisdictions and products.

The only permitted final technical claim is evidence-backed: report the commit hash, test commands, migration result, health result, and any external owner-controlled blockers. Do not claim a static screen is a working financial system.
