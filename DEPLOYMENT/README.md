Deployment files added:
- .github/workflows/db-migrate.yml
- scripts/test-db-connection.mjs
- scripts/post-migration-check.mjs
- DEPLOYMENT/RAILWAY_VARIABLES_TEMPLATE.env

Important:
- Do not commit real secrets to source control.
- Use GitHub Secrets for CI and Railway variables for runtime.
- After pushing, configure the required secrets in GitHub and the deployment platform.
