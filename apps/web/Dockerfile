# Production image for the Queenix web app (Next.js standalone).
# Build:  docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_CONVEX_URL=https://api.example.com .
# NEXT_PUBLIC_* values are baked in at build time (Next.js inlines them);
# everything else is read at runtime — see DEPLOY.md for the full env list.

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY scripts scripts
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages packages
RUN npm ci --no-audit --no-fund
COPY apps/web apps/web
ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_CONVEX_URL" || (echo "NEXT_PUBLIC_CONVEX_URL build arg is required" && exit 1) \
    && npm run build --workspace @queenix/web

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
