# One-shot job: push Convex functions + deployment env to the self-hosted
# backend. Run after every release (Railway: a service with restart policy
# "never"; AWS: an ECS run-task; locally: the convex-deploy compose job).
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY scripts scripts
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages packages
RUN npm ci --no-audit --no-fund --workspace @queenix/convex --include-workspace-root
COPY deploy/convex/deploy.sh /deploy.sh
WORKDIR /app/packages/convex
CMD ["sh", "/deploy.sh"]
