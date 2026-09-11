# COPILOT-INSTRUCTIONS.md — Master Replication Command (XpressPro FX)

**Repository:** https://github.com/trevionjamielynn800/Rebrand-xpfx.git
**Project:** Full hybrid fintech forex broker + investment platform (NeXTrade + Admin Portal + API)

## ABSOLUTE RULES (Must Follow Exactly)
- Preserve **ALL** existing business logic exactly (wallets, KYC, mandatory admin approval for withdrawals, P2P, encryption, referrals, etc.).
- **ONLY** fix infrastructure, build, dependency, deployment, and repository issues.
- Do **NOT** change any route behavior, admin logic, or core functionality.
- This project uses **npm workspaces** (NOT pnpm). The file `pnpm-lock.yaml` at the root **must be removed** because it breaks Railway builds.
- Goal: Clean, working, production-ready system with **zero files missing**.

## PERMANENT AI AGENT PRODUCTION RULE
- Every AI agent modifying this repository MUST preserve the founder/owner rules, approval gates, wallet/key protections, KYC/AML requirements, and existing API contracts.
- Every change MUST leave the customer frontend, admin control plane, API server, persistence, deployment configuration, and security controls wired end to end; partial, simulated, or silently degraded financial behavior is not production-ready.
- Before declaring a stage complete, the agent MUST run the narrowest relevant tests, TypeScript checks, production builds, security checks, and HTTP smoke tests for the affected user, admin, and API workflows.
- The agent MUST commit and push each completed stage to `origin/main` before starting the next stage, and MUST report the exact evidence and any external blocker such as DNS, provider credentials, or platform settings.
- No agent may claim “enterprise production ready” when required production secrets, database connectivity, provider delivery, live deployment routing, or browser-level validation remain unverified; fail closed and document the blocker instead.

## PHASES TO FOLLOW (In Order)

### PHASE 1: Repository Setup
- Remove `pnpm-lock.yaml`
- Verify structure has `artifacts/` and `lib/` at root (no numbered folders)
- Fix `package.json` workspaces if they contain old paths

### PHASE 2: Install Dependencies
```bash
npm install
# or (recommended for Railway):
npm ci --prefer-offline --no-audit --no-fund
