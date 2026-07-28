Deployment files added:
- .github/workflows/db-migrate.yml
- scripts/test-db-connection.mjs
- scripts/post-migration-check.mjs
- DEPLOYMENT/RAILWAY_VARIABLES_TEMPLATE.env
- DEPLOYMENT/LOCAL_ENV_TEMPLATE.env

Important:
- Do not commit real secrets to source control.
- Use GitHub Secrets for CI and Railway variables for runtime.
- For local development, copy DEPLOYMENT/LOCAL_ENV_TEMPLATE.env to .env and fill in the values.
- For deployment, populate the required secrets in GitHub Actions and the target hosting platform.
