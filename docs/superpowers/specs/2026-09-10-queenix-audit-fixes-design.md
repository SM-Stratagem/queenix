# Queenix Gym — Audit, Fix, Dockerize, Test

**Date:** 2026-09-10
**Status:** Approved for implementation
**Supersedes:** None
**Session goal:** A fresh clone of this repo, on a clean machine, can be brought up with three commands (`npm install`, `docker compose up`, `npm run dev`) and the four demo accounts can sign in across web, mobile, and web admin using local Convex and local BetterAuth.

---

## 1. Goal & Non-Goals

### In scope
- Audit every TS/TSX file in `apps/*` and `packages/*` for correctness, broken imports, dead code, monolithic files, missing error handling
- Fix the `@tamagui/icons` install blocker and any other npm-install failures
- Switch lockfile from pnpm to npm (workspaces); update all scripts so `npm install`, `npm run dev`, `npm test` work
- Replace cloud-only Convex assumptions with self-hosted Convex backend in Docker (Postgres-backed)
- Replace cloud-only BetterAuth assumptions with file-backed (SQLite) BetterAuth for local dev, env-overridable for prod
- Docker Compose: `convex-backend`, `postgres` (for Convex persistence), `web` (Next.js)
- Extract presentational subcomponents from the screens over 500 lines into `apps/mobile/components/<screen>/`
- Vitest unit tests on pure logic: Convex mutation auth + idempotency, payments router, types/Zod, receipt math
- Playwright component tests on web admin's dashboard and scanner webhook
- Maestro smoke flow on mobile (login → home)

### Out of scope (explicit)
- Brand/design/typography/spacing — separate session
- Translation completion (Arabic)
- Production Stripe/Tap live keys (mock provider selected via env)
- Hardware procurement, App Store builds, EAS, ANPR, loyalty V2
- Performance optimization beyond what falls out of correctness fixes
- Replacing Tamagui, Convex, or BetterAuth

---

## 2. Architecture

### Repository layout (after this session)

```
queenix-gym/
├── apps/
│   ├── mobile/                    Expo SDK 53 (iOS/Android/Web) — Expo Router
│   │   ├── app/                   File-based routes — THIN, use subcomponents
│   │   ├── components/            NEW: per-screen subcomponents (extract)
│   │   │   ├── incidents/         rows, filters, detail card
│   │   │   ├── profile/           sections, role cards
│   │   │   ├── scanner/           camera, last-scan card, manual entry
│   │   │   ├── payments/          list, intent card, receipt card
│   │   │   └── ... one folder per big screen
│   │   ├── lib/                   auth context, convex client, hooks
│   │   ├── e2e/                   NEW: Maestro flows
│   │   └── __tests__/             NEW: visual screenshot tests
│   └── web/                       Next.js 15 admin
│       ├── src/app/               App Router — thin
│       ├── src/components/        Dashboard cards, scanner status, etc.
│       └── e2e/                   NEW: Playwright tests
├── packages/
│   ├── ui/                        24 Tamagui components (unchanged)
│   ├── theme/                     Tokens (unchanged in this session)
│   ├── types/                     Shared TS + Zod (unchanged, used in tests)
│   ├── i18n/                      EN + AR (unchanged)
│   ├── auth/                      BetterAuth server (now with SQLite adapter)
│   ├── convex/                    Convex schema + functions (unchanged except token bridge)
│   ├── payments/                  Stripe + Tap router (unchanged, mocked locally)
│   └── receipts/                  HTML receipt renderer (unchanged, tested)
├── convex-backend/                NEW: thin wrapper for self-hosted Convex
│   ├── Dockerfile
│   └── README.md
├── tests/                         NEW: shared test utilities
├── docker-compose.yml             NEW: postgres + convex-backend + web
├── package.json                   npm workspaces root
├── package-lock.json              npm lockfile (replaces pnpm-lock.yaml)
└── docs/
    ├── RUNBOOK.md                 NEW: single source of truth for running it
    └── superpowers/specs/
        └── 2026-09-10-queenix-audit-fixes-design.md   ← this design
```

### Runtime topology

```
┌─────────────────────────────────────────────────────────────┐
│  docker compose up                                          │
│                                                             │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │ convex-backend│◀──│ postgres:16   │   │ web (Next.js) │  │
│  │ (ghcr.io/     │   │ convex DB     │   │ :3000         │  │
│  │ get-convex/   │   │               │   │ BetterAuth    │  │
│  │ convex-       │   │               │   │ /api/scanner  │  │
│  │ backend)      │   │               │   │ /api/payments │  │
│  │ :3210 api     │   └───────────────┘   └───────────────┘  │
│  │ :3211 site    │                                          │
│  └───────────────┘                                          │
│                                                             │
│  ┌───────────────┐                                          │
│  │ mobile (host) │  Expo Go / simulator — connects to       │
│  │ npm run dev   │  convex:3210 + auth:3000 over LAN        │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Key architecture decisions

1. **Convex backend** uses the official self-hosted Docker image (`ghcr.io/get-convex/convex-backend`) — no cloud account, no internet required after initial `docker compose pull`.
2. **Convex persistence** uses Postgres 16 in the same compose — Postgres stores the **backend's metadata only** (function index, schema snapshots, deployment history). Your 27 domain tables (users, memberships, payments, etc.) are persisted by Convex's own internal storage layer, which the `convex-backend` image manages. If you later switch to Convex Cloud, the metadata DB stays behind, but your domain tables migrate via `npx convex export`.
3. **BetterAuth** switches from cloud-required Postgres to SQLite (file-backed at `.data/queenix-auth.db`). BetterAuth supports SQLite natively via `better-auth/adapters/drizzle`. No cloud DB required.
4. **Payments** — provider router already exists (`packages/payments`). For local dev we add a `mock` provider selected when `PAYMENTS_PROVIDER=mock` in env, returning deterministic success in 1s. Real Stripe/Tap wire in for prod via env switch.
5. **Workspaces**: convert `pnpm-workspace.yaml` → npm workspaces in root `package.json`. Drop `turbo.json` task graph (npm doesn't need it; use `--workspaces` flag for fan-out commands).
6. **Tests** run with `npm test` at root (delegates to `npm run test --workspaces`).

---

## 3. Data Flow & Auth

### Demo account provisioning

Four demo accounts live in `.env.testing`:
- `member@queenix.test`, `trainer@queenix.test`, `owner@queenix.test`, `ops@queenix.test`
- Shared password `QueenixDemo123!`

The seed script (`scripts/seed-demo-users.mjs`, already partially written) is the **single source of truth** for first-time setup. It does five things in order:

1. POST `/api/auth/sign-up/email` for each demo account against the running web server (BetterAuth creates the auth row in SQLite).
2. POST `/api/auth/sign-in/email` for each account to grab a session cookie.
3. Call Convex mutation `auth:linkUserToConvex` with the BetterAuth userId + role + name → creates a row in the `users` table.
4. Call `seed:seedDemoData` to insert plans, classes, sample members, sample bookings (idempotent — uses `by_email` index, skips on conflict).
5. Print a summary of credentials and the URLs where they work.

### Auth flow (login → API → Convex)

```
Mobile / Web Admin                                 Convex (self-hosted)
───────────────────────                            ──────────────────
Email + password                                          │
     │                                                    │
     ▼                                                    │
POST /api/auth/sign-in/email ──▶ BetterAuth handler       │
                                    ├─ verify pw (bcrypt) │
                                    ├─ create session     │
                                    └─ set HTTP-only      │
                                       cookie             │
     ◀───────────── 200 { user, session }                  │
     │                                                    │
     ▼                                                    │
GET /api/convex/token ────▶ returns signed JWT            │
     ◀───────────── { token }                              │
     │                                                    │
useConvexQuery (auto-attaches Bearer) ──────────────────▶ │
                                                            Convex
custom auth hook decodes JWT against AUTH_SECRET,
validates against BetterAuth SQLite, extracts userId,
returns data OR 401
     ◀───────────────────────────────────────────────────── data
```

### Convex auth bridge

Convex runs in "custom auth" mode (set in `convex/auth.config.ts`). The bridge:

- Web admin's Convex HTTP action `apps/web/src/app/api/convex/token/route.ts` returns a short-lived JWT signed with `AUTH_SECRET`. Mobile and web clients call this endpoint to get a token, then pass it to Convex in `Authorization: Bearer`.
- Convex queries/mutations use a `requireUser` helper (`packages/convex/convex/_helpers.ts`) that decodes the JWT, looks up the BetterAuth user in SQLite via a tiny `getAuthUser` action, then loads the matching `users` row.
- This is one-time setup; all existing functions that already call `requireUser` keep working unchanged.

### Idempotency guarantee

Every existing mutation that takes `Idempotency-Key` (payments, bookings, access scans) is preserved. Tests assert that calling the same mutation twice with the same key returns the first result, not a duplicate row.

### Error handling

Every Convex mutation has a single `try/catch` at the top that:
- logs to the audit log table with `{ action, actorId, targetId, error, stack }`
- rethrows as a Convex `ConvexError` with a stable `code` field (`UNAUTHORIZED`, `CONFLICT`, `VALIDATION`, `INTERNAL`)
- the client maps codes to UI toast strings via `lib/errors.ts`

---

## 4. Docker & Local Dev

### docker-compose.yml

```yaml
services:
  convex-backend:
    image: ghcr.io/get-convex/convex-backend:latest
    ports: ["3210:3210", "3211:3211"]
    environment:
      CONVEX_RELEASE_VERSION: latest
      DATABASE_URL: postgresql://convex:convex@postgres:5432/convex_metadata
    depends_on: { postgres: { condition: service_healthy } }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/version"]
      interval: 5s
      retries: 20

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: convex
      POSTGRES_PASSWORD: convex
      POSTGRES_DB: convex_metadata
    volumes: ["convex_pg:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U convex"]
      interval: 5s
      retries: 10

  web:
    build: { context: ., dockerfile: apps/web/Dockerfile.dev }
    ports: ["3000:3000"]
    volumes: [".:/app", "/app/node_modules", "/app/apps/web/node_modules"]
    environment:
      CONVEX_URL: http://convex-backend:3210
      CONVEX_SITE_URL: http://localhost:3211
      AUTH_BASE_URL: http://localhost:3000
      AUTH_DB_PATH: /app/.data/queenix-auth.db
      AUTH_SECRET: ${AUTH_SECRET:-testing-secret-replace-before-production-min-32-chars-0123456789ab}
      PAYMENTS_PROVIDER: ${PAYMENTS_PROVIDER:-mock}
    depends_on:
      convex-backend: { condition: service_healthy }
```

### One-shot jobs

Run on demand, not part of `up`:
- `npm run db:migrate` — invokes `better-auth/cli migrate` against the running web container, creating SQLite tables.
- `npm run seed` — runs `scripts/seed-demo-users.mjs` against the running web + convex containers.

### Mobile is on the host

Reason: Expo Go needs to bind the LAN, simulator needs Mac/Metal, and Docker-on-Mac file-watching for Metro is painful. Mobile reads its env from `.env` at `apps/mobile/.env` pointing at `localhost:3210` and `localhost:3000` — works for both Expo Go and the simulator.

### Dev workflow

```bash
git clone … && cd queenix-gym
npm install                         # one time
docker compose up -d                # starts postgres + convex backend
npm run db:migrate                  # one time per machine: create SQLite tables
npm run seed                        # one time: create 4 demo users + sample data
npm run dev                         # opens web admin at :3000 AND Expo at :8081 in parallel
```

### Env file templating

`.env.example` files at root, `apps/web/.env.example`, `apps/mobile/.env.example` document every variable. `.env.testing` values get copied to those on first `npm install` via a `postinstall` script that only writes if the file is missing.

---

## 5. Audit Findings & Fix Strategy

### A. Install blockers (must fix first)

1. `@tamagui/icons: ^1.130.0` doesn't exist → remove line from `packages/ui/package.json` (already noted in HANDOFF.md §"Known issue").
2. `apps/mobile/package.json` already has `lucide-react-native`; iterate on every other npm-install error as it surfaces.
3. `pnpm-lock.yaml` → delete, regenerate as `package-lock.json`.
4. `pnpm-workspace.yaml` → fold into root `package.json` `"workspaces": ["apps/*", "packages/*"]`.
5. `apps/mobile/babel.config.js` and `apps/mobile/metro.config.js` — partially modified in working tree; re-validate after `npm install`.

### B. BetterAuth wiring

- `packages/auth/src/server.ts` has uncommitted modifications — diff against HEAD first, decide what to keep vs revert.
- Add `better-auth/adapters/drizzle` + `drizzle-orm` + `better-sqlite3` deps for SQLite path.
- Add `BETTER_AUTH_URL` and `AUTH_TRUST_HOST=true` to handle Docker/localhost loopback.
- Mobile client needs explicit `baseURL: AUTH_BASE_URL` and `disableCSRFCheck: true` for cross-origin (Expo on :8081 → web on :3000).
- Add the `/api/convex/token` JWT bridge route in `apps/web`.

### C. Convex

- `packages/convex/convex/auth.config.ts` — verify it's set to `type: "custom"`.
- All 27 tables + 8 query files + 7 mutation files — only mutate for the token bridge. Don't refactor existing functions.
- `convex/_generated/` is git-ignored — running `npx convex dev --once` will regenerate it. Done in the `db:migrate` flow against the self-hosted backend.

### D. Screen decomposition (11 screens, all >480 lines)

For each: extract presentational subcomponents into `apps/mobile/components/<screen>/<name>.tsx`. Logic stays in the screen route file. Result: route files ~200-300 lines, subcomponents 50-150 lines each.

| Screen | Current LOC | Extract |
|---|---|---|
| `(ops)/incidents.tsx` | 687 | `<IncidentRow>`, `<IncidentFilters>`, `<IncidentDetailCard>`, `<EmptyIncidents>` |
| `(ops)/profile.tsx` | 669 | `<ProfileHeader>`, `<RoleSection>`, `<SettingsRow>`, `<RoleCard>` |
| `(ops)/scanner.tsx` | 657 | `<CameraView>`, `<LastScanCard>`, `<ManualEntryForm>` |
| `(member)/payments.tsx` | 602 | `<PaymentMethodRow>`, `<ReceiptCard>`, `<PaymentHistoryItem>` |
| `(ops)/support.tsx` | 585 | `<TicketRow>`, `<TicketComposer>`, `<StatusBadge>` |
| `(owner)/members/[id].tsx` | 556 | `<MemberHeader>`, `<MembershipSummary>`, `<ActionRow>` |
| `(trainer)/profile.tsx` | 548 | `<TrainerBio>`, `<EarningsCard>`, `<CertificationList>` |
| `(member)/rewards.tsx` | 532 | `<PointsHero>`, `<RewardCard>`, `<TierProgress>` |
| `(ops)/classes.tsx` | 527 | `<ClassRow>`, `<RosterList>`, `<BookingToggle>` |
| `(member)/book.tsx` | 520 | `<TrainerCard>`, `<TimeSlotPicker>`, `<BookingSummary>` |
| `(trainer)/schedule.tsx` | 492 | `<DayHeader>`, `<SessionBlock>`, `<WeekStrip>` |

That's 11 screens / ~30 subcomponents. Each subcomponent takes props via TypeScript interface, has no Convex dependency (data passed in), and is unit-testable.

### E. Web admin decomposition

- `apps/web/src/components/Dashboard.tsx` (618 lines) — split into `<KpiGrid>`, `<KpiCard>`, `<ScannerHealthPanel>`, `<RevenueChart>`, `<RecentPaymentsTable>`.
- `apps/web/src/components/AdminShell.tsx` (264 lines) — borderline; leave it.

### F. Untracked / uncommitted in working tree

Keep the good parts (env file, gitignore, TamaguiProvider, seed script) and revert anything that doesn't compile after my fixes. `git diff` every file before deciding.

### G. Dead code / unused exports

Sweep with `ts-prune` post-install, delete everything that returns 0 callers in `apps/*` and `packages/*`.

---

## 6. Testing & Verification

### Test layers

```
tests/
├── convex-helpers.ts              spins up a convex-test runtime
├── auth-helpers.ts                signs up a demo user, returns session
└── fixtures/                      sample users, memberships, payments
```

### Layer 1 — Vitest unit tests (~30 tests)

`npm test` at root.

| File | Coverage |
|---|---|
| `packages/types/src/__tests__/schemas.test.ts` | Every Zod schema rejects bad input, accepts good input |
| `packages/convex/convex/mutations/__tests__/payments.test.ts` | `recordPaymentSuccess` idempotent on duplicate webhook; rejects wrong signature; emits audit row |
| `packages/convex/convex/mutations/__tests__/users.test.ts` | `linkUserToConvex` rejects unknown auth id; sets role correctly; idempotent on re-link |
| `packages/convex/convex/queries/__tests__/access.test.ts` | `currentOccupancy` returns count of active sessions only; rotated token rejected after expiry |
| `packages/payments/src/__tests__/router.test.ts` | Provider routing: AED → Tap, USD → Stripe, `mock` → MockProvider; unknown → throws |
| `packages/receipts/src/__tests__/render.test.ts` | VAT math: subtotal 100 + 5% VAT = 105, total in words, line items in order |

Test runtime uses `convex-test` (official) — no live Convex needed, runs in-process in <2s.

### Layer 2 — Playwright web component tests (5 tests)

`npm run test:e2e:web`. `apps/web/e2e/playwright.config.ts` starts the Next.js dev server in a `webServer` block.

| Test | What it asserts |
|---|---|
| `dashboard.spec.ts` | GET `/` returns 200; KPI grid renders 4 cards; each card has a label + value + delta |
| `auth-signin.spec.ts` | POST `/api/auth/sign-in/email` with demo owner → 200 + Set-Cookie; wrong password → 401 |
| `scanner-webhook.spec.ts` | POST `/api/scanner/qr` with valid token → 200 `{ ok: true, opened: true }`; unknown token → 404 |
| `payments-webhook.spec.ts` | POST `/api/payments/stripe/webhook` with signed body → 200; tampered body → 400 |
| `receipt.spec.ts` | GET `/api/payments/<id>/receipt` → 200 HTML containing total + VAT line |

### Layer 3 — Maestro mobile smoke (1-2 flows)

`npm run test:e2e:mobile`. Why Maestro over Detox: zero native build, runs against Expo Go on the simulator in <30s.

```
apps/mobile/e2e/
├── login.yaml                     member@queenix.test → home screen visible
└── ios.yaml, android.yaml         platform configs
```

### Layer 4 — Visual smoke (no assertions, just screenshots)

`apps/mobile/__tests__/screenshots.spec.ts` — Playwright opens Expo web at `:8081`, navigates to each of the 4 role home screens, takes a screenshot. Stored under `apps/mobile/__tests__/screenshots/`. Used during this session for visual review only.

### Verification triad

Run after every batch of fixes:

```bash
npm run typecheck                  # tsc --noEmit across all workspaces
npm test                           # vitest unit tests
npm run build                      # next build + tsc for packages
```

Plus a real runtime smoke:

```bash
docker compose down -v
docker compose up -d
sleep 15
npm run db:migrate
npm run seed
npm run dev &
sleep 20
curl -sf http://localhost:3000 > /dev/null && echo "web OK"
curl -sf http://localhost:3210/version > /dev/null && echo "convex OK"
curl -sf http://localhost:8081 > /dev/null && echo "expo OK"
```

If any of those three URLs doesn't respond, the session isn't done.

### Done = all of these true

1. Fresh clone → `npm install` succeeds on the first try, no warnings about missing peers
2. `docker compose up -d` brings up convex + postgres + web, all healthchecks pass
3. `npm run db:migrate` succeeds; `npm run seed` creates 4 demo users visible in SQLite
4. `npm test` passes (>25 assertions, all green)
5. `npm run typecheck` exits 0
6. `npm run test:e2e:web` passes (5 Playwright tests)
7. `npm run test:e2e:mobile` passes (1 Maestro flow)
8. Web admin loads at `localhost:3000`, mobile loads at `localhost:8081`
9. Each of the 4 demo accounts can log in on web AND mobile
10. Audit checklist in `RUNBOOK.md` completed