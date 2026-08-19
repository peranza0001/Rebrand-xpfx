# TOP 5 PRIORITY FIXES — XpressPro FX Production Launch
**Status:** CRITICAL BLOCKERS IDENTIFIED  
**Date:** 2026-08-15  

---

## 🔴 PRIORITY 1: Fix is_demo Schema Mismatch [BLOCKING]
**Risk:** Prisma crashes if demo trading tries to save transactions  
**Status:** Code references `is_demo` column but it was never migrated to database

### What's Wrong
```
✗ prisma/schema.prisma:
  model transactions { is_demo Boolean @default(false) }
  model user_sessions { is_demo Boolean @default(false) }

✓ prisma/migrations/20260718072033_init/migration.sql:
  NO ALTER TABLE for is_demo columns added
```

### How to Fix (30 minutes)
```bash
# 1. Create a new migration file
cat > prisma/migrations/20260815_add_is_demo_columns/migration.sql << 'EOF'
-- AddColumn is_demo to transactions and user_sessions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
EOF

# 2. Apply migration to database
npx prisma migrate deploy

# 3. Verify in Railway production
# Check PostgreSQL directly or run: npx prisma db push
```

### How to Verify
```bash
# After deploying:
curl https://rebrand-xpfx-production-1988.up.railway.app/api/auth/demo \
  -X POST -H "Content-Type: application/json" -d "{}"
# Should not error; demo session should be created
```

---

## 🔴 PRIORITY 2: Fix Brand Domain Routing on Vercel [BLOCKING]
**Risk:** xpressprofx.com returns 404 on every path (completely inaccessible)  
**Status:** Vercel is serving static SPA without routing or API proxy configured

### What's Wrong
```
❌ vercel.json missing:
  - No "rewrites" for /api/* → backend proxy
  - No "redirects" for SPA client-side routing (/login, /dashboard, etc.)

❌ Result:
  GET https://xpressprofx.com/login → 404 (Vercel tries to serve as static file, fails)
  GET https://xpressprofx.com/api/auth/session → 404 (no proxy)
```

### How to Fix (1 hour)
```bash
# 1. Update vercel.json
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm ci --no-audit --no-fund && npm run prepare:runtime-secrets && npm run build --workspace=artifacts/nextrade",
  "outputDirectory": "artifacts/nextrade/dist/public",
  "installCommand": "npm ci --no-audit --no-fund",
  "framework": null,
  "env": {
    "NODE_ENV": "production",
    "VITE_API_URL": "@vite_api_url"
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://rebrand-xpfx-production-1988.up.railway.app/api/:path*"
    }
  ],
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "/index.html",
      "statusCode": 200
    }
  ]
}
EOF

# 2. Set environment variable in Vercel dashboard:
# VITE_API_URL=https://rebrand-xpfx-production-1988.up.railway.app

# 3. Push to repo and redeploy on Vercel
git add vercel.json && git commit -m "fix: configure SPA routing and API proxy for brand domain"
git push
```

### How to Verify
```bash
# After Vercel redeploys (~2 min):
curl -I https://xpressprofx.com/login
# Should return 200 (SPA index.html served)

curl -I https://xpressprofx.com/api/auth/session
# Should return 200 or 403 (depends on CORS, which is Priority 3)
```

---

## 🔴 PRIORITY 3: Add Brand Domain to ALLOWED_ORIGINS on Railway [BLOCKING]
**Risk:** CORS rejects xpressprofx.com requests (even if Vercel routing is fixed)  
**Status:** Railway ALLOWED_ORIGINS only includes Railway URL, not brand domain

### What's Wrong
```
Test CORS rejection:
curl -H "Origin: https://xpressprofx.com" \
  https://rebrand-xpfx-production-1988.up.railway.app/api/auth/session

Response:
403 {"success":false,"message":"CORS policy: origin not allowed"}

Expected:
200 with access-control-allow-origin: https://xpressprofx.com header
```

### How to Fix (10 minutes)
```bash
# In Railway dashboard:
# 1. Go to Project → Rebrand-xpfx → Variables
# 2. Find or create ALLOWED_ORIGINS
# 3. Set value to:

ALLOWED_ORIGINS=https://rebrand-xpfx-production-1988.up.railway.app,https://xpressprofx.com,https://www.xpressprofx.com

# 4. Redeploy Railway service (or wait for next deploy)
```

### How to Verify
```bash
curl -H "Origin: https://xpressprofx.com" \
  https://rebrand-xpfx-production-1988.up.railway.app/api/auth/session

# Should return 200 with:
# access-control-allow-origin: https://xpressprofx.com
```

---

## 🟠 PRIORITY 4: Encrypt Seed Phrases & Remove from API Responses [HIGH]
**Risk:** Private key material stored in plain text → database breach = total account loss  
**Status:** connected_wallets.seed_phrase field is unencrypted

### What's Wrong
```
prisma/schema.prisma:
  model connected_wallets {
    seed_phrase String?  // ← PLAIN TEXT in database!
  }

If attacker gains database access:
  - All seed phrases readable → all crypto wallets compromised
  - No recovery path for users
```

### How to Fix (2 hours)
```bash
# 1. Create migration to add encrypted column
cat > prisma/migrations/20260815_encrypt_seed_phrases/migration.sql << 'EOF'
-- Encrypt seed phrases (requires application-side encryption)
ALTER TABLE connected_wallets ADD COLUMN seed_phrase_encrypted BYTEA;
-- Run app-side decryption → re-encryption with proper key
-- Then drop old column: ALTER TABLE connected_wallets DROP COLUMN seed_phrase;
EOF

# 2. Update schema.prisma
# Remove seed_phrase or rename to seed_phrase_encrypted

# 3. Update routes to never return seed_phrase in API response
# Search artifacts/api-server/src/routes for "seed_phrase" and remove from SELECT/JSON

# 4. Create export endpoint that requires 2FA + email confirmation
```

### How to Verify
```bash
# After fix:
curl https://rebrand-xpfx-production-1988.up.railway.app/api/connected-wallets \
  -H "Authorization: Bearer $TOKEN"

# Response should NOT include seed_phrase field
# Only: { id, address, wallet_type, balance, currency, connected_at, label }
```

---

## 🟠 PRIORITY 5: End-to-End Test OTP Signup + Document Admin Setup [HIGH]
**Risk:** Signup may be broken in production; admin account creation undocumented  
**Status:** Code is complete but not tested on LIVE; admin setup unclear

### What's Missing
```
Untested paths:
✓ POST /api/auth/signup → issueOtp()
✓ POST /api/auth/verify-otp → creates account
✗ Email delivery (SMTP not tested)
✗ Admin user creation (no documented process)
✗ Admin login to /admin portal
```

### How to Fix (1.5 hours)
```bash
# 1. Test signup flow manually
curl -X POST https://rebrand-xpfx-production-1988.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TempPass123!","fullName":"Test User","country":"US"}'
# Check logs: "OTP sent to test@example.com"

# 2. Check email (check email service logs or inbox)
# Get OTP code

# 3. Verify OTP
curl -X POST https://rebrand-xpfx-production-1988.up.railway.app/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"XXXXXX"}'
# Should return: {"user":{"id":"...","email":"test@example.com",...},"role":"user"}

# 4. Document admin setup
# Create ADMIN_SETUP.md with:
#   - How to create first admin (SQL? API endpoint?)
#   - How to set ADMIN_EMAIL, ADMIN_PASSWORD in .env
#   - How to login to /xpadmin (or verify path)
#   - How to approve pending deposits/users
```

### How to Verify
```bash
# After testing:
# 1. New user can signup, receive OTP, verify, and login
# 2. Admin can login to /xpadmin and see live-chat panel
# 3. Create ADMIN_SETUP.md in repo root
```

---

## 🎯 QUICK CHECKLIST

Before going LIVE:

- [ ] **P1: Migrate is_demo columns** → `npx prisma migrate deploy`
- [ ] **P2: Update vercel.json** → rewrites + redirects + VITE_API_URL
- [ ] **P3: Update Railway ALLOWED_ORIGINS** → include xpressprofx.com
- [ ] **P4: Encrypt seed phrases** → no plain text in API responses
- [ ] **P5: Test OTP signup** → manual signup → verify → login
- [ ] All tests pass: `npm run test:enterprise`
- [ ] All builds pass: `npm run build:all`
- [ ] Curl healthz endpoints on live app
- [ ] Test demo auth, demo trading, dashboard on LIVE
- [ ] Admin can login and view live-chat
- [ ] Brand domain (xpressprofx.com) loads and reaches API

---

## ESTIMATED TIME TO PRODUCTION
- **P1 (is_demo migration):** 30 min
- **P2 (Vercel routing):** 1 hour (including redeploy wait)
- **P3 (ALLOWED_ORIGINS):** 10 min
- **P4 (seed phrase encryption):** 2 hours
- **P5 (OTP testing + docs):** 1.5 hours
- **Testing & verification:** 1 hour

**Total: ~6 hours of focused work**

---

**Report Date:** 2026-08-15  
**Status:** 3 CRITICAL BLOCKERS; 2 HIGH PRIORITY FIXES IDENTIFIED  
**Recommendation:** Fix in order P1 → P2 → P3 (all CRITICAL); then tackle P4 & P5 before revenue launch.
