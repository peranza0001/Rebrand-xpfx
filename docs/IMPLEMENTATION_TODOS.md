# XpressPro FX Implementation TODOs

Execution order for the unified live-domain/GitHub union. Each milestone must
be validated with focused tests, committed, and pushed before the next one.

1. **Review live domain and repository**
   - Capture public/auth route inventory, current repository surfaces, and gaps.
  - Deliverable: `docs/LIVE_DOMAIN_GAP_ANALYSIS_2026-09-08.md`.

2. **Publish numbered gap-analysis TODOs**
   - Keep this file as the milestone checklist and update acceptance evidence.

3. **Implement unified login routing**
   - Use one public `/login`.
   - Authenticate normal users and env-configured admins through the existing
     security middleware.
   - Return role/destination without exposing secrets.
   - Navigate users to the user shell and admins to `/xpadmin` only.

4. **Harden auth and session durability**
   - Test refresh, logout, CSRF, rate limits, lockout, forgot password, and
     admin/user route separation.

5. **Unify user frontend feature coverage**
   - Verify live-domain public routes against repository pages and wire every
     real API state, including loading, empty, error, and success states.

6. **Fix wallet and withdrawal gating**
   - Prove connect-wallet persistence, per-user admin receiving addresses,
     wallet visibility, ledger updates, and server-side withdrawal gates.

7. **Complete live chat workflows**
   - Verify bot response, human escalation, admin inbox, reply persistence,
     socket reconnect, and responsive full-height UI.

8. **Stabilize demo trading**
   - Prove durable demo balances, trade events, refresh behavior, and clear
     separation from real-money balances.

9. **Verify investment engines**
   - Exercise all configured plans and Standard/Pro/VIP tiers with decimal
     money handling, ledger entries, and restart persistence.

10. **Complete the admin provider control plane**
    - Verify users, sessions, KYC/OTP review, provider status, deposits,
      withdrawals, investment overrides, chat, audit, and platform controls.
    - Providers without credentials must show unavailable/pending states, never
      fabricate successful verification or payment.

11. **Enforce the account checklist**
    - Enforce email, approved KYC, funding wallet, connected public wallet, 2FA
      withdrawal protection, and risk disclosure server-side where required.

12. **Polish product design**
    - Match the live domain's dark fintech quality while preserving the deeper
      broker/admin workflows and accessible responsive states.

13. **Build, smoke test, and publish**
    - Clean npm install, build API/user/admin, health checks, focused auth and
      financial tests, clean git state, and push every verified commit to
      `origin/main`.

## Commit Convention

Use focused commit messages such as:

- `docs: record live domain and repository gap analysis`
- `auth: route unified login by role`
- `fix: enforce withdrawal account checklist`
- `admin: complete provider review controls`
- `test: prove production auth and persistence`
