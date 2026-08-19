# OTP Persistence Fix — Deployment Guide

## Overview

**Date**: August 11, 2026  
**Commit**: `2fca545`  
**Status**: Ready for production deployment

This fix ensures OTP signup payload persists durably across server restarts, fixing signup verification failures when the API server restarts during the OTP verification window.

---

## What Was Fixed

### Problem
When users initiated signup and received an OTP, if the API server restarted before they verified the OTP code, the signup payload (email, password, full name, country) would be lost from memory. Subsequent OTP verification would fail because the backend couldn't complete signup without the original payload.

### Solution
The OTP module now:
1. **Persists signup payload** to the database when issuing OTP (via Drizzle ORM or Prisma fallback)
2. **Restores signup payload** from storage on server startup
3. **Handles Prisma snake_case field naming** correctly (`signup_payload`, `user_id`, `expires_at`, `created_at`)
4. **Prevents duplicate restores** by checking if an email OTP already exists in memory

### Files Changed
- `artifacts/api-server/src/lib/otp.ts` — OTP persistence and restoration logic
- `prisma/schema.prisma` — Added `signup_payload Json?` field to `OtpCode` model
- `lib/db/src/schema/users.ts` — Added `signupPayload: jsonb("signup_payload")` to Drizzle schema
- `tests/auth-flow.test.mjs` — Updated test fixtures to validate signup payload restoration
- `prisma/migrations/20260811000000_add_otp_signup_payload/migration.sql` — Database migration (NEW)

---

## Deployment Steps

### 1. **Apply Database Migration**

Before deploying the new code, apply the database migration to add the `signup_payload` column:

```bash
# Development (local)
DATABASE_URL="postgresql://user:pass@localhost/db" npx prisma migrate deploy

# Production (VPS / Railway / Render)
# The migration runs automatically during the deployment pipeline
# OR manually via CI/CD secrets:
npx prisma migrate deploy --schema=artifacts/api-server/prisma/schema.prisma
```

**Migration Details:**
- **Table**: `otp_codes`
- **New Column**: `signup_payload JSONB` (nullable)
- **Rollback**: Not required (column is optional; existing OTP records will have NULL)
- **Duration**: <1ms (schema change only, no data transformation)

### 2. **Deploy Code**

Push to `main` branch or use your platform's deployment method:

#### **VPS / systemd**
```bash
cd /var/www/Rebrand-xpfx
git pull origin main
npm install
npm run build --workspace=artifacts/api-server
sudo systemctl restart xpressfx-api

# Verify
curl http://localhost:8082/healthz
```

#### **Railway**
1. Push to `main` branch (automatic deploy)
2. Railway runs migrations automatically
3. Verify deployment status in Railway dashboard

#### **Render / Heroku**
1. Push to `main` branch (automatic deploy)
2. Run migrations in Render/Heroku console:
   ```bash
   npx prisma migrate deploy
   ```
3. Restart the app

#### **Docker Compose**
```bash
git pull origin main
docker compose up --build -d

# Verify
curl http://localhost:8082/healthz
```

### 3. **Verification**

After deployment, verify the fix:

1. **Check API health**:
   ```bash
   curl https://your-api.com/healthz
   ```

2. **Test signup → OTP → Verify flow** in the app:
   - Go to Sign Up page
   - Enter email, password, name, country
   - You'll receive an OTP email (or dev code via `/api/auth/dev-otp?email=...`)
   - **Simulate restart** (optional, for thorough testing):
     - Stop the API server
     - Wait 1–2 seconds
     - Restart the API server
   - Enter the OTP code
   - Verify signup completes successfully

3. **Check database**:
   ```bash
   psql $DATABASE_URL -c "SELECT email, code, type, signup_payload, expires_at FROM otp_codes WHERE used = false ORDER BY created_at DESC LIMIT 5;"
   ```
   - Confirm `signup_payload` is populated (not NULL) for recent OTP records

4. **Monitor logs** for errors:
   ```bash
   tail -f /var/log/xpfx/app.log | grep -i otp
   ```

---

## Rollback Plan

If issues arise, rollback is safe:

1. **Revert the commit**:
   ```bash
   git revert 2fca545
   git push origin main
   ```

2. **No database rollback needed**:
   - The `signup_payload` column is nullable and backward-compatible
   - Old OTP records will continue to work (payload will be NULL, handled gracefully)
   - Existing signup flows using login OTP will work unchanged

3. **Restart the API server**:
   ```bash
   sudo systemctl restart xpressfx-api
   # OR
   docker compose restart
   ```

---

## Testing Checklist

- [ ] Database migration applied without errors
- [ ] API server starts cleanly after deployment
- [ ] Signup flow works end-to-end
- [ ] OTP verification succeeds
- [ ] `signup_payload` is persisted in the database
- [ ] Server restart doesn't break OTP verification
- [ ] Admin login / OTP flow works (login OTP, no payload)
- [ ] Demo auth still works (`GET /api/auth/demo`)
- [ ] No new error logs related to OTP

---

## Notes

- **Backward Compatible**: Existing login OTP records will have NULL `signup_payload` and work fine
- **Drizzle + Prisma Fallback**: The code uses Drizzle by default, with Prisma as a fallback for environments without Drizzle
- **Field Naming**: Handles both camelCase (in-memory) and snake_case (Prisma) field names
- **No Breaking Changes**: Session, CSRF, and other auth flows are unchanged

---

## Questions or Issues?

If you encounter errors during deployment:

1. Check the migration status:
   ```bash
   npx prisma migrate status
   ```

2. Review logs for OTP-related errors:
   ```bash
   grep "\[otp\]" /var/log/xpfx/app.log
   ```

3. Verify the database connection:
   ```bash
   npx tsx -e "console.log('DB:', process.env.DATABASE_URL)"
   ```

Contact DevOps or review the `PRODUCTION_CHECKLIST.md` for additional debugging steps.
