# NeXTrade

A crypto trading and P2P platform implementing the contract from `lib/api-spec/openapi.yaml`. Provides a self-directed trading desk, social/copy-trading via account managers, a peer-to-peer marketplace, an asset purchase catalog, multi-context messaging, and a support center.

## Architecture

Monorepo (npm workspaces) with two main artifacts and shared libs.

### Artifacts
- **`artifacts/api-server`** (`@workspace/api-server`) — Express 5 + Pino server. Mounted under `/api`. Backed entirely by an in-memory store (no database). Routes are split per resource under `src/routes/{users,wallets,trades,managers,messages,p2p,assets,support,admin,admin-extended,admin-platform,admin-users,admin-p2p}.ts` and registered in `src/routes/index.ts`. All request/response shapes are validated against the generated Zod schemas from `@workspace/api-zod`.
- **`artifacts/nextrade`** (`@workspace/nextrade`, web) — React + Vite frontend served at `/`. Uses Wouter for routing and Tanstack Query via the generated hooks in `@workspace/api-client-react`. Pages: `/` Dashboard, `/wallets`, `/trades`, `/p2p`, `/managers` (Trade Manager picker), `/messages`, `/assets`, `/support`, `/settings`, `/deposits`, `/withdrawals`, `/banks`, `/cards`, `/promotions`, `/billing`, `/kyc`, `/referrals`, `/admin`. The shell is fully responsive: a persistent sidebar from `md` upwards, a hamburger-triggered drawer (`Sheet`) on mobile. The sidebar groups entries by purpose — **Overview**, **Trading**, **Funds**, **Account** — defined in the `navGroups` array of `Shell.tsx`.
- **`artifacts/admin-portal`** (`@workspace/admin-portal`, web) — React + Vite admin command center served at `/xpadmin`. Login uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` secrets (the auth route bypasses OTP for admin role). Pages: `/users` (list + Create User modal), `/users/:userId` (10-tab detail: overview, profile, status, wallet, banks, connected wallets, trades, merchant, vault, crypto), `/trades` (global trade ledger), `/assets` (asset catalog CRUD), `/p2p-merchants` (applications + approved merchants with Notify/Chat modals), `/settings` (platform toggles: trading/registration/demo-mode/maintenance + maintenance message), plus existing billing/managers/messages/promotions screens.

### Shared libs
- **`lib/api-spec`** — `openapi.yaml` contract (single source of truth).
- **`lib/api-zod`** — Codegen Zod schemas + TS types from the spec.
- **`lib/api-client-react`** — Codegen Tanstack Query hooks from the spec.
- **`lib/db`** — Drizzle schema definitions (defined but unused; the API server uses an in-memory store).

### Data
The in-memory store in `artifacts/api-server/src/lib/store.ts` is seeded at boot with a demo user (`u_demo_001` / Alex Morgan), three wallets (main / trading / social), demo trades and transactions, several account managers, P2P listings/orders/notifications, an asset catalog, and a couple of support tickets. State resets on server restart.

## Conventions

- **Backend route naming.** All Zod schemas come from the generated names in `lib/api-zod/src/generated/api.ts` — never guess. Examples: `ConnectExternalWalletBody`, `SelectManagerBody`, `GetMessagesQueryParams`, `CreateP2PListingBody`, `PurchaseAssetBody`. After any spec change, re-run `npm --workspace=lib/api-spec run codegen` before touching server or client code.
- **Frontend hooks.** Always import hooks from `@workspace/api-client-react` (never relative paths). Hooks return `T` directly, not wrapped. After mutations, invalidate the matching `getXxxQueryKey()` so the UI refreshes.
- **Routing.** The web app is mounted at `/` via the artifact preview path. The API is mounted at `/api`.
- **Client-side preferences.** Per-user UI preferences that the backend does not model live in localStorage behind a typed hook (see `src/hooks/use-default-bank.ts`). Hooks dispatch a custom event after writing so all subscribers re-read the value within the same tab.
- **Responsive design.** Pages should use `p-4 md:p-6` for outer padding, `text-2xl md:text-3xl` for h1, and `grid-cols-1 md:grid-cols-N` for card grids. Dialogs should set `max-w-[95vw] sm:max-w-lg` so they fit on phones.

## Monthly billing

Three mandatory monthly fees are charged to every customer:

1. **Maintenance** — platform upkeep (default $25/mo).
2. **AI assistance bot** — required AI monitoring subscription (default $49/mo).
3. **Active ongoing trade** — per-cycle fee multiplied by the number of open trades carried into the cycle (default $15/trade).

Cycle accounting lives in `artifacts/api-server/src/lib/billing.ts`. Cycles are keyed by `YYYY-MM` (UTC) and rolled forward when the user touches `/billing/me` or any admin billing route. Defaults live in `defaultBillingRates` (mutable, admin-controlled). Per-user overrides live on `UserData.billingRatesOverride`.

Endpoints:
- `GET /billing/me` — customer cycle + history (`BillingStatus`).
- `POST /billing/pay` — debit the main wallet for one or more `BillingChargeKey`s. Records a `Transaction` with `type: "fee"`.
- `GET /admin/billing` — all customer rows + current defaults (`AdminBillingOverview`).
- `PATCH /admin/billing` — update defaults (`UpdateBillingDefaultsBody`).
- `PATCH /admin/billing/users/:userId` — set per-user rates (`UpdateUserBillingRatesBody`).
- `POST /admin/billing/users/:userId/mark-paid` — manually settle items (offline payments).

UI:
- Customer page `src/pages/billing.tsx` — current cycle with per-charge "Pay" buttons, a "Pay all" button, and past-cycle history.
- Admin tab "Billing" inside `src/pages/admin.tsx` (`AdminBillingPanel`) — edit defaults and per-user rates, mark cycles paid.

## Admin command center

The admin portal exposes platform-wide controls. All routes live under `/api/admin/*` and are gated by `requireAdmin`.

- **Platform settings** — `GET/PATCH /admin/platform-settings` toggles `tradingEnabled`, `registrationEnabled`, `demoModeEnabled`, `maintenanceMode` and stores a `maintenanceMessage`. Stored on the singleton `platformSettings` object in `store.ts`.
- **Asset catalog** — `POST/PATCH/DELETE /admin/assets[/{id}]` manage the global catalog used by trades and the asset purchase flow. `CreateAssetRequest` requires `category` (`crypto|stock|etf|forex|commodity`).
- **Global trades** — `GET /admin/trades` returns every trade with the owning user joined in (`AdminTradeRow`). Filterable client-side.
- **Per-user controls** — `user-detail.tsx` 10-tab view covers profile edits, status flags (`kycVerified`, `tradingLocked`, `demoMode`, `merchant`), wallet balance adjustments, bank accounts, connected external wallets, trade history, merchant promotion/revocation, vault balances, and crypto wallet addresses.
- **Admin user creation** — `POST /admin/users` creates a user with role `user|admin|demo`, optional `merchant` flag, and bypasses OTP entirely (no email infra needed). Username defaults to the email local-part if blank.
- **P2P merchant management** — `admin-p2p.ts` exposes:
  - `GET /admin/p2p/merchants` — pending/approved/rejected applications + currently-approved merchants.
  - `POST /admin/p2p/merchants/{userId}/approve` and `/reject` — flips `UserData.merchant` and records the decision.
  - `POST /admin/p2p/merchants/{userId}/notify` — pushes a typed notification (`NotifyMerchantBody`) into the merchant's notification feed.
  - `GET/POST /admin/p2p/merchants/{userId}/chat` — admin↔merchant thread backed by `lib/p2p-chat.ts`.
- **P2P merchant gating** — `routes/p2p.ts` enforces that only users with `merchant: true` can create listings. Non-merchants get a `POST /p2p/merchant-applications` endpoint to apply; admins review the queue from the portal.

## Environment variables

All process-env access is centralized in `artifacts/api-server/src/lib/env.ts`. Routes/lib must read `env.X` (not `process.env.X` directly) so missing optional secrets never crash startup.

- **Required at startup**: `PORT` (validated via `assertRequiredEnv()`).
- **Optional with safe fallbacks**:
  - `NODE_ENV` (defaults `development`), `LOG_LEVEL` (defaults `info`).
  - `ENABLE_DEMO_AUTH=true` (dev-only) — enables `/auth/demo`, demo seed user Alex, and sample merchant applications. Surfaced as `isDemoAuthEnabled`.
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — when both present, the admin user is provisioned at boot. Otherwise startup logs a warning and `adminSeedStatus.provisioned=false`.
  - `ADMIN_NOTIFY_EMAIL` — destination for admin-alert email mirrors.
  - `SENDGRID_API_KEY` — preferred email provider. When set, `lib/email.ts` sends via SendGrid HTTP API.
  - `SMTP_FROM` — verified sender email used for SendGrid transactional messages. This should be set to a SendGrid-authorized 'from' address.
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — fallback provider used only when SendGrid is not configured (lazy-loads `nodemailer`). When neither provider is wired, emails are logged to `sentEmails` and printed (stub fallback) — admins can still audit them at `/admin/sent-emails`.
  - `lib/otp.ts` now routes OTP emails through `lib/email.ts`, so real SendGrid or SMTP credentials will be used for signup/login codes when configured.
  - `SESSION_SECRET` — signs the session cookie; falls back to a dev placeholder if unset (rotate before production).
  - `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — provisioned by the workspace's Replit AI integration. When missing, `/live-chat` falls back to canned replies and never auto-escalates.
  - `ALCHEMY_API_KEY` / `INFURA_API_KEY` — `lib/blockchain.ts` falls back to ethers' default public provider when missing.
  - `MOONPAY_API_KEY` / `MOONPAY_SECRET_KEY` / `MOONPAY_WEBHOOK_SECRET` — MoonPay routes fall back to sandbox URLs/signatures when missing.

## Data storage

The platform uses an **in-memory store** — every collection (users, wallets, transactions, withdrawals, deposits, KYC, banks, cards, P2P listings/orders/notifications/applications, mailbox, support tickets, live chat, alerts, notification settings, billing cycles, asset catalog, gas-fee config, platform settings, sessions, tx-hash claim ledger) lives in `artifacts/api-server/src/lib/store.ts` as module-level `Map`s/arrays and **resets on every server restart**. OTP state is held separately in `lib/otp.ts` (also in-memory). The Drizzle schema definitions in `lib/db` are NOT used at runtime; they are reserved for a future migration to Postgres. There is no `DATABASE_URL`, no Drizzle migrations, and no production persistence layer in this codebase today.

## Running

- API: workflow `artifacts/api-server: API Server` (`npm --workspace=artifacts/api-server run dev`).
- Web: workflow `artifacts/nextrade: web` (`vite dev`). Reads `PORT` and `BASE_PATH` from the env.
- Admin portal: workflow `artifacts/admin-portal: web` (`vite dev`), served under `/xpadmin`.
- Source code (`artifacts/` + `lib/`, excluding `node_modules`) totals under 10MB.
