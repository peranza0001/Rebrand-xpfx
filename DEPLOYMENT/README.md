Deployment files added:
- .github/workflows/db-migrate.yml
- scripts/test-db-connection.mjs
- scripts/post-migration-check.mjs
- DEPLOYMENT/RAILWAY_VARIABLES_TEMPLATE.env
- DEPLOYMENT/LOCAL_ENV_TEMPLATE.env

Important:
- Do not commit real secrets to source control.
- Use GitHub Secrets for CI and Railway variables for runtime.
- Railway must be configured with `SENDGRID_API_KEY` and `ALCHEMY_API_KEY` in its environment settings for OTP email delivery and blockchain provider lookups.
- For local development, copy DEPLOYMENT/LOCAL_ENV_TEMPLATE.env to .env and fill in the values.
- For deployment, populate the required secrets in GitHub Actions and the target hosting platform.
- Docker Compose expects the app to listen on port 3000; the reverse proxy uses /healthz for health checks.
