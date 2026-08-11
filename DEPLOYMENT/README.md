## Deployment Documentation

This folder contains deployment guides and configurations for all supported platforms (VPS, Railway, Render, Docker Compose, Replit).

### Key Files

- `commands.md` — Quick deployment commands for each platform
- `LOCAL_ENV_TEMPLATE.env` — Local development environment template
- `RAILWAY_VARIABLES_TEMPLATE.env` — Railway environment template
- `RAILWAY_STEPS.md` — Step-by-step Railway deployment guide
- `VPS_START_COMMAND.sh` — VPS startup script
- `OTP_PERSISTENCE_FIX.md` — **NEW**: OTP signup payload durability fix and deployment guide

### Recent Updates (2026-08-11)

**OTP Persistence Fix** (`commit: 2fca545`)
- Signup payload now persists durably across server restarts
- Database migration required: `prisma/migrations/20260811000000_add_otp_signup_payload/migration.sql`
- See [OTP_PERSISTENCE_FIX.md](OTP_PERSISTENCE_FIX.md) for full deployment guide

### Important Notes

- **Do not commit real secrets** to source control
- Use **GitHub Secrets** for CI and **platform secrets managers** for runtime (Railway, Render, etc.)
- **Railway** must be configured with:
  - `SENDGRID_API_KEY` (for OTP email delivery)
  - `SMTP_FROM` (must be a verified SendGrid sender)
  - `ALCHEMY_API_KEY` (for blockchain provider)
- **Local development**: Copy `LOCAL_ENV_TEMPLATE.env` to `.env` and fill in values
- **Docker Compose**: Expects the app to listen on port 3000; reverse proxy uses `/healthz` for health checks

### Database Migrations

All deployments automatically apply pending Prisma migrations. For manual control:

```bash
# Check status
npx prisma migrate status --schema=artifacts/api-server/prisma/schema.prisma

# Apply migrations (production/staging)
npx prisma migrate deploy --schema=artifacts/api-server/prisma/schema.prisma

# Reset (dev only, destroys all data)
DATABASE_URL="..." npx prisma migrate reset
```

See the main [QUICKSTART.md](../QUICKSTART.md) for more details.
