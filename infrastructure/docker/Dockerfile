# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY artifacts/nextrade/package.json ./artifacts/nextrade/package.json
COPY artifacts/admin-portal/package.json ./artifacts/admin-portal/package.json
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node scripts/predeploy.mjs --skip-env-check \
    && ./node_modules/.bin/prisma generate \
    && npm run build --workspace=artifacts/api-server \
    && npm run build --workspace=artifacts/nextrade \
    && npm run build --workspace=artifacts/admin-portal

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/artifacts ./artifacts
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/.npmrc ./.npmrc
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
