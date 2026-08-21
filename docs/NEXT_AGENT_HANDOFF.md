# XpressPro FX Next-Agent Handoff

Updated: 2026-08-20

## Phase 0 checkpoint

- Branch: `main`
- Phase 0 commit pushed to `origin/main`: `b332eb9bbae8e7a028cb2bdba1a76d6b7613d038`
- Phase 0 change: committed the existing intentional `remember.md` auto-sync update as `chore: sync agent memory`.
- Working tree was clean after the push.
- No secret values were printed or committed. `.env` exists locally and remains untracked/ignored; use environment configuration only.
- Phase 1 handoff commit pushed: `bc7b303f0d29791457ec0a7ef8a468fe203fe6ef`.
- Phase 2 copy-trading commit pushed: `f6a1b42b81cd984ba43f8a3ba084bc02bda76330`.
- Phase 3 Web3 commit pushed: `54e2dd2be2fe56f9587f3dec688975607ef72638`.

## Known URLs

- Primary API: https://web-production-94f970.up.railway.app
- Frontend: https://rebrand-xpfx-api-server.vercel.app
- Database: PostgreSQL configured through the Railway `DATABASE_URL` environment variable.

## Current implementation status

### Copy trading (implemented in Phase 2)

- UI exists in `artifacts/nextrade/src/components/social-trading-hub.tsx`.
- Current UI uses default in-component trader data and callback props; follow state is local React state.
- Backend routes now provide authenticated leaders, follow/unfollow, allocation bounds, stop-copy, simulated copy events, and history at `/api/copy-trading/*`.
- PostgreSQL migration/model files are `artifacts/api-server/prisma/migrations/20260820150000_add_copy_trading/migration.sql` and `artifacts/api-server/prisma/schema.prisma`.
- Copy events are explicitly simulated and do not require external signal-provider accounts or keys.
- Existing authenticated session middleware is in `artifacts/api-server/src/lib/session`; existing database persistence helpers are in `artifacts/api-server/src/lib/db-persist`.

### Web3, MetaMask, SIWE, and WalletConnect (implemented in Phase 3)

- Public-address wallet linking exists at `artifacts/api-server/src/routes/wallets.ts` (`POST /wallets/connect`) and is auth-gated.
- Wallet records are returned through public-safe serializers and persisted through the existing database persistence path. No private key or seed storage is intended.
- Frontend wallet linking exists in `artifacts/nextrade/src/pages/connect-wallet.tsx` and `artifacts/nextrade/src/pages/wallets.tsx`.
- Injected MetaMask/window.ethereum connection, chain checking, SIWE signing, and refresh-safe public wallet linking are implemented in `artifacts/nextrade/src/pages/connect-wallet.tsx`.
- EIP-4361-compatible challenge/verification routes are in `artifacts/api-server/src/routes/auth-siwe.ts`; nonces are short-lived and single-use, and verification is bound to the authenticated user, origin/domain, URI, address, chain, and timestamps.
- WalletConnect v2/Reown support uses `@walletconnect/ethereum-provider` and activates only when `VITE_WALLETCONNECT_PROJECT_ID` is set. Without it, the UI remains usable and shows a disabled/not-configured state.
- The unsafe seed-phrase/private-key wording was removed. Only public addresses are accepted and persisted.
- `ethers` is already an API dependency and can support address/signature validation without an RPC provider. WalletConnect should remain optional and disabled with a clear configuration state when no project ID is present.

## Ordered next tasks

1. ~~**Complete copy-trading persistence and routes**~~ **Done**
   - Why: the current social trading screen is demo/local state and cannot support authenticated follow, allocation, stop-copy, or history workflows.
   - Files: add focused API route/schema/persistence modules near `artifacts/api-server/src/routes`, `artifacts/api-server/prisma/schema.prisma`, generated API contracts/client as required, and wire `artifacts/nextrade/src/components/social-trading-hub.tsx`.
   - Acceptance: authenticated leader list; follow/unfollow; allocation validation; stop-copy; PostgreSQL-backed records; deterministic stub/simulated copy events without provider keys; history endpoints; disclaimer; admin suspension if the existing admin pattern supports it.
   - Dependencies: existing auth/session and database connection.

2. ~~**Implement provider-free injected wallet connection**~~ **Done**
   - Why: the minimum live path must connect MetaMask/window.ethereum, handle common provider errors, persist only the public address, and survive refresh.
   - Files: wallet frontend page/components, wallet API contract and `artifacts/api-server/src/routes/wallets.ts`, plus browser-provider typings if needed.
   - Acceptance: connect, disconnect/reconnect, truncated address, no-provider/rejected/locked/pending/wrong-chain handling, and public-address persistence after refresh.
   - Dependencies: browser wallet; no RPC provider key required.

3. ~~**Implement EIP-4361 SIWE**~~ **Done**
   - Why: wallet ownership must be verified instead of trusting a submitted address.
   - Files: API SIWE/nonce route and persistence, auth/session integration, frontend sign-in flow, tests.
   - Acceptance: domain/URI-bound nonce; exact EIP-4361 message; signature verification with `ethers`; short TTL and single-use nonce; invalid/expired/replayed nonce returns 401; link to authenticated account without replacing email auth.
   - Dependencies: existing session/auth conventions; database or short-lived local nonce store.

4. ~~**Add optional WalletConnect v2/Reown**~~ **Done**
   - Why: mobile/deep-link wallets need a connector when injected MetaMask is unavailable.
   - Files: frontend dependency/configuration, wallet connector component, environment examples, documentation.
   - Acceptance: `VITE_WALLETCONNECT_PROJECT_ID` enables the live connector; missing ID leaves the app functional and shows a disabled/not-configured state; only public addresses are persisted.
   - Dependencies: optional WalletConnect project ID; no server secret in `VITE_*`.

5. **Run closure and related handoff work**
   - Why: production readiness requires evidence for crypto stubs, support/chat/webhooks, auth/demo, CORS, npm warnings, and deployment health.
   - Acceptance: every item marked Done or Blocked with a concrete reason; focused tests/builds green; live/staging proof recorded; clean tree and one pushed commit per phase/task.

## Open blockers and risks

- Live copy-trading execution is intentionally not enabled; only simulated events are available until a regulated execution provider is configured.
- Live WalletConnect mobile testing requires an optional project ID and a compatible wallet. The no-key path is covered by the disabled-state behavior.
- Railway/Vercel live proof depends on current deployment access, configured environment variables, database availability, and browser wallet availability.
- External provider keys are optional by requirement; missing keys must select local/stub behavior rather than crash.
- The wallet page's stale seed-phrase/private-key wording is a security/documentation defect and must be corrected.
- Do not store or request CVV, PIN, private keys, seed phrases, or other wallet custody secrets.
- npm warnings, CORS configuration, auth/demo behavior, support chat/webhooks, and provider-free crypto paths require explicit closure checks after feature work.

## Validation evidence

- `npx prisma validate --schema=artifacts/api-server/prisma/schema.prisma`: passed.
- `npx prisma generate --schema=artifacts/api-server/prisma/schema.prisma`: passed.
- API workspace typecheck and build: passed.
- Frontend Vite build: passed.
- Frontend workspace typecheck remains blocked by pre-existing generated-client output errors and unrelated missing imports in other components; no error was reported from the modified wallet page itself.

## Commit gate

After each phase or independently deployable task: run focused validation, commit the intentional changes, run `git pull origin main --rebase`, push `main` to `origin`, record the hash, and only then begin the next phase. Never force-push and never commit secrets.
