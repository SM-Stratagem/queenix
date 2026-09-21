# Queenix Gym - Docker platform run (one command)

> Uses `docker-compose.platform.yml` (postgres:16 + convex-dev + web on one
> shared network). The pre-existing `docker-compose.yml` (self-hosted Convex
> backend, npm) is untouched; promoting this file to replace it is an
> integrator decision (see WIRING NOTES in the task reply).

## Prereqs

- Docker Desktop 4.x (or Docker Engine + compose v2 plugin)
- Node 20+ and pnpm 9 on the host (for seed scripts + mobile)
- Expo Go on a phone on the same Wi-Fi as the host (mobile only)

## One-command run

```bash
cp .env.platform.example .env
docker compose -f docker-compose.platform.yml up --build
```

Services: `db` (postgres:16, host port 5432) -> `convex-dev`
(`pnpm --filter @queenix/convex dev`, ports 3210/3211) + `web`
(`pnpm --filter @queenix/web dev`, port 3000). `convex-dev` and `web`
start only after `db` is healthy.

## Seed steps (host shell, after first up)

```bash
npm run db:migrate   # better-auth schema -> DATABASE_URL (or local sqlite fallback)
node scripts/seed-demo-users.mjs
```

## Mobile on host Expo Go (NOT in compose)

Expo Go cannot run inside the compose network, so mobile stays on the host
and talks to compose over your LAN:

```bash
# in apps/mobile (host):
EXPO_PUBLIC_CONVEX_URL=http://<HOST_LAN_IP>:3210 \
EXPO_PUBLIC_AUTH_BASE_URL=http://<HOST_LAN_IP>:3000 \
npx expo start --go
```

Find `<HOST_LAN_IP>` via `ipconfig getifaddr en0` (macOS) or
`hostname -I` (Linux). `localhost` will NOT work from a physical phone.
`TAP_SECRET_KEY` / `STRIPE_SECRET_KEY` stay `TODO-connect` placeholders in
dev; mock provider is used until real keys are wired.

## Reset

```bash
docker compose -f docker-compose.platform.yml down        # keep pg data
docker compose -f docker-compose.platform.yml down -v     # wipe pg data + start fresh
docker compose -f docker-compose.platform.yml logs -f     # follow logs
```

## Notes

- Repo currently uses npm workspaces; compose runs pnpm commands, so run
  `pnpm import` once on the host to generate `pnpm-lock.yaml` before
  `docker compose build` for reproducible layers.
- `db` data persists in the `pgdata` volume across restarts.
