# XpressPro FX Live Domain and Repository Gap Analysis

Date: 2026-09-08

## Review Scope

The live public domain was reviewed through `https://xpressprofx.com/` and
`https://xpressprofx.com/login`. The GitHub tree was reviewed across
`artifacts/nextrade`, `artifacts/admin-portal`, `artifacts/api-server/src`,
`lib/`, and the root deployment configuration.

The live domain is a Next.js-rendered public site. The repository is an npm
workspace monorepo using React/Vite for the user and admin shells and an
Express API that serves both built applications in production.

## Live Domain Inventory

| Surface | Live evidence | Repository coverage | Action |
|---|---|---|---|
| Public home and dark fintech visual language | Home page, green CTA accents, market/trading messaging | Public home, shared layout, Tailwind/Vite styling | Keep and polish against current shell |
| Buy, sell, stocks, shares, commodities | Public links present on live home | Public pages/routes and API asset/payment modules exist | Verify route UX and real response states |
| Signals and copy trading | Public links present on live home | Signals/education and copy-trading pages/routes exist | Verify data and empty/error states |
| Trade and markets | `/trade` and `/dashboard/markets` links present | Trading, markets, demo-trading, forex routes/pages exist | Verify auth and market data boundaries |
| About, contact, legal | Public links present | Public about/contact/legal pages exist | Keep and ensure support links work |
| WhatsApp support | `wa.me/447869331386` link present | Support/live-chat routes and widgets exist | Verify full-height chat and escalation |
| Unified sign in | `/login` says “Welcome back”, has forgot-password and create-account links | User login page and separate admin portal login exist | Implement one API role-aware login contract |
| Registration and recovery | `/register` and `/forgot-password` links/flows present | Signup, forgot-password, reset-password pages/routes exist | Verify persistence and safe errors |
| Authenticated dashboard/support | `/dashboard/markets` and `/dashboard/support` links present | Dashboard, support, messages, statements, wallets exist | Verify refresh/session durability |

## Repository Inventory

### User frontend

The repository contains dashboard, markets, trading, demo trading, wallets,
deposits, withdrawals, KYC, connect wallet, investment plans, SmartVest,
education, statements, support, live chat, messages, referrals, promotions,
P2P, cards, banks, copy trading, public content, signup, login, OTP, and
password recovery pages.

### Admin backend

The repository contains users, user detail, deposits, withdrawals, KYC,
trades, assets, billing, gas fees, platform settings, notifications, mailbox,
P2P merchants, and live-chat admin pages. The API contains admin user,
wallet, deposit, platform, notification, P2P, audit, monitoring, KYC, and
provider-related routes protected by existing admin middleware.

Per-user crypto deposit-address editing is present in the admin user-detail
page and uses `GET/PATCH /api/admin/users/:userId/crypto-addresses`. It must be
covered by end-to-end persistence tests and role-aware login routing.

### API and persistence

The API has auth/session, CSRF, rate-limit, user, wallet, ledger, deposits,
withdrawals, KYC/AML, provider, chat, investment, demo, audit, and health
routes. PostgreSQL/Prisma persistence is required for production financial
state. Provider integrations are optional and must fail honestly when secrets
are absent.

## Prioritized Gap List

| Feature or risk | Live/domain expectation | Current repository state | Action |
|---|---|---|---|
| Unified login routing | One public login chooses user or admin destination | User and admin shells exist, but role-aware shared login response needs proof | Extend login response/session and user login navigation |
| Admin session durability | Admin refresh stays in admin shell | Admin app has auth guard; shared user login routing is not yet proven | Add role-aware session tests and guards |
| Safe admin credentials | Env-only admin identity, no hardcoded secrets | Existing admin middleware/env patterns exist | Consolidate and test env aliases without weakening auth |
| User/admin route separation | Admin APIs and shells reject non-admin sessions | Admin route middleware exists | Add explicit integration coverage |
| Admin wallet address control | Admin can set per-user receiving addresses | UI/API contract exists | Prove database persistence, frontend visibility, audit trail |
| Withdrawal gates | KYC, wallet, 2FA/risk requirements enforced server-side | Relevant routes and checklist data exist | Trace one complete mutation path and add denial tests |
| Provider control plane | KYC/payment/monitoring review when providers are absent | Provider routes and admin pages exist in parts | Consolidate status/review controls and honest unavailable states |
| KYC/OTP review | Admin approval/rejection with reason and audit | KYC/admin routes exist | Verify reason, audit, and user-visible status |
| Money operations | Ledgered deposit/withdrawal approval | Admin wallet/deposit routes exist | Verify transaction atomicity and audit records |
| Live chat | Full user panel, bot/human/admin reply | User/admin chat routes and pages exist | Verify socket/reply lifecycle and responsive panel |
| Demo trading | Durable demo balance and no auth bounce | Demo engine/pages exist | Run persistence and refresh tests |
| Investment engines | Plans start and ledger correctly | Investment plan and engine code exists | Run plan coverage and money precision tests |
| Deployment portability | Current GitHub commit deploys on supported platforms | npm/Replit/Railway/Vercel/Docker configs exist | Keep one lockfile and run build/health smoke matrix |
| Documentation/source | GitHub repo and `main` are authoritative | Some historical docs had stale URLs | Keep docs aligned with canonical source and branch |

## Acceptance Evidence Required Before Production Claim

1. Normal user credentials create/restore a user session and navigate only to
   the user shell.
2. Env-configured admin credentials use the same public `/login`, receive an
   admin role, and navigate only to `/xpadmin`.
3. Wrong credentials return a generic safe error and do not reveal account
   existence.
4. Admin refresh preserves the admin shell and admin API authorization.
5. A per-user wallet address update persists in PostgreSQL, appears in the user
   deposit flow, and is audit-visible.
6. Withdrawal requirements are denied server-side until required gates pass.
7. `/healthz`, the user root, and `/xpadmin/` serve successfully after a clean
   install/build on the selected deployment target.

This document records review evidence and gaps; it does not claim that an
external provider is live without the required production credentials.
