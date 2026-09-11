# Queenix Gym — Local Runbook

Single source of truth for getting the app running locally. Follow the numbered steps once per machine, then use section 2 for daily development.

## 0. Prerequisites

- **Node.js 20+** (recommended 22)
- **Docker Desktop** or **OrbStack** (macOS)
- (Optional) **Xcode 15+** for iOS simulator, **Android Studio** for emulator
- (Optional) **Maestro CLI** for mobile E2E: `brew install maestro`

## 1. Fresh setup (one time per machine)

```bash
git clone <repo> && cd queenix-gym
npm install                    # bootstraps .env files via postinstall
docker compose up -d           # postgres + convex-backend + web
npm run db:migrate             # create SQLite auth tables
npm run seed                   # create 4 demo accounts + sample data
```

What you should see:
- `curl http://localhost:3210/version` returns JSON with a `version` field
- `curl http://localhost:3000` returns HTML
- `sqlite3 .data/queenix-auth.db "SELECT email FROM user"` shows 4 rows after `npm run seed`

## 2. Daily dev

```bash
docker compose up -d           # if not already running
npm run dev                    # starts web admin (:3000) AND Expo (:8081)
```

Open:
- **Web admin**: http://localhost:3000
- **Mobile Expo web**: http://localhost:8081
- **Convex dashboard**: http://localhost:3211

## 3. Demo accounts

| Role | Email | Password |
|---|---|---|
| Member | `member@queenix.test` | `QueenixDemo123!` |
| Trainer | `trainer@queenix.test` | `QueenixDemo123!` |
| Owner | `owner@queenix.test` | `QueenixDemo123!` |
| Operations | `ops@queenix.test` | `QueenixDemo123!` |

These accounts live in `.env.testing`. They're created the first time you run `npm run seed`.

## 4. Tests

```bash
npm test                       # vitest: 19 tests across types/payments/receipts
npm run test:e2e:web           # playwright against the running web admin
npm run test:e2e:mobile        # maestro flow on a running simulator
```

Vitest test files:
- `packages/types/src/__tests__/schemas.test.ts` — Zod schema round-trips
- `packages/payments/src/__tests__/router.test.ts` — provider routing
- `packages/receipts/src/__tests__/computeVat.test.ts` — VAT math
- `packages/receipts/src/__tests__/render.test.ts` — HTML escaping

## 5. Useful npm scripts

```bash
npm run dev                    # web + mobile dev
npm run dev:web                # only Next.js admin
npm run dev:mobile             # only Expo
npm run dev:convex             # only Convex CLI
npm run typecheck              # tsc --noEmit across all workspaces
npm run lint
npm run build
npm run clean                  # remove node_modules + caches
npm run compose:up
npm run compose:down
npm run compose:logs
npm run db:migrate             # BetterAuth SQLite migration
npm run seed                   # seed demo accounts + sample data
```

## 6. Troubleshooting

### "Convex complains schema is out of date"
Run `npm run db:migrate` again — the on-disk schema is regenerated from `convex/schema.ts`.

### "BetterAuth secret missing"
Export `AUTH_SECRET` with at least 32 chars:
```bash
export AUTH_SECRET=$(openssl rand -base64 32)
```

### "Metro: Unable to resolve @queenix/ui"
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

### "Port 3000 already in use"
The web admin's port is fixed. Either stop the conflicting process or change `web.ports` in `docker-compose.yml` (use the `WEB_PORT` env var to remap).

### "createReactContext is not a function" / "missing tokens.space" when loading web admin
These are Tamagui 1.144 + React 19 + Next.js dev-mode incompatibilities. Two paths:

**Path A (recommended for now)** — verify the backend stack works without the web UI:
```bash
curl http://localhost:3210/version                  # Convex
npm test                                           # 19 unit tests
node scripts/seed-demo-users.mjs                    # creates 4 demo accounts once web+convex are up
```

**Path B** — to make the web admin render, the theme package at `packages/theme/src/tamagui.config.ts` and the Tokens need a numeric-token + `true` key migration (Tamagui 2.x work). Defer to design session.

### Reset everything
```bash
docker compose down -v
rm -rf .data apps/mobile/.expo apps/mobile/node_modules/.cache
npm install
docker compose up -d
npm run db:migrate
npm run seed
```

## 7. Architecture quick map

```
queenix-gym/
├── apps/
│   ├── mobile/                Expo SDK 53, file-based router
│   ├── web/                   Next.js 15 admin
├── packages/
│   ├── auth/                  BetterAuth (SQLite for local)
│   ├── convex/                Backend schema + functions
│   ├── payments/              Stripe + Tap router
│   ├── receipts/              HTML receipt + VAT math
│   ├── types/                 Shared Zod schemas
│   ├── theme/                 Brand tokens
│   ├── ui/                    24 Tamagui components
│   └── i18n/                  EN + AR
├── docker-compose.yml         postgres + convex-backend + web
└── docs/RUNBOOK.md            This file
```

## 8. Production note

For production deployment, the codebase supports the same path: set `PAYMENTS_PROVIDER=stripe|tap`, point `AUTH_BASE_URL` at the live URL, set a real `AUTH_SECRET`, and provide `POSTGRES_URL` to the Convex backend. Every env var has a `.env.example` template.
