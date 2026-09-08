# COPILOT-INSTRUCTIONS.md — Master Replication Command (XpressPro FX)

**Repository:** https://github.com/trevionjamielynn800/Rebrand-xpfx.git
**Project:** Full hybrid fintech forex broker + investment platform (NeXTrade + Admin Portal + API)

## ABSOLUTE RULES (Must Follow Exactly)
- Preserve **ALL** existing business logic exactly (wallets, KYC, mandatory admin approval for withdrawals, P2P, encryption, referrals, etc.).
- **ONLY** fix infrastructure, build, dependency, deployment, and repository issues.
- Do **NOT** change any route behavior, admin logic, or core functionality.
- This project uses **npm workspaces** (NOT pnpm). The file `pnpm-lock.yaml` at the root **must be removed** because it breaks Railway builds.
- Goal: Clean, working, production-ready system with **zero files missing**.

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
