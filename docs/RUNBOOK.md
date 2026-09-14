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
npm install                    # bootstraps .env files + patches Tamagui for React 19
docker compose up -d           # self-hosted Convex backend + dashboard + Next.js web
cd packages/convex
docker exec queenix-convex /convex/generate_admin_key.sh
# Copy the printed key into packages/convex/.env.local as CONVEX_SELF_HOSTED_ADMIN_KEY
cd ../..
npx convex env set AUTH_BASE_URL "http://localhost:3000" --project queenix
cd packages/convex && npx convex dev --once && cd ../..
npm run db:migrate             # create SQLite auth tables (BetterAuth + Kysely)
npm run seed                   # create 4 demo accounts (BetterAuth + Convex)
```

What you should see:
- `curl http://localhost:3210/version` returns JSON with `version` field
- `curl http://localhost:3000` returns HTML with "Queenix Admin"
- `npm run seed` prints `created owner@queenix.test` for each role
- `curl -sX POST http://localhost:3000/api/auth/sign-in/email -H "Content-Type: application/json" -d '{"email":"owner@queenix.test","password":"QueenixDemo123!"}'` returns 200 with `activeRole: "owner"`

## 2. Daily dev

```bash
docker compose up -d           # if not already running
npm run dev                    # starts web admin (:3000) AND Expo (:8081)
```

Open:
- **Web admin**: http://localhost:3000
- **Mobile Expo web**: http://localhost:8081
- **Convex dashboard**: http://localhost:3211

If port 3000 is taken, override with `WEB_PORT=3300 npm run dev` and `AUTH_BASE_URL=http://localhost:3300`.

## 3. Demo accounts

| Role | Email | Password |
|---|---|---|
| Member | `member@queenix.test` | `QueenixDemo123!` |
| Trainer | `trainer@queenix.test` | `QueenixDemo123!` |
| Owner | `owner@queenix.test` | `QueenixDemo123!` |
| Operations | `ops@queenix.test` | `QueenixDemo123!` |

Created the first time you run `npm run seed`. The seed script is idempotent — re-runs are safe.

## 4. Tests

```bash
npm test                       # vitest: 19 tests across types/payments/receipts
npm run test:e2e:web           # playwright against running web admin (6 tests, needs docker compose up)
npm run test:e2e:mobile        # maestro flow on a running simulator
```

Vitest test files:
- `packages/types/src/__tests__/schemas.test.ts` — Zod schema round-trips
- `packages/payments/src/__tests__/router.test.ts` — provider routing
- `packages/receipts/src/__tests__/computeVat.test.ts` — VAT math
- `packages/receipts/src/__tests__/render.test.ts` — HTML escaping

Playwright in `apps/web/e2e/auth.spec.ts`:
1. root renders Tamagui with 200
2. get-session returns null for anonymous
3. sign-up + admin role assignment + sign-in
4. admin role endpoint rejects wrong token
5. sign-in with wrong password is rejected
6. convex health endpoint reachable

## 5. Useful npm scripts

```bash
npm run dev                    # web + mobile dev (concurrent)
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
npm run db:migrate             # BetterAuth SQLite migration (creates 4 tables)
npm run seed                   # seed demo accounts + sample data
```

## 6. Architecture

```
queenix-gym/
├── apps/
│   ├── mobile/                Expo SDK 53, file-based router
│   ├── web/                   Next.js 15 admin (port 3000 / $WEB_PORT)
├── packages/
│   ├── auth/                  BetterAuth + Kysely + better-sqlite3 (no cloud DB needed)
│   ├── convex/                Backend schema + functions (self-hosted)
│   ├── payments/              Stripe + Tap router (mock for local dev)
│   ├── receipts/              HTML receipt + VAT math
│   ├── types/                 Shared Zod schemas
│   ├── theme/                 Brand tokens + Tamagui config (numeric tokens)
│   ├── ui/                    24 Tamagui components (extensible ViewProps)
│   └── i18n/                  EN + AR
├── docker-compose.yml         self-hosted Convex + web (no external DB)
└── docs/RUNBOOK.md            This file
```

## 7. How authentication flows

1. Mobile or web client → POST `/api/auth/sign-in/email` to the Next.js web admin
2. Web admin's BetterAuth handler verifies credentials against SQLite (`apps/web/.data/queenix-auth.db`)
3. Session cookie + JWT-like token returned to client
4. Client sends the token to Convex via `/api/convex/token` (the bridge route) on every call
5. Convex identifies the user via the bridge's signed JWT and runs queries/mutations

## 8. How seeding works

`scripts/seed-demo-users.mjs` performs 3 steps per demo user:
1. Sign-up via BetterAuth (skipped if already exists, falls back to sign-in)
2. POST `/api/admin/users/{id}/role` to set role (dev-only, x-queenix-admin-token header)
3. Background `auth.databaseHooks.user.create.after` syncs the user to Convex

Convex is then seeded with `seed:seedDemoUsers` mutation via `npx convex dev --once`.

## 9. Troubleshooting

### "Convex complains schema is out of date"
The self-hosted Convex backend was restarted but doesn't have code yet. Run:
```bash
cd packages/convex && npx convex dev --once
```

### "BetterAuth: Drizzle schema mismatch"
You haven't migrated yet. Run `npm run db:migrate`.

### "createReactContext is not a function" / "missing tokens.space"
Already handled by `scripts/patch-tamagui-react19.mjs` which runs as part of `npm install`. If it fails, run it manually:
```bash
node scripts/patch-tamagui-react19.mjs
```

### "Port 3000 already in use"
Another project (aleeya-web) is on port 3000. Override with `WEB_PORT=3300 npm run dev` and use `AUTH_BASE_URL=http://localhost:3300` in your .env.

### Reset everything
```bash
docker compose down -v
rm -rf .data apps/mobile/.expo apps/mobile/node_modules/.cache
npm install
docker compose up -d
cd packages/convex && npx convex dev --once && cd ../..
npm run db:migrate
npm run seed
```

## 10. Production deployment

For production:
- Set `AUTH_SECRET` from a secure generator (`openssl rand -base64 32`)
- Set `PAYMENTS_PROVIDER=stripe|tap` with real keys
- Point `AUTH_BASE_URL` at the production URL
- Provide a real `CONVEX_DEPLOY_KEY` for cloud Convex (or self-host with `CONVEX_SELF_HOSTED_*`)
- Use Postgres for BetterAuth (`AUTH_DB_DRIVER=pg` would need code change — currently SQLite-only)

