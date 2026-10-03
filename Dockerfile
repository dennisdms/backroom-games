# Multi-stage build. This is the image `docker compose up` runs locally and the
# one the homelab deploys, so the demo also tests production.

FROM node:24-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN pnpm install --frozen-lockfile

COPY . .
# A failing test means no image.
RUN pnpm test && pnpm build

# The server is bundled into one file with its dependencies, so the runtime
# image needs no node_modules.
FROM node:24-slim AS runtime
WORKDIR /app
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/client/dist ./public
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/app/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/index.js"]
